/**
 * V-CAL script.js
 * Clean Architecture Refactor
 *
 * 1. Constants: Elimination of magic numbers
 * 2. Options: Centralized option data (generates HTML)
 * 3. Registry: Centralized DOM management
 * 4. State: Reactive UI data handling
 * 5. Calculator: Pure logic for weight computation
 * 6. PolicyManager: Style & exclusivity rules
 * 7. Renderer: Decoupled UI updates
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
    WARNING_THRESHOLD_KG: 50
};

// オプションデータ定義 — ここを編集するだけでオプションの追加・変更が可能
const OPTIONS = [
    { id: 'O1026', name: 'サイドオーニング3.5m',              code: 'O1026', front: 4,   rear: 19,   total: 23   },
    { id: 'O1404', name: 'ルーフウィンドウ',                  code: 'O1404', front: 5,   rear: 0,    total: 5    },
    { id: 'O1043', name: 'エントランスアシストステップ',        code: 'O1043', front: -2,  rear: 7,    total: 5    },
    { id: 'P3202', name: 'ラップル',                          code: 'P3202', front: -3,  rear: 13,   total: 10   },
    { id: 'O3012', name: '温水設備',                          code: 'O3012', front: -3,  rear: 33,   total: 30   },
    { id: 'O4501', name: '電気冷蔵庫83L',                     code: 'O4501', front: -3,  rear: 28,   total: 25   },
    { id: 'O4052', name: '電子レンジ',                        code: 'O4052', front: -2,  rear: 15.5, total: 13.5 },
    { id: 'O4800', name: 'リチウムイオンバッテリー追加(1個)',   code: 'O4800', front: 20,  rear: 10,   total: 30   },
    { id: 'O4801', name: 'リチウムイオンバッテリー追加(2個)',   code: 'O4801', front: 40,  rear: 20,   total: 60   },
    { id: 'O4601', name: 'フレキシブルソーラー充電器 (240W)',   code: 'O4601', front: 9,   rear: 1,    total: 10   },
    { id: 'O4600', name: 'フレキシブルソーラー充電器 (480W)',   code: 'O4600', front: 14,  rear: 1,    total: 15   },
    { id: 'O4700', name: 'フレキシブルソーラー充電器 (610W)',   code: 'O4700', front: -2,  rear: 17,   total: 15   },
];

const WATER_OPTIONS = [
    { id: 'WaterTank', name: '生活用水タンク', front: 7,  rear: 48, total: 55, defaultChecked: true, category: 'water'     },
    { id: 'FreshWater', name: '清水タンク',    front: -2, rear: 22, total: 20, defaultChecked: true, category: 'freshWater', standard: true },
];

const APP_CONFIG = {
    STYLES: {
        'custom':  { defaultPax: 6, defaults: { 'opt_WaterTank': true } },
        'family':  { defaultPax: 6, locks: ['opt_WaterTank', 'opt_O3012', 'opt_O4801'] },
        'wmax':    { defaultPax: 4, defaults: { 'opt_WaterTank': true, 'opt_O3012': true } },
        'emax':    { defaultPax: 4, defaults: { 'opt_O4801': true }, locks: ['opt_WaterTank', 'opt_O3012'] },
        'premium': { defaultPax: 3, defaults: { 'opt_WaterTank': true } }
    },
    EXCLUSIVITY: [
        { group: ['opt_O4600'], excludes: ['opt_O4601', 'opt_O1404'] },  // 480W → 240W, ルーフウィンドウ
        { group: ['opt_O4601'], excludes: ['opt_O4600'] },               // 240W → 480Wのみ
        { group: ['opt_O1404'], excludes: ['opt_O4600'] },               // ルーフウィンドウ → 480Wのみ
        { group: ['opt_O4800'], excludes: ['opt_O4801'] },
        { group: ['opt_O4801'], excludes: ['opt_O4800'] },
        { group: ['opt_O3012'], excludes: ['opt_O4801'], styleOnly: ['wmax'] },  // W-max: 温水設備 → バッテリー2個を排他
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
        this.style = 'family';
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
                cb.parentElement.classList.remove('locked-default');
            }
        });

        // Set Default options
        if (config.defaults) {
            Object.keys(config.defaults).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.checked = config.defaults[id];
                    if (config.defaults[id] === true) {
                        el.disabled = true;
                        el.parentElement.classList.add('locked-default');
                    }
                }
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
        // まず全オプションをリセット（スタイルロック・標準装備は除く）
        const styleId = document.querySelector('input[name="camper_style"]:checked')?.value || 'family';
        const styleLocks = APP_CONFIG.STYLES[styleId]?.locks || [];
        document.querySelectorAll('.option-checkbox').forEach(el => {
            if (el.dataset.standard === 'true') return;
            if (styleLocks.includes(el.id)) return;
            if (el.parentElement.classList.contains('locked-default')) return;
            el.disabled = false;
            el.parentElement.classList.remove('disabled');
        });

        const disableOpt = (el) => {
            el.disabled = true;
            el.parentElement.classList.add('disabled');
        };

        APP_CONFIG.EXCLUSIVITY.forEach(rule => {
            if (rule.styleOnly && !rule.styleOnly.includes(styleId)) return;
            const isGroupChecked = rule.group.some(id => document.getElementById(id)?.checked);

            if (isGroupChecked) {
                if (rule.excludes) {
                    rule.excludes.forEach(targetId => {
                        const target = document.getElementById(targetId);
                        if (target) {
                            target.checked = false;
                            disableOpt(target);
                        }
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
        bar.className = 'progress-bar';
        label.className = 'remaining';

        if (rem < 0) {
            bar.classList.add('danger');
            label.classList.add('danger');
            label.innerText = `⚠️ ${Math.abs(Math.round(rem))}kg オーバー`;
        } else if (rem <= CONSTANTS.WARNING_THRESHOLD_KG) {
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

        weightContainer.className = 'current-weight';
        barEl.className = 'progress-bar';
        containerEl.className = 'remaining-display';
        const summaryCard = weightContainer.closest('.summary-card');
        if (summaryCard) summaryCard.className = 'summary-card glass';

        if (remaining < 0) {
            weightContainer.classList.add('danger');
            barEl.classList.add('danger');
            containerEl.classList.add('danger');
            if (summaryCard) summaryCard.classList.add('danger');
            labelEl.innerText = 'オーバー: ';
            valueEl.innerText = Math.abs(Math.round(remaining));
        } else if (remaining <= CONSTANTS.WARNING_THRESHOLD_KG) {
            weightContainer.classList.add('warning');
            barEl.classList.add('warning');
            containerEl.classList.add('warning');
            labelEl.innerText = '最大許容まで:';
            valueEl.innerText = Math.round(remaining);
        } else {
            labelEl.innerText = '最大許容まで:';
            valueEl.innerText = Math.round(remaining);
        }
    }
}

class App {
    // オプションデータからチェックボックスUIを生成する
    static _buildOptions(container, opts) {
        if (!container) return;
        opts.forEach(opt => {
            const optId = 'opt_' + opt.id;
            const label = document.createElement('label');
            label.className = 'option-item' + (opt.standard ? ' disabled' : '');
            label.innerHTML =
                `<input type="checkbox" class="option-checkbox" id="${optId}"` +
                ` data-front="${opt.front}" data-rear="${opt.rear}" data-total="${opt.total}"` +
                (opt.standard ? ' data-standard="true" checked disabled' : '') +
                (opt.defaultChecked && !opt.standard ? ' checked' : '') +
                `><div class="option-content">` +
                `<span class="option-name">${opt.name}${opt.code ? ` (${opt.code})` : ''}</span>` +
                `<span class="option-weight">+${opt.total}kg (F: ${opt.front}, R: ${opt.rear})</span>` +
                `</div>`;
            container.appendChild(label);
        });
    }

    constructor() {
        try {
            // DOMRegistry の前にHTMLを生成する
            App._buildOptions(document.getElementById('optionsContainer'), OPTIONS);
            App._buildOptions(document.getElementById('waterContainer'), WATER_OPTIONS);

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
            if (cb.checked) ids.add(cb.id);
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

    // オプションデータをDOMではなくデータ配列から直接構築
    _getOptionDataMap() {
        const map = {};
        [...OPTIONS, ...WATER_OPTIONS].forEach(opt => {
            map['opt_' + opt.id] = {
                front: opt.front,
                rear: opt.rear,
                total: opt.total,
                isFreshWater: opt.category === 'freshWater',
                isWater: opt.category === 'water'
            };
        });
        return map;
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
