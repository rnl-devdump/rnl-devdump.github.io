#!/usr/bin/env python3
"""
fetch_thinq.py — LG ThinQ Connect API poller for CENPELCO Live Monitor
----------------------------------------------------------------------
Reads device states and energy data from the LG ThinQ Connect PAT API,
then writes docs/current/current.json consumed by the live-monitor frontend.

Required environment variables:
  THINQ_PAT           Personal Access Token from smartsolution.developer.lge.com
  THINQ_CLIENT_ID     A stable UUID4 you generate once (store as repo secret)

Optional:
  THINQ_COUNTRY       ISO country code (default: PH)
  THINQ_BASE_URL      API base URL (default: https://api-aic.lgthinq.com)
                      EIC region users: https://api-eic.lgthinq.com
                      US region users:  https://api-us.lgthinq.com
  BILLING_START_DAY   Day-of-month your CENPELCO bill starts (default: 26)
  OUTPUT_PATH         Where to write current.json (default: docs/current/current.json)
"""

import asyncio
import json
import os
import sys
import uuid
import traceback
from datetime import date, datetime, timezone, timedelta

import aiohttp

# ── Configuration ──────────────────────────────────────────────────────────────

PAT             = os.environ.get("THINQ_PAT", "")
CLIENT_ID       = os.environ.get("THINQ_CLIENT_ID", str(uuid.uuid4()))
COUNTRY         = os.environ.get("THINQ_COUNTRY", "PH")
BASE_URL        = os.environ.get("THINQ_BASE_URL", "https://api-aic.lgthinq.com")
BILLING_DAY     = int(os.environ.get("BILLING_START_DAY", "26"))
OUTPUT_PATH     = os.environ.get("OUTPUT_PATH", "docs/current/current.json")

# PH is UTC+8
TZ_PH = timezone(timedelta(hours=8))

# Device types the frontend knows about; others are skipped
DEVICE_TYPE_MAP = {
    "DEVICE_AIR_CONDITIONER":   "AC",
    "DEVICE_WASHER":            "WASHER",
    "DEVICE_DRYER":             "DRYER",
    "DEVICE_REFRIGERATOR":      "FRIDGE",
    "DEVICE_WASHTOWER_WASHER":  "WASHER",
    "DEVICE_WASHTOWER_DRYER":   "DRYER",
    "DEVICE_WASH_COMBO":        "WASHER",
}

# Conservative rated wattages used as fallback when the API
# doesn't report instantaneous power (most common situation)
RATED_WATTS = {
    "AC":     1500,
    "WASHER":  500,
    "DRYER":  1200,
    "FRIDGE":  150,
}


# ── API helpers ────────────────────────────────────────────────────────────────

def _headers() -> dict:
    """Build a fresh request header set (message-id must be unique per call)."""
    msg_id = uuid.uuid4().hex[:22]          # 22-char hex, matches LG's expected format
    return {
        "Authorization":  f"Bearer {PAT}",
        "x-client-id":    CLIENT_ID,
        "x-message-id":   msg_id,
        "x-country-code": COUNTRY,
        "Content-Type":   "application/json",
        "Accept":         "application/json",
    }


async def api_get(session: aiohttp.ClientSession, path: str) -> dict | list:
    """
    GET {BASE_URL}{path} and return the inner `response` field.
    Raises on non-2xx or on LG error codes.
    """
    url = f"{BASE_URL}{path}"
    async with session.get(url, headers=_headers(), timeout=aiohttp.ClientTimeout(total=20)) as resp:
        body = await resp.json(content_type=None)

        # LG wraps everything in { messageId, timestamp, response }
        # Some error payloads use { resultCode, resultMsg } instead
        if "resultCode" in body and body["resultCode"] != "0000":
            raise RuntimeError(
                f"LG API error {body.get('resultCode')}: {body.get('resultMsg')} — {path}"
            )

        resp.raise_for_status()
        return body.get("response", body)


# ── Billing-period maths ───────────────────────────────────────────────────────

