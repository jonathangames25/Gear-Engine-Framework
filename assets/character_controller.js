// Basic Character Controller for Platformer
const moveSpeed = 5;
const turnSpeed = 3;

fixedUpdate = (dt) => {
    let moveDir = { x: 0, y: 0, z: 0 };
    let inputFound = false;

    // Movement Input
    if (InputModule.isKeyDown('KeyW')) {
        moveDir.z -= 1;
        inputFound = true;
    }
    if (InputModule.isKeyDown('KeyS')) {
        moveDir.z += 1;
        inputFound = true;
    }
    if (InputModule.isKeyDown('KeyA')) {
        moveDir.x -= 1;
        inputFound = true;
    }
    if (InputModule.isKeyDown('KeyD')) {
        moveDir.x += 1;
        inputFound = true;
    }

    if (inputFound) {
        // Normalize movement vector
        const mag = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
        if (mag > 0) {
            moveDir.x /= mag;
            moveDir.z /= mag;

            // Calculate target angle (atan2(x, z))
            const targetAngle = Math.atan2(moveDir.x, moveDir.z) + Math.PI; // +PI to face forward correctly
            
            // For simplicity, we'll set the rotation directly using GameObjectModule.updateGameObject
            // We need a quaternion: [0, sin(theta/2), 0, cos(theta/2)] for rotation around Y
            const halfAngle = targetAngle * 0.5;
            const rotation = {
                x: 0,
                y: Math.sin(halfAngle),
                z: 0,
                w: Math.cos(halfAngle)
            };

            GameObjectModule.updateGameObject(gameObject.id, {
                physics: { rotation }
            });
        }

        // Apply movement
        GameObjectModule.move(gameObject.id, moveDir, moveSpeed * dt);
        
        // Play walk animation if available
        if (gameObject.animations && gameObject.animations.includes('Walk')) {
            GameObjectModule.playAnimation(gameObject.id, 'Walk');
        }
    } else {
        // Play idle animation if available
        if (gameObject.animations && gameObject.animations.includes('Idle')) {
            GameObjectModule.playAnimation(gameObject.id, 'Idle');
        }
    }
};

onCollisionEnter = (other) => {
    console.log(`[CharacterController] Collided with: ${other.name}`);
};
