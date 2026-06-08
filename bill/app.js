let dataset = null;

async function runLoader() {
    try {
        const fetchStream = await fetch('./rates.json');
        dataset = await fetchStream.json();

        // Target header baseline string parameters
        document.getElementById('label-month').innerText = dataset.billing_month || "Unknown Period";

        // Populate Table 1: Generation Charges Breakdown
        const genBody = document.getElementById('body-generation-table');
        if (dataset.generation_breakdown && dataset.generation_breakdown.length > 0) {
            genBody.innerHTML = dataset.generation_breakdown.map(row => `
                <tr>
                    <td><strong>${row.source}</strong></td>
                    <td>${row.pct_kwh}</td>
                    <td>${Number(row.kwh_purchased).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>${row.pct_cost}</td>
                    <td>₱${Number(row.basic_cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>₱${Number(row.other_adjust).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>₱${Number(row.discounts).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td><strong>₱${Number(row.total_cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td>₱${Number(row.oga).toFixed(4)}</td>
                    <td><strong>₱${Number(row.avg_cost).toFixed(4)}</strong></td>
                </tr>
            `).join('');
        } else {
            genBody.innerHTML = `<tr><td colspan="10" class="no-data">No generation breakdown items recorded for this cycle.</td></tr>`;
        }

        // Populate Table 2: Complete Rates Reference Matrix
        const ratesBody = document.getElementById('body-rates-table');
        if (dataset.unbundled_rates && dataset.unbundled_rates.length > 0) {
            ratesBody.innerHTML = dataset.unbundled_rates.map(r => {
                let typeCheck = r.type ? r.type.toLowerCase() : "";
                let ruleStr = typeCheck.includes('kw') || typeCheck.includes('kwh')
                    ? "Rate × Consumption Usage" 
                    : "Constant Flat Charge";
                return `
                    <tr>
                        <td><strong>${r.category}</strong> <span style="color:#7f8c8d; font-size:0.85em;">(${r.group})</span></td>
                        <td>${r.name}</td>
                        <td>${r.type}</td>
                        <td><strong>${r.raw_rate_str}</strong></td>
                        <td><span style="color:#7f8c8d; font-size:0.9em;">${ruleStr}</span></td>
                    </tr>
                `;
            }).join('');
        } else {
            ratesBody.innerHTML = `<tr><td colspan="5" class="no-data">No billing profile parameters found.</td></tr>`;
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
    let ledgerHTML = `<table class="master-table"><thead><tr><th>Component (Group)</th><th>Rate Item</th><th>Cost Charge Breakdown Calculation</th><th class="text-right">Subtotal (Php)</th></tr></thead><tbody>`;

    dataset.unbundled_rates.forEach(item => {
        let costItem = 0;
        let breakdownDesc = "";
        let typeCheck = item.type ? item.type.toLowerCase() : "";

        // Volumetric calculation verification
        if (typeCheck.includes('kw') || typeCheck.includes('kwh')) {
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
                    <td><strong>${item.category}</strong> <small style="color:#7f8c8d;">(${item.group})</small></td>
                    <td>${item.name}</td>
                    <td><small style="color:#555;">${breakdownDesc}</small></td>
                    <td class="text-right">₱${costItem.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
