/**
 * V-CAL script.js
 * Clean Architecture Refactor
 * 
 * 1. Constants: Elimination of magic numbers
 * 2. Registry: Centralized DOM management
 * 3. State: Reactive UI data handling
 * 4. Calculator: Pure logic for weight computation
 * 5. PolicyManager: Style & exclusivity rules
 * 6. Renderer: Decoupled UI updates
 */

const CONSTANTS = {
    PASSENGER_WEIGHT: 55,
    BASE_PASSENGERS_TOTAL: 6,
    BASE_FRONT_PAX_WEIGHT: 110, // 2 pax * 55
    BASE_REAR_PAX_WEIGHT: 220,  // 4 pax * 55
    PAX_DISTRIBUTION_SUB: {
        '4': { front: 65, rear: 45 },
        '3': { front: 35, rear: 130 },
        '6': { front: 0, rear: 0 }
    },
    WARNING_PCT: 0.81,
    DANGER_PCT: 0.96
};

const APP_CONFIG = {
    STYLES: {
        'custom': { defaultPax: 6, defaults: { 'opt_WaterTank': true } },
        'family': { defaultPax: 6, locks: ['opt_WaterTank', 'opt_O3012', 'opt_O4801'] },
        'wmax': { defaultPax: 4, defaults: { 'opt_WaterTank': true, 'opt_O3012': true }, locks: ['opt_O4801'] },
        'emax': { defaultPax: 4, defaults: { 'opt_O4801': true }, locks: ['opt_WaterTank', 'opt_O3012'] },
        'premium': { defaultPax: 3, defaults: { 'opt_WaterTank': true } }
    },
    EXCLUSIVITY: [
        { group: ['opt_O4600'], excludes: ['opt_O4601', 'opt_O1404'] },
        { group: ['opt_O4800'], excludes: ['opt_O4801'] },
        { group: ['opt_O4801'], excludes: ['opt_O4800'] },
        { group: ['opt_O3012'], requires: ['opt_WaterTank'], forceCheck: true }
    ]
};

class DOMRegistry {
    constructor() {
        this.inputs = {
            baseFront: document.getElementById('baseFrontWeight'),
            baseRear: document.getElementById('baseRearWeight'),
            frontGawr: document.getElementById('frontGawr'),
            rearGawr: document.getElementById('rearGawr'),
            gvwr: document.getElementById('gvwr'),
            styleRadios: document.querySelectorAll('input[name="camper_style"]'),
            paxRadios: document.querySelectorAll('input[name="passengerCount"]'),
            options: document.querySelectorAll('.option-checkbox'),
            clearOptionsBtn: document.getElementById('clearOptionsBtn'),
            paxSelector: document.getElementById('passengerSelector')
        };

        this.outputs = {
            totalWeight: document.getElementById('totalWeightDisplay'),
            gvwr: document.getElementById('gvwrDisplay'),
            progressBar: document.getElementById('weightProgressBar'),
            remainingValue: document.getElementById('remainingWeightValue'),
            remainingLabel: document.getElementById('remainingWeightLabel'),
            remainingDisplay: document.getElementById('remainingDisplay'),
            breakdownBase: document.getElementById('breakdownBase'),
            breakdownPax: document.getElementById('breakdownPassengers'),
            breakdownWater: document.getElementById('breakdownWater'),
            breakdownOptions: document.getElementById('breakdownOptions'),
            frontRaw: document.getElementById('frontWeightRaw'),
            rearRaw: document.getElementById('rearWeightRaw'),
            frontGawr: document.getElementById('frontGawrDisplay'),
            rearGawr: document.getElementById('rearGawrDisplay'),
            frontRemaining: document.getElementById('frontRemaining'),
            rearRemaining: document.getElementById('rearRemaining'),
            frontBar: document.getElementById('frontProgressBar'),
            rearBar: document.getElementById('rearProgressBar')
        };

        this.header = document.querySelector('header');
        this.totalWeightContainer = this.outputs.totalWeight?.parentElement;
    }
}

