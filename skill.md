# ⚙️ Gear Engine: Complete AI Skill Reference

This guide provides the exhaustive command-set, module reference, and usage patterns for the Gear Engine. It is intended for AI agents to understand how to build full games using the REST API and Scripting system.

**Base URL**: `http://127.0.0.1:3005`  
**API Root**: `/api`  
**Coordinate System**: Right-handed, Y-up. Units in meters. Rotations are Quaternions `{x, y, z, w}`.

---

## 🛠️ API Fundamentals
- **Method Conventions**: `GET`, `POST`, `PATCH`, `DELETE`
- **Header**: `Content-Type: application/json`

### 💻 Cross-Platform Terminal Usage
- **Linux/macOS (curl)**:
  ```bash
  API_URL="http://127.0.0.1:3005/api"
  curl -s -X GET "$API_URL/gameobjects"
  ```
- **Windows (PowerShell)**:
  ```powershell
  $API_URL = "http://127.0.0.1:3005/api"
  Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Get
  ```

### 🤖 AI Self-Healing & Discovery
> [!IMPORTANT]
> - **404 Errors**: In the event that the Gear Engine base URL returns a **404** or appears unresponsive, a ping to `GET /api/gameobjects` **MUST** be performed immediately. This confirms engine availability and retrieves the current scene's state.
> - **Script Errors**: When errors are encountered during script execution or attachment, **NODE.JS LOGS MUST BE REQUESTED** from the terminal. Detailed error stacks are often output to the Node console and are not visible via the API.
> - **Attachment Workflow**: A script **MUST** be saved to the engine via `POST /api/scripts` before any attempt is made to attach it to a GameObject. If a script attachment fails with a 400 error, it is often because the file does not exist in the `assets/` directory or contains syntax errors.
> - **Physics-First Workflow**: This engine is optimized for physics. Moving dynamic objects by setting `.position` directly is discouraged for gameplay; instead, **impulses and velocities** should be used to ensure realistic physics interaction.
> - **Module Priority**: Always attempt to use built-in modules (`GameObjectModule`, `PhysicsModule`, etc.) before using raw **`THREE`** or **`RAPIER`** libraries. Raw libraries should only be used for high-complexity math or direct engine manipulation beyond module capabilities.
> - **Source Inspection**: When unsure about a module's API surface, use `GET /api/source?module=ModuleName` to read engine source code directly. Available modules: `GameObjectModule`, `PhysicsModule`, `ScriptModule`, `LightModule`, `UIModule`, `AudioModule`, `CameraModule`, `SkyboxModule`, `InputModule`, `MaterialModule`, `MeshModule`, `CollidersModule`, `SceneModule`, `VehicleModule`.

---

## ⚡ 1. SCRIPTING & LOGIC (Most Important)

Scripts are the primary way to implement game logic. They run inside a sandboxed `vm` context and have direct access to **all engine modules**, `THREE.js`, and `RAPIER` physics. This means scripts can do **everything the API can do and more**.

### 📜 Script Lifecycle Events

| Event | Signature | When it fires |
|:---|:---|:---|
| `onStart` | `function onStart()` | Once, immediately after the script is attached. |
| `update` | `function update(dt)` | Every frame (~60fps). `dt` = seconds since last frame. |
| `fixedUpdate` | `function fixedUpdate(dt)` | Every physics tick (60Hz). `dt` is always `1/60`. |
| `onCollisionEnter` | `function onCollisionEnter(other)` | When this object starts touching another. `other` = the other GameObject. |
| `onCollisionExit` | `function onCollisionExit(other)` | When this object stops touching another. |
| `onTriggerEnter` | `function onTriggerEnter(other)` | When entering a trigger volume. |
| `onTriggerExit` | `function onTriggerExit(other)` | When leaving a trigger volume. |

### 🧰 Modules Available Inside Scripts

Every script automatically has access to:

| Variable | Description |
|:---|:---|
| `gameObject` | The GameObject this script is attached to. Has `.position`, `.rotation`, `.scale`, `.name`, `.tag`, `.id`, `.enabled`, etc. |
| `GameObjectModule` | Create, find, delete, and manage all GameObjects. |
| `PhysicsModule` | Access the Rapier physics world (`PhysicsModule.world`), create bodies/colliders. |
| `InputModule` | Check keyboard and mouse state. |
| `AudioModule` | Play, stop, and control sounds. |
| `UIModule` | Create and manipulate HUD elements (labels, buttons, inputs). |
| `LightModule` | Create, update, and delete lights. |
| `MaterialModule` | Create and update materials. |
| `CameraModule` | Create cameras, set the active camera, follow targets. |
| `SkyboxModule` | Change the skybox color, equirectangular map, or cubemap. |
| `SceneModule` | Export/load scenes, manage scene graph. |
| `MeshModule` | Register and query mesh metadata. |
| `CollidersModule` | Toggle debug gizmos, inspect collider data. |
| `THREE` | Full THREE.js library for vector math, quaternions, raycasting helpers. |
| `RAPIER` | Full Rapier physics library for advanced physics operations. |
| `console` | Standard `console.log()`, `console.error()`, etc. |

### 🎮 GameObject Helper Methods (In Scripts)

The `gameObject` variable has these built-in helper methods:

| Method | Description |
|:---|:---|
| `gameObject.setLinearVelocity({x, y, z})` | Set the linear velocity of the physics body. |
| `gameObject.setAngularVelocity({x, y, z})` | Set the angular (spin) velocity. |
| `gameObject.applyImpulse({x, y, z})` | Apply an instant force (good for jumps, explosions). |
| `gameObject.applyTorqueImpulse({x, y, z})` | Apply an instant rotational force. |
| `gameObject.move(direction, amount)` | Translate by `direction * amount`. |
| `gameObject.rotate(axis, angleDegrees)` | Rotate around `axis` by degrees. |
| `gameObject.lookAt({x, y, z})` | Face towards a world position (Y-axis rotation). |
| `gameObject.setEnabled(bool)` | Enable/disable the object (hides and stops physics). |
| `gameObject.position = {x, y, z}` | Teleport (auto-syncs to physics body). |
| `gameObject.rotation = {x, y, z, w}` | Set rotation quaternion (auto-syncs). |
| `gameObject.scale = {x, y, z}` | Set scale (auto-updates collider). |

---

### 🏃 Script Example: WASD Player Controller with Jump
```javascript
// player_controller.js — Attach to a dynamic GameObject
const speed = 8;
const jumpForce = 12;
let isGrounded = false;

function onCollisionEnter(other) {
    // If colliding with something below, the player is grounded
    if (other.position.y < gameObject.position.y) {
        isGrounded = true;
    }
}

function onCollisionExit(other) {
    isGrounded = false;
}

function update(dt) {
    let vel = { x: 0, y: 0, z: 0 };

    // Get current Y velocity to preserve gravity
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    const currentVel = body ? body.linvel() : { x: 0, y: 0, z: 0 };

    if (InputModule.isKeyDown('KeyW')) vel.z = -speed;
    if (InputModule.isKeyDown('KeyS')) vel.z = speed;
    if (InputModule.isKeyDown('KeyA')) vel.x = -speed;
    if (InputModule.isKeyDown('KeyD')) vel.x = speed;

    // Keep existing Y velocity (gravity) but override X/Z for movement
    vel.y = currentVel.y;
    gameObject.setLinearVelocity(vel);

    // Jump
    if (InputModule.isKeyDown('Space') && isGrounded) {
        gameObject.applyImpulse({ x: 0, y: jumpForce, z: 0 });
        isGrounded = false;
    }
}
```

### 🔄 Script Example: Smooth Rotation / Spinning Object
```javascript
// spinner.js — Attach to any object to make it spin
const spinSpeed = 3; // radians per second on Y axis

function update(dt) {
    gameObject.setAngularVelocity({ x: 0, y: spinSpeed, z: 0 });
}
```

