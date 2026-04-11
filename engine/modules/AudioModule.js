class AudioModule {
    constructor() {
        this.activeSounds = new Map();
        this.soundEvents = [];
    }

    playSound(id, assetPath, loop = false, volume = 1.0) {
        const soundEvent = {
            type: 'play',
            id,
            assetPath,
            loop,
            volume,
            timestamp: Date.now()
        };
        this.soundEvents.push(soundEvent);
        return soundEvent;
    }

    stopSound(id) {
        const soundEvent = {
            type: 'stop',
            id,
            timestamp: Date.now()
        };
        this.soundEvents.push(soundEvent);
    }

    setVolume(id, volume) {
        const soundEvent = {
            type: 'setVolume',
            id,
            volume,
            timestamp: Date.now()
        };
        this.soundEvents.push(soundEvent);
    }

    getNewEvents() {
        const events = [...this.soundEvents];
        this.soundEvents = [];
        return events;
    }
}

module.exports = new AudioModule();
