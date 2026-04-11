const RAPIER = require('@dimforge/rapier3d-compat');

class PhysicsModule {
    constructor() {
        this.world = null;
        this.gravity = { x: 0.0, y: -9.81, z: 0.0 };
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        await RAPIER.init();
        this.world = new RAPIER.World(this.gravity);
        this.eventQueue = new RAPIER.EventQueue(true);
        this.initialized = true;
        console.log('Physics Engine (Rapier) Initialized');
    }

    step() {
        if (!this.world) return;

        // Sync from JS objects to Physics bodies (handles manual moves)
        const GameObjectModule = require('./GameObjectModule');
        const VehicleModule = require('./VehicleModule');
        
        GameObjectModule.syncGameObjectsToPhysics();
        VehicleModule.step();

        this.world.step(this.eventQueue);
        
        // Sync from Physics bodies back to JS objects
        GameObjectModule.syncPhysicsToGameObjects();
        
        // Handle events
        this.eventQueue.drainCollisionEvents((h1, h2, started) => {
            if (this.onCollision) this.onCollision(h1, h2, started);
            // Optionally dispatch as trigger if we want separate callbacks
            if (this.onTrigger) this.onTrigger(h1, h2, started);
        });
    }

    setCollisionCallbacks(collisionCb, triggerCb) {
        this.onCollision = collisionCb;
        this.onTrigger = triggerCb;
    }

    startTicker(fps = 60) {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        
        const deltaTime = 1000 / fps;
        this.tickerInterval = setInterval(() => {
            this.step();
        }, deltaTime);
        
        console.log(`Physics ticker started at ${fps} FPS`);
    }

    createRigidBody(type, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0, w: 1 }) {
        let bodyDesc;
        switch (type) {
            case 'dynamic':
                bodyDesc = RAPIER.RigidBodyDesc.dynamic();
                break;
            case 'kinematic':
                bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
                break;
            case 'static':
            default:
                bodyDesc = RAPIER.RigidBodyDesc.fixed();
                break;
        }
        
        bodyDesc.setTranslation(position.x, position.y, position.z);
        bodyDesc.setRotation(rotation);
        
        return this.world.createRigidBody(bodyDesc);
    }

    createCollider(shape, body, props) {
        let colliderDesc;
        switch (shape) {
            case 'cylinder':
                colliderDesc = RAPIER.ColliderDesc.cylinder((props.height || 1.0) / 2, props.radius || 0.5);
                break;
            case 'cone':
                colliderDesc = RAPIER.ColliderDesc.cone((props.height || 1.0) / 2, props.radius || 0.5);
                break;
            case 'cube':
                colliderDesc = RAPIER.ColliderDesc.cuboid(props.halfWidth || 0.5, props.halfHeight || 0.5, props.halfDepth || 0.5);
                break;
            case 'sphere':
                colliderDesc = RAPIER.ColliderDesc.ball(props.radius || 0.5);
                break;
            case 'capsule':
                colliderDesc = RAPIER.ColliderDesc.capsule((props.height || 1.0) / 2, props.radius || 0.5);
                break;
            default:
                colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        }
        
        colliderDesc.setFriction(props.friction !== undefined ? props.friction : 0.5);
        colliderDesc.setRestitution(props.restitution !== undefined ? props.restitution : 0.0);
        
        if (props.offset) {
            colliderDesc.setTranslation(props.offset.x || 0, props.offset.y || 0, props.offset.z || 0);
        }
        
        // CRITICAL: Enable collision events so drainCollisionEvents() receives them
        colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        
        return this.world.createCollider(colliderDesc, body);
    }
    createCharacterController(offset = 0.1) {
        if (!this.world) return null;
        const controller = this.world.createCharacterController(offset);
        controller.enableAutostep(0.5, 0.2, true);
        controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
        controller.enableSnapToGround(0.5);
        return controller;
    }
}

module.exports = new PhysicsModule();