### 🔄 Script Example: Rotate to Face Movement Direction
```javascript
// face_direction.js — Object faces the direction it moves
function update(dt) {
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    if (!body) return;
    const vel = body.linvel();

    // Only rotate if moving
    if (Math.abs(vel.x) > 0.1 || Math.abs(vel.z) > 0.1) {
        const targetPos = {
            x: gameObject.position.x + vel.x,
            y: gameObject.position.y,
            z: gameObject.position.z + vel.z
        };
        gameObject.lookAt(targetPos);
    }
}
```

### 🏗️ Script Example: Move (Kinematic Translate)
```javascript
// sliding_platform.js — Attach to a kinematic object
let timer = 0;
const distance = 5;
const moveSpeed = 2;

function update(dt) {
    timer += dt * moveSpeed;
    const offset = Math.sin(timer) * distance;
    gameObject.position = {
        x: offset,
        y: gameObject.position.y,
        z: gameObject.position.z
    };
}
```

### 🎬 Script Example: Animation Controller
```javascript
// anim_controller.js — Attach to a character model with animations
let currentAnim = 'Idle';

function onStart() {
    // Play idle animation on start
    GameObjectModule.playAnimation(gameObject.id, 'Idle');
}

function update(dt) {
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    if (!body) return;
    const vel = body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

    let targetAnim = 'Idle';
    if (speed > 0.5) targetAnim = 'Run';
    if (speed > 0.1 && speed <= 0.5) targetAnim = 'Walk';

    if (targetAnim !== currentAnim) {
        currentAnim = targetAnim;
        GameObjectModule.playAnimation(gameObject.id, currentAnim);
    }
}
```

### 💡 Script Example: Dynamic Lighting Control
```javascript
// day_night.js — Attach to any object (acts as controller)
let time = 0;

function onStart() {
    // Create a sun light
    LightModule.createLight({
        name: 'Sun',
        type: 'directional',
        color: '#ffe0a0',
        intensity: 2,
        position: { x: 10, y: 20, z: 10 }
    });

    // Ambient fill light
    LightModule.createLight({
        name: 'Ambient Fill',
        type: 'point',
        color: '#334488',
        intensity: 0.5,
        position: { x: 0, y: 10, z: 0 },
        range: 100
    });
}

function update(dt) {
    time += dt * 0.1; // Slow cycle

    // Vary skybox color between day and night
    const r = Math.floor(128 + 127 * Math.sin(time));
    const g = Math.floor(100 + 100 * Math.sin(time - 1));
    const b = Math.floor(180 + 75 * Math.sin(time + 1));
    const hex = '#' + r.toString(16).padStart(2, '0') +
                       g.toString(16).padStart(2, '0') +
                       b.toString(16).padStart(2, '0');
    SkyboxModule.setColor(hex);
}
```

### 🖥️ Script Example: HUD / UI Elements
```javascript
// hud.js — Create an in-game HUD with score and health
let score = 0;
let health = 100;

function onStart() {
    // Create HUD labels
    UIModule.createLabel('score_label', 'Score: 0', 20, 20);
    UIModule.createLabel('health_label', 'Health: 100', 20, 50);

    // Create a restart button (hidden initially)
    UIModule.createButton('restart_btn', 'Restart Game', 300, 300);

    // Listen for button clicks
    UIModule.on('restart_btn', 'click', () => {
        score = 0;
        health = 100;
        UIModule.setLabel('score_label', 'Score: 0');
        UIModule.setLabel('health_label', 'Health: 100');
        gameObject.position = { x: 0, y: 2, z: 0 };
    });
}

function update(dt) {
    // Update HUD text
    UIModule.setLabel('score_label', 'Score: ' + score);
    UIModule.setLabel('health_label', 'Health: ' + health);
}

function onCollisionEnter(other) {
    if (other.tag === 'Coin') {
        score += 10;
        other.setEnabled(false); // Hide the coin
        AudioModule.playSound('coin_sfx', 'coin.wav', false, 0.5);
    }
    if (other.tag === 'Hazard') {
        health -= 25;
        if (health <= 0) {
            UIModule.setLabel('health_label', 'GAME OVER');
        }
    }
}
```

### 📸 Script Example: Follow Camera
```javascript
// follow_camera.js — Attach to the player; creates a camera that follows
let camId = null;

function onStart() {
    // Create a follow camera targeting this object
    const cam = CameraModule.createCamera({
        name: 'Player Cam',
        type: 'follow',
        targetId: gameObject.id,
        offset: { x: 0, y: 4, z: 8 },
        fov: 60
    });
    camId = cam.id;

    // Make it the active camera
    CameraModule.setActiveCamera(camId);
}

function update(dt) {
    if (!camId) return;

    // Manually update camera position to follow the player
    const cam = CameraModule.getCamera(camId);
    if (cam) {
        cam.position = {
            x: gameObject.position.x + cam.offset.x,
            y: gameObject.position.y + cam.offset.y,
            z: gameObject.position.z + cam.offset.z
        };
    }
}
```

### 🔊 Script Example: Audio Zones
```javascript
// audio_zone.js — Play background music when player enters area
let playing = false;

function onTriggerEnter(other) {
    if (other.tag === 'Player' && !playing) {
        AudioModule.playSound('zone_music', 'ambient_forest.mp3', true, 0.3);
        playing = true;
    }
}

function onTriggerExit(other) {
    if (other.tag === 'Player' && playing) {
        AudioModule.stopSound('zone_music');
        playing = false;
    }
}
```

### 🎯 Script Example: Raycasting (Ground Detection)
```javascript
// raycast_ground.js — Raycast downward to detect ground
function update(dt) {
    const ray = new RAPIER.Ray(
        { x: gameObject.position.x, y: gameObject.position.y, z: gameObject.position.z },
        { x: 0, y: -1, z: 0 } // Downward
    );
    const hit = PhysicsModule.world.castRay(ray, 10, true);
    if (hit) {
        const groundDist = hit.time;
        const hitCollider = hit.collider;
        const groundObj = GameObjectModule.getGameObjectByColliderHandle(hitCollider.handle);
        if (groundObj) {
            console.log('Ground: ' + groundObj.name + ' at distance ' + groundDist.toFixed(2));
        }
    }
}
```

### 💥 Script Example: Projectile Spawner
```javascript
// projectile_spawner.js — Press F to fire projectiles
let cooldown = 0;

function update(dt) {
    cooldown -= dt;
    if (InputModule.isKeyDown('KeyF') && cooldown <= 0) {
        // Create a small sphere projectile
        const spawnPos = {
            x: gameObject.position.x,
            y: gameObject.position.y + 1,
            z: gameObject.position.z - 2
        };

        const proj = GameObjectModule.createGameObject({
            name: 'Bullet',
            type: 'dynamic',
            primitive: 'sphere',
            position: spawnPos,
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            mass: 0.5,
            tag: 'Projectile'
        });

        // Shoot it forward
        proj.setLinearVelocity({ x: 0, y: 2, z: -30 });

        AudioModule.playSound('shoot_sfx', 'laser.mp3', false, 0.3);
        cooldown = 0.3; // Fire rate

        // Auto-destroy after 3 seconds
        setTimeout(() => {
            GameObjectModule.deleteGameObject(proj.id);
        }, 3000);
    }
}
```

### 🏎️ Script Example: Vehicle Driving Controller
```javascript
// vehicle_drive.js — Attach to the chassis GameObject of a vehicle
function update(dt) {
    const vehicleId = gameObject.vehicleId;
    if (!vehicleId) return;

    const vehicle = require('./VehicleModule').getVehicle(vehicleId);
    if (!vehicle) return;

    let engineForce = 0;
    let steering = 0;
    let brake = 0;

    if (InputModule.isKeyDown('KeyW')) engineForce = 800;
    if (InputModule.isKeyDown('KeyS')) engineForce = -400;
    if (InputModule.isKeyDown('KeyA')) steering = -0.5;
    if (InputModule.isKeyDown('KeyD')) steering = 0.5;
    if (InputModule.isKeyDown('Space')) brake = 50;

    vehicle.wheels.forEach(wheel => {
        if (!wheel.isFront) wheel.engineForce = engineForce;
        if (wheel.isFront) wheel.steering = steering;
        wheel.brake = brake;
    });
}
```

