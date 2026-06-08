#!/usr/bin/env python3
"""
fetch_thinq.py
──────────────
Polls LG ThinQ API for high-draw appliances (AC, washer, dryer, fridge)
and writes bill/current/current.json for the static dashboard.

Required GitHub Actions secrets:
  THINQ_PAT        – Personal Access Token from https://connect-pat.lgthinq.com
  THINQ_CLIENT_ID  – Any stable unique string identifying this client
                     (e.g. "my-bill-poller"; does NOT need to be an LG app credential)

Optional env vars (set in workflow YAML, not as secrets):
  THINQ_COUNTRY     – ISO 3166-1 alpha-2, default: PH
  BILLING_START_DAY – Day-of-month your CENPELCO period starts, default: 1
  BILLING_DAYS      – Length of billing period in days, default: 30
  OUTPUT_PATH       – Where to write JSON, default: bill/current/current.json

API flow:
  1. GET  {regional_bootstrap}/route           → resolve real apiServer
  2. GET  {apiServer}/devices                  → list all devices
  3. GET  {apiServer}/devices/energy/{id}/usage?period=DAILY&...  → kWh per day
  4. GET  {apiServer}/devices/{id}             → live status (on/off, watts, mode)

LG ThinQ API docs: https://thinq.developer.lge.com/en/apiManage/index
"""

import os, json, sys, uuid, base64
from datetime import datetime, timezone, timedelta
from typing import Optional
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
PAT           = os.environ["THINQ_PAT"]           # Bearer PAT from connect-pat.lgthinq.com
CLIENT_ID     = os.environ["THINQ_CLIENT_ID"]     # stable unique client string
COUNTRY       = os.environ.get("THINQ_COUNTRY", "PH").upper()
OUTPUT_PATH   = os.environ.get("OUTPUT_PATH", "bill/current/current.json")

BILLING_START_DAY = int(os.environ.get("BILLING_START_DAY", "1"))
BILLING_DAYS      = int(os.environ.get("BILLING_DAYS", "30"))

# Fixed public API key — same for every caller, per official LG ThinQ docs
THINQ_API_KEY = "v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3"

# Regional bootstrap base URLs (select by country)
_KIC = "https://api-kic.lgthinq.com"   # South Asia, East Asia & Pacific
_AIC = "https://api-aic.lgthinq.com"   # Americas
_EIC = "https://api-eic.lgthinq.com"   # Europe, Middle East, Africa

REGIONAL_BOOTSTRAP = {
    # KIC — Asia-Pacific
    "PH": _KIC, "KR": _KIC, "JP": _KIC, "AU": _KIC, "NZ": _KIC,
    "SG": _KIC, "MY": _KIC, "TH": _KIC, "VN": _KIC, "ID": _KIC,
    "IN": _KIC, "HK": _KIC, "TW": _KIC,
    # AIC — Americas
    "US": _AIC, "CA": _AIC, "MX": _AIC, "BR": _AIC,
    # EIC — EMEA
    "GB": _EIC, "DE": _EIC, "FR": _EIC, "ES": _EIC, "IT": _EIC,
    "NL": _EIC, "PL": _EIC, "SE": _EIC, "SA": _EIC, "ZA": _EIC,
    "AE": _EIC,
}
BOOTSTRAP_BASE = REGIONAL_BOOTSTRAP.get(COUNTRY, _KIC)

# Device types we care about (ThinQ `deviceType` string values)
HIGH_DRAW_TYPES = {
    "WINDRIDER":    "AC",
    "AC":           "AC",
    "RAC":          "AC",
    "WASHER":       "WASHER",
    "DRYER":        "DRYER",
    "FRIDGE":       "FRIDGE",
    "REFRIGERATOR": "FRIDGE",
}

# ── Message ID ────────────────────────────────────────────────────────────────
def new_message_id() -> str:
    """url-safe base64 no-padding, 22 chars — required format per ThinQ docs."""
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).decode().rstrip("=")

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _headers() -> dict:
    """Standard headers required on every ThinQ API call."""
    return {
        "Authorization":   f"Bearer {PAT}",   # PAT token, not OAuth
        "x-api-key":       THINQ_API_KEY,      # fixed public key
        "x-client-id":     CLIENT_ID,          # stable unique client identifier
        "x-country":       COUNTRY,            # ISO alpha-2
        "x-message-id":    new_message_id(),   # fresh UUID per request
        "x-service-phase": "OP",
        "Content-Type":    "application/json",
    }

