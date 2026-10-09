import json
import re
import sys
import ssl
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_URL = "https://cmbis.cenpelco.com/public/rates"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

def get_ssl_context():
    """Create an SSL context that gracefully tolerates self-signed or legacy certificates."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def fetch_url(url, referer=None, as_json=False):
    """Fetch content using standard library urllib."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/javascript, */*; q=0.01" if as_json else "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    if as_json:
        headers["X-Requested-With"] = "XMLHttpRequest"

    req = urllib.request.Request(url, headers=headers)
    ctx = get_ssl_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
        if as_json:
            return json.loads(raw)
        return raw

def scrape_metadata():
    """
    Scrapes https://cmbis.cenpelco.com/public/rates/billrates.jsp
    Dynamically extracts available bill periods, consumer types, and towns.
    """
    page_url = f"{BASE_URL}/billrates.jsp"
    print(f"Fetching metadata from {page_url}...")
    html = fetch_url(page_url)

    # 1. Parse bill periods
    bill_periods = []
    bp_match = re.search(r'<select\s+id=["\']select-bill-period["\']>(.*?)</select>', html, re.DOTALL | re.IGNORECASE)
    if bp_match:
        options = re.findall(r'<option\s+value=["\'](\d+)["\'][^>]*>(.*?)</option>', bp_match.group(1), re.DOTALL | re.IGNORECASE)
        for opt_id, opt_text in options:
            clean_name = re.sub(r'\s+', ' ', opt_text).strip()
            bill_periods.append({
                "id": int(opt_id),
                "name": clean_name
            })

    # 2. Parse consumer types
    consumer_types = []
    ct_match = re.search(r'<select\s+id=["\']select-consumer-type["\']>(.*?)</select>', html, re.DOTALL | re.IGNORECASE)
    if ct_match:
        options = re.findall(r'<option\s+value=["\'](\d+)["\'][^>]*>(.*?)</option>', ct_match.group(1), re.DOTALL | re.IGNORECASE)
        for opt_id, opt_text in options:
            consumer_types.append({
                "id": int(opt_id),
                "name": re.sub(r'\s+', ' ', opt_text).strip()
            })

    # 3. Parse towns
    towns = []
    town_match = re.search(r'<select\s+id=["\']select-town["\']>(.*?)</select>', html, re.DOTALL | re.IGNORECASE)
    if town_match:
        options = re.findall(r'<option\s+value=["\'](\d+)["\'][^>]*>(.*?)</option>', town_match.group(1), re.DOTALL | re.IGNORECASE)
        for opt_id, opt_text in options:
            towns.append({
                "id": int(opt_id),
                "name": re.sub(r'\s+', ' ', opt_text).strip()
            })

    print(f"Discovered: {len(bill_periods)} bill periods, {len(consumer_types)} consumer types, {len(towns)} towns.")
    return {
        "bill_periods": bill_periods,
        "consumer_types": consumer_types,
        "towns": towns
    }

def fetch_rates_for_period(billperiod_id, consumer_type_id=1, town_id=202):
    """
    Calls getRates.jsp with dynamic parameters.
    Default: Residential (1), Lingayen (202)
    """
    url = f"{BASE_URL}/getRates.jsp?billperiodId={billperiod_id}&consumertypeId={consumer_type_id}&townId={town_id}"
    referer = f"{BASE_URL}/billrates.jsp"
    print(f"Fetching rates from API: {url}...")
    return fetch_url(url, referer=referer, as_json=True)