### 🎨 Script Example: Dynamic Material Changes
```javascript
// material_changer.js — Change object color over time
let hue = 0;

function onStart() {
    // Create a custom material for this object
    MaterialModule.createMaterial('rainbow_mat', {
        color: '#ff0000',
        roughness: 0.3,
        emissive: '#000000'
    });
    gameObject.mesh.materialId = 'rainbow_mat';
}

function update(dt) {
    hue = (hue + dt * 50) % 360;
    // Convert HSL to hex
    const c = hslToHex(hue, 100, 50);
    MaterialModule.updateMaterial('rainbow_mat', { color: c });
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
}
```

### 🌍 Script Example: Scene Management
```javascript
// level_manager.js — Save/Load scenes from a script
function onStart() {
    console.log('Level Manager active. Press 1 to save, 2 to load.');
}

function update(dt) {
    if (InputModule.isKeyDown('Digit1')) {
        SceneModule.exportScene(SceneModule.activeSceneId, 'level1.json');
        console.log('Scene saved!');
    }
    if (InputModule.isKeyDown('Digit2')) {
        SceneModule.loadScene('level1.json');
        console.log('Scene loaded!');
    }
}
```

### 🔍 Script Example: Finding Other GameObjects
```javascript
// enemy_ai.js — Find the player and chase them
let player = null;

function onStart() {
    // Find the player by tag
    const allObjects = GameObjectModule.getAllGameObjects();
    player = allObjects.find(go => go.tag === 'Player');
    if (player) console.log('Found player: ' + player.name);
}

function update(dt) {
    if (!player) return;

    // Calculate direction to player
    const dx = player.position.x - gameObject.position.x;
    const dz = player.position.z - gameObject.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 1.5) {
        const speed = 3;
        const dirX = dx / dist;
        const dirZ = dz / dist;
        gameObject.setLinearVelocity({
            x: dirX * speed,
            y: 0,
            z: dirZ * speed
        });

        // Face the player
        gameObject.lookAt(player.position);
    } else {
        gameObject.setLinearVelocity({ x: 0, y: 0, z: 0 });
    }
}
```

### ⏫ Script Example: Elevator / Moving Platform
```javascript
// elevator.js — Moves up and down, carrying objects on top
let startY = 0;
let timer = 0;
const height = 5;
const speed = 1;

function onStart() {
    startY = gameObject.position.y;
}

function update(dt) {
    timer += dt * speed;
    const newY = startY + Math.sin(timer) * height;
    gameObject.position = {
        x: gameObject.position.x,
        y: newY,
        z: gameObject.position.z
    };
}
```

### 🎰 Script Example: Object Spawner on Timer
```javascript
// spawner.js — Spawns falling cubes every 2 seconds
let timer = 0;
let spawnCount = 0;

function update(dt) {
    timer += dt;
    if (timer >= 2.0 && spawnCount < 20) {
        timer = 0;
        spawnCount++;
        const x = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;

        GameObjectModule.createGameObject({
            name: 'FallingBox_' + spawnCount,
            type: 'dynamic',
            primitive: 'cube',
            position: { x: x, y: 15, z: z },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            tag: 'FallingBox'
        });
    }
}
```

### 🎮 Script Example: Toggle Objects with Keyboard
```javascript
// toggle_visibility.js — Press T to toggle object on/off
let visible = true;

function update(dt) {
    if (InputModule.isKeyDown('KeyT')) {
        visible = !visible;
        gameObject.setEnabled(visible);
    }
}
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)

The fundamental building block. Combines Mesh, Physics, and Scripts.

### API Reference

| Action | Method | Endpoint | Body / Params | Description |
|:---|:---|:---|:---|:---|
| **List All** | `GET` | `/api/gameobjects` | — | Retrieve all active objects. |
| **Get One** | `GET` | `/api/gameobjects/:id` | — | Get a specific object by ID. |
| **Create** | `POST` | `/api/gameobjects` | See below | Add a new primitive or model-based object. |
| **Update** | `PATCH` | `/api/gameobjects/:id` | See below | Modify properties (transform, visibility, color). |
| **Delete** | `DELETE` | `/api/gameobjects/:id` | — | Remove object and its physics body. |
| **Move** | `POST` | `/api/gameobjects/:id/move` | `{direction, amount}` | Translate by direction * amount. |
| **Rotate** | `POST` | `/api/gameobjects/:id/rotate` | `{axis, angle}` | Rotate around axis by angle (degrees). |
| **Play Animation** | `POST` | `/api/gameobjects/:id/animations/play` | `{name}` | Play a named animation clip. |
| **Report Animations** | `POST` | `/api/gameobjects/:id/animations/report` | `{animations}` | Register available animation clip names reported by renderer. |
| **Attach Script** | `POST` | `/api/gameobjects/:id/scripts` | `{fileName}` | Attach a saved script file. |
| **Detach Script** | `DELETE` | `/api/gameobjects/:id/scripts/:fileName` | — | Remove a script from an object. |
| **Export Prefab** | `POST` | `/api/gameobjects/:id/export` | `{fileName}` | Save object as a reusable prefab JSON. |

### Create GameObject Body Schema

```json
{
    "name": "My Object",
    "type": "dynamic|static|kinematic",
    "primitive": "cube|sphere|cylinder|cone|capsule|torus",
    "position": {"x": 0, "y": 0, "z": 0},
    "rotation": {"x": 0, "y": 0, "z": 0, "w": 1},
    "scale": {"x": 1, "y": 1, "z": 1},
    "mass": 1,
    "modelUrl": "model.glb",
    "isCharacter": false,
    "tag": "Player",
    "enabled": true
}
```

**Physics Types:**
| Type | Behavior |
|:---|:---|
| `dynamic` | Affected by gravity and forces. For gameplay objects. |
| `static` | Immovable. For floors, walls, terrain. |
| `kinematic` | Moved by code only, not affected by forces. For platforms, elevators. |

**Primitive Shapes:**
| Shape | Collider Used |
|:---|:---|
| `cube` | Box (cuboid) |
| `sphere` | Ball |
| `cylinder` | Cylinder |
| `cone` | Cone |
| `capsule` | Capsule (good for characters) |
| `torus` | Cylinder approximation |

### Example: Creating Objects (curl)
```bash
# Static ground platform
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ground", "type": "static", "primitive": "cube", "position": {"x":0,"y":-0.5,"z":0}, "scale": {"x":20,"y":1,"z":20}}'

# Dynamic physics ball
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ball", "type": "dynamic", "primitive": "sphere", "position": {"x":0,"y":5,"z":0}, "scale": {"x":0.5,"y":0.5,"z":0.5}}'

# Character with model
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Player", "modelUrl": "Soldier.glb", "isCharacter": true, "type": "dynamic", "position": {"x":0,"y":2,"z":0}, "tag": "Player"}'

# Kinematic moving platform
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Platform", "type": "kinematic", "primitive": "cube", "position": {"x":0,"y":3,"z":-5}, "scale": {"x":3,"y":0.3,"z":3}}'
```

### Example: Moving and Rotating (curl)
```bash
# Move object forward by 5 units on Z
curl -X POST "$API_URL/gameobjects/OBJECT_ID/move" \
  -H "Content-Type: application/json" \
  -d '{"direction": {"x":0,"y":0,"z":-1}, "amount": 5}'

# Rotate 45 degrees around Y axis
curl -X POST "$API_URL/gameobjects/OBJECT_ID/rotate" \
  -H "Content-Type: application/json" \
  -d '{"axis": {"x":0,"y":1,"z":0}, "angle": 45}'

# Teleport to new position via PATCH
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"position": {"x":5,"y":2,"z":10}}'

# Set velocity via PATCH
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"physics": {"linvel": {"x":0,"y":0,"z":-10}}}'