def get(base: str, path: str, query: str = "") -> dict:
    url = f"{base}{path}" + (f"?{query}" if query else "")
    req = urllib.request.Request(url, headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} → {url}\n  {body}", file=sys.stderr)
        raise

# ── Step 1: Route discovery ───────────────────────────────────────────────────
def resolve_api_server() -> str:
    """
    GET {bootstrap}/route
    Returns the actual apiServer domain for this region/account.
    Falls back to bootstrap URL so subsequent calls still attempt.
    """
    print(f"Route discovery → {BOOTSTRAP_BASE}/route")
    try:
        data   = get(BOOTSTRAP_BASE, "/route")
        server = (data.get("response") or {}).get("apiServer", "").rstrip("/")
        if server:
            print(f"  apiServer: {server}")
            return server
        print("  /route returned no apiServer, using bootstrap.", file=sys.stderr)
    except Exception as e:
        print(f"  /route failed ({e}), falling back to bootstrap.", file=sys.stderr)
    return BOOTSTRAP_BASE

# ── Step 2: Device list ───────────────────────────────────────────────────────
def list_devices(api: str) -> list:
    print("\nFetching device list…")
    data  = get(api, "/devices")
    items = (data.get("response") or data.get("result") or {}).get("item", [])
    print(f"  {len(items)} device(s) on account")
    return items

# ── Step 3: Energy usage (DAILY, billing period) ─────────────────────────────
def fetch_energy_usage(api: str, device_id: str,
                       start_date: str, end_date: str) -> Optional[dict]:
    """
    GET /devices/energy/{deviceId}/usage?period=DAILY&startDate=YYYYMMDD&endDate=YYYYMMDD
    Returns `response.result` dict or None on any error / unsupported device.
    """
    query = f"period=DAILY&startDate={start_date}&endDate={end_date}"
    try:
        data = get(api, f"/devices/energy/{device_id}/usage", query)
        resp = data.get("response") or {}
        code = resp.get("resultCode", "")
        if code != "0000":
            reason = {
                "1212": "device not owned",
                "1221": "product not supported",
                "1220": "property not supported",
                "1307": "country not supported",
                "2214": "request failed",
            }.get(code, f"resultCode {code}")
            print(f"    Energy API: {reason}", file=sys.stderr)
            return None
        return resp.get("result")
    except Exception as e:
        print(f"    Energy fetch failed: {e}", file=sys.stderr)
        return None

# ── Step 4: Live device status (on/off, watts, mode) ─────────────────────────
def fetch_device_status(api: str, device_id: str) -> Optional[dict]:
    """GET /devices/{deviceId} → response.result"""
    try:
        data = get(api, f"/devices/{device_id}")
        resp = data.get("response") or data.get("result") or {}
        code = resp.get("resultCode", "0000")
        if code != "0000":
            print(f"    Status API resultCode {code}", file=sys.stderr)
            return None
        return resp.get("result") or resp
    except Exception as e:
        print(f"    Status fetch failed: {e}", file=sys.stderr)
        return None

# ── Billing period math ───────────────────────────────────────────────────────
def billing_period_info() -> dict:
    now  = datetime.now(timezone(timedelta(hours=8)))   # UTC+8 Philippine time
    y, m, d = now.year, now.month, now.day
    if d < BILLING_START_DAY:
        start = datetime(y - 1 if m == 1 else y,
                         12 if m == 1 else m - 1,
                         BILLING_START_DAY, tzinfo=now.tzinfo)
    else:
        start = datetime(y, m, BILLING_START_DAY, tzinfo=now.tzinfo)
    return {
        "billing_period":  start.strftime("%B %Y"),
        "billing_start":   start.isoformat(),
        "days_elapsed":    (now - start).days + 1,
        "billing_days":    BILLING_DAYS,
        "start_date_str":  start.strftime("%Y%m%d"),   # for energy API
        "end_date_str":    now.strftime("%Y%m%d"),
    }

