// Player Controller Script
let moveSpeed = 5;

// fixedUpdate runs on physics tick (60Hz)
fixedUpdate = (dt) => {
    let direction = { x: 0, y: 0, z: 0 };
    
    // Keyboard Input
    if (InputModule.isKeyDown('KeyW')) direction.z -= 1;
    if (InputModule.isKeyDown('KeyS')) direction.z += 1;
    if (InputModule.isKeyDown('KeyA')) direction.x -= 1;
    if (InputModule.isKeyDown('KeyD')) direction.x += 1;

    // Normalize and apply move
    if (direction.x !== 0 || direction.z !== 0) {
        const mag = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        direction.x /= mag;
        direction.z /= mag;
        
        GameObjectModule.move(gameObject.id, direction, moveSpeed * dt);
    }

    // Mouse check
    if (InputModule.isMouseButtonDown(0)) {
        // Maybe change color or something
        // GameObjectModule.updateGameObject(gameObject.id, { mesh: { materialId: 'red' } });
    }
};

// Event Subscriptions
onCollisionEnter = (other) => {
    console.log(`[Script] ${gameObject.name} started colliding with ${other.name}`);
    // Play a sound when colliding
    AudioModule.playSound(gameObject.id + '_hit', 'hit.mp3', false, 0.5);
};

onCollisionExit = (other) => {
    console.log(`[Script] ${gameObject.name} stopped colliding with ${other.name}`);
};

onTriggerEnter = (other) => {
    console.log(`[Script] ${gameObject.name} entered trigger ${other.name}`);
};