# Set angular velocity via PATCH
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"physics": {"angvel": {"x":0,"y":5,"z":0}}}'

# Change tag
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"tag": "Enemy"}'

# Enable/disable object
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Change visibility only (keep physics active)
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"mesh": {"visible": false}}'

# Play animation
curl -X POST "$API_URL/gameobjects/OBJECT_ID/animations/play" \
  -H "Content-Type: application/json" \
  -d '{"name": "Run"}'
```

---

## 📝 3. SCRIPT MANAGEMENT (`/scripts`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Save/Create** | `POST` | `/api/scripts` | `{fileName, content}` | Save a `.js` script file to `assets/`. |
| **Edit** | `PATCH` | `/api/scripts` | `{fileName, content}` | Overwrite an existing script. |
| **Delete** | `DELETE` | `/api/scripts/:fileName` | — | Delete a script file from `assets/`. |
| **Attach** | `POST` | `/api/gameobjects/:id/scripts` | `{fileName}` | Attach a script to a GameObject. |
| **Detach** | `DELETE` | `/api/gameobjects/:id/scripts/:fileName` | — | Stop and remove a script from an object. |

### Full Workflow: Create, Save, Attach
```bash
# Step 1: Save the script file
curl -X POST "$API_URL/scripts" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "player_move.js",
    "content": "function update(dt) {\n  let vel = {x:0, y:0, z:0};\n  if (InputModule.isKeyDown(\"KeyW\")) vel.z = -5;\n  if (InputModule.isKeyDown(\"KeyS\")) vel.z = 5;\n  if (InputModule.isKeyDown(\"KeyA\")) vel.x = -5;\n  if (InputModule.isKeyDown(\"KeyD\")) vel.x = 5;\n  gameObject.setLinearVelocity(vel);\n}"
  }'

# Step 2: Create a GameObject
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Player", "type": "dynamic", "primitive": "cube", "position": {"x":0,"y":2,"z":0}, "tag": "Player"}'

# Step 3: Attach (use the ID returned from step 2)
curl -X POST "$API_URL/gameobjects/PLAYER_ID/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "player_move.js"}'

# Edit the script later
curl -X PATCH "$API_URL/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "player_move.js", "content": "// Updated script content..."}'

# Detach the script
curl -X DELETE "$API_URL/gameobjects/PLAYER_ID/scripts/player_move.js"

# Delete the script file entirely
curl -X DELETE "$API_URL/scripts/player_move.js"
```

---

## 💡 4. LIGHT MODULE (`/lights`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **List** | `GET` | `/api/lights` | — | Get all lights. |
| **Create** | `POST` | `/api/lights` | See below | Add a light to the scene. |
| **Update** | `PATCH` | `/api/lights/:id` | Any light prop | Modify a light's properties. |
| **Delete** | `DELETE` | `/api/lights/:id` | — | Remove a light. |

### Light Types & Properties

| Property | Type | Description |
|:---|:---|:---|
| `name` | string | Display name. |
| `type` | `point`, `directional`, `spot` | Light type. |
| `color` | hex string | Light color (e.g., `#ffffff`). |
| `intensity` | number | Brightness multiplier. |
| `position` | `{x,y,z}` | World position. |
| `range` | number | Maximum distance for point/spot lights. |

### Examples
```bash
# Directional sun light
curl -X POST "$API_URL/lights" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sun", "type": "directional", "color": "#fffff0", "intensity": 2.0, "position": {"x":10,"y":20,"z":5}}'

# Point light (like a torch)
curl -X POST "$API_URL/lights" \
  -H "Content-Type: application/json" \
  -d '{"name": "Torch", "type": "point", "color": "#ff8833", "intensity": 1.5, "position": {"x":3,"y":2,"z":3}, "range": 15}'

# Spot light
curl -X POST "$API_URL/lights" \
  -H "Content-Type: application/json" \
  -d '{"name": "Spotlight", "type": "spot", "color": "#ffffff", "intensity": 3.0, "position": {"x":0,"y":10,"z":0}, "range": 20}'

# Update light intensity
curl -X PATCH "$API_URL/lights/LIGHT_ID" \
  -H "Content-Type: application/json" \
  -d '{"intensity": 0.5, "color": "#ff0000"}'

# Delete a light
curl -X DELETE "$API_URL/lights/LIGHT_ID"
```

### Script: Dynamic Lighting
```javascript
// Scripts have full LightModule access
function onStart() {
    // Create multiple lights from script
    LightModule.createLight({
        name: 'RedAlert',
        type: 'point',
        color: '#ff0000',
        intensity: 3,
        position: { x: 0, y: 3, z: 0 },
        range: 20
    });
}
```

---

## 🎨 5. MATERIAL MODULE (`/materials`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Create** | `POST` | `/api/materials` | `{id, props}` | Create a named material. |
| **Update** | `PATCH` | `/api/materials/:id` | `{props}` or props directly | Update material properties. |

### Material Properties

| Property | Type | Description |
|:---|:---|:---|
| `color` | hex string | Base color (e.g., `#ff0000`). |
| `emissive` | hex string | Glow color. |
| `roughness` | 0-1 | Surface roughness. |
| `wireframe` | boolean | Render as wireframe. |
| `opacity` | 0-1 | Transparency level. |
| `transparent` | boolean | Enable transparency. |

### Assigning a Material to a GameObject
```bash
# Create the material
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{"id": "player_mat", "props": {"color": "#3399ff", "emissive": "#001133", "roughness": 0.3}}'

# Assign it to a GameObject
curl -X PATCH "$API_URL/gameobjects/OBJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"mesh": {"materialId": "player_mat"}}'

# Create glowing lava material
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{"id": "lava_mat", "props": {"color": "#ff2200", "emissive": "#ff4400", "roughness": 0.9}}'

# Transparent glass material
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{"id": "glass_mat", "props": {"color": "#88ccff", "opacity": 0.3, "transparent": true, "roughness": 0.05}}'

# Wireframe debug material
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{"id": "wireframe_mat", "props": {"color": "#00ff00", "wireframe": true}}'
```

---

## 🔊 6. AUDIO MODULE (`/audio`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Play** | `POST` | `/api/audio/play` | `{id, assetPath, loop, volume}` | Play a sound. |
| **Stop** | `POST` | `/api/audio/stop` | `{id}` | Stop a playing sound. |
| **Set Volume** | `POST` | `/api/audio/setVolume` | `{id, volume}` | Change volume of a playing sound. |

### Examples
```bash
# Play background music (looped)
curl -X POST "$API_URL/audio/play" \
  -H "Content-Type: application/json" \
  -d '{"id": "bgm", "assetPath": "music.mp3", "loop": true, "volume": 0.4}'

# Play a one-shot sound effect
curl -X POST "$API_URL/audio/play" \
  -H "Content-Type: application/json" \
  -d '{"id": "explosion_sfx", "assetPath": "explosion.wav", "loop": false, "volume": 0.8}'

# Adjust volume
curl -X POST "$API_URL/audio/setVolume" \
  -H "Content-Type: application/json" \
  -d '{"id": "bgm", "volume": 0.2}'

# Stop a sound
curl -X POST "$API_URL/audio/stop" \
  -H "Content-Type: application/json" \
  -d '{"id": "bgm"}'
```

### Script: Audio
```javascript
// In scripts, use AudioModule directly:
AudioModule.playSound('pickup_sfx', 'pickup.wav', false, 0.5);
AudioModule.playSound('bgm', 'background_music.mp3', true, 0.3);
AudioModule.stopSound('bgm');
AudioModule.setVolume('bgm', 0.1);
```

---

## 📸 7. CAMERA MODULE (`/cameras`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **List** | `GET` | `/api/cameras` | — | Get all cameras. |
| **Get Active** | `GET` | `/api/cameras/active` | — | Get the active camera. |
| **Create** | `POST` | `/api/cameras` | See below | Create a new camera. |
| **Set Active** | `POST` | `/api/cameras/active` | `{id}` | Switch the active camera. |
| **Update** | `PATCH` | `/api/cameras/:id` | Any camera prop | Modify a camera. |
| **Delete** | `DELETE` | `/api/cameras/:id` | — | Remove a camera (cannot delete default orbit cam). |

