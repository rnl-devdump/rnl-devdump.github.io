let localRates = null;

async function fetchCenpelcoRates() {
    try {
        const response = await fetch('./rates.json');
        localRates = await response.json();

        // Populate Table UI parameters
        document.getElementById('txt-month').innerText = localRates.billing_month;
        document.getElementById('td-month').innerText = localRates.billing_month;
        document.getElementById('td-rate').innerText = `₱${localRates.residential.effective_kwh_rate.toFixed(4)} / kWh`;
        document.getElementById('td-fixed').innerText = `₱${localRates.residential.fixed_meter_charge.toFixed(2)} / Mo`;
    } catch (e) {
        document.getElementById('txt-month').innerText = "Offline Error";
        console.error("Failed parsing rates json database.", e);
    }
}

function calculateCenpelcoBill() {
    if(!localRates) return alert("System data not loaded yet.");
    
    const kwhValue = parseFloat(document.getElementById('num-kwh').value);
    if (isNaN(kwhValue) || kwhValue < 0) return alert("Please supply a valid numeric consumption count.");

    const resultBox = document.getElementById('bill-result');
    const totalBox = document.getElementById('txt-total');
    const breakdownBox = document.getElementById('txt-breakdown');

    const rate = localRates.residential.effective_kwh_rate;
    const fixed = localRates.residential.fixed_meter_charge;

    // Direct standard calculation for every single kWh
    const genCost = kwhValue * rate;
    const finalCost = genCost + fixed;
    
    const descriptionText = `Usage Charge: ₱${genCost.toFixed(2)} (${kwhValue} kWh × ₱${rate.toFixed(4)}) + Fixed Monthly Meter Charge: ₱${fixed.toFixed(2)}.`;

    totalBox.innerText = `₱${finalCost.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    breakdownBox.innerText = descriptionText;
    resultBox.style.display = 'block';
}

// Initialize on page load
fetchCenpelcoRates();
