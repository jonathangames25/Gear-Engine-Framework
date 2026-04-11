class UIModule {
    constructor() {
        this.elements = new Map();
        this.uiSyncQueue = [];
        this.callbacks = new Map(); // elementId_event -> cb
    }

    // --- Creation ---
    createElement(type, id, props = {}) {
        const element = {
            id,
            type,
            props: {
                label: props.label || '',
                value: props.value !== undefined ? props.value : '',
                checked: props.checked || false,
                placeholder: props.placeholder || '',
                x: props.x || 0,
                y: props.y || 0,
                ...props
            }
        };
        this.elements.set(id, element);
        this.uiSyncQueue.push({ type: 'create', data: element });
        return element;
    }

    createLabel(id, text, x = 0, y = 0) {
        return this.createElement('label', id, { label: text, x, y });
    }

    createButton(id, label, x = 0, y = 0) {
        return this.createElement('button', id, { label, x, y });
    }

    createTextInput(id, placeholder, x = 0, y = 0) {
        return this.createElement('text', id, { placeholder, x, y });
    }

    createCheckbox(id, label, checked = false, x = 0, y = 0) {
        return this.createElement('checkbox', id, { label, checked, x, y });
    }

    createRadio(id, label, group, checked = false, x = 0, y = 0) {
        return this.createElement('radio', id, { label, group, checked, x, y });
    }

    // --- Setters/Getters ---
    setProperty(id, key, value) {
        const el = this.elements.get(id);
        if (el) {
            el.props[key] = value;
            this.uiSyncQueue.push({ type: 'update', id, key, value });
        }
    }

    getProperty(id, key) {
        const el = this.elements.get(id);
        return el ? el.props[key] : null;
    }

    setLabel(id, text) { this.setProperty(id, 'label', text); }
    getLabel(id) { return this.getProperty(id, 'label'); }

    setValue(id, value) { this.setProperty(id, 'value', value); }
    getValue(id) { return this.getProperty(id, 'value'); }

    setChecked(id, bool) { this.setProperty(id, 'checked', bool); }
    getChecked(id) { return this.getProperty(id, 'checked'); }

    // --- Events ---
    on(id, eventType, callback) {
        this.callbacks.set(`${id}_${eventType}`, callback);
    }

    handleClientEvent(id, eventType, data = {}) {
        // Update local state first if needed
        if (data.value !== undefined) this.setProperty(id, 'value', data.value);
        if (data.checked !== undefined) this.setProperty(id, 'checked', data.checked);

        const cb = this.callbacks.get(`${id}_${eventType}`);
        if (cb) {
            try {
                cb(data);
            } catch (e) {
                console.error(`Error in UI callback for ${id}:${eventType}`, e);
            }
        }
    }

    getSyncData() {
        const data = [...this.uiSyncQueue];
        this.uiSyncQueue = [];
        return data;
    }
}

module.exports = new UIModule();