### Camera Types

| Type | Description |
|:---|:---|
| `orbit` | Default free-orbit camera (built-in, undeletable). |
| `static` | Fixed position/rotation camera. |
| `follow` | A camera that follows a target GameObject. |

### Camera Properties

| Property | Type | Description |
|:---|:---|:---|
| `name` | string | Camera name. |
| `type` | `static`, `follow` | Camera behavior. |
| `position` | `{x,y,z}` | World position. |
| `rotation` | `{x,y,z,w}` | Rotation quaternion. |
| `targetId` | string | ID of the GameObject to follow (follow mode). |
| `offset` | `{x,y,z}` | Offset from target (follow mode). |
| `fov` | number | Field of view in degrees. |

### Examples
```bash
# Create a static camera
curl -X POST "$API_URL/cameras" \
  -H "Content-Type: application/json" \
  -d '{"name": "Cutscene Cam", "type": "static", "position": {"x":0,"y":5,"z":10}, "fov": 60}'

# Create a follow camera
curl -X POST "$API_URL/cameras" \
  -H "Content-Type: application/json" \
  -d '{"name": "Player Cam", "type": "follow", "targetId": "PLAYER_GO_ID", "offset": {"x":0,"y":3,"z":8}, "fov": 70}'

# Switch active camera
curl -X POST "$API_URL/cameras/active" \
  -H "Content-Type: application/json" \
  -d '{"id": "CAMERA_ID"}'

# Reset to default orbit camera
curl -X POST "$API_URL/cameras/active" \
  -H "Content-Type: application/json" \
  -d '{"id": "default_orbit"}'
```

---

## 🌅 8. SKYBOX MODULE (`/skybox`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Get** | `GET` | `/api/skybox` | — | Get current skybox configuration. |
| **Set** | `POST` | `/api/skybox` | See below | Change the skybox. |

### Skybox Types

| Type | Description | Required Field |
|:---|:---|:---|
| `color` | Solid color background. | `color` (hex string) |
| `equirectangular` | 360° panoramic image. | `assetPath` (file in assets/) |
| `cubemap` | 6-image skybox. | `cubemapPaths` (array of 6 file paths) |

### Examples
```bash
# Set a solid color skybox
curl -X POST "$API_URL/skybox" \
  -H "Content-Type: application/json" \
  -d '{"type": "color", "color": "#1a1a2e"}'

# Set a dark blue night sky
curl -X POST "$API_URL/skybox" \
  -H "Content-Type: application/json" \
  -d '{"type": "color", "color": "#0a0a1e"}'

# Set equirectangular panorama
curl -X POST "$API_URL/skybox" \
  -H "Content-Type: application/json" \
  -d '{"type": "equirectangular", "assetPath": "sky_panorama.hdr", "intensity": 1.5}'
```

### Script: Skybox
```javascript
// Change skybox color from script
SkyboxModule.setColor('#ff6600'); // Sunset orange
SkyboxModule.setEquirectangular('desert_sky.hdr');
```

---

## 🖥️ 9. UI MODULE (`/ui`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Create Element** | `POST` | `/api/ui` | `{type, id, props}` | Create a UI element. |
| **Handle Event** | `POST` | `/api/ui/event` | `{id, type, data}` | Trigger a UI event from client. |

### UI Element Types

| Type | Description | Key Props |
|:---|:---|:---|
| `label` | Text display. | `label`, `x`, `y` |
| `button` | Clickable button. | `label`, `x`, `y` |
| `text` | Text input field. | `placeholder`, `x`, `y` |
| `checkbox` | Toggle checkbox. | `label`, `checked`, `x`, `y` |
| `radio` | Radio button. | `label`, `group`, `checked`, `x`, `y` |

### Examples via API
```bash
# Create a score label
curl -X POST "$API_URL/ui" \
  -H "Content-Type: application/json" \
  -d '{"type": "label", "id": "score_display", "props": {"label": "Score: 0", "x": 20, "y": 20}}'

# Create a button
curl -X POST "$API_URL/ui" \
  -H "Content-Type: application/json" \
  -d '{"type": "button", "id": "start_btn", "props": {"label": "Start Game", "x": 300, "y": 400}}'

# Create a text input
curl -X POST "$API_URL/ui" \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "id": "name_input", "props": {"placeholder": "Enter your name", "x": 200, "y": 100}}'
```

### Script: Complete UI System
```javascript
// game_ui.js — Full UI with scripts (much more powerful than API)
function onStart() {
    // Labels
    UIModule.createLabel('title', 'MY GAME', 300, 10);
    UIModule.createLabel('fps_counter', 'FPS: 60', 10, 10);
    UIModule.createLabel('score', 'Score: 0', 10, 40);

    // Interactive button
    UIModule.createButton('fire_btn', 'FIRE!', 10, 500);
    UIModule.on('fire_btn', 'click', () => {
        console.log('Fire button clicked!');
        AudioModule.playSound('fire', 'shoot.wav', false, 0.5);
    });

    // Checkbox
    UIModule.createCheckbox('music_toggle', 'Music', true, 10, 100);
    UIModule.on('music_toggle', 'change', (data) => {
        if (data.checked) {
            AudioModule.playSound('bgm', 'music.mp3', true, 0.3);
        } else {
            AudioModule.stopSound('bgm');
        }
    });

    // Text input
    UIModule.createTextInput('chat_input', 'Type message...', 10, 550);
}

let frameCount = 0;
let fpsTimer = 0;

function update(dt) {
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 1.0) {
        UIModule.setLabel('fps_counter', 'FPS: ' + frameCount);
        frameCount = 0;
        fpsTimer = 0;
    }
}
```

---

## 🎮 10. INPUT MODULE (`/input`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Update State** | `POST` | `/api/input` | `{keys, mouse}` | Push input state from client. |

> [!NOTE]
> Input is primarily consumed inside scripts. The client renderer pushes input state via `POST /api/input`, and scripts read it via `InputModule`.

### Input Methods (In Scripts)

| Method | Description |
|:---|:---|
| `InputModule.isKeyDown('KeyW')` | Returns `true` if the key is currently held down. |
| `InputModule.isKeyDown('Space')` | Check spacebar. |
| `InputModule.isKeyDown('ShiftLeft')` | Check left shift. |
| `InputModule.isMouseButtonDown(0)` | Left mouse button. |
| `InputModule.isMouseButtonDown(2)` | Right mouse button. |
| `InputModule.getMousePosition()` | Returns `{x, y}` pixel coordinates. |

### Key Codes Reference
| Key | Code | Key | Code |
|:---|:---|:---|:---|
| W | `KeyW` | Space | `Space` |
| A | `KeyA` | Shift | `ShiftLeft` |
| S | `KeyS` | Ctrl | `ControlLeft` |
| D | `KeyD` | Enter | `Enter` |
| Q | `KeyQ` | Escape | `Escape` |
| E | `KeyE` | 1-9 | `Digit1`-`Digit9` |
| F | `KeyF` | Arrow keys | `ArrowUp/Down/Left/Right` |

---

## 🏎️ 11. VEHICLE MODULE (`/vehicles`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Create** | `POST` | `/api/vehicles` | `{id, chassisId, config}` | Create a vehicle from a chassis GO. |
| **Control** | `PATCH` | `/api/vehicles/:id/control` | `{engineForce, steering, brake}` | Control the vehicle. |

### Vehicle Config

```json
{
    "id": "player_car",
    "chassisId": "CHASSIS_GAMEOBJECT_ID",
    "config": {
        "wheels": [
            {"connectionPoint": {"x":-0.8,"y":0,"z":-1.2}, "isFront": true, "radius": 0.4},
            {"connectionPoint": {"x": 0.8,"y":0,"z":-1.2}, "isFront": true, "radius": 0.4},
            {"connectionPoint": {"x":-0.8,"y":0,"z": 1.2}, "isFront": false, "radius": 0.4},
            {"connectionPoint": {"x": 0.8,"y":0,"z": 1.2}, "isFront": false, "radius": 0.4}
        ]
    }
}
```

