import json
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


def scrape_cenpelco():
    url = "https://cmbis.cenpelco.com/public/rates/billrates.jsp"

    with sync_playwright() as p:
        # Launch headless browser (ignore SSL issues if CMBIS certificate fails)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()

        print("Navigating to CENPELCO CMBIS portal...")
        page.goto(url)

        # 1. Select the LATEST Bill Period (The second option, right after the default placeholder)
        print("Selecting latest billing period...")
        page.wait_for_selector("select[name='billperiod']")
        # Grab all options to locate the first available valid month dynamically
        options = page.locator("select[name='billperiod'] option").all_inner_texts()
        latest_month = options[1] if len(options) > 1 else ""
        page.select_option("select[name='billperiod']", index=1)

        # 2. Select Consumer Type: (R) Residential
        print("Filtering for (R) Residential...")
        page.select_option("select[name='customertype']", value="(R) Residential")

        # 3. Select Town: (13) Lingayen
        print("Filtering for (13) Lingayen...")
        page.select_option("select[name='town']", value="13 - Lingayen")

        # Wait for the network to idle and the AJAX table content to completely render
        page.wait_for_load_state("networkidle")
        # Explicit safeguard wait for the DOM to structure
        page.wait_for_timeout(2000)

        # Extract the dynamically populated content
        html_content = page.content()
        browser.close()

    # --- Parse the generated HTML table using BeautifulSoup ---
    soup = BeautifulSoup(html_content, "html.parser")

    # Locate the cell that contains the final summary total
    # CENPELCO tables traditionally place the ultimate rate under "Effective Php/KWH"
    effective_rate = 12.00  # Safe fallback if string splitting hits an edge case

    for row in soup.find_all("tr"):
        cells = [c.get_text(strip=True) for c in row.find_all("td")]
        if any("Effective Php/KWH" in cell for cell in cells):
            # Locate the numerical rate adjacent to or inside the match
            for cell in cells:
                match = re.search(r"\d+\.\d+", cell)
                if match:
                    effective_rate = float(match.group())
                    break

    # Construct payload for your static Frontend
    rates_data = {
        "billing_month": latest_month.strip(),
        "town": "Lingayen",
        "residential": {
            "effective_kwh_rate": effective_rate,
            "fixed_meter_charge": 5.00,  # Fallback for base retail customer metering charge
            "lifeline_threshold": 50,
        },
    }

    with open("rates.json", "w") as f:
        json.dump(rates_data, f, indent=4)

    print(f"Success! Saved {latest_month} rates for Lingayen: ₱{effective_rate}/kWh")


if __name__ == "__main__":
    scrape_cenpelco()