# ── Parse energy result → (kwh_today, kwh_period) ────────────────────────────
def extract_kwh(result: Optional[dict]) -> tuple[float, float]:
    """
    ThinQ energy result shape varies by device class.
    Values are in Wh — divide by 1000 to get kWh.
    """
    if not result:
        return 0.0, 0.0

    def to_kwh(v):
        try: return float(v) / 1000.0
        except (TypeError, ValueError): return 0.0

    # Most common shape: list of daily records
    records = (result.get("energyData")
               or result.get("dailyData")
               or result.get("data")
               or [])
    if isinstance(records, list) and records:
        period_total = sum(
            to_kwh(r.get("energyValue") or r.get("value") or r.get("energy") or 0)
            for r in records
        )
        last = records[-1]
        kwh_today = to_kwh(last.get("energyValue") or last.get("value") or last.get("energy") or 0)
        return kwh_today, period_total

    # Fallback: scalar keys on result object itself
    kwh_today  = to_kwh(result.get("todayUsage")   or result.get("energyToday") or 0)
    kwh_period = to_kwh(result.get("monthUsage")   or result.get("energyMonth")
                        or result.get("totalUsage") or 0)
    return kwh_today, kwh_period

# ── Parse device status → (is_on, watts, mode) ───────────────────────────────
def extract_status(status: Optional[dict]) -> tuple[bool, float, str]:
    if not status:
        return False, 0.0, "—"

    op = status.get("operation") or {}

    ON_VALUES = {"POWER_ON", "ON", "1", "TRUE", "RUNNING",
                 "COOL", "HEAT", "AUTO", "FAN", "DRY", "WASH", "SPIN"}
    is_on = any(
        str(op.get(k) or "").upper() in ON_VALUES
        for k in ("airOperationMode", "operationMode", "washerOperationMode",
                  "dryerOperationMode", "fridgeOperationMode")
    )

    watts = 0.0
    for k in ("powerConsumption", "activePowerWatt", "energyConsumedW",
              "currentPower", "instantPowerW"):
        try:
            v = float(status.get(k) or 0)
            if v > 0:
                watts = v
                break
        except (TypeError, ValueError):
            pass

    mode = (op.get("airOperationMode")
            or op.get("currentJobName")
            or op.get("washerOperationMode")
            or op.get("dryerOperationMode")
            or "—")

    return is_on, watts, str(mode)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    period = billing_period_info()
    api    = resolve_api_server()

    targets = [
        d for d in list_devices(api)
        if (d.get("deviceType") or "").upper() in HIGH_DRAW_TYPES
    ]
    print(f"  High-draw appliances: {len(targets)}")

    parsed_devices   = []
    total_kwh_period = 0.0
    total_watts_now  = 0.0

    for dev in targets:
        did   = dev.get("deviceId") or dev.get("device_id", "")
        alias = dev.get("alias") or dev.get("name") or did
        model = dev.get("modelName") or dev.get("model") or ""
        dtype = HIGH_DRAW_TYPES[(dev.get("deviceType") or "").upper()]
        print(f"\n  [{dtype}] {alias}  id={did}")

        energy_raw         = fetch_energy_usage(api, did,
                                                period["start_date_str"],
                                                period["end_date_str"])
        kwh_today, kwh_period = extract_kwh(energy_raw)
        print(f"    kWh today={kwh_today:.3f}  period={kwh_period:.3f}")

        status_raw         = fetch_device_status(api, did)
        is_on, watts, mode = extract_status(status_raw)
        print(f"    {'ON' if is_on else 'OFF'}  {watts} W  mode={mode}")

        parsed_devices.append({
            "device_id":  did,
            "alias":      alias,
            "model":      model,
            "type":       dtype,
            "on":         is_on,
            "watts":      round(watts, 1),
            "kwh_today":  round(kwh_today, 3),
            "kwh_period": round(kwh_period, 3),
            "mode":       mode,
        })
        total_kwh_period += kwh_period
        if is_on:
            total_watts_now += watts

    payload = {
        "polled_at":       datetime.now(timezone.utc).isoformat(),
        "api_server":      api,
        "billing_period":  period["billing_period"],
        "billing_start":   period["billing_start"],
        "days_elapsed":    period["days_elapsed"],
        "billing_days":    period["billing_days"],
        "kwh_accumulated": round(total_kwh_period, 3),
        "watts_now":       round(total_watts_now, 1),
        "devices":         parsed_devices,
    }

    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n✓  {OUTPUT_PATH}")
    print(f"   {period['billing_period']}  day {period['days_elapsed']}/{period['billing_days']}")
    print(f"   {len(parsed_devices)} devices  |  {total_kwh_period:.3f} kWh  |  {total_watts_now:.1f} W now")


if __name__ == "__main__":
    main()