### Full Vehicle Setup (curl)
```bash
# 1. Create chassis
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Car", "type": "dynamic", "primitive": "cube", "position": {"x":0,"y":2,"z":0}, "scale": {"x":2,"y":0.5,"z":4}, "mass": 1500}'

# 2. Create vehicle controller (use chassis ID from step 1)
curl -X POST "$API_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{"id": "my_car", "chassisId": "CHASSIS_ID", "config": {"wheels": [{"connectionPoint":{"x":-0.8,"y":0,"z":-1.2},"isFront":true,"radius":0.4},{"connectionPoint":{"x":0.8,"y":0,"z":-1.2},"isFront":true,"radius":0.4},{"connectionPoint":{"x":-0.8,"y":0,"z":1.2},"isFront":false,"radius":0.4},{"connectionPoint":{"x":0.8,"y":0,"z":1.2},"isFront":false,"radius":0.4}]}}'

# 3. Drive it
curl -X PATCH "$API_URL/vehicles/my_car/control" \
  -H "Content-Type: application/json" \
  -d '{"engineForce": 1000, "steering": 0.0, "brake": 0}'
```

---

## 🧊 12. COLLIDERS MODULE (`/colliders`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Get Gizmos State** | `GET` | `/api/colliders/gizmos` | — | Check if debug wireframes are enabled. |
| **Toggle Gizmos** | `POST` | `/api/colliders/gizmos` | `{enabled}` | Show/hide physics debug wireframes. |

### Examples
```bash
# Enable physics debug visualization
curl -X POST "$API_URL/colliders/gizmos" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Disable debug visualization
curl -X POST "$API_URL/colliders/gizmos" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## 🗂️ 13. SCENE MODULE (`/scenes`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **List Scenes** | `GET` | `/api/scenes` | — | Get all active scenes. |
| **Get Active** | `GET` | `/api/scenes/active` | — | Get the active scene. |
| **Create** | `POST` | `/api/scenes` | `{name}` | Create a new empty scene. |
| **Rename** | `PUT` | `/api/scenes/:id` | `{name}` | Rename a scene. |
| **Export** | `POST` | `/api/scenes/export` | `{id?, fileName}` | Save scene to `assets/` as JSON. |
| **Load** | `POST` | `/api/scenes/load` | `{fileName}` | Load a scene from `assets/`. |
| **List Asset Scenes** | `GET` | `/api/assets/scenes` | — | List all scene JSON files in `assets/`. |

### Examples
```bash
# Export current scene
curl -X POST "$API_URL/scenes/export" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "my_level.json"}'

# Load a saved scene
curl -X POST "$API_URL/scenes/load" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "my_level.json"}'

# List saved scenes
curl -X GET "$API_URL/assets/scenes"
```

---

## 📦 14. PREFAB SYSTEM (`/prefabs`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Export** | `POST` | `/api/gameobjects/:id/export` | `{fileName}` | Save a GameObject as a reusable prefab. |
| **Instantiate** | `POST` | `/api/prefabs/instantiate` | `{fileName, position?, rotation?}` | Spawn a prefab. |

### Examples
```bash
# Export a configured object as a prefab
curl -X POST "$API_URL/gameobjects/OBJECT_ID/export" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "enemy_template.json"}'

# Instantiate the prefab at a position
curl -X POST "$API_URL/prefabs/instantiate" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "enemy_template.json", "position": {"x":5,"y":2,"z":-3}}'
```

### Script: Spawning Prefabs
```javascript
// In scripts, use GameObjectModule.instantiatePrefab()
const enemy = GameObjectModule.instantiatePrefab('enemy_template.json', { x: 5, y: 0, z: 10 });
if (enemy) {
    enemy.setLinearVelocity({ x: 0, y: 0, z: -5 });
}
```

---

## 🔎 15. SYSTEM & DEBUGGING

| Endpoint | Method | Description |
|:---|:---|:---|
| `GET /api/sync` | GET | Real-time physics state sync (positions, rotations, materials, audio events, UI, camera, skybox, debug wireframes). |
| `GET /api/source?module=ModuleName` | GET | View the engine source code of any module. |
| `POST /api/colliders/gizmos` | POST | Toggle physics debug wireframes. |
| `GET /api/help` | GET | This full help reference as JSON for AI agents. |

### Example: Source Inspection
```bash
# View any module's source code to understand its full API
curl -X GET "$API_URL/source?module=GameObjectModule"
curl -X GET "$API_URL/source?module=PhysicsModule"
curl -X GET "$API_URL/source?module=UIModule"
curl -X GET "$API_URL/source?module=LightModule"
curl -X GET "$API_URL/source?module=ScriptModule"
```

---

## 🚀 COMPLETE GAME BUILDING TUTORIALS

### Tutorial 1: Building a Platformer (Live API — step by step)

```bash
API_URL="http://127.0.0.1:3005/api"

# 1. Set up skybox
curl -X POST "$API_URL/skybox" -H "Content-Type: application/json" \
  -d '{"type": "color", "color": "#2d1b69"}'

# 2. Create ground
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "Ground", "type": "static", "primitive": "cube", "position": {"x":0,"y":-1,"z":0}, "scale": {"x":30,"y":1,"z":30}}'

# 3. Create ground material
curl -X POST "$API_URL/materials" -H "Content-Type: application/json" \
  -d '{"id": "ground_mat", "props": {"color": "#2a5a2a", "roughness": 0.8}}'
curl -X PATCH "$API_URL/gameobjects/GROUND_ID" -H "Content-Type: application/json" \
  -d '{"mesh": {"materialId": "ground_mat"}}'

# 4. Add sun light
curl -X POST "$API_URL/lights" -H "Content-Type: application/json" \
  -d '{"name": "Sun", "type": "directional", "color": "#ffeedd", "intensity": 2, "position": {"x":10,"y":20,"z":5}}'

# 5. Add ambient light
curl -X POST "$API_URL/lights" -H "Content-Type: application/json" \
  -d '{"name": "Ambient", "type": "point", "color": "#404080", "intensity": 0.5, "position": {"x":0,"y":10,"z":0}, "range": 50}'

# 6. Create player
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "Player", "type": "dynamic", "primitive": "capsule", "position": {"x":0,"y":2,"z":0}, "scale": {"x":0.5,"y":1,"z":0.5}, "tag": "Player"}'
curl -X POST "$API_URL/materials" -H "Content-Type: application/json" \
  -d '{"id": "player_mat", "props": {"color": "#3399ff", "emissive": "#001133"}}'
curl -X PATCH "$API_URL/gameobjects/PLAYER_ID" -H "Content-Type: application/json" \
  -d '{"mesh": {"materialId": "player_mat"}}'

# 7. Create platforms
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "Platform1", "type": "static", "primitive": "cube", "position": {"x":4,"y":2,"z":-3}, "scale": {"x":3,"y":0.3,"z":3}}'
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "Platform2", "type": "static", "primitive": "cube", "position": {"x":8,"y":4,"z":-6}, "scale": {"x":3,"y":0.3,"z":3}}'
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "GoalPlatform", "type": "static", "primitive": "cube", "position": {"x":12,"y":6,"z":-9}, "scale": {"x":4,"y":0.3,"z":4}, "tag": "Goal"}'

# 8. Create collectible coins
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "Coin1", "type": "kinematic", "primitive": "cylinder", "position": {"x":4,"y":3,"z":-3}, "scale": {"x":0.3,"y":0.05,"z":0.3}, "tag": "Coin"}'
curl -X POST "$API_URL/materials" -H "Content-Type: application/json" \
  -d '{"id": "coin_mat", "props": {"color": "#ffdd00", "emissive": "#443300"}}'

