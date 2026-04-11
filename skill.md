# ⚙️ Gear Engine: Complete AI Skill Reference

This guide provides the exhaustive command-set and usage patterns for the Gear Engine. It is intended for AI agents to understand how to manipulate materials, physics, audio, and scenes via the REST API.

---

## 🛠️ API Fundamentals
- **Base URL**: `http://127.0.0.1:3005/api`
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
> - **FULL ACCESS**: For advanced logic, direct access to the **`THREE`** and **`RAPIER`** libraries is provided. These are to be used for custom math, complex physics queries, or direct engine manipulation.

---

## ⚡ 1. SCRIPTING & LOGIC (`/scripts`)
Scripts serve as the logic for GameObjects. They are standard JavaScript files saved in `assets/`.

### 📂 Script Asset Management
| Action | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Save/Create** | `POST` | `/scripts` | Save a new script or overwrite an existing one. |
| **Edit** | `PATCH` | `/scripts` | Update the content of an existing script. |
| **Delete** | `DELETE` | `/scripts/[fileName]` | Permanently remove a script from assets. |

#### Example: Save/Edit Script
```bash
curl -X POST "$API_URL/scripts" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "rotation_logic.js",
    "content": "function update(dt) { gameObject.rotate({x:0, y:1, z:0}, 50 * dt); }"
  }'
```

#### Example: Delete Script from Assets
```bash
curl -X DELETE "$API_URL/scripts/rotation_logic.js"
```

### 🔗 Script Attachment & Detachment
Attach or remove logic from specific GameObjects.

| Action | Method | Endpoint |
| :--- | :--- | :--- |
| **Attach** | `POST` | `/gameobjects/[ID]/scripts` |
| **Detach** | `DELETE` | `/gameobjects/[ID]/scripts/[fileName]` |

#### Example: Attach to Object
```bash
curl -X POST "$API_URL/gameobjects/[ID]/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "rotation_logic.js"}'
```

#### Example: Detach from Object
```bash
curl -X DELETE "$API_URL/gameobjects/[ID]/scripts/rotation_logic.js"
```

### 🧠 Essential Script Examples

Scripts have access to a rich set of lifecycle methods and engine modules. Below are common patterns used in game development:

```javascript
/* 1. Basic Movement & Rotation */
function update(dt) {
    // Move forward along the Z axis at 5 units per second
    gameObject.position.z -= 5 * dt; 
    // Rotate continuously around the Y axis
    gameObject.rotate({x: 0, y: 1, z: 0}, 90 * dt);
}

/* 2. Keyboard Input Handling */
function update(dt) {
    const speed = 10;
    // Basic WASD movement
    if (InputModule.isKeyDown('KeyW')) gameObject.position.z -= speed * dt;
    if (InputModule.isKeyDown('KeyS')) gameObject.position.z += speed * dt;
    if (InputModule.isKeyDown('KeyA')) gameObject.position.x -= speed * dt;
    if (InputModule.isKeyDown('KeyD')) gameObject.position.x += speed * dt;
    
    // Jump with Spacebar & check height (basic grounded check)
    if (InputModule.isKeyDown('Space') && gameObject.position.y < 0.6) {
        // Apply upward physics impulse
        gameObject.applyImpulse({ x: 0, y: 5, z: 0 });
    }
}

/* 3. Physics, Collisions, and Triggers */
function onCollisionEnter(other) {
    // Called when the rigid body hits another rigid body
    if (other.tag === 'Enemy') {
        console.log("Hit by enemy!");
        gameObject.setEnabled(false); // Destroy/hide the object
    }
}

function onTriggerEnter(other) {
    // Called for overlapping sensor colliders
    if (other.tag === 'Coin') {
        console.log("Coin collected!");
        other.setEnabled(false); // Consume the coin
    }
}

/* 4. Timers and Prefab Spawning */
let timer = 0;
function update(dt) {
    timer += dt;
    if (timer > 2.0) { // Every 2 seconds
        // Spawn a bullet prefab at current position
        const bulletOffset = { x: gameObject.position.x, y: gameObject.position.y, z: gameObject.position.z - 1 };
        GameObjectModule.instantiatePrefab('bullet.json', bulletOffset);
        timer = 0;
    }
}

/* 5. Tracking / LookAt */
function update(dt) {
    // Find player and rotate to face them
    const player = GameObjectModule.getGameObject('player-id'); // Or use tagging system
    if (player) {
        gameObject.lookAt(player.position);
    }
}

/* 6. Direct Access to THREE & RAPIER */
function update(dt) {
    // Using THREE.js for complex vector distance calculations
    const targetPos = new THREE.Vector3(10, 0, 10);
    const myPos = new THREE.Vector3(gameObject.position.x, gameObject.position.y, gameObject.position.z);
    
    if (myPos.distanceTo(targetPos) < 2.0) {
        console.log("Within bounds!");
    }

    // Using RAPIER directly to cast a physical ray downward
    const rayOrigin = { x: gameObject.position.x, y: gameObject.position.y, z: gameObject.position.z };
    const rayDir = { x: 0.0, y: -1.0, z: 0.0 };
    const maxToi = 4.0; 
    const solid = true;
    
    const ray = new RAPIER.Ray(rayOrigin, rayDir);
    
    // Cast ray against the physical world
    const hit = PhysicsModule.world.castRay(ray, maxToi, solid);
    if (hit != null) {
        // Retrieve the actual GameObject hit by the ray
        const hitGO = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle());
        if (hitGO) {
            console.log("Ray hit object:", hitGO.name, "at distance:", hit.toi);
        }
    }
}
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)
GameObjects combine meshes, physics, and scripting.

### List All Active Objects
Objects are to be listed first to understand the current scene context.
```bash
curl -X GET "$API_URL/gameobjects"
```

### Creating Objects
```bash
# Character (Kinematic)
curl -X POST "$API_URL/gameobjects" \
  -d '{"name": "Player", "modelUrl": "Soldier.glb", "isCharacter": true}'

