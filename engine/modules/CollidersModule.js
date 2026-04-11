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

    updateColliderScale(handle, scale, shape, currentProps) {
        if (!physicsModule.world) return null;
        const collider = physicsModule.world.getCollider(handle);
        if (!collider) return null;

        const body = collider.parent();
        physicsModule.world.removeCollider(collider, true);

        // Update props with new scale
        let newProps = { ...currentProps };
        if (shape === 'cube') {
            newProps.halfWidth = (currentProps.halfWidth || 0.5) * scale.x;
            newProps.halfHeight = (currentProps.halfHeight || 0.5) * scale.y;
            newProps.halfDepth = (currentProps.halfDepth || 0.5) * scale.z;
        } else if (shape === 'sphere') {
            newProps.radius = (currentProps.radius || 0.5) * scale.x;
        } else if (shape === 'capsule') {
            newProps.radius = (currentProps.radius || 0.5) * scale.x;
            newProps.height = (currentProps.height || 1.0) * scale.y;
        }

        const newCollider = physicsModule.createCollider(shape, body, newProps);
        return newCollider.handle;
    }
}

module.exports = new CollidersModule();
