# ⚙️ Gear Engine: Complete AI Skill Reference

This guide provides the exhaustive command-set and usage patterns for the Gear Engine. It is intended for AI agents to understand how to manipulate materials, physics, audio, and scenes via the REST API and Scripting system.

---

## 🛠️ API Fundamentals
- **Method Conventions**: `GET`, `POST`, `PATCH`, `DELETE`
- **Header**: `Content-Type: application/json`

### 💻 Cross-Platform Terminal Usage
- **Linux/macOS (curl)**:
  `curl -X GET http://127.0.0.1:3005/api/gameobjects`
- **Windows (PowerShell)**:
  `Invoke-RestMethod -Uri http://127.0.0.1:3005/api/gameobjects -Method Get`

### 🤖 AI Self-Healing & Discovery
> [!IMPORTANT]
> - **404 Errors**: In the event that the Gear Engine base URL returns a **404** or appears unresponsive, a ping to `GET /api/gameobjects` **MUST** be performed immediately. This confirms engine availability and retrieves the current scene's state.
> - **Script Errors**: When errors are encountered during script execution or attachment, **NODE.JS LOGS MUST BE REQUESTED** from the terminal. Detailed error stacks are often output to the Node console and are not visible via the API.
> - **Attachment Workflow**: A script **MUST** be saved to the engine via `POST /api/scripts` before any attempt is made to attach it to a GameObject. If a script attachment fails with a 400 error, it is often because the file does not exist in the `assets/` directory or contains syntax errors.
> - **Physics-First Workflow**: This engine is optimized for physics. Moving dynamic objects by setting `.position` directly is discouraged for gameplay; instead, **impulses and velocities** should be used to ensure Realistic Physics interaction.
> - **Module Priority**: Always attempt to use built-in modules (`GameObjectModule`, `PhysicsModule`, etc.) before using raw **`THREE`** or **`RAPIER`** libraries. Raw libraries should only be used for high-complexity math or direct engine manipulation beyond module capabilities.

---

## ⚡ 1. SCRIPTING & LOGIC (`/scripts`)
Scripts are the primary way to implement game logic. They have access to the full engine state.

### 🧠 Modern Scripting Patterns (Physics-First)

#### Basic Player Controller (Physics Velocity)
```javascript
function update(dt) {
    const speed = 5;
    let vel = { x: 0, y: 0, z: 0 };
    
    if (InputModule.isKeyDown('KeyW')) vel.z = -speed;
    if (InputModule.isKeyDown('KeyS')) vel.z = speed;
    if (InputModule.isKeyDown('KeyA')) vel.x = -speed;
    if (InputModule.isKeyDown('KeyD')) vel.x = speed;
    
    // Apply velocity directly to the rigid body for responsive movement
    gameObject.setLinearVelocity(vel);
    
    // Jump using an impulse (instant force)
    if (InputModule.isKeyDown('Space') && Math.abs(gameObject.position.y) < 0.1) {
        gameObject.applyImpulse({ x: 0, y: 10, z: 0 });
    }
}
```

#### Collision & Interaction
```javascript
function onCollisionEnter(other) {
    // Check tags for interaction logic
    if (other.tag === 'Lava') {
        gameObject.position = { x: 0, y: 5, z: 0 }; // Teleport back to start
    }
}

function onTriggerEnter(other) {
    if (other.tag === 'Checkpoint') {
        console.log("Checkpoint reached: " + other.name);
        AudioModule.playSound('ping', 'pickup.wav', false, 0.5);
    }
}
```

#### Advanced Physics rotation
```javascript
function update(dt) {
    // Apply angular velocity to spin the object
    gameObject.setAngularVelocity({ x: 0, y: 5, z: 0 });
    
    // Or apply a torque impulse for a sudden spin
    if (InputModule.isKeyDown('KeyQ')) {
        gameObject.applyTorqueImpulse({ x: 0, y: 20, z: 0 });
    }
}
```

#### Module Interaction (Spawning & Audio)
```javascript
let cooldown = 0;
function update(dt) {
    cooldown -= dt;
    if (InputModule.isKeyDown('KeyF') && cooldown <= 0) {
        // Instantiate a prefab from assets/ projectile.json
        const spawnPos = { 
            x: gameObject.position.x, 
            y: gameObject.position.y + 1, 
            z: gameObject.position.z - 2 
        };
        const proj = GameObjectModule.instantiatePrefab('projectile.json', spawnPos);
        
        // Give the projectile initial speed
        if (proj) proj.setLinearVelocity({ x: 0, y: 0, z: -20 });
        
        AudioModule.playSound('shoot_eff', 'laser.mp3', false, 0.3);
        cooldown = 0.5;
    }
}
```

#### Raw THREE/RAPIER Usage (Last Resort)
```javascript
function update(dt) {
    // Vector math with THREE
    const vecA = new THREE.Vector3(gameObject.position.x, 0, gameObject.position.z);
    const vecB = new THREE.Vector3(10, 0, 10);
    const dist = vecA.distanceTo(vecB);
    
    // Raycasting with Raw RAPIER
    const ray = new RAPIER.Ray(gameObject.position, { x: 0, y: -1, z: 0 });
    const hit = PhysicsModule.world.castRay(ray, 10, true);
    if (hit) {
        const hitObj = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle());
        if (hitObj) console.log("Detected ground: " + hitObj.name);
    }
}
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)
The fundamental building block. Combines Mesh, Physics, and Scripts.

| Action | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **List All** | `GET` | `/api/gameobjects` | Retrieve all active objects. |
| **Create** | `POST` | `/api/gameobjects` | Add a new primitive or model-based object. |
| **Update** | `PATCH` | `/api/gameobjects/[ID]` | Modify properties (transform, visibility, color). |
| **Delete** | `DELETE` | `/api/gameobjects/[ID]` | Remove object and its physics body. |

### Creating Complex Objects
```bash
# Model with Physics
curl -X POST "$API_URL/gameobjects" \
  -d '{
    "name": "Guard",
    "modelUrl": "Soldier.glb",
    "isCharacter": true,
    "position": {"x": 5, "y": 0, "z": 5}
  }'
```

---

## 🎨 3. MATERIAL MODULE (`/materials`)
Define surface aesthetics.

```bash
curl -X POST "$API_URL/materials" \
  -d '{
    "id": "neon_blue",
    "props": {
      "color": "#00ffff",
      "emissive": "#003333",
      "roughness": 0.2
    }
  }'
```

---

## 🏎️ 4. VEHICLE PHYSICS (`/vehicles`)
Specific raycast-based vehicle controllers.

```bash
curl -X POST "$API_URL/vehicles" \
  -d '{
    "id": "player_car",
    "chassisId": "[GO_ID]",
    "config": {
        "mass": 1500,
        "suspensionStiffness": 20.0
    }
  }'
```

---

## 🔎 5. SYSTEM & DEBUGGING
- **State Sync**: `GET /api/sync` - Returns positions, rotations, and audio events for renderers.
- **Source Inspection**: `GET /api/source?module=[ModuleName]` - View engine internal code for any module.
- **Physics Debug**: `POST /api/colliders/gizmos` - `{"enabled": true}` toggles wireframes.