class AppState {
    constructor(onChange) {
        this.style = 'custom';
        this.paxCount = 6;
        this.selectedOptions = new Set();
        this.onChange = onChange;
    }

    update(data) {
        let changed = false;
        for (const key in data) {
            if (this[key] !== data[key]) {
                this[key] = data[key];
                changed = true;
            }
        }
        if (changed) this.onChange();
    }
}

class WeightCalculator {
    static calculate(state, baseWeights, optionData) {
        const { passengers, passFrontSub, passRearSub } = this._getPaxData(state.paxCount);
        
        let waterTotal = 0;
        let optionsTotal = 0;
        let additionalBaseWeight = 0;
        let optionsFront = 0;
        let optionsRear = 0;

        state.selectedOptions.forEach(id => {
            const opt = optionData[id];
            if (!opt) return;

            if (opt.isFreshWater) additionalBaseWeight += opt.total;
            else if (opt.isWater) waterTotal += opt.total;
            else optionsTotal += opt.total;

            optionsFront += opt.front;
            optionsRear += opt.rear;
        });

        const totalFront = baseWeights.front + (CONSTANTS.BASE_FRONT_PAX_WEIGHT - passFrontSub) + optionsFront;
        const totalRear = baseWeights.rear + (CONSTANTS.BASE_REAR_PAX_WEIGHT - passRearSub) + optionsRear;
        const grandTotal = totalFront + totalRear;
        const displayBase = baseWeights.front + baseWeights.rear + additionalBaseWeight;

        return {
            grandTotal,
            displayBase,
            passengers,
            waterTotal,
            optionsTotal,
            totalFront,
            totalRear
        };
    }

    static _getPaxData(count) {
        const sub = CONSTANTS.PAX_DISTRIBUTION_SUB[count] || { front: 0, rear: 0 };
        return {
            passengers: count * CONSTANTS.PASSENGER_WEIGHT,
            passFrontSub: sub.front,
            passRearSub: sub.rear
        };
    }
}

class PolicyManager {
    static applyStyle(styleId, registry) {
        const config = APP_CONFIG.STYLES[styleId];
        if (!config) return;

        // Reset and Apply Pax
        const targetPax = document.getElementById(`p${config.defaultPax}`);
        if (targetPax) targetPax.checked = true;

        // Reset options visibility/accessibility
        registry.inputs.options.forEach(cb => {
            if (cb.dataset.standard !== 'true') {
                cb.disabled = false;
                cb.parentElement.classList.remove('disabled');
            }
        });

        // Set Default options
        if (config.defaults) {
            Object.keys(config.defaults).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = config.defaults[id];
            });
        }

        // Apply Locks
        if (config.locks) {
            config.locks.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.checked = false;
                    el.disabled = true;
                    el.parentElement.classList.add('disabled');
                }
            });
        }

        // Lock Pax Selector
        const isCustom = styleId === 'custom';
        registry.inputs.paxSelector?.classList.toggle('locked', !isCustom);
    }

    static applyExclusivity() {
        const disableOpt = (el) => {
            el.disabled = true;
            el.parentElement.classList.add('disabled');
        };

        APP_CONFIG.EXCLUSIVITY.forEach(rule => {
            const isGroupChecked = rule.group.some(id => document.getElementById(id)?.checked);
            
            if (isGroupChecked) {
                if (rule.excludes) {
                    rule.excludes.forEach(targetId => {
                        const target = document.getElementById(targetId);
                        if (target) disableOpt(target);
                    });
                }
                if (rule.forceCheck) {
                    rule.requires.forEach(targetId => {
                        const target = document.getElementById(targetId);
                        if (target) {
                            target.checked = true;
                            disableOpt(target);
                        }
                    });
                }
            } else if (rule.forceCheck) {
                const isRequiredChecked = rule.requires.some(id => document.getElementById(id)?.checked);
                if (!isRequiredChecked) {
                    rule.group.forEach(id => {
                        const target = document.getElementById(id);
                        if (target) {
                            target.checked = false;
                            disableOpt(target);
                        }
                    });
                }
            }
        });
    }
}