# 9. Save player controller script
curl -X POST "$API_URL/scripts" -H "Content-Type: application/json" \
  -d '{"fileName": "platformer_player.js", "content": "const speed = 6;\nconst jumpForce = 10;\nlet grounded = false;\n\nfunction onCollisionEnter(other) { if (other.position.y < gameObject.position.y) grounded = true; }\nfunction onCollisionExit(other) { grounded = false; }\n\nfunction update(dt) {\n  const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);\n  const curVel = body ? body.linvel() : {x:0,y:0,z:0};\n  let vx = 0, vz = 0;\n  if (InputModule.isKeyDown(\"KeyW\")) vz = -speed;\n  if (InputModule.isKeyDown(\"KeyS\")) vz = speed;\n  if (InputModule.isKeyDown(\"KeyA\")) vx = -speed;\n  if (InputModule.isKeyDown(\"KeyD\")) vx = speed;\n  gameObject.setLinearVelocity({x: vx, y: curVel.y, z: vz});\n  if (InputModule.isKeyDown(\"Space\") && grounded) {\n    gameObject.applyImpulse({x:0, y:jumpForce, z:0});\n    grounded = false;\n  }\n}"}'

# 10. Attach script to player
curl -X POST "$API_URL/gameobjects/PLAYER_ID/scripts" -H "Content-Type: application/json" \
  -d '{"fileName": "platformer_player.js"}'

# 11. Save coin spinner script
curl -X POST "$API_URL/scripts" -H "Content-Type: application/json" \
  -d '{"fileName": "coin_spin.js", "content": "function update(dt) { gameObject.rotate({x:0,y:1,z:0}, 90 * dt); }"}'

# 12. Save the scene
curl -X POST "$API_URL/scenes/export" -H "Content-Type: application/json" \
  -d '{"fileName": "platformer_level1.json"}'

# 13. Enable debug gizmos to see colliders
curl -X POST "$API_URL/colliders/gizmos" -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Tutorial 2: Complete Game via Scripts (Reusable)

This approach creates the entire game from a single "bootstrap" script that sets up everything.

```bash
# Save the game bootstrap script
curl -X POST "$API_URL/scripts" -H "Content-Type: application/json" \
  -d @- << 'SCRIPT_EOF'
{
  "fileName": "game_bootstrap.js",
  "content": "// ====================================\n// COMPLETE GAME BOOTSTRAP SCRIPT\n// Attach to any dummy object to run\n// ====================================\n\nlet score = 0;\nlet gameOver = false;\nlet playerGo = null;\nlet enemies = [];\n\nfunction onStart() {\n    console.log('=== Game Bootstrap Starting ===');\n\n    // --- SKYBOX ---\n    SkyboxModule.setColor('#1a0a2e');\n\n    // --- LIGHTING ---\n    LightModule.createLight({\n        name: 'Sun', type: 'directional',\n        color: '#ffeedd', intensity: 2.0,\n        position: { x: 10, y: 20, z: 5 }\n    });\n    LightModule.createLight({\n        name: 'Fill', type: 'point',\n        color: '#334488', intensity: 0.8,\n        position: { x: -5, y: 8, z: -5 }, range: 50\n    });\n\n    // --- MATERIALS ---\n    MaterialModule.createMaterial('ground_mat', { color: '#336633', roughness: 0.9 });\n    MaterialModule.createMaterial('player_mat', { color: '#3399ff', emissive: '#001144', roughness: 0.3 });\n    MaterialModule.createMaterial('enemy_mat', { color: '#ff3333', emissive: '#330000', roughness: 0.5 });\n    MaterialModule.createMaterial('coin_mat', { color: '#ffcc00', emissive: '#332200', roughness: 0.2 });\n    MaterialModule.createMaterial('wall_mat', { color: '#666666', roughness: 0.7 });\n\n    // --- GROUND ---\n    const ground = GameObjectModule.createGameObject({\n        name: 'Arena Floor', type: 'static', primitive: 'cube',\n        position: { x: 0, y: -0.5, z: 0 }, scale: { x: 30, y: 1, z: 30 }\n    });\n    ground.mesh.materialId = 'ground_mat';\n    SceneModule.addGameObjectToScene(SceneModule.activeSceneId, ground);\n\n    // --- WALLS ---\n    const wallPositions = [\n        { pos: { x: 15, y: 2, z: 0 }, scale: { x: 0.5, y: 4, z: 30 } },\n        { pos: { x: -15, y: 2, z: 0 }, scale: { x: 0.5, y: 4, z: 30 } },\n        { pos: { x: 0, y: 2, z: 15 }, scale: { x: 30, y: 4, z: 0.5 } },\n        { pos: { x: 0, y: 2, z: -15 }, scale: { x: 30, y: 4, z: 0.5 } }\n    ];\n    wallPositions.forEach((w, i) => {\n        const wall = GameObjectModule.createGameObject({\n            name: 'Wall_' + i, type: 'static', primitive: 'cube',\n            position: w.pos, scale: w.scale\n        });\n        wall.mesh.materialId = 'wall_mat';\n        SceneModule.addGameObjectToScene(SceneModule.activeSceneId, wall);\n    });\n\n    // --- PLAYER ---\n    playerGo = GameObjectModule.createGameObject({\n        name: 'Player', type: 'dynamic', primitive: 'sphere',\n        position: { x: 0, y: 1, z: 0 }, scale: { x: 0.5, y: 0.5, z: 0.5 },\n        tag: 'Player'\n    });\n    playerGo.mesh.materialId = 'player_mat';\n    SceneModule.addGameObjectToScene(SceneModule.activeSceneId, playerGo);\n\n    // --- COINS ---\n    for (let i = 0; i < 10; i++) {\n        const cx = (Math.random() - 0.5) * 24;\n        const cz = (Math.random() - 0.5) * 24;\n        const coin = GameObjectModule.createGameObject({\n            name: 'Coin_' + i, type: 'kinematic', primitive: 'cylinder',\n            position: { x: cx, y: 0.5, z: cz },\n            scale: { x: 0.3, y: 0.05, z: 0.3 },\n            tag: 'Coin'\n        });\n        coin.mesh.materialId = 'coin_mat';\n        SceneModule.addGameObjectToScene(SceneModule.activeSceneId, coin);\n    }\n\n    // --- ENEMIES ---\n    for (let i = 0; i < 3; i++) {\n        const ex = (Math.random() - 0.5) * 20;\n        const ez = (Math.random() - 0.5) * 20;\n        const enemy = GameObjectModule.createGameObject({\n            name: 'Enemy_' + i, type: 'dynamic', primitive: 'cube',\n            position: { x: ex, y: 1, z: ez },\n            scale: { x: 0.8, y: 0.8, z: 0.8 },\n            tag: 'Hazard'\n        });\n        enemy.mesh.materialId = 'enemy_mat';\n        SceneModule.addGameObjectToScene(SceneModule.activeSceneId, enemy);\n        enemies.push(enemy);\n    }\n\n    // --- UI ---\n    UIModule.createLabel('score_hud', 'Score: 0', 20, 20);\n    UIModule.createLabel('status_hud', 'Collect all coins!', 20, 50);\n\n    // --- CAMERA ---\n    const cam = CameraModule.createCamera({\n        name: 'Game Cam', type: 'follow',\n        targetId: playerGo.id,\n        offset: { x: 0, y: 8, z: 12 }, fov: 65\n    });\n    CameraModule.setActiveCamera(cam.id);\n\n    console.log('=== Game Ready ===');\n}\n\nfunction update(dt) {\n    if (gameOver || !playerGo) return;\n\n    // --- PLAYER MOVEMENT ---\n    const body = PhysicsModule.world.getRigidBody(playerGo.physics.bodyHandle);\n    const curVel = body ? body.linvel() : { x: 0, y: 0, z: 0 };\n    const speed = 8;\n    let vx = 0, vz = 0;\n    if (InputModule.isKeyDown('KeyW')) vz = -speed;\n    if (InputModule.isKeyDown('KeyS')) vz = speed;\n    if (InputModule.isKeyDown('KeyA')) vx = -speed;\n    if (InputModule.isKeyDown('KeyD')) vx = speed;\n    playerGo.setLinearVelocity({ x: vx, y: curVel.y, z: vz });\n    if (InputModule.isKeyDown('Space') && Math.abs(curVel.y) < 0.1) {\n        playerGo.applyImpulse({ x: 0, y: 8, z: 0 });\n    }\n\n    // --- ENEMY AI ---\n    enemies.forEach(enemy => {\n        if (!enemy.enabled) return;\n        const dx = playerGo.position.x - enemy.position.x;\n        const dz = playerGo.position.z - enemy.position.z;\n        const dist = Math.sqrt(dx * dx + dz * dz);\n        if (dist > 0.5) {\n            const eSpeed = 2.5;\n            enemy.setLinearVelocity({ x: (dx/dist)*eSpeed, y: 0, z: (dz/dist)*eSpeed });\n        }\n    });\n\n    // --- COIN ROTATION ---\n    const allGOs = GameObjectModule.getAllGameObjects();\n    allGOs.forEach(go => {\n        if (go.tag === 'Coin' && go.enabled) {\n            go.rotate({ x: 0, y: 1, z: 0 }, 120 * dt);\n        }\n    });\n\n    // --- COLLISION CHECKS (proximity-based) ---\n    allGOs.forEach(go => {\n        if (!go.enabled) return;\n        const dx = playerGo.position.x - go.position.x;\n        const dz = playerGo.position.z - go.position.z;\n        const dist = Math.sqrt(dx * dx + dz * dz);\n\n        if (go.tag === 'Coin' && dist < 1.0) {\n            go.setEnabled(false);\n            score += 10;\n            UIModule.setLabel('score_hud', 'Score: ' + score);\n            AudioModule.playSound('coin_' + score, 'coin.wav', false, 0.5);\n        }\n\n        if (go.tag === 'Hazard' && dist < 1.0) {\n            gameOver = true;\n            UIModule.setLabel('status_hud', 'GAME OVER! Score: ' + score);\n        }\n    });\n\n    // Win condition\n    if (score >= 100) {\n        gameOver = true;\n        UIModule.setLabel('status_hud', 'YOU WIN! Score: ' + score);\n    }\n\n    // --- CAMERA UPDATE ---\n    const cam = CameraModule.getActiveCamera();\n    if (cam && cam.offset) {\n        cam.position = {\n            x: playerGo.position.x + cam.offset.x,\n            y: playerGo.position.y + cam.offset.y,\n            z: playerGo.position.z + cam.offset.z\n        };\n    }\n}\n"
}
SCRIPT_EOF

# Create a bootstrap object and attach the script
curl -X POST "$API_URL/gameobjects" -H "Content-Type: application/json" \
  -d '{"name": "GameManager", "type": "static", "primitive": "cube", "position": {"x":0,"y":-10,"z":0}, "scale": {"x":0.01,"y":0.01,"z":0.01}, "enabled": true}'

curl -X POST "$API_URL/gameobjects/MANAGER_ID/scripts" -H "Content-Type: application/json" \
  -d '{"fileName": "game_bootstrap.js"}'
```

