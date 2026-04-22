// premade behaviour script for Character Controller
properties.speed = properties.speed !== undefined ? properties.speed : 5.0;
properties.jumpForce = properties.jumpForce !== undefined ? properties.jumpForce : 12.0;

// Input properties manipulated by AI or scripts
properties.horizontal = properties.horizontal !== undefined ? properties.horizontal : 0;
properties.vertical = properties.vertical !== undefined ? properties.vertical : 0;
properties.doJump = properties.doJump !== undefined ? properties.doJump : false;

onStart = () => {
    // Ensure the body doesn't rotate if it's a character
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    if (body) {
        body.lockRotations(true, true);
    }
};

update = (dt) => {
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    if (!body) return;

    const currentVel = body.linvel();
    
    // Apply horizontal and vertical movement
    gameObject.setLinearVelocity({ 
        x: properties.horizontal * properties.speed, 
        y: currentVel.y, 
        z: properties.vertical * properties.speed 
    });

    // Handle jumping
    if (properties.doJump && Math.abs(currentVel.y) < 0.2) {
        gameObject.applyImpulse({ x: 0, y: properties.jumpForce, z: 0 });
        properties.doJump = false; // consume the jump
    }
};
