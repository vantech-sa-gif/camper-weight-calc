const fs = require('fs');

class MockElement {
    constructor(id) {
        this.id = id;
        this.checked = false;
        this.disabled = false;
        this.value = '0';
        this.dataset = { front: 0, rear: 0, total: 0 };
        this.listeners = {};
        this.innerText = '';
        this.className = '';
        this.style = {};
        this.parentElement = { classList: { add: () => {}, remove: () => {} } };
        this.classList = { add: () => {}, remove: () => {} };
    }
    addEventListener(type, cb) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }
    dispatchEvent(type, event) {
        if (this.listeners[type]) {
            this.listeners[type].forEach(cb => cb(event));
        }
    }
}

const mockDoc = {
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) this.elements[id] = new MockElement(id);
        return this.elements[id];
    },
    querySelector(sel) {
        if (sel.includes('passengerCount')) return { value: '6' };
        return null;
    },
    querySelectorAll(sel) {
        if (sel === 'input, select') return Object.values(this.elements);
        if (sel === '.option-checkbox:checked') return Object.values(this.elements).filter(e => e.checked);
        return [];
    },
    addEventListener() {}
};

global.document = mockDoc;
global.parseFloat = parseFloat;
global.parseInt = parseInt;
global.Math = Math;

try {
    const code = fs.readFileSync('script.js', 'utf8');
    // Replace document.addEventListener to run immediately
    const runCode = code.replace("document.addEventListener('DOMContentLoaded', () => {", "(() => {");
    eval(runCode);
    console.log("Script evaluated successfully without crashing.");
} catch (e) {
    console.error("Crash during eval:", e);
}
