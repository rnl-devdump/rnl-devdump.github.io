import json
import requests
from urllib3.exceptions import InsecureRequestWarning
import urllib3

urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = "https://cmbis.cenpelco.com/public/rates"

def get_rates(billperiod_id=5330, consumer_type_id=1, town_id=202):
    url = f"{BASE_URL}/getRates.jsp"
    params = {
        "billperiodId": billperiod_id,
        "consumertypeId": consumer_type_id,
        "townId": town_id,
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": f"{BASE_URL}/billrates.jsp",
    }
    
    r = requests.get(
        url,
        params=params,
        headers=headers,
        verify=False,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()

def normalize(api_data):
    data = api_data.get("data", {})
    billperiod = data.get("billperiod", {})
    
    # Extract string name for the billing month/period
    billing_month_str = billperiod.get("name", f"Period {billperiod.get('id', 'Unknown')}")

    result = {
        "billing_month": billing_month_str,
        "generation_breakdown": [],
        "unbundled_rates": [],
    }

    # ---------------------------
    # PARSE HIERARCHICAL RATES MATRIX
    # ---------------------------
    for sg in data.get("superGroups", []):
        sg_name = sg.get("name")

        for group in sg.get("groups", []):
            group_name = group.get("name")

            for rate in group.get("rates", []):
                amount_val = float(rate.get("amount", 0))
                
                result["unbundled_rates"].append({
                    "category": sg_name,
                    "group": group_name,
                    "name": rate.get("name", ""),
                    "type": rate.get("type", ""),
                    "rate_val": amount_val,
                    "raw_rate_str": f"₱{amount_val:.4f}"
                })

    # ---------------------------
    # PARSE GENERATION BREAKDOWN VIA EXACT API KEYS
    # ---------------------------
    breakdown_list = data.get("breakdown") or []
    for b in breakdown_list:
        try:
            pct_kwh = float(b.get("percent", 0))
            kwh_purchased = float(b.get("a", 0))
            pct_cost = float(b.get("costp", 100))
            basic_cost = float(b.get("b", 0))
            other_adjust = float(b.get("c", 0))
            discounts = float(b.get("d", 0))
            oga = float(b.get("cf", 0))
            
            # Use original mathematical rules formula layout from source billrates.js
            total_cost = basic_cost + other_adjust - discounts
            avg_cost = (total_cost / kwh_purchased) + oga if kwh_purchased > 0 else oga
        except (ValueError, TypeError):
            pct_kwh = kwh_purchased = pct_cost = basic_cost = other_adjust = discounts = total_cost = oga = avg_cost = 0

        result["generation_breakdown"].append({
            "source": b.get("source", "Unknown"),
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
        raw = get_rates()
        with open("raw_rates.json", "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=4)

        parsed = normalize(raw)
        with open("rates.json", "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=4)

        print("Done.")
        print("Saved: raw_rates.json + rates.json")
    except Exception as e:
        print(f"Error executing scraper pipeline setup: {e}")

if __name__ == "__main__":
    main()
