import json
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


def scrape_cenpelco_full():
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
        page.wait_for_selector("#select-bill-period", timeout=20000)

        # 1. Select Parameters
        options = page.locator("#select-bill-period option").all_inner_texts()
        latest_month = (
            options[1].strip() if len(options) > 1 else "Current Month"
        )

        page.select_option("#select-bill-period", index=1)
        page.wait_for_timeout(500)
        page.select_option("#select-consumer-type", value="1")  # Residential
        page.wait_for_timeout(500)
        page.select_option("#select-town", value="202")  # Lingayen

        print("Waiting for tables to fully render...")
        page.wait_for_timeout(4500)

        html_content = page.content()
        browser.close()

    soup = BeautifulSoup(html_content, "html.parser")

    # --- TABLE 1: Parse Generation Source Matrix ---
    generation_sources = []
    gen_table = soup.find("table", id="breakdown-table")
    if gen_table:
        for row in gen_table.find_all("tr")[2:]:  # Skip headers
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) >= 10:
                generation_sources.append(
                    {
                        "source": cells[0],
                        "pct_kwh": cells[1],
                        "kwh_purchased": cells[2],
                        "pct_cost": cells[3],
                        "basic_cost": cells[4],
                        "other_adjust": cells[5],
                        "discounts": cells[6],
                        "total_cost": cells[7],
                        "oga": cells[8],
                        "avg_cost": cells[9],
                    }
                )

    # --- TABLE 2: Parse Comprehensive Component Rates ---
    component_rates = []
    result_table = soup.find("table", id="result-table")
    if result_table:
        for row in result_table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) == 4 and cells[0] != "Rates":  # Filter header
                component_rates.append(
                    {
                        "category": cells[0],
                        "name": cells[1],
                        "type": cells[2],
                        "rate_val": float(re.sub(r"[^\d\.]", "", cells[3]))
                        if re.search(r"\d", cells[3])
                        else 0.0,
                        "raw_rate_str": cells[3],
                    }
                )

    # Master Structure Payload Output
    master_data = {
        "billing_month": latest_month,
        "town": "Lingayen",
        "generation_breakdown": generation_sources,
        "unbundled_rates": component_rates,
    }

    with open("rates.json", "w") as f:
        json.dump(master_data, f, indent=4)

    print(f"Scraped structural values successfully for {latest_month}!")


if __name__ == "__main__":
    scrape_cenpelco_full()
