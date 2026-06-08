// Storage cache mapped against the dynamic GitHub actions target file output
let activeRates = null;

async function bootstrapApplication() {
    try {
        const serverStream = await fetch('./rates.json'); // Keep the dot-slash (./)
        if (!serverStream.ok) throw new Error("Resource structural tracking failure.");
        
        activeRates = await serverStream.json();
        
        // Render UI parameter values directly from the scraped data
        document.getElementById('lbl-month').innerText = activeRates.billing_month;
        document.getElementById('lbl-town').innerText = `${activeRates.town} (Zone 13)`;
        document.getElementById('lbl-rate').innerText = `${activeRates.residential.effective_kwh_rate.toFixed(4)} ₱/kWh`;
        document.getElementById('lbl-fixed').innerText = `${activeRates.residential.fixed_meter_charge.toFixed(2)} ₱/Mo`;
        
    } catch (error) {
        console.error("Initialization Fault:", error);
        document.getElementById('lbl-month').innerText = "System Offline";
        document.getElementById('lbl-rate').innerText = "Error Loading Rates";
    }
}

function executeCalculation() {
    if (!activeRates) {
        alert("Pricing matrix data missing. Please refresh the page.");
        return;
    }

    const inputElement = document.getElementById('kwh-input');
    const consumptionKwh = parseFloat(inputElement.value);

    if (isNaN(consumptionKwh) || consumptionKwh < 0) {
        alert("Please specify a valid tracking threshold usage quantity.");
        return;
    }

    const outputContainer = document.getElementById('result-display');
    const costLabel = document.getElementById('total-cost');
    const metricLabel = document.getElementById('breakdown-desc');

    const baseRatePerKwh = activeRates.residential.effective_kwh_rate;
    const standardFixedCharge = activeRates.residential.fixed_meter_charge;
    const systemLifelineLimit = activeRates.residential.lifeline_threshold;

    let aggregateBillAmount = 0;
    let detailBreakdownString = "";

    // Lifeline Policy Evaluation
    if (consumptionKwh <= systemLifelineLimit && consumptionKwh > 0) {
        aggregateBillAmount = standardFixedCharge;
        detailBreakdownString = `Lifeline Subsidized Bracket Active (≤ ${systemLifelineLimit} kWh). Energy consumption charges are waived; billing reflects base system maintenance fee only.`;
    } else {
        // Standard Bill Computation
        const consumptionCost = consumptionKwh * baseRatePerKwh;
        aggregateBillAmount = consumptionCost + standardFixedCharge;
        
        detailBreakdownString = `Energy Charge: ₱${consumptionCost.toFixed(2)} (${consumptionKwh} kWh × ₱${baseRatePerKwh.toFixed(4)}) + System Metering Base: ₱${standardFixedCharge.toFixed(2)}`;
    }

    // Update UI components
    costLabel.innerText = `₱${aggregateBillAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    metricLabel.innerText = detailBreakdownString;
    outputContainer.style.display = "block";
}

// Global initialization call execution
bootstrapApplication();