def normalize_rates(api_data, metadata=None, active_period=None):
    """Normalizes raw CENPELCO JSON into a clean structure for the web calculator."""
    data = api_data.get("data", {})
    billperiod = data.get("billperiod") or {}

    start_date = billperiod.get("startDate", "")
    end_date = billperiod.get("endDate", "")
    if start_date and end_date:
        billing_month_str = f"{start_date} - {end_date}"
    else:
        billing_month_str = active_period.get("name") if active_period else "Current Billing Cycle"

    result = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "billing_month": billing_month_str,
        "billperiod_id": billperiod.get("id"),
        "status": billperiod.get("status"),
        "source": f"{BASE_URL}/billrates.jsp",
        "available_periods": metadata.get("bill_periods", []) if metadata else [],
        "generation_breakdown": [],
        "unbundled_rates": []
    }

    # Parse structural superGroups
    for sg in data.get("superGroups", []):
        sg_name = sg.get("name", "Other")
        for group in sg.get("groups", []):
            group_name = group.get("name", "General")
            for rate in group.get("rates", []):
                try:
                    amount_val = float(rate.get("amount", 0))
                except (ValueError, TypeError):
                    amount_val = 0.0

                is_meter = "meter" in rate.get("name", "").lower()
                raw_str = f"₱{amount_val:.2f}/mo" if is_meter else f"₱{amount_val:.4f}"

                result["unbundled_rates"].append({
                    "category": sg_name,
                    "group": group_name,
                    "name": rate.get("name", "Unnamed Component"),
                    "type": rate.get("type", "Rate x Consumption"),
                    "rate_val": amount_val,
                    "raw_rate_str": raw_str
                })

    # Parse generation source breakdown
    for b in data.get("breakdown", []):
        try:
            pct_kwh = float(b.get("percent", 0))
            kwh_purchased = float(b.get("a", 0))
            pct_cost = float(b.get("costp", 100))
            basic_cost = float(b.get("b", 0))
            other_adjust = float(b.get("c", 0))
            discounts = float(b.get("d", 0))
            oga = float(b.get("cf", 0))

            total_cost = basic_cost + other_adjust - discounts
            avg_cost = (total_cost / kwh_purchased) + oga if kwh_purchased > 0 else oga
        except (ValueError, TypeError):
            pct_kwh = kwh_purchased = pct_cost = basic_cost = other_adjust = discounts = total_cost = oga = avg_cost = 0

        result["generation_breakdown"].append({
            "source": b.get("source", "Unknown Supply Source"),
            "pct_kwh": f"{pct_kwh:.2f}%",
            "kwh_purchased": kwh_purchased,
            "pct_cost": f"{pct_cost:.2f}%",
            "basic_cost": basic_cost,
            "other_adjust": other_adjust,
            "discounts": discounts,
            "total_cost": total_cost,
            "oga": oga,
            "avg_cost": avg_cost
        })

    return result

def main():
    try:
        # Step 1: Scrape live metadata from CENPELCO billrates.jsp
        meta = scrape_metadata()
        periods = meta.get("bill_periods", [])
        if not periods:
            raise RuntimeError("No bill periods found on CENPELCO billrates.jsp")

        # Step 2: Dynamically select the latest period (first in the list)
        latest_period = periods[0]
        print(f"Latest detected billing period: {latest_period['name']} (ID: {latest_period['id']})")

        # Step 3: Fetch rates for the latest period (Residential, Lingayen)
        raw_data = fetch_rates_for_period(latest_period["id"], consumer_type_id=1, town_id=202)

        # Save raw snapshot
        with open("raw_rates.json", "w", encoding="utf-8") as f:
            json.dump(raw_data, f, indent=4)
        print("Wrote raw_rates.json")

        # Step 4: Normalize and write production rates.json
        normalized = normalize_rates(raw_data, metadata=meta, active_period=latest_period)
        with open("rates.json", "w", encoding="utf-8") as f:
            json.dump(normalized, f, indent=4)
        print(f"Successfully scraped & synced rates.json for: {normalized['billing_month']}")
        print(f"  Unbundled rate items: {len(normalized['unbundled_rates'])}")
        print(f"  Generation breakdown items: {len(normalized['generation_breakdown'])}")

    except Exception as e:
        print(f"ERROR running CENPELCO scraper: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