---

## 🧮 QUICK REFERENCE: RAW THREE & RAPIER (In Scripts Only)

### THREE.js — Vector Math
```javascript
// Distance between two points
const a = new THREE.Vector3(gameObject.position.x, 0, gameObject.position.z);
const b = new THREE.Vector3(10, 0, 10);
const dist = a.distanceTo(b);

// Direction from A to B (normalized)
const dir = new THREE.Vector3().subVectors(b, a).normalize();

// Lerp (smooth interpolation)
const result = new THREE.Vector3().lerpVectors(a, b, 0.5); // Midpoint

// Quaternion from Euler angles
const quat = new THREE.Quaternion();
const euler = new THREE.Euler(0, Math.PI / 4, 0, 'XYZ');
quat.setFromEuler(euler);
```

### RAPIER — Physics Queries
```javascript
// Raycast
const ray = new RAPIER.Ray(
    { x: 0, y: 5, z: 0 },    // origin
    { x: 0, y: -1, z: 0 }    // direction
);
const hit = PhysicsModule.world.castRay(ray, 100, true);
if (hit) {
    const hitPoint = hit.time; // Distance
    const hitGo = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle);
}

// Get rigid body state
const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
const velocity = body.linvel();        // {x, y, z}
const angVelocity = body.angvel();     // {x, y, z}
const position = body.translation();   // {x, y, z}
const rotation = body.rotation();      // {x, y, z, w}
```

---

## 📋 FULL ENDPOINT SUMMARY

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/help` | Full AI help reference (JSON). |
| `GET` | `/api/gameobjects` | List all GameObjects. |
| `GET` | `/api/gameobjects/:id` | Get one GameObject. |
| `POST` | `/api/gameobjects` | Create a GameObject. |
| `PATCH` | `/api/gameobjects/:id` | Update a GameObject. |
| `DELETE` | `/api/gameobjects/:id` | Delete a GameObject. |
| `POST` | `/api/gameobjects/:id/move` | Move a GameObject. |
| `POST` | `/api/gameobjects/:id/rotate` | Rotate a GameObject. |
| `POST` | `/api/gameobjects/:id/animations/play` | Play animation. |
| `POST` | `/api/gameobjects/:id/animations/report` | Report available animations. |
| `POST` | `/api/gameobjects/:id/scripts` | Attach a script. |
| `DELETE` | `/api/gameobjects/:id/scripts/:fileName` | Detach a script. |
| `POST` | `/api/gameobjects/:id/export` | Export as prefab. |
| `POST` | `/api/scripts` | Save a script file. |
| `PATCH` | `/api/scripts` | Edit a script file. |
| `DELETE` | `/api/scripts/:fileName` | Delete a script file. |
| `POST` | `/api/prefabs/instantiate` | Instantiate a prefab. |
| `GET` | `/api/lights` | List lights. |
| `POST` | `/api/lights` | Create a light. |
| `PATCH` | `/api/lights/:id` | Update a light. |
| `DELETE` | `/api/lights/:id` | Delete a light. |
| `POST` | `/api/materials` | Create a material. |
| `PATCH` | `/api/materials/:id` | Update a material. |
| `POST` | `/api/audio/play` | Play a sound. |
| `POST` | `/api/audio/stop` | Stop a sound. |
| `POST` | `/api/audio/setVolume` | Set sound volume. |
| `GET` | `/api/cameras` | List cameras. |
| `GET` | `/api/cameras/active` | Get active camera. |
| `POST` | `/api/cameras` | Create a camera. |
| `POST` | `/api/cameras/active` | Set active camera. |
| `PATCH` | `/api/cameras/:id` | Update a camera. |
| `DELETE` | `/api/cameras/:id` | Delete a camera. |
| `GET` | `/api/skybox` | Get skybox config. |
| `POST` | `/api/skybox` | Set skybox. |
| `POST` | `/api/ui` | Create a UI element. |
| `POST` | `/api/ui/event` | Handle UI event. |
| `POST` | `/api/input` | Push input state. |
| `GET` | `/api/colliders/gizmos` | Get gizmo state. |
| `POST` | `/api/colliders/gizmos` | Toggle gizmos. |
| `POST` | `/api/vehicles` | Create a vehicle. |
| `PATCH` | `/api/vehicles/:id/control` | Control a vehicle. |
| `GET` | `/api/scenes` | List scenes. |
| `GET` | `/api/scenes/active` | Get active scene. |
| `POST` | `/api/scenes` | Create a scene. |
| `PUT` | `/api/scenes/:id` | Rename a scene. |
| `POST` | `/api/scenes/export` | Export scene. |
| `POST` | `/api/scenes/load` | Load scene. |
| `GET` | `/api/assets/scenes` | List saved scene files. |
| `GET` | `/api/sync` | Full state sync. |
| `GET` | `/api/source?module=Name` | View module source. |
