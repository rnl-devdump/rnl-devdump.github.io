let dataset = null;

async function runLoader() {
    try {
        const fetchStream = await fetch('./rates.json');
        dataset = await fetchStream.json();

        document.getElementById('label-month').innerText = dataset.billing_month;

        // Populate Table 1: Generation Charges Breakdown
        const genBody = document.getElementById('body-generation-table');
        if (dataset.generation_breakdown && dataset.generation_breakdown.length > 0) {
            genBody.innerHTML = dataset.generation_breakdown.map(row => `
                <tr>
                    <td><strong>${row.source}</strong></td>
                    <td>${row.pct_kwh}</td>
                    <td>${row.kwh_purchased}</td>
                    <td>${row.pct_cost}</td>
                    <td>${row.basic_cost}</td>
                    <td>${row.other_adjust}</td>
                    <td>${row.discounts}</td>
                    <td>${row.total_cost}</td>
                    <td>${row.oga}</td>
                    <td>${row.avg_cost}</td>
                </tr>
            `).join('');
        }

        // Populate Table 2: Complete Rates Reference Matrix
        const ratesBody = document.getElementById('body-rates-table');
        if (dataset.unbundled_rates && dataset.unbundled_rates.length > 0) {
            ratesBody.innerHTML = dataset.unbundled_rates.map(r => {
                let ruleStr = r.type.toLowerCase().includes('kw') || r.type.toLowerCase().includes('kwh')
                    ? "Rate × Consumption Usage" 
                    : "Constant Flat Charge";
                return `
                    <tr>
                        <td>${r.category}</td>
                        <td><strong>${r.name}</strong></td>
                        <td>${r.type}</td>
                        <td>${r.raw_rate_str}</td>
                        <td><span style="color:#7f8c8d; font-size:0.9em;">${ruleStr}</span></td>
                    </tr>
                `;
            }).join('');
        }

    } catch (err) {
        console.error("Data initial execution mapping layout error:", err);
        document.getElementById('body-rates-table').innerHTML = `<tr><td colspan="5" class="no-data" style="color:red;">Error loading file profiles. Run your GitHub Action pipeline.</td></tr>`;
    }
}

function processUnbundledBill() {
    if (!dataset) return alert("Tariff system baseline profile data is absent.");
    
    const kwhValue = parseFloat(document.getElementById('input-kwh').value);
    if (isNaN(kwhValue) || kwhValue < 0) return alert("Please supply a valid usage value.");

    let cumulativeTotal = 0;
    let ledgerHTML = `<table class="master-table"><thead><tr><th>Component</th><th>Rate Item</th><th>Cost Charge Breakdown Calculation</th><th class="text-right">Subtotal (Php)</th></tr></thead><tbody>`;

    dataset.unbundled_rates.forEach(item => {
        let costItem = 0;
        let breakdownDesc = "";

        // Check if item calculation behaves as a volumetric charge or fixed element flat cost
        if (item.type.toLowerCase().includes('kw') || item.type.toLowerCase().includes('kwh')) {
            costItem = kwhValue * item.rate_val;
            breakdownDesc = `${kwhValue} kWh × ₱${item.rate_val.toFixed(4)}`;
        } else {
            costItem = item.rate_val;
            breakdownDesc = "Flat Cost Fixed Element Charge";
        }

        cumulativeTotal += costItem;

        if (costItem > 0 || item.rate_val !== 0) {
            ledgerHTML += `
                <tr>
                    <td>${item.category}</td>
                    <td>${item.name}</td>
                    <td><small style="color:#555;">${breakdownDesc}</small></td>
                    <td class="text-right">₱${costItem.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    ledgerHTML += `</tbody></table>`;

    document.getElementById('label-total').innerText = `Estimated Statement: ₱${cumulativeTotal.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('billing-statement-ledger').innerHTML = ledgerHTML;
    document.getElementById('panel-result').style.display = 'block';
}

runLoader();