class Renderer {
    static update(results, limits, registry) {
        const { outputs, totalWeightContainer } = registry;
        
        // Main Displays
        outputs.totalWeight.innerText = Math.round(results.grandTotal);
        outputs.gvwr.innerText = Math.round(limits.gvwr);
        outputs.breakdownBase.innerText = `${Math.round(results.displayBase)} kg`;
        outputs.breakdownPax.innerText = `${Math.round(results.passengers)} kg`;
        if (outputs.breakdownWater) outputs.breakdownWater.innerText = `${Math.round(results.waterTotal)} kg`;
        outputs.breakdownOptions.innerText = `${Math.round(results.optionsTotal)} kg`;

        // Axle Gauges
        outputs.frontRaw.innerText = Math.round(results.totalFront);
        outputs.rearRaw.innerText = Math.round(results.totalRear);
        outputs.frontGawr.innerText = Math.round(limits.frontGawr);
        outputs.rearGawr.innerText = Math.round(limits.rearGawr);

        // Progress Bars & Status
        this._updateBar(outputs.progressBar, results.grandTotal, limits.gvwr);
        this._updateBar(outputs.frontBar, results.totalFront, limits.frontGawr);
        this._updateBar(outputs.rearBar, results.totalRear, limits.rearGawr);

        this._updateStatusLabel(outputs.remainingValue, outputs.remainingLabel, outputs.remainingDisplay, totalWeightContainer, outputs.progressBar, results.grandTotal, limits.gvwr);
        this._updateAxleStatus(outputs.frontRemaining, outputs.frontBar, results.totalFront, limits.frontGawr);
        this._updateAxleStatus(outputs.rearRemaining, outputs.rearBar, results.totalRear, limits.rearGawr);
    }

    static _updateBar(bar, val, max) {
        if (!bar) return;
        const pct = Math.min(Math.max((max > 0 ? (val / max) * 100 : 100), 0), 100);
        bar.style.width = `${pct}%`;
    }

    static _updateAxleStatus(label, bar, current, limit) {
        if (!label || !bar) return;
        const rem = limit - current;
        let pct = limit > 0 ? (current / limit) : 1;
        
        bar.className = 'progress-bar';
        label.className = 'remaining';

        if (pct >= CONSTANTS.DANGER_PCT) {
            bar.classList.add('danger');
            label.classList.add('danger');
            label.innerText = rem < 0 ? `⚠️ ${Math.abs(Math.round(rem))}kg オーバー` : `残り ${Math.round(rem)}kg`;
        } else if (pct >= CONSTANTS.WARNING_PCT) {
            bar.classList.add('warning');
            label.classList.add('warning');
            label.innerText = `残り ${Math.round(rem)}kg`;
        } else {
            label.innerText = `残り ${Math.round(rem)}kg`;
        }
    }

    static _updateStatusLabel(valueEl, labelEl, containerEl, weightContainer, barEl, total, gvwr) {
        if (!valueEl || !labelEl || !containerEl || !weightContainer || !barEl) return;
        const remaining = gvwr - total;
        let pct = gvwr > 0 ? (total / gvwr) : 1;
        
        weightContainer.className = 'current-weight';
        barEl.className = 'progress-bar';
        containerEl.className = 'remaining-display';

        if (pct >= CONSTANTS.DANGER_PCT) {
            weightContainer.classList.add('danger');
            barEl.classList.add('danger');
            containerEl.classList.add('danger');
            labelEl.innerText = remaining < 0 ? 'オーバー: ' : '許容限度まで: ';
            valueEl.innerText = Math.abs(Math.round(remaining));
        } else if (pct >= CONSTANTS.WARNING_PCT) {
            weightContainer.classList.add('warning');
            barEl.classList.add('warning');
            containerEl.classList.add('warning');
            labelEl.innerText = '許容限度まで: ';
            valueEl.innerText = Math.round(remaining);
        } else {
            labelEl.innerText = '許容限度まで: ';
            valueEl.innerText = Math.round(remaining);
        }
    }
}

