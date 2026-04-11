class InputModule {
    constructor() {
        this.keys = new Set();
        this.mouse = {
            buttons: new Set(),
            x: 0,
            y: 0
        };
    }

    updateState(data) {
        if (data.keys) {
            this.keys = new Set(data.keys);
        }
        if (data.mouse) {
            if (data.mouse.buttons) this.mouse.buttons = new Set(data.mouse.buttons);
            this.mouse.x = data.mouse.x || 0;
            this.mouse.y = data.mouse.y || 0;
        }
    }

    isKeyDown(key) {
        return this.keys.has(key);
    }

    isMouseButtonDown(button) {
        return this.mouse.buttons.has(button);
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
}

module.exports = new InputModule();
