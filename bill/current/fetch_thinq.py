#!/usr/bin/env python3
"""
fetch_thinq.py
──────────────
Polls LG ThinQ API for high-draw appliances (AC, washer, dryer, fridge)
and writes bill/current/current.json for the static dashboard.

Required environment variables (set as GitHub Actions secrets):
  THINQ_CLIENT_ID      – LG ThinQ developer client ID
  THINQ_CLIENT_SECRET  – LG ThinQ developer client secret
  THINQ_ACCESS_TOKEN   – OAuth access token (refresh manually or via separate step)
  THINQ_COUNTRY        – e.g. PH
  THINQ_LANGUAGE       – e.g. en-PH
  BILLING_START_DAY    – Day-of-month your billing period starts (default: 1)
  BILLING_DAYS         – Length of billing period in days (default: 30)

LG ThinQ v2 API reference:
  https://thinq.developer.lge.com/en/apiManage/index
"""

import os, json, math, sys
from datetime import datetime, timezone, timedelta
from typing import Optional
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
CLIENT_ID     = os.environ["THINQ_CLIENT_ID"]
CLIENT_SECRET = os.environ["THINQ_CLIENT_SECRET"]
ACCESS_TOKEN  = os.environ["THINQ_ACCESS_TOKEN"]
COUNTRY       = os.environ.get("THINQ_COUNTRY", "PH")
LANGUAGE      = os.environ.get("THINQ_LANGUAGE", "en-PH")
OUTPUT_PATH   = os.environ.get("OUTPUT_PATH", "bill/current/current.json")

BILLING_START_DAY = int(os.environ.get("BILLING_START_DAY", "1"))
BILLING_DAYS      = int(os.environ.get("BILLING_DAYS", "30"))

# Device types we care about (ThinQ deviceType values)
HIGH_DRAW_TYPES = {
    "WINDRIDER": "AC",        # split AC
    "AC":        "AC",
    "RAC":       "AC",
    "WASHER":    "WASHER",
    "DRYER":     "DRYER",
    "FRIDGE":    "FRIDGE",
    "REFRIGERATOR": "FRIDGE",
}

THINQ_BASE = "https://kic.lgthinq.com:46030/api"   # KIC gateway (PH region)

# ── Helpers ───────────────────────────────────────────────────────────────────
def thinq_headers() -> dict:
    return {
        "x-client-id":       CLIENT_ID,
        "x-client-secret":   CLIENT_SECRET,
        "x-country-code":    COUNTRY,
        "x-language-code":   LANGUAGE,
        "x-service-code":    "SVC202",
        "x-service-phase":   "OP",
        "x-app-type":        "NUTS",
        "x-app-ver":         "3.6.20800",
        "x-message-id":      "bill-current-poller",
        "Authorization":     f"Bearer {ACCESS_TOKEN}",
        "Content-Type":      "application/json",
    }

def get(path: str) -> dict:
    url = f"{THINQ_BASE}{path}"
    req = urllib.request.Request(url, headers=thinq_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} on GET {path}: {body}", file=sys.stderr)
        raise

def get_device_status(device_id: str) -> Optional[dict]:
    try:
        data = get(f"/devices/{device_id}")
        return data.get("result", {})
    except Exception as e:
        print(f"  Skipping device {device_id}: {e}", file=sys.stderr)
        return None

# ── Billing period math ───────────────────────────────────────────────────────
def billing_period_info() -> dict:
    """Return days_elapsed, billing_period label, billing_days."""
    now = datetime.now(timezone(timedelta(hours=8)))  # PH time (UTC+8)
    year, month, day = now.year, now.month, now.day

    # Period start = BILLING_START_DAY of current month
    # If today is before start day, period started last month
    if day < BILLING_START_DAY:
        if month == 1:
            start = datetime(year - 1, 12, BILLING_START_DAY, tzinfo=now.tzinfo)
        else:
            start = datetime(year, month - 1, BILLING_START_DAY, tzinfo=now.tzinfo)
    else:
        start = datetime(year, month, BILLING_START_DAY, tzinfo=now.tzinfo)

    days_elapsed = (now - start).days + 1
    period_label = start.strftime("%B %Y")

    return {
        "billing_period": period_label,
        "billing_start":  start.isoformat(),
        "days_elapsed":   days_elapsed,
        "billing_days":   BILLING_DAYS,
    }