# Rigid Body (Dynamic)
curl -X POST "$API_URL/gameobjects" \
  -d '{"name": "Crate", "primitive": "box", "type": "dynamic", "position": {"y": 5}}'
```

### 👁️ Visibility & Mastery
- `enabled`: `false` disables logic, physics, and hides the mesh.
- `mesh.visible`: `false` hides the mesh but keeps physics (colliders) active.

---

## 🎨 3. MATERIAL MODULE (`/materials`)
Materials define the surface properties of meshes.

### Full PBR Material Definition
```bash
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gold_metal",
    "props": {
      "color": "#ffd700",
      "metalness": 0.9,
      "roughness": 0.1
    }
  }'
```

---

## 🎥 4. CAMERA MODULE (`/cameras`)

### Dynamic Follow Camera
```bash
curl -X POST "$API_URL/cameras" \
  -d '{
    "name": "MainFollow",
    "type": "follow",
    "targetId": "[GO_ID]",
    "offset": {"x": 0, "y": 5, "z": 10}
  }'
```

---

## 🏎️ 5. VEHICLE PHYSICS (`/vehicles`)
Advanced raycast-based vehicle controllers.

### Create & Drive
```bash
# Create
curl -X POST "$API_URL/vehicles" \
  -d '{"id": "car", "chassisId": "[GO_ID]", "config": {...}}'

# Drive
curl -X PATCH "$API_URL/vehicles/car/control" \
  -d '{"engineForce": 500.0, "steering": 0.2}'
```

---

## 💡 6. LIGHT MODULE (`/lights`)
```bash
curl -X POST "$API_URL/lights" \
  -d '{"type": "directional", "intensity": 2.5, "color": "#ffffff"}'
```

---

## 🔊 7. AUDIO MODULE (`/audio`)
```bash
curl -X POST "$API_URL/audio/play" \
  -d '{"id": "bgm", "assetPath": "music.mp3", "loop": true}'
```

---

## 🌆 8. SKYBOX & ENVIRONMENT (`/skybox`)
```bash
curl -X POST "$API_URL/skybox" \
  -d '{"type": "equirectangular", "assetPath": "sky.hdr"}'
```

---

## 💾 9. SCENE PERSISTENCE (`/scenes`)
```bash
# Export
curl -X POST "$API_URL/scenes/export" -d '{"fileName": "save.json"}'

# Load
curl -X POST "$API_URL/scenes/load" -d '{"fileName": "save.json"}'
```

---

## 🔎 10. SYSTEM & DEBUGGING
- **State Sync**: `GET /api/sync` - Returns positions and rotations.
- **Source Inspection**: `GET /api/source?module=[ModuleName]` - View engine internal code.
- **Collider Gizmos**: `POST /api/colliders/gizmos` - Toggle physics wireframes.