class App {
    constructor() {
        try {
            this.registry = new DOMRegistry();
            this.state = new AppState(() => this.calculate());
            this.calcTimeout = null;
            this.init();
        } catch (e) {
            console.error("App Construction Error:", e);
        }
    }

    init() {
        this._attachListeners();
        this._initScrollEffect();
        this.syncState(true); // Initial override & calculation
    }

    _attachListeners() {
        const { inputs } = this.registry;

        inputs.styleRadios.forEach(r => r.addEventListener('change', (e) => {
            this.state.style = e.target.value;
            this.syncState(true);
        }));

        const syncEvents = ['change', 'input'];
        [...inputs.paxRadios, ...inputs.options].forEach(input => {
            syncEvents.forEach(ev => input.addEventListener(ev, () => this.syncState()));
        });

        inputs.clearOptionsBtn?.addEventListener('click', () => {
            const optionCard = inputs.clearOptionsBtn.closest('.card');
            optionCard.querySelectorAll('.option-checkbox').forEach(cb => cb.checked = false);
            this.syncState();
        });
    }

    _initScrollEffect() {
        const { header } = this.registry;
        if (!header) return;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
                    const opacity = Math.max(0, Math.min(1, 1 - (scrollPos / 150)));
                    header.style.opacity = opacity;
                    header.style.transform = `translateZ(0) translateY(-${(1 - opacity) * 15}px)`;
                    header.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    syncState(forceOverride = false) {
        if (forceOverride) {
            PolicyManager.applyStyle(this.state.style, this.registry);
        }
        PolicyManager.applyExclusivity();

        const selectedPax = document.querySelector('input[name="passengerCount"]:checked');
        this.state.update({
            paxCount: parseInt(selectedPax?.value) || 6,
            selectedOptions: this._getCurrentlyCheckedOptionIds()
        });
    }

    _getCurrentlyCheckedOptionIds() {
        const ids = new Set();
        this.registry.inputs.options.forEach(cb => {
            if (cb.checked) {
                const id = cb.id || cb.closest('.option-item').querySelector('.option-name').innerText;
                ids.add(id);
            }
        });
        return ids;
    }

    calculate() {
        clearTimeout(this.calcTimeout);
        this.calcTimeout = setTimeout(() => {
            try {
                const baseWeights = {
                    front: parseFloat(this.registry.inputs.baseFront.value) || 0,
                    rear: parseFloat(this.registry.inputs.baseRear.value) || 0
                };
                const limits = {
                    gvwr: parseFloat(this.registry.inputs.gvwr.value) || 0,
                    frontGawr: parseFloat(this.registry.inputs.frontGawr.value) || 0,
                    rearGawr: parseFloat(this.registry.inputs.rearGawr.value) || 0
                };

                const results = WeightCalculator.calculate(this.state, baseWeights, this._getOptionDataMap());
                Renderer.update(results, limits, this.registry);
            } catch (e) {
                console.error("Calculation/Render Error:", e);
            }
        }, 100);
    }

    _getOptionDataMap() {
        const map = {};
        this.registry.inputs.options.forEach(cb => {
            const item = cb.closest('.option-item');
            const id = cb.id || item.querySelector('.option-name').innerText;
            map[id] = {
                front: parseFloat(cb.dataset.front) || 0,
                rear: parseFloat(cb.dataset.rear) || 0,
                total: parseFloat(cb.dataset.total) || 0,
                isFreshWater: item.innerText.includes('清水タンク'),
                isWater: cb.id === 'opt_WaterTank'
            };
        });
        return map;
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
