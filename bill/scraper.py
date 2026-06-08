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

    result = {
        "bill_period": {
            "id": billperiod.get("id"),
            "start_date": billperiod.get("startDate"),
            "end_date": billperiod.get("endDate"),
            "status": billperiod.get("status"),
        },
        "generation_breakdown": [],
        "unbundled_rates": [],
    }

    # ---------------------------
    # FLATTEN SUPER GROUPS
    # ---------------------------
    for sg in data.get("superGroups", []):
        sg_name = sg.get("name")

        for group in sg.get("groups", []):
            group_name = group.get("name")

            for rate in group.get("rates", []):
                result["unbundled_rates"].append({
                    "super_group": sg_name,
                    "group": group_name,
                    "name": rate.get("name"),
                    "amount": float(rate.get("amount", 0)),
                    "type": rate.get("type"),
                    "tax_type": rate.get("taxTypeName"),
                })

    # ---------------------------
    # BREAKDOWN (empty in your sample but supported)
    # ---------------------------
    for b in data.get("breakdown", []):
        result["generation_breakdown"].append(b)

    return result


def main():
    raw = get_rates()

    with open("raw_rates.json", "w", encoding="utf-8") as f:
        json.dump(raw, f, indent=4)

    parsed = normalize(raw)

    with open("rates.json", "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=4)

    print("Done.")
    print("Saved: raw_rates.json + rates.json")


if __name__ == "__main__":
    main()
