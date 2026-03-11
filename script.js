document.addEventListener('DOMContentLoaded', () => {
try {
    // -------------------------------------------------------------
    // Element References
    // -------------------------------------------------------------
    // Inputs
    const baseFrontWeightInput = document.getElementById('baseFrontWeight');
    const baseRearWeightInput = document.getElementById('baseRearWeight');
    const frontGawrInput = document.getElementById('frontGawr');
    const rearGawrInput = document.getElementById('rearGawr');
    const gvwrInput = document.getElementById('gvwr');

    // Outputs
    const totalWeightDisplay = document.getElementById('totalWeightDisplay');
    const gvwrDisplay = document.getElementById('gvwrDisplay');
    const weightProgressBar = document.getElementById('weightProgressBar');
    const statusMessage = document.getElementById('statusMessage');
    
    const breakdownBase = document.getElementById('breakdownBase');
    const breakdownPassengers = document.getElementById('breakdownPassengers');
    const breakdownWater = document.getElementById('breakdownWater');
    const breakdownOptions = document.getElementById('breakdownOptions');

    // Axle Gauges
    const frontWeightRaw = document.getElementById('frontWeightRaw');
    const rearWeightRaw = document.getElementById('rearWeightRaw');
    const frontGawrDisplay = document.getElementById('frontGawrDisplay');
    const rearGawrDisplay = document.getElementById('rearGawrDisplay');
    const frontRemaining = document.getElementById('frontRemaining');
    const rearRemaining = document.getElementById('rearRemaining');
    const frontProgressBar = document.getElementById('frontProgressBar');
    const rearProgressBar = document.getElementById('rearProgressBar');
    
    // Parent elements for styling
    const currentWeightContainer = totalWeightDisplay.parentElement;

    // -------------------------------------------------------------
    // Logic
    // -------------------------------------------------------------

    // Safe parse helper
    const getVal = (el) => parseFloat(el.value) || 0;

    // Debounce to prevent Chrome crashes with excessive execution
    let calculateTimeout;
    const calculateWeight = () => {
        clearTimeout(calculateTimeout);
        calculateTimeout = setTimeout(() => {
            try {
                console.log("calculateWeight logic executing...");
        
        // 1. Base
        const baseFront = getVal(baseFrontWeightInput);
        const baseRear = getVal(baseRearWeightInput);
        const base = baseFront + baseRear;

        const frontGawr = getVal(frontGawrInput);
        const rearGawr = getVal(rearGawrInput);
        const gvwr = getVal(gvwrInput);
        // 2. Passengers
        const passCount = parseInt(document.querySelector('input[name="passengerCount"]:checked').value) || 0;
        const passengers = passCount * 55;
        
        let passFrontSub = 0;
        let passRearSub = 0;
        
        // Base is considered 6 passengers
        if (passCount === 4) {
            passFrontSub = 65;
            passRearSub = 45;
        } else if (passCount === 3) {
            passFrontSub = 35;
            passRearSub = 130;
        }
        
        // 4. Options
        let optionsTotal = 0;
        let optionsFront = 0;
        let optionsRear = 0;
        let waterTotal = 0;
        let additionalBaseWeight = 0; // standard equipment items

        document.querySelectorAll('.option-checkbox:checked').forEach(cb => {
            const isFreshWaterTank = cb.closest('.option-item').innerText.includes('清水タンク');
            const isWater = cb.id === 'opt_WaterTank';
            
            if (isFreshWaterTank) {
                // Treated as standard equipment
                additionalBaseWeight += parseFloat(cb.dataset.total) || 0;
            } else if (isWater) {
                // Treated as water category for calculations only
                waterTotal += parseFloat(cb.dataset.total) || 0;
            } else {
                // Regular option
                optionsTotal += parseFloat(cb.dataset.total) || 0;
            }

            optionsFront += parseFloat(cb.dataset.front) || 0;
            optionsRear += parseFloat(cb.dataset.rear) || 0;
        });
        
        let displayWaterTotal = waterTotal;

        const allOptionsCombinedTotal = optionsTotal + waterTotal + additionalBaseWeight;

        // Grand Total
        const total = base + passengers + allOptionsCombinedTotal;

        // The base breakdown display value:
        const displayBase = base + additionalBaseWeight;

        // Base passenger distribution (assuming 6 pax total: 2 front, 4 rear)
        // 55kg * 2 = 110kg front, 55kg * 4 = 220kg rear.
        // Base weights from input already include these or are empty, but logic suggests:
        const basePassFront = 110; 
        const basePassRear = 220;
        
        const actualPassFront = basePassFront - passFrontSub;
        const actualPassRear = basePassRear - passRearSub;
        
        const totalRear = baseRear + actualPassRear + optionsRear;
        const totalFront = baseFront + actualPassFront + optionsFront;
        updateUI(displayBase, passengers, displayWaterTotal, optionsTotal, total, gvwr, totalFront, totalRear, frontGawr, rearGawr);
        console.log("Weight calculation updated successfully. Total:", total);
            } catch (err) {
                alert("Error in calculateWeight: " + err.message);
            }
        }, 100); // 100ms debounce
    };

    const updateUI = (displayBase, passengers, waterTotal, optionsTotal, total, gvwr, totalFront, totalRear, frontGawr, rearGawr) => {
        // Update main text displays
        totalWeightDisplay.innerText = Math.round(total);
        gvwrDisplay.innerText = Math.round(gvwr);
        
        breakdownBase.innerText = `${Math.round(displayBase)} kg`;
        breakdownPassengers.innerText = `${Math.round(passengers)} kg`;
        if (breakdownWater) breakdownWater.innerText = `${Math.round(waterTotal)} kg`;
        breakdownOptions.innerText = `${Math.round(optionsTotal)} kg`;

        // Update Axle Gauges
        frontWeightRaw.innerText = Math.round(totalFront);
        rearWeightRaw.innerText = Math.round(totalRear);
        frontGawrDisplay.innerText = Math.round(frontGawr);
        rearGawrDisplay.innerText = Math.round(rearGawr);

        // Update Progress Bars
        const getPct = (val, max) => Math.min(Math.max((max > 0 ? (val / max) * 100 : 100), 0), 100);
        
        const totalPct = getPct(total, gvwr);
        weightProgressBar.style.width = `${totalPct}%`;

        const frontPct = getPct(totalFront, frontGawr);
        frontProgressBar.style.width = `${frontPct}%`;

        const rearPct = getPct(totalRear, rearGawr);
        rearProgressBar.style.width = `${rearPct}%`;

        // Style updates function
        const updateAxleStatus = (current, limit, elRemaining, elBar) => {
            const rem = limit - current;
            elBar.className = 'progress-bar'; // reset
            elRemaining.className = 'remaining';
            
            if (rem < 0) {
                elBar.classList.add('danger');
                elRemaining.classList.add('danger');
                elRemaining.innerText = `⚠️ ${Math.abs(Math.round(rem))}kg オーバー`;
            } else if (rem <= 50) {
                elBar.classList.add('warning');
                elRemaining.classList.add('warning');
                elRemaining.innerText = `残り ${Math.round(rem)}kg`;
            } else {
                elRemaining.innerText = `残り ${Math.round(rem)}kg`;
            }
        };

        updateAxleStatus(totalFront, frontGawr, frontRemaining, frontProgressBar);
        updateAxleStatus(totalRear, rearGawr, rearRemaining, rearProgressBar);

        // Status Logic
        const remaining = gvwr - total;
        
        // Reset classes
        currentWeightContainer.className = 'current-weight';
        weightProgressBar.className = 'progress-bar';
        statusMessage.className = 'status-message';
        
        if (remaining < 0) {
            // Overloaded
            currentWeightContainer.classList.add('danger');
            weightProgressBar.classList.add('danger');
            statusMessage.classList.add('danger');
            statusMessage.innerText = `⚠️ 重量超過です！許容総重量（GVWR）を ${Math.abs(Math.round(remaining))}kg 超えています。`;
        } else if (remaining <= 50) {
            // Less than or equal to 50kg remaining -> Warning
            currentWeightContainer.classList.add('warning');
            weightProgressBar.classList.add('warning');
            statusMessage.classList.add('warning');
            statusMessage.innerText = `⚠️ 警告！残り ${Math.round(remaining)}kg です。リミットに非常に近付いています。`;
        } else {
            // Safe
            statusMessage.innerText = `安全圏です！あと ${Math.round(remaining)}kg の積載余裕があります。`;
        }
    };

    // -------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------
    
    // Exclusivity Rules
    const opt1404 = document.getElementById('opt_O1404');
    const opt3012 = document.getElementById('opt_O3012'); // Water Heater
    const opt4600 = document.getElementById('opt_O4600');
    const opt4601 = document.getElementById('opt_O4601');
    const opt4800 = document.getElementById('opt_O4800');
    const opt4801 = document.getElementById('opt_O4801');
    const optWaterTank = document.getElementById('opt_WaterTank');

    const updateExclusivity = () => {
        const disableOpt = (opt) => {
            if (!opt || opt.disabled) return; // Skip if already disabled
            opt.disabled = true;
            opt.parentElement.classList.add('disabled');
        };

        const enableOpt = (opt) => {
            if (!opt || !opt.disabled) return; // Skip if already enabled
            opt.disabled = false;
            opt.parentElement.classList.remove('disabled');
        };

        // Solar & Window (O4600 vs O4601/O1404)
        if (opt4600 && opt4601 && opt1404) {
            if (opt4600.checked) {
                disableOpt(opt4601);
                disableOpt(opt1404);
            } else {
                if (opt4601.checked || opt1404.checked) {
                    disableOpt(opt4600);
                } else {
                    enableOpt(opt4600);
                    enableOpt(opt4601);
                    enableOpt(opt1404);
                }
            }
        }

        // Battery (O4800 vs O4801)
        if (opt4800 && opt4801) {
            if (opt4800.checked) {
                disableOpt(opt4801);
            } else if (opt4801.checked) {
                disableOpt(opt4800);
            } else {
                enableOpt(opt4800);
                enableOpt(opt4801);
            }
        }

        // Water Heater (O3012) requires Water Tank
        if (opt3012 && optWaterTank) {
            // Reset both to enabled first
            enableOpt(opt3012);
            enableOpt(optWaterTank);
            
            if (opt3012.checked) {
                // If water heater is checked, water tank MUST be checked AND disabled so it can't be unchecked
                optWaterTank.checked = true;
                disableOpt(optWaterTank);
            } else if (!optWaterTank.checked) {
                // If water tank is NOT checked, water heater MUST NOT be checked AND disabled
                opt3012.checked = false;
                disableOpt(opt3012);
            }
        }

        // --------------------------------------------------------
        // Style Overrides (Run last to enforce locks)
        // --------------------------------------------------------
        const style = document.querySelector('input[name="camper_style"]:checked')?.value || 'custom';
        const passengerTabs = document.getElementById('passengerSelector');

        if (passengerTabs) {
            if (style === 'custom') {
                passengerTabs.classList.remove('locked');
            } else {
                passengerTabs.classList.add('locked');
            }
        }

        if (style === 'family') {
            if (optWaterTank) {
                optWaterTank.checked = false;
                disableOpt(optWaterTank);
            }
            if (opt3012) {
                opt3012.checked = false;
                disableOpt(opt3012);
            }
            if (opt4801) {
                opt4801.checked = false;
                disableOpt(opt4801);
            }
        } else if (style === 'wmax') {
            if (opt4801) {
                opt4801.checked = false;
                disableOpt(opt4801);
            }
        } else if (style === 'emax') {
            if (optWaterTank) {
                optWaterTank.checked = false;
                disableOpt(optWaterTank);
            }
            if (opt3012) {
                opt3012.checked = false;
                disableOpt(opt3012);
            }
        }
    };

    // Style Radio Listeners
    const styleRadios = document.querySelectorAll('input[name="camper_style"]');
    const applyPassengerStyle = (style) => {
        const p6 = document.getElementById('p6');
        const p4 = document.getElementById('p4');
        const p3 = document.getElementById('p3');
        
        if (style === 'family' && p6) p6.checked = true;
        if ((style === 'emax' || style === 'wmax') && p4) p4.checked = true;
        if (style === 'premium' && p3) p3.checked = true;

        // Default settings for W-max
        if (style === 'wmax') {
            if (optWaterTank) optWaterTank.checked = true;
            if (opt3012) opt3012.checked = true;
        }
    };

    styleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyPassengerStyle(e.target.value);
            updateExclusivity();
            calculateWeight();
        });
    });

    if (opt4600 && opt4601 && opt1404) {
        opt4600.addEventListener('change', updateExclusivity);
        opt4601.addEventListener('change', updateExclusivity);
        opt1404.addEventListener('change', updateExclusivity);
    }
    
    if (opt4800 && opt4801) {
        opt4800.addEventListener('change', updateExclusivity);
        opt4801.addEventListener('change', updateExclusivity);
    }

    if (optWaterTank) {
        optWaterTank.addEventListener('change', () => {
            updateExclusivity();
            calculateWeight();
        });
    }

    // Also run for Water Heater changes if user tries to check it
    if (opt3012) {
        opt3012.addEventListener('change', () => {
            updateExclusivity();
            calculateWeight();
        });
    }

    // Clear All Options Button
    const clearOptionsBtn = document.getElementById('clearOptionsBtn');
    if (clearOptionsBtn) {
        clearOptionsBtn.addEventListener('click', () => {
            // Find all option checkboxes but exclude water tanks if they aren't part of the "Options" grid
            // In this case, we only want to clear the main Option card checkboxes
            const optionCard = clearOptionsBtn.closest('.card');
            const checkboxesToClear = optionCard.querySelectorAll('.option-checkbox');
            
            checkboxesToClear.forEach(cb => {
                cb.checked = false;
            });
            // Also reset to defaults for the exclusivity check to re-enable everything
            updateExclusivity();
            calculateWeight();
        });
    }

    // Run once on load to establish initial state
    updateExclusivity();

    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateWeight);
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.addEventListener('change', calculateWeight);
        }
    });

    // Initial calculation
    calculateWeight();
} catch (e) {
    alert("JS Error: " + e.message + "\n\n" + e.stack);
    console.error(e);
}
});