def billing_period_info() -> tuple[date, date, int, int, str]:
    """
    Return (period_start, period_end, days_elapsed, billing_days, label).
    CENPELCO billing typically runs from the 26th of one month to the 25th
    of the next.  Adjust BILLING_START_DAY to match your actual meter date.
    """
    today = datetime.now(TZ_PH).date()

    # Determine if we're past the billing-start day this month
    if today.day >= BILLING_DAY:
        period_start = today.replace(day=BILLING_DAY)
    else:
        # Roll back to previous month
        first_of_this = today.replace(day=1)
        last_month_last = first_of_this - timedelta(days=1)
        period_start = last_month_last.replace(day=BILLING_DAY)

    # Next billing start = period end
    if period_start.month == 12:
        period_end = date(period_start.year + 1, 1, BILLING_DAY)
    else:
        period_end = date(period_start.year, period_start.month + 1, BILLING_DAY)

    days_elapsed  = max((today - period_start).days, 0)
    billing_days  = (period_end - period_start).days
    label         = f"{period_start.strftime('%b %d')}–{period_end.strftime('%b %d, %Y')}"

    return period_start, period_end, days_elapsed, billing_days, label


# ── Device-state parsing ───────────────────────────────────────────────────────
#
# The LG ThinQ Connect API returns device state as a flat dict of
# "resource" objects, e.g.:
#   {
#     "operation":       { "airConOperationMode": "POWER_ON" },
#     "airConJobMode":   { "currentJobMode": "COOL" },
#     "powerConsumption":{ "instantPower": 1340 },
#     "temperature":     { "currentTemperatureC": 25.0 },
#     "runState":        { "currentState": "RUNNING" }
#   }

_OFF_STATES = {"POWER_OFF", "END", "SLEEP", "PAUSE", "INITIAL", "STANDBY"}

def _is_on(device_type: str, state: dict) -> bool:
    dtype = DEVICE_TYPE_MAP.get(device_type, "")
    if dtype == "AC":
        mode = state.get("operation", {}).get("airConOperationMode", "POWER_OFF")
        return mode not in _OFF_STATES
    if dtype in ("WASHER", "DRYER"):
        st = state.get("runState", {}).get("currentState", "POWER_OFF")
        return st not in _OFF_STATES
    if dtype == "FRIDGE":
        return True   # refrigerators are always on
    return False


def _watts(device_type: str, state: dict, on: bool) -> int:
    if not on:
        return 0

    # ── Attempt 1: powerConsumption resource (AC with energy-monitoring support)
    pc = state.get("powerConsumption", {})
    for key in ("instantPower", "currentPower", "activePower"):
        if key in pc:
            try:
                return int(round(float(pc[key])))
            except (ValueError, TypeError):
                pass

    # ── Attempt 2: energy resource (some washer/dryer models)
    en = state.get("energy", {})
    for key in ("instantPower", "currentPower"):
        if key in en:
            try:
                return int(round(float(en[key])))
            except (ValueError, TypeError):
                pass

    # ── Fallback: rated wattage (will look like a constant bar in the UI)
    dtype = DEVICE_TYPE_MAP.get(device_type, "")
    return RATED_WATTS.get(dtype, 0)


def _mode(device_type: str, state: dict) -> str:
    dtype = DEVICE_TYPE_MAP.get(device_type, "")
    if dtype == "AC":
        return state.get("airConJobMode", {}).get("currentJobMode", "—")
    if dtype in ("WASHER", "DRYER"):
        return state.get("runState", {}).get("currentState", "—")
    if dtype == "FRIDGE":
        return "COOLING"
    return "—"


# ── kWh calculation ────────────────────────────────────────────────────────────
#
# The Energy API (GET /devices/{id}/energy) returns:
#   {
#     "energyThisMonth":  182500,   ← Wh consumed in the *calendar* month so far
#     "energyLastMonth":  210000,   ← Wh consumed in the previous calendar month
#     "energyYesterday":    5200    ← Wh consumed yesterday
#   }
#
# CENPELCO billing != calendar month, so we stitch the two months together.

