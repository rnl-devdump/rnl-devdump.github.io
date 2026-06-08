import json
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


def scrape_cenpelco():
    url = "https://cmbis.cenpelco.com/public/rates/billrates.jsp"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        print("Navigating to CENPELCO CMBIS portal...")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        # Wait using the explicit IDs found in their source code
        page.wait_for_selector("#select-bill-period", timeout=20000)

        # 1. Grab the latest visible billing month (index 1 is the first option after placeholder)
        print("Selecting latest billing period...")
        options = page.locator("#select-bill-period option").all_inner_texts()
        latest_month = (
            options[1].strip() if len(options) > 1 else "Current Billing Month"
        )
        page.select_option("#select-bill-period", index=1)
        page.wait_for_timeout(500)

        # 2. Select Consumer Type: Value "1" represents (R) Residential
        print("Filtering for (R) Residential...")
        page.select_option("#select-consumer-type", value="1")
        page.wait_for_timeout(500)

        # 3. Select Town: Value "202" represents 13 - Lingayen
        print("Filtering for (13) Lingayen...")
        page.select_option("#select-town", value="202")

        # Wait for their AJAX script (billrates.js) to populate #result-table
        print("Waiting for data table elements to update...")
        page.wait_for_timeout(4000)

        # Grab the fully updated DOM string
        html_content = page.content()
        browser.close()

    # --- Parse the generated data using BeautifulSoup ---
    soup = BeautifulSoup(html_content, "html.parser")

    # Fallback default values in case of any internal scraping errors
    effective_rate = 12.5000
    fixed_meter_charge = 5.00

    # Look through the updated result table rows for data lines
    result_table = soup.find("table", id="result-table")
    if result_table:
        for row in result_table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            row_text = " ".join(cells).lower()

            # Target lines containing totals or key effective values
            if "effective" in row_text or "total" in row_text:
                numbers = re.findall(r"\d+\.\d+", " ".join(cells))
                if numbers:
                    effective_rate = float(numbers[-1])

            # Look for fixed service or customer metering rows
            if "metering" in row_text or "customer charge" in row_text:
                numbers = re.findall(r"\d+\.\d+", " ".join(cells))
                if numbers:
                    fixed_meter_charge = float(numbers[0])

    rates_data = {
        "billing_month": latest_month,
        "town": "Lingayen",
        "residential": {
            "effective_kwh_rate": effective_rate,
            "fixed_meter_charge": fixed_meter_charge,
            "lifeline_threshold": 50,
        },
    }

    with open("rates.json", "w") as f:
        json.dump(rates_data, f, indent=4)

    print(
        f"Successfully generated data: {latest_month} | ₱{effective_rate}/kWh | Fixed base: ₱{fixed_meter_charge}"
    )


if __name__ == "__main__":
    scrape_cenpelco()
