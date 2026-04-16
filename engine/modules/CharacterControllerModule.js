const physicsModule = require('./PhysicsModule');
const gameObjectModule = require('./GameObjectModule');

class CharacterControllerModule {
    constructor() {
        this.characters = new Map(); // id -> state
    }

    /**
     * Move a character using the Rapier character controller.
     * @param {string} id GameObject ID
     * @param {Object} movement {x, y, z} desired movement vector
     * @param {number} dt Delta time
     */
    moveCharacter(id, movement, dt) {
        const go = gameObjectModule.getGameObject(id);
        if (!go || !go.physics.isCharacter) return;

        const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
        const collider = physicsModule.world.getCollider(go.physics.colliderHandle);
        if (!body || !collider) return;

        const controller = go.physics.controller;
        if (!controller) return;

        // Apply movement
        controller.computeColliderMovement(collider, movement);
        const correctedMovement = controller.computedMovement();

        const currentPos = body.translation();
        const newPos = {
            x: currentPos.x + correctedMovement.x,
            y: currentPos.y + correctedMovement.y,
            z: currentPos.z + correctedMovement.z
        };

        body.setNextKinematicTranslation(newPos);
        
        // Update state
        const state = this.getOrInitState(id);
        state.isGrounded = controller.computedGrounded();
        
        // Update go position for sync
        go.physics.position.x = newPos.x;
        go.physics.position.y = newPos.y;
        go.physics.position.z = newPos.z;
    }

    getOrInitState(id) {
        if (!this.characters.has(id)) {
            this.characters.set(id, {
                velocity: { x: 0, y: 0, z: 0 },
                isGrounded: false,
                jumpForce: 10,
                gravity: -20,
                moveSpeed: 5
            });
        }
        return this.characters.get(id);
    }

    /**
     * Standard update loop for a character (handles gravity and basic movement)
     */
    updateCharacter(id, input, dt) {
        const state = this.getOrInitState(id);
        const go = gameObjectModule.getGameObject(id);
        if (!go) return;

        // Apply Gravity
        if (!state.isGrounded) {
            state.velocity.y += state.gravity * dt;
        } else if (state.velocity.y < 0) {
            state.velocity.y = -0.1; // Small downward force to stay grounded
        }

        // Horizontal Movement
        let moveX = (input.x || 0) * state.moveSpeed;
        let moveZ = (input.z || 0) * state.moveSpeed;

        // Combine
        const movement = {
            x: moveX * dt,
            y: state.velocity.y * dt,
            z: moveZ * dt
        };

        this.moveCharacter(id, movement, dt);
    }

    jump(id) {
        const state = this.getOrInitState(id);
        if (state.isGrounded) {
            state.velocity.y = state.jumpForce;
            state.isGrounded = false;
        }
    }
}

module.exports = new CharacterControllerModule();