def _kwh_for_billing_period(
    energy: dict,
    period_start: date,
    today: date,
) -> float:
    """
    Estimate kWh consumed since period_start using this-month and last-month totals.
    Returns 0.0 if no energy data is available.
    """
    wh_this_month   = float(energy.get("energyThisMonth",  0) or 0)
    wh_last_month   = float(energy.get("energyLastMonth",  0) or 0)

    # Days in the previous calendar month
    first_of_today_month = today.replace(day=1)
    last_month_last_day  = first_of_today_month - timedelta(days=1)
    days_in_last_cal     = last_month_last_day.day   # e.g. 31 for January

    if period_start.month == today.month and period_start.year == today.year:
        # Billing started this calendar month — only need this-month's data
        # Approximate: scale by (days elapsed since billing start) / (days in calendar month so far)
        days_since_cal_start = today.day - 1          # yesterday is last completed day
        days_since_billing   = (today - period_start).days
        if days_since_cal_start > 0:
            kwh = (wh_this_month / 1000) * (days_since_billing / days_since_cal_start)
        else:
            kwh = wh_this_month / 1000
    else:
        # Billing period spans two calendar months
        # Portion from last month: period_start → end of last month
        last_month_days_in_period = (first_of_today_month - period_start).days
        kwh_per_day_last          = (wh_last_month / 1000) / max(days_in_last_cal, 1)
        kwh_from_last_month       = kwh_per_day_last * last_month_days_in_period

        # Portion from this month: start of this month → today (use the month total directly)
        kwh_from_this_month = wh_this_month / 1000

        kwh = kwh_from_last_month + kwh_from_this_month

    return max(round(kwh, 3), 0.0)


# ── Main poller ────────────────────────────────────────────────────────────────

async def main() -> None:
    if not PAT:
        print("✗ THINQ_PAT is not set. Aborting.", file=sys.stderr)
        sys.exit(1)

    period_start, period_end, days_elapsed, billing_days, period_label = billing_period_info()
    today = datetime.now(TZ_PH).date()

    print(f"→ Polling LG ThinQ  [{COUNTRY}] {BASE_URL}")
    print(f"→ Billing period    {period_label}  (day {days_elapsed}/{billing_days})")

    async with aiohttp.ClientSession() as session:

        # ── 1. Device list ──────────────────────────────────────────────────
        raw_devices = await api_get(session, "/devices")
        if not isinstance(raw_devices, list):
            raw_devices = []

        print(f"→ Found {len(raw_devices)} device(s) registered to account")

        devices_out   = []
        total_kwh     = 0.0
        total_watts   = 0

        for d in raw_devices:
            device_id   = d.get("deviceId", "")
            info        = d.get("deviceInfo", {})
            device_type = info.get("deviceType", "")
            alias       = info.get("alias", "Unknown")
            model       = info.get("modelName", "—")

            if device_type not in DEVICE_TYPE_MAP:
                print(f"   skip  {alias} ({device_type}) — not in monitored types")
                continue

            short_type = DEVICE_TYPE_MAP[device_type]
            print(f"   poll  {alias} [{short_type}] {device_id[:8]}…")

            # ── 2. Device state (real-time) ─────────────────────────────────
            state = {}
            try:
                state = await api_get(session, f"/devices/{device_id}/state")
            except Exception as e:
                print(f"         ⚠ state error: {e}")

            # ── 3. Energy data (daily/monthly aggregates) ───────────────────
            energy = {}
            try:
                energy = await api_get(session, f"/devices/{device_id}/energy")
            except Exception as e:
                print(f"         ⚠ energy error: {e}")

            on    = _is_on(device_type, state)
            watts = _watts(device_type, state, on)
            mode  = _mode(device_type, state)

            kwh_today  = round(float(energy.get("energyYesterday", 0) or 0) / 1000, 3)
            kwh_period = _kwh_for_billing_period(energy, period_start, today)

            total_kwh   += kwh_period
            total_watts += watts

            devices_out.append({
                "deviceId":  device_id,
                "alias":     alias,
                "model":     model,
                "type":      short_type,
                "on":        on,
                "watts":     watts,
                "kwh_today": kwh_today,
                "kwh_period": kwh_period,
                "mode":      mode,
            })

            print(f"         {'ON ' if on else 'OFF'} | {watts}W | {kwh_period:.1f} kWh period | mode: {mode}")

    # ── 4. Write current.json ───────────────────────────────────────────────
    output = {
        "polled_at":       datetime.now(TZ_PH).isoformat(),
        "billing_period":  period_label,
        "days_elapsed":    days_elapsed,
        "billing_days":    billing_days,
        "kwh_accumulated": round(total_kwh, 2),
        "devices":         devices_out,
    }

    out_dir = os.path.dirname(OUTPUT_PATH)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Wrote {OUTPUT_PATH}")
    print(f"  {len(devices_out)} devices  |  {total_watts}W live  |  {total_kwh:.2f} kWh period")


if __name__ == "__main__":
    asyncio.run(main())
