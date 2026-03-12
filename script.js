/**
 * V-CAL: Camper Weight Calculator
 * Refactored by Antigravity (Advanced Frontend Engineering)
 * 
 * Objectives:
 * 1. Centralized DOM Management
 * 2. DRY Principles Application
 * 3. Modern ES6+ Syntax
 * 4. Zero Functional Change
 */

(() => {
    'use strict';

    // -------------------------------------------------------------
    // Constants & Configuration
    // -------------------------------------------------------------
    const CONFIG = {
        PASSENGER_WEIGHT: 55,
        THRESHOLD_WARNING: 50,
        BASE_PASSENGER_FRONT: 110,
        BASE_PASSENGER_REAR: 220,
        DEBOUNCE_MS: 100,
        FADE_LIMIT: 150,
        SCROLL_TRANSFORM_PX: 15
    };

    // -------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------
    const DOM = {
        // Inputs
        baseFrontWeight: document.getElementById('baseFrontWeight'),
        baseRearWeight: document.getElementById('baseRearWeight'),
        frontGawr: document.getElementById('frontGawr'),
        rearGawr: document.getElementById('rearGawr'),
        gvwr: document.getElementById('gvwr'),

        // Outputs (Main)
        totalWeightDisplay: document.getElementById('totalWeightDisplay'),
        gvwrDisplay: document.getElementById('gvwrDisplay'),
        weightProgressBar: document.getElementById('weightProgressBar'),
        remainingWeightValue: document.getElementById('remainingWeightValue'),
        remainingWeightLabel: document.getElementById('remainingWeightLabel'),
        remainingDisplay: document.getElementById('remainingDisplay'),
        currentWeightContainer: document.getElementById('totalWeightDisplay')?.parentElement,

        // Breakdown
        breakdownBase: document.getElementById('breakdownBase'),
        breakdownPassengers: document.getElementById('breakdownPassengers'),
        breakdownWater: document.getElementById('breakdownWater'),
        breakdownOptions: document.getElementById('breakdownOptions'),

        // Axle Gauges
        frontWeightRaw: document.getElementById('frontWeightRaw'),
        rearWeightRaw: document.getElementById('rearWeightRaw'),
        frontGawrDisplay: document.getElementById('frontGawrDisplay'),
        rearGawrDisplay: document.getElementById('rearGawrDisplay'),
        frontRemaining: document.getElementById('frontRemaining'),
        rearRemaining: document.getElementById('rearRemaining'),
        frontProgressBar: document.getElementById('frontProgressBar'),
        rearProgressBar: document.getElementById('rearProgressBar'),

        // Exclusivity Elements
        opt1404: document.getElementById('opt_O1404'),
        opt3012: document.getElementById('opt_O3012'), // Water Heater
        opt4600: document.getElementById('opt_O4600'),
        opt4601: document.getElementById('opt_O4601'),
        opt4800: document.getElementById('opt_O4800'),
        opt4801: document.getElementById('opt_O4801'),
        optWaterTank: document.getElementById('opt_WaterTank'),
        passengerSelector: document.getElementById('passengerSelector'),
        clearOptionsBtn: document.getElementById('clearOptionsBtn'),

        // Layout
        header: document.querySelector('header'),
        allInputs: () => document.querySelectorAll('input, select'),
        optionCheckboxes: () => document.querySelectorAll('.option-checkbox'),
        styleRadios: () => document.querySelectorAll('input[name="camper_style"]'),
        checkedPassengerCount: () => document.querySelector('input[name="passengerCount"]:checked'),
        checkedCamperStyle: () => document.querySelector('input[name="camper_style"]:checked'),
    };

    // -------------------------------------------------------------
    // Initialization Check
    // -------------------------------------------------------------
    if (!DOM.gvwr) {
        console.error('Critical DOM elements missing. V-CAL initialization aborted.');
        return;
    }

    // -------------------------------------------------------------
    // Helper Utilities
    // -------------------------------------------------------------
    const getVal = (el) => parseFloat(el?.value) || 0;

    const getPct = (val, max) => Math.min(Math.max((max > 0 ? (val / max) * 100 : 100), 0), 100);

    const toggleOptionSet = (opt, isEnabled) => {
        if (!opt) return;
        opt.disabled = !isEnabled;
        opt.parentElement.classList.toggle('disabled', !isEnabled);
    };

    // -------------------------------------------------------------
    // Core Logic
    // -------------------------------------------------------------

    let calculateTimeout;
    const calculateWeight = () => {
        clearTimeout(calculateTimeout);
        calculateTimeout = setTimeout(() => {
            try {
                // 1. Base Weights
                const baseFront = getVal(DOM.baseFrontWeight);
                const baseRear = getVal(DOM.baseRearWeight);
                const frontGawr = getVal(DOM.frontGawr);
                const rearGawr = getVal(DOM.rearGawr);
                const gvwr = getVal(DOM.gvwr);

                // 2. Passengers
                const passCount = parseInt(DOM.checkedPassengerCount()?.value) || 0;
                const passengersTotalWeight = passCount * CONFIG.PASSENGER_WEIGHT;
                
                let passFrontSub = 0;
                let passRearSub = 0;
                
                // Specific distribution adjustments based on original logic
                if (passCount === 4) {
                    passFrontSub = 65;
                    passRearSub = 45;
                } else if (passCount === 3) {
                    passFrontSub = 35;
                    passRearSub = 130;
                }

                // 3. Options & Water
                let optionsTotal = 0;
                let optionsFront = 0;
                let optionsRear = 0;
                let waterTotal = 0;
                let additionalBaseWeight = 0;

                DOM.optionCheckboxes().forEach(cb => {
                    if (!cb.checked) return;

                    const isFreshWaterTank = cb.closest('.option-item')?.innerText.includes('清水タンク');
                    const isWater = cb.id === 'opt_WaterTank';
                    const weightTotal = parseFloat(cb.dataset.total) || 0;
                    const weightFront = parseFloat(cb.dataset.front) || 0;
                    const weightRear = parseFloat(cb.dataset.rear) || 0;

                    if (isFreshWaterTank) {
                        additionalBaseWeight += weightTotal;
                    } else if (isWater) {
                        waterTotal += weightTotal;
                    } else {
                        optionsTotal += weightTotal;
                    }

                    optionsFront += weightFront;
                    optionsRear += weightRear;
                });

                // 4. Grand Totals
                const combinedOptionsWeight = optionsTotal + waterTotal + additionalBaseWeight;
                const totalWeight = (baseFront + baseRear) + passengersTotalWeight + combinedOptionsWeight;
                const displayBaseWeight = (baseFront + baseRear) + additionalBaseWeight;

                // 5. Axle Distribution
                const actualPassFront = CONFIG.BASE_PASSENGER_FRONT - passFrontSub;
                const actualPassRear = CONFIG.BASE_PASSENGER_REAR - passRearSub;
                
                const totalFrontWeight = baseFront + actualPassFront + optionsFront;
                const totalRearWeight = baseRear + actualPassRear + optionsRear;

                updateUI({
                    displayBaseWeight,
                    passengersTotalWeight,
                    waterTotal,
                    optionsTotal,
                    totalWeight,
                    gvwr,
                    totalFrontWeight,
                    totalRearWeight,
                    frontGawr,
                    rearGawr
                });
            } catch (err) {
                alert("Error in calculateWeight: " + err.message);
            }
        }, CONFIG.DEBOUNCE_MS);
    };

    /**
     * Updates the UI representation of the weight data
     */
    const updateUI = (data) => {
        const {
            displayBaseWeight, passengersTotalWeight, waterTotal, optionsTotal,
            totalWeight, gvwr, totalFrontWeight, totalRearWeight, frontGawr, rearGawr
        } = data;

        // Main Displays
        DOM.totalWeightDisplay.innerText = Math.round(totalWeight);
        DOM.gvwrDisplay.innerText = Math.round(gvwr);
        
        DOM.breakdownBase.innerText = `${Math.round(displayBaseWeight)} kg`;
        DOM.breakdownPassengers.innerText = `${Math.round(passengersTotalWeight)} kg`;
        if (DOM.breakdownWater) DOM.breakdownWater.innerText = `${Math.round(waterTotal)} kg`;
        DOM.breakdownOptions.innerText = `${Math.round(optionsTotal)} kg`;

        // Axle Gauges
        DOM.frontWeightRaw.innerText = Math.round(totalFrontWeight);
        DOM.rearWeightRaw.innerText = Math.round(totalRearWeight);
        DOM.frontGawrDisplay.innerText = Math.round(frontGawr);
        DOM.rearGawrDisplay.innerText = Math.round(rearGawr);

        // Progress Bars
        DOM.weightProgressBar.style.width = `${getPct(totalWeight, gvwr)}%`;
        DOM.frontProgressBar.style.width = `${getPct(totalFrontWeight, frontGawr)}%`;
        DOM.rearProgressBar.style.width = `${getPct(totalRearWeight, rearGawr)}%`;

        // Status Rendering
        const updateAxleStatus = (current, limit, elRemaining, elBar) => {
            const rem = limit - current;
            elBar.className = 'progress-bar'; // reset
            elRemaining.className = 'remaining';
            
            if (rem < 0) {
                elBar.classList.add('danger');
                elRemaining.classList.add('danger');
                elRemaining.innerText = `⚠️ ${Math.abs(Math.round(rem))}kg オーバー`;
            } else if (rem <= CONFIG.THRESHOLD_WARNING) {
                elBar.classList.add('warning');
                elRemaining.classList.add('warning');
                elRemaining.innerText = `残り ${Math.round(rem)}kg`;
            } else {
                elRemaining.innerText = `残り ${Math.round(rem)}kg`;
            }
        };

        updateAxleStatus(totalFrontWeight, frontGawr, DOM.frontRemaining, DOM.frontProgressBar);
        updateAxleStatus(totalRearWeight, rearGawr, DOM.rearRemaining, DOM.rearProgressBar);

        // Overall GVWR Status
        const remaining = gvwr - totalWeight;
        DOM.currentWeightContainer.className = 'current-weight';
        DOM.weightProgressBar.className = 'progress-bar';
        DOM.remainingDisplay.className = 'remaining-display';
        
        if (remaining < 0) {
            DOM.currentWeightContainer.classList.add('danger');
            DOM.weightProgressBar.classList.add('danger');
            DOM.remainingDisplay.classList.add('danger');
            DOM.remainingWeightLabel.innerText = 'オーバー: ';
            DOM.remainingWeightValue.innerText = Math.abs(Math.round(remaining));
        } else if (remaining <= CONFIG.THRESHOLD_WARNING) {
            DOM.currentWeightContainer.classList.add('warning');
            DOM.weightProgressBar.classList.add('warning');
            DOM.remainingDisplay.classList.add('warning');
            DOM.remainingWeightLabel.innerText = '許容限度まで: ';
            DOM.remainingWeightValue.innerText = Math.round(remaining);
        } else {
            DOM.remainingWeightLabel.innerText = '許容限度まで: ';
            DOM.remainingWeightValue.innerText = Math.round(remaining);
        }
    };

    /**
     * Manages logic for mutually exclusive options and style locking
     */
    const updateExclusivity = () => {
        // Solar & Window (O4600 vs O4601/O1404)
        if (DOM.opt4600 && DOM.opt4601 && DOM.opt1404) {
            if (DOM.opt4600.checked) {
                toggleOptionSet(DOM.opt4601, false);
                toggleOptionSet(DOM.opt1404, false);
            } else {
                if (DOM.opt4601.checked || DOM.opt1404.checked) {
                    toggleOptionSet(DOM.opt4600, false);
                } else {
                    toggleOptionSet(DOM.opt4600, true);
                    toggleOptionSet(DOM.opt4601, true);
                    toggleOptionSet(DOM.opt1404, true);
                }
            }
        }

        // Battery (O4800 vs O4801)
        if (DOM.opt4800 && DOM.opt4801) {
            if (DOM.opt4800.checked) {
                toggleOptionSet(DOM.opt4801, false);
            } else if (DOM.opt4801.checked) {
                toggleOptionSet(DOM.opt4800, false);
            } else {
                toggleOptionSet(DOM.opt4800, true);
                toggleOptionSet(DOM.opt4801, true);
            }
        }

        // Water Heater (O3012) depends on Water Tank
        if (DOM.opt3012 && DOM.optWaterTank) {
            toggleOptionSet(DOM.opt3012, true);
            toggleOptionSet(DOM.optWaterTank, true);
            
            if (DOM.opt3012.checked) {
                DOM.optWaterTank.checked = true;
                toggleOptionSet(DOM.optWaterTank, false);
            } else if (!DOM.optWaterTank.checked) {
                DOM.opt3012.checked = false;
                toggleOptionSet(DOM.opt3012, false);
            }
        }

        // Style Overrides & Lock Enforcement
        const style = DOM.checkedCamperStyle()?.value || 'custom';
        if (DOM.passengerSelector) {
            DOM.passengerSelector.classList.toggle('locked', style !== 'custom');
        }

        // Style-specific constraints
        const applyStyleConstraints = (currentStyle) => {
            const disableIfMatch = (styleList, opt) => {
                if (styleList.includes(currentStyle) && opt) {
                    opt.checked = false;
                    toggleOptionSet(opt, false);
                }
            };

            disableIfMatch(['family', 'emax'], DOM.optWaterTank);
            disableIfMatch(['family', 'emax'], DOM.opt3012);
            disableIfMatch(['family', 'wmax'], DOM.opt4801);
        };

        applyStyleConstraints(style);
    };

    /**
     * Applies passenger defaults and option presets based on selected style
     */
    const applyPassengerStyle = (style) => {
        const p6 = document.getElementById('p6');
        const p4 = document.getElementById('p4');
        const p3 = document.getElementById('p3');
        
        // Reset non-standard options
        DOM.optionCheckboxes().forEach(cb => {
            if (cb.dataset.standard !== 'true') {
                cb.checked = false;
                toggleOptionSet(cb, true);
            }
        });

        // Passenger Count Preset
        if ((style === 'family' || style === 'custom') && p6) p6.checked = true;
        if ((style === 'emax' || style === 'wmax') && p4) p4.checked = true;
        if (style === 'premium' && p3) p3.checked = true;

        // Option Presets
        if (style === 'custom' && DOM.optWaterTank) DOM.optWaterTank.checked = true;
        if (style === 'wmax') {
            if (DOM.optWaterTank) DOM.optWaterTank.checked = true;
            if (DOM.opt3012) DOM.opt3012.checked = true;
        }
        if (style === 'emax' && DOM.opt4801) DOM.opt4801.checked = true;
        if (style === 'premium' && DOM.optWaterTank) DOM.optWaterTank.checked = true;
    };

    // -------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------
    
    const initEvents = () => {
        // Style Selection
        DOM.styleRadios().forEach(radio => {
            radio.addEventListener('change', (e) => {
                applyPassengerStyle(e.target.value);
                updateExclusivity();
                calculateWeight();
            });
        });

        // Exclusivity Triggeers
        [DOM.opt4600, DOM.opt4601, DOM.opt1404, DOM.opt4800, DOM.opt4801, DOM.optWaterTank, DOM.opt3012].forEach(opt => {
            if (opt) {
                opt.addEventListener('change', () => {
                    updateExclusivity();
                    calculateWeight();
                });
            }
        });

        // Clear Options Button
        if (DOM.clearOptionsBtn) {
            DOM.clearOptionsBtn.addEventListener('click', () => {
                const optionCard = DOM.clearOptionsBtn.closest('.card');
                optionCard?.querySelectorAll('.option-checkbox').forEach(cb => {
                    cb.checked = false;
                });
                updateExclusivity();
                calculateWeight();
            });
        }

        // Header Scroll Effect - Optimized to prevent object allocation during scroll
        if (DOM.header) {
            let ticking = false;
            const updateHeaderState = () => {
                const scrollPos = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
                let opacity = 1 - (scrollPos / CONFIG.FADE_LIMIT);
                opacity = Math.max(0, Math.min(1, opacity));
                
                DOM.header.style.opacity = opacity;
                DOM.header.style.transform = `translateY(-${(1 - opacity) * CONFIG.SCROLL_TRANSFORM_PX}px)`;
                DOM.header.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
                ticking = false;
            };

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(updateHeaderState);
                    ticking = true;
                }
            }, { passive: true });
        }

        // General Input Listeners
        DOM.allInputs().forEach(input => {
            const eventType = (input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
            input.addEventListener(eventType, calculateWeight);
        });
    };

    // -------------------------------------------------------------
    // Initial Execution
    // -------------------------------------------------------------
    try {
        initEvents();
        updateExclusivity();
        calculateWeight();
    } catch (e) {
        console.error("V-CAL Initialization Error:", e);
        alert("JS Error: " + e.message);
    }

})();
