const physicsModule = require('./PhysicsModule');

class CollidersModule {
    constructor() {
        this.gizmosEnabled = true;
    }

    setGizmosEnabled(enabled) {
        this.gizmosEnabled = enabled;
    }

    getColliderData(handle) {
        if (!physicsModule.world) return null;
        const collider = physicsModule.world.getCollider(handle);
        if (!collider) return null;

        return {
            handle: collider.handle,
            type: collider.shapeType(),
            // Scale and position are handled by rigidBody usually, but collider can have offset
            translation: collider.translation(),
            rotation: collider.rotation(),
            isSensor: collider.isSensor()
        };
    }

    recreateCollider(handle, shape, props) {
        if (!physicsModule.world) return null;
        const collider = physicsModule.world.getCollider(handle);
        if (!collider) return null;

        const body = collider.parent();
        physicsModule.world.removeCollider(collider, true);

        const newCollider = physicsModule.createCollider(shape, body, props);
        return newCollider.handle;
    }
}

module.exports = new CollidersModule();