# ── Device parsing ────────────────────────────────────────────────────────────
def parse_device(dev: dict, status: dict) -> dict:
    dev_type_raw = (dev.get("deviceType") or "").upper()
    friendly_type = HIGH_DRAW_TYPES.get(dev_type_raw, dev_type_raw)

    # Power state – ThinQ v2 uses `operation` nested key
    op = status.get("operation", {})
    is_on = str(op.get("airOperationMode") or op.get("operationMode") or "").upper() in ("ON", "1", "TRUE", "RUNNING")

    # Real-time wattage – key varies by device class
    watts = float(
        status.get("powerConsumption")
        or status.get("activePowerWatt")
        or status.get("energyConsumedW")
        or 0
    )

    # Energy counters (cumulative, in Wh – convert to kWh)
    kwh_today  = float(status.get("energyDailyUsage") or status.get("energyTodayWh") or 0) / 1000
    kwh_period = float(status.get("energyMonthlyUsage") or status.get("energyMonthWh") or 0) / 1000

    # AC-specific extras
    mode = (
        op.get("airOperationMode")
        or op.get("washerOperationMode")
        or op.get("dryerOperationMode")
        or "—"
    )

    return {
        "device_id":  dev["deviceId"],
        "alias":      dev.get("alias", "Unknown"),
        "model":      dev.get("modelName", ""),
        "type":       friendly_type,
        "on":         is_on,
        "watts":      round(watts, 1),
        "kwh_today":  round(kwh_today, 3),
        "kwh_period": round(kwh_period, 2),
        "mode":       str(mode),
    }

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("Fetching device list from LG ThinQ…")
    device_list_resp = get("/devices")
    all_devices = device_list_resp.get("result", {}).get("item", [])
    print(f"  Total devices on account: {len(all_devices)}")

    # Filter to high-draw types only
    targets = [
        d for d in all_devices
        if (d.get("deviceType") or "").upper() in HIGH_DRAW_TYPES
    ]
    print(f"  High-draw appliances found: {len(targets)}")

    parsed_devices = []
    total_kwh_period = 0.0
    total_watts_now  = 0

    for dev in targets:
        did = dev["deviceId"]
        print(f"  Polling {dev.get('alias', did)} ({dev.get('deviceType')})…")
        status = get_device_status(did)
        if status is None:
            continue
        parsed = parse_device(dev, status)
        parsed_devices.append(parsed)
        total_kwh_period += parsed["kwh_period"]
        if parsed["on"]:
            total_watts_now += parsed["watts"]

    period_info = billing_period_info()

    payload = {
        "polled_at":         datetime.now(timezone.utc).isoformat(),
        "billing_period":    period_info["billing_period"],
        "billing_start":     period_info["billing_start"],
        "days_elapsed":      period_info["days_elapsed"],
        "billing_days":      period_info["billing_days"],
        "kwh_accumulated":   round(total_kwh_period, 3),
        "watts_now":         round(total_watts_now, 1),
        "devices":           parsed_devices,
    }

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n✓ Wrote {OUTPUT_PATH}")
    print(f"  Period : {period_info['billing_period']} (day {period_info['days_elapsed']} of {period_info['billing_days']})")
    print(f"  Devices: {len(parsed_devices)} tracked")
    print(f"  Total kWh this period: {total_kwh_period:.3f}")
    print(f"  Current draw: {total_watts_now} W")


if __name__ == "__main__":
    main()
