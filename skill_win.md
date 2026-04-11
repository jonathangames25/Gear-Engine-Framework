# ⚙️ Gear Engine: Complete AI Skill Reference (PowerShell)

This guide provides the exhaustive command-set, module reference, and usage patterns for the Gear Engine using PowerShell (`Invoke-RestMethod`). It is intended for AI agents to understand how to build full games using the REST API and Scripting system.

**Base URL**: `http://127.0.0.1:3005`  
**API Root**: `/api`  
**Coordinate System**: Right-handed, Y-up. Units in meters. Rotations are Quaternions `{x, y, z, w}`.

---

## 🛠️ API Fundamentals
- **Base URL**: `$API_URL = "http://127.0.0.1:3005/api"`
- **Method Conventions**: `Get`, `Post`, `Patch`, `Delete`
- **Headers**: `-ContentType "application/json"`

### 🤖 AI Self-Healing & Discovery
> [!IMPORTANT]
> - **404 Errors**: In the event that the Gear Engine base URL returns a **404** or appears unresponsive, a ping to `GET /api/gameobjects` **MUST** be performed immediately via `Invoke-RestMethod`. This confirms engine availability and retrieves the current scene's state.
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
    if (other.position.y < gameObject.position.y) {
        isGrounded = true;
    }
}

function onCollisionExit(other) {
    isGrounded = false;
}

function update(dt) {
    let vel = { x: 0, y: 0, z: 0 };
    const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
    const currentVel = body ? body.linvel() : { x: 0, y: 0, z: 0 };

    if (InputModule.isKeyDown('KeyW')) vel.z = -speed;
    if (InputModule.isKeyDown('KeyS')) vel.z = speed;
    if (InputModule.isKeyDown('KeyA')) vel.x = -speed;
    if (InputModule.isKeyDown('KeyD')) vel.x = speed;

    vel.y = currentVel.y;
    gameObject.setLinearVelocity(vel);

    if (InputModule.isKeyDown('Space') && isGrounded) {
        gameObject.applyImpulse({ x: 0, y: jumpForce, z: 0 });
        isGrounded = false;
    }
}
```

### 🔄 Script Example: Smooth Rotation / Spinning Object
```javascript
// spinner.js — Attach to any object to make it spin
const spinSpeed = 3;
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
    LightModule.createLight({
        name: 'Sun', type: 'directional',
        color: '#ffe0a0', intensity: 2,
        position: { x: 10, y: 20, z: 10 }
    });
    LightModule.createLight({
        name: 'Ambient Fill', type: 'point',
        color: '#334488', intensity: 0.5,
        position: { x: 0, y: 10, z: 0 }, range: 100
    });
}
function update(dt) {
    time += dt * 0.1;
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
    UIModule.createLabel('score_label', 'Score: 0', 20, 20);
    UIModule.createLabel('health_label', 'Health: 100', 20, 50);
    UIModule.createButton('restart_btn', 'Restart Game', 300, 300);
    UIModule.on('restart_btn', 'click', () => {
        score = 0; health = 100;
        UIModule.setLabel('score_label', 'Score: 0');
        UIModule.setLabel('health_label', 'Health: 100');
        gameObject.position = { x: 0, y: 2, z: 0 };
    });
}
function update(dt) {
    UIModule.setLabel('score_label', 'Score: ' + score);
    UIModule.setLabel('health_label', 'Health: ' + health);
}
function onCollisionEnter(other) {
    if (other.tag === 'Coin') {
        score += 10;
        other.setEnabled(false);
        AudioModule.playSound('coin_sfx', 'coin.wav', false, 0.5);
    }
    if (other.tag === 'Hazard') {
        health -= 25;
        if (health <= 0) UIModule.setLabel('health_label', 'GAME OVER');
    }
}
```

### 📸 Script Example: Follow Camera
```javascript
// follow_camera.js — Attach to the player
let camId = null;
function onStart() {
    const cam = CameraModule.createCamera({
        name: 'Player Cam', type: 'follow',
        targetId: gameObject.id,
        offset: { x: 0, y: 4, z: 8 }, fov: 60
    });
    camId = cam.id;
    CameraModule.setActiveCamera(camId);
}
function update(dt) {
    if (!camId) return;
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
// raycast_ground.js
function update(dt) {
    const ray = new RAPIER.Ray(
        { x: gameObject.position.x, y: gameObject.position.y, z: gameObject.position.z },
        { x: 0, y: -1, z: 0 }
    );
    const hit = PhysicsModule.world.castRay(ray, 10, true);
    if (hit) {
        const groundObj = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle);
        if (groundObj) console.log('Ground: ' + groundObj.name + ' dist: ' + hit.time.toFixed(2));
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
        const spawnPos = {
            x: gameObject.position.x,
            y: gameObject.position.y + 1,
            z: gameObject.position.z - 2
        };
        const proj = GameObjectModule.createGameObject({
            name: 'Bullet', type: 'dynamic', primitive: 'sphere',
            position: spawnPos, scale: { x: 0.2, y: 0.2, z: 0.2 },
            mass: 0.5, tag: 'Projectile'
        });
        proj.setLinearVelocity({ x: 0, y: 2, z: -30 });
        AudioModule.playSound('shoot_sfx', 'laser.mp3', false, 0.3);
        cooldown = 0.3;
        setTimeout(() => { GameObjectModule.deleteGameObject(proj.id); }, 3000);
    }
}
```

### 🎨 Script Example: Dynamic Material Changes
```javascript
// material_changer.js — Change object color over time
let hue = 0;
function onStart() {
    MaterialModule.createMaterial('rainbow_mat', { color: '#ff0000', roughness: 0.3 });
    gameObject.mesh.materialId = 'rainbow_mat';
}
function update(dt) {
    hue = (hue + dt * 50) % 360;
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

### 🔍 Script Example: Finding Other GameObjects / Enemy AI
```javascript
// enemy_ai.js — Find the player and chase them
let player = null;
function onStart() {
    const allObjects = GameObjectModule.getAllGameObjects();
    player = allObjects.find(go => go.tag === 'Player');
}
function update(dt) {
    if (!player) return;
    const dx = player.position.x - gameObject.position.x;
    const dz = player.position.z - gameObject.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.5) {
        const speed = 3;
        gameObject.setLinearVelocity({ x: (dx/dist)*speed, y: 0, z: (dz/dist)*speed });
        gameObject.lookAt(player.position);
    } else {
        gameObject.setLinearVelocity({ x: 0, y: 0, z: 0 });
    }
}
```

### ⏫ Script Example: Elevator / Moving Platform
```javascript
// elevator.js
let startY = 0; let timer = 0;
const height = 5; const speed = 1;
function onStart() { startY = gameObject.position.y; }
function update(dt) {
    timer += dt * speed;
    gameObject.position = {
        x: gameObject.position.x,
        y: startY + Math.sin(timer) * height,
        z: gameObject.position.z
    };
}
```

### 🎰 Script Example: Object Spawner on Timer
```javascript
// spawner.js — Spawns falling cubes every 2 seconds
let timer = 0; let count = 0;
function update(dt) {
    timer += dt;
    if (timer >= 2.0 && count < 20) {
        timer = 0; count++;
        GameObjectModule.createGameObject({
            name: 'FallingBox_' + count, type: 'dynamic', primitive: 'cube',
            position: { x: (Math.random()-0.5)*10, y: 15, z: (Math.random()-0.5)*10 },
            scale: { x: 0.5, y: 0.5, z: 0.5 }, tag: 'FallingBox'
        });
    }
}
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)

### API Reference

| Action | Method | Endpoint | Body / Params | Description |
|:---|:---|:---|:---|:---|
| **List All** | `Get` | `/api/gameobjects` | — | Retrieve all active objects. |
| **Get One** | `Get` | `/api/gameobjects/:id` | — | Get a specific object by ID. |
| **Create** | `Post` | `/api/gameobjects` | See below | Add a new primitive or model-based object. |
| **Update** | `Patch` | `/api/gameobjects/:id` | See below | Modify properties. |
| **Delete** | `Delete` | `/api/gameobjects/:id` | — | Remove object and its physics body. |
| **Move** | `Post` | `/api/gameobjects/:id/move` | `{direction, amount}` | Translate by direction * amount. |
| **Rotate** | `Post` | `/api/gameobjects/:id/rotate` | `{axis, angle}` | Rotate around axis by angle (degrees). |
| **Play Animation** | `Post` | `/api/gameobjects/:id/animations/play` | `{name}` | Play a named animation clip. |
| **Attach Script** | `Post` | `/api/gameobjects/:id/scripts` | `{fileName}` | Attach a saved script file. |
| **Detach Script** | `Delete` | `/api/gameobjects/:id/scripts/:fileName` | — | Remove a script from object. |
| **Export Prefab** | `Post` | `/api/gameobjects/:id/export` | `{fileName}` | Save object as reusable prefab JSON. |

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

### Examples (PowerShell)
```powershell
$API_URL = "http://127.0.0.1:3005/api"

# List all objects
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Get

# Static ground platform
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Ground","type":"static","primitive":"cube","position":{"x":0,"y":-0.5,"z":0},"scale":{"x":20,"y":1,"z":20}}'

# Dynamic physics ball
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Ball","type":"dynamic","primitive":"sphere","position":{"x":0,"y":5,"z":0},"scale":{"x":0.5,"y":0.5,"z":0.5}}'

# Character with model
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Player","modelUrl":"Soldier.glb","isCharacter":true,"type":"dynamic","position":{"x":0,"y":2,"z":0},"tag":"Player"}'

# Kinematic platform
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Platform","type":"kinematic","primitive":"cube","position":{"x":0,"y":3,"z":-5},"scale":{"x":3,"y":0.3,"z":3}}'

# Move object forward by 5 units on Z
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID/move" -Method Post -ContentType "application/json" `
  -Body '{"direction":{"x":0,"y":0,"z":-1},"amount":5}'

# Rotate 45 degrees around Y axis
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID/rotate" -Method Post -ContentType "application/json" `
  -Body '{"axis":{"x":0,"y":1,"z":0},"angle":45}'

# Teleport to new position
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"position":{"x":5,"y":2,"z":10}}'

# Set velocity
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"physics":{"linvel":{"x":0,"y":0,"z":-10}}}'

# Set angular velocity
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"physics":{"angvel":{"x":0,"y":5,"z":0}}}'

# Change tag
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"tag":"Enemy"}'

# Enable/disable
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"enabled":false}'

# Play animation
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID/animations/play" -Method Post -ContentType "application/json" `
  -Body '{"name":"Run"}'

# Delete
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Delete
```

---

## 📝 3. SCRIPT MANAGEMENT (`/scripts`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Save/Create** | `Post` | `/api/scripts` | `{fileName, content}` | Save a `.js` script file to `assets/`. |
| **Edit** | `Patch` | `/api/scripts` | `{fileName, content}` | Overwrite an existing script. |
| **Delete** | `Delete` | `/api/scripts/:fileName` | — | Delete a script file from `assets/`. |
| **Attach** | `Post` | `/api/gameobjects/:id/scripts` | `{fileName}` | Attach a script to a GameObject. |
| **Detach** | `Delete` | `/api/gameobjects/:id/scripts/:fileName` | — | Remove a script from an object. |

### Full Workflow (PowerShell)
```powershell
$API_URL = "http://127.0.0.1:3005/api"

# Step 1: Save the script
$scriptContent = @"
function update(dt) {
  let vel = {x:0, y:0, z:0};
  if (InputModule.isKeyDown('KeyW')) vel.z = -5;
  if (InputModule.isKeyDown('KeyS')) vel.z = 5;
  if (InputModule.isKeyDown('KeyA')) vel.x = -5;
  if (InputModule.isKeyDown('KeyD')) vel.x = 5;
  gameObject.setLinearVelocity(vel);
}
"@
$body = @{ fileName = "player_move.js"; content = $scriptContent } | ConvertTo-Json
Invoke-RestMethod -Uri "$API_URL/scripts" -Method Post -ContentType "application/json" -Body $body

# Step 2: Create a GameObject
$result = Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Player","type":"dynamic","primitive":"cube","position":{"x":0,"y":2,"z":0},"tag":"Player"}'
$playerId = $result.data.id

# Step 3: Attach the script
Invoke-RestMethod -Uri "$API_URL/gameobjects/$playerId/scripts" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"player_move.js"}'

# Edit the script later
$body = @{ fileName = "player_move.js"; content = "// Updated content" } | ConvertTo-Json
Invoke-RestMethod -Uri "$API_URL/scripts" -Method Patch -ContentType "application/json" -Body $body

# Detach the script
Invoke-RestMethod -Uri "$API_URL/gameobjects/$playerId/scripts/player_move.js" -Method Delete

# Delete the script file
Invoke-RestMethod -Uri "$API_URL/scripts/player_move.js" -Method Delete
```

---

## 💡 4. LIGHT MODULE (`/lights`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **List** | `Get` | `/api/lights` | — | Get all lights. |
| **Create** | `Post` | `/api/lights` | See below | Add a light to the scene. |
| **Update** | `Patch` | `/api/lights/:id` | Any light prop | Modify a light. |
| **Delete** | `Delete` | `/api/lights/:id` | — | Remove a light. |

### Light Types & Properties

| Property | Type | Description |
|:---|:---|:---|
| `name` | string | Display name. |
| `type` | `point`, `directional`, `spot` | Light type. |
| `color` | hex string | Light color (e.g., `#ffffff`). |
| `intensity` | number | Brightness multiplier. |
| `position` | `{x,y,z}` | World position. |
| `range` | number | Maximum distance for point/spot lights. |

### Examples (PowerShell)
```powershell
$API_URL = "http://127.0.0.1:3005/api"

# Directional sun light
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" `
  -Body '{"name":"Sun","type":"directional","color":"#fffff0","intensity":2.0,"position":{"x":10,"y":20,"z":5}}'

# Point light (torch)
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" `
  -Body '{"name":"Torch","type":"point","color":"#ff8833","intensity":1.5,"position":{"x":3,"y":2,"z":3},"range":15}'

# Spot light
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" `
  -Body '{"name":"Spotlight","type":"spot","color":"#ffffff","intensity":3.0,"position":{"x":0,"y":10,"z":0},"range":20}'

# Update light
Invoke-RestMethod -Uri "$API_URL/lights/LIGHT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"intensity":0.5,"color":"#ff0000"}'

# Delete
Invoke-RestMethod -Uri "$API_URL/lights/LIGHT_ID" -Method Delete
```

---

## 🎨 5. MATERIAL MODULE (`/materials`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Create** | `Post` | `/api/materials` | `{id, props}` | Create a named material. |
| **Update** | `Patch` | `/api/materials/:id` | `{props}` or props directly | Update material. |

### Material Properties

| Property | Type | Description |
|:---|:---|:---|
| `color` | hex | Base color. |
| `emissive` | hex | Glow color. |
| `roughness` | 0-1 | Surface roughness. |
| `wireframe` | boolean | Render as wireframe. |
| `opacity` | 0-1 | Transparency level. |
| `transparent` | boolean | Enable transparency. |

### Examples (PowerShell)
```powershell
# Create player material
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"player_mat","props":{"color":"#3399ff","emissive":"#001133","roughness":0.3}}'

# Assign to a GameObject
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID" -Method Patch -ContentType "application/json" `
  -Body '{"mesh":{"materialId":"player_mat"}}'

# Glowing lava material
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"lava_mat","props":{"color":"#ff2200","emissive":"#ff4400","roughness":0.9}}'

# Transparent glass
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"glass_mat","props":{"color":"#88ccff","opacity":0.3,"transparent":true,"roughness":0.05}}'

# Wireframe debug
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"wireframe_mat","props":{"color":"#00ff00","wireframe":true}}'
```

---

## 🔊 6. AUDIO MODULE (`/audio`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **Play** | `Post` | `/api/audio/play` | `{id, assetPath, loop, volume}` | Play a sound. |
| **Stop** | `Post` | `/api/audio/stop` | `{id}` | Stop a sound. |
| **Set Volume** | `Post` | `/api/audio/setVolume` | `{id, volume}` | Change volume. |

### Examples (PowerShell)
```powershell
# Play background music (looped)
Invoke-RestMethod -Uri "$API_URL/audio/play" -Method Post -ContentType "application/json" `
  -Body '{"id":"bgm","assetPath":"music.mp3","loop":true,"volume":0.4}'

# Play sound effect
Invoke-RestMethod -Uri "$API_URL/audio/play" -Method Post -ContentType "application/json" `
  -Body '{"id":"explosion","assetPath":"explosion.wav","loop":false,"volume":0.8}'

# Adjust volume
Invoke-RestMethod -Uri "$API_URL/audio/setVolume" -Method Post -ContentType "application/json" `
  -Body '{"id":"bgm","volume":0.2}'

# Stop sound
Invoke-RestMethod -Uri "$API_URL/audio/stop" -Method Post -ContentType "application/json" `
  -Body '{"id":"bgm"}'
```

---

## 📸 7. CAMERA MODULE (`/cameras`)

### API Reference

| Action | Method | Endpoint | Body | Description |
|:---|:---|:---|:---|:---|
| **List** | `Get` | `/api/cameras` | — | Get all cameras. |
| **Get Active** | `Get` | `/api/cameras/active` | — | Get active camera. |
| **Create** | `Post` | `/api/cameras` | See below | Create a camera. |
| **Set Active** | `Post` | `/api/cameras/active` | `{id}` | Switch active camera. |
| **Update** | `Patch` | `/api/cameras/:id` | Any camera prop | Modify a camera. |
| **Delete** | `Delete` | `/api/cameras/:id` | — | Remove a camera. |

### Camera Types: `orbit` (default), `static`, `follow`

### Examples (PowerShell)
```powershell
# Create a static camera
Invoke-RestMethod -Uri "$API_URL/cameras" -Method Post -ContentType "application/json" `
  -Body '{"name":"Cutscene Cam","type":"static","position":{"x":0,"y":5,"z":10},"fov":60}'

# Create a follow camera
Invoke-RestMethod -Uri "$API_URL/cameras" -Method Post -ContentType "application/json" `
  -Body '{"name":"Player Cam","type":"follow","targetId":"PLAYER_ID","offset":{"x":0,"y":3,"z":8},"fov":70}'

# Set active camera
Invoke-RestMethod -Uri "$API_URL/cameras/active" -Method Post -ContentType "application/json" `
  -Body '{"id":"CAMERA_ID"}'

# Reset to orbit
Invoke-RestMethod -Uri "$API_URL/cameras/active" -Method Post -ContentType "application/json" `
  -Body '{"id":"default_orbit"}'
```

---

## 🌅 8. SKYBOX MODULE (`/skybox`)

### Skybox Types: `color`, `equirectangular`, `cubemap`

### Examples (PowerShell)
```powershell
# Solid color
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Post -ContentType "application/json" `
  -Body '{"type":"color","color":"#1a1a2e"}'

# Panoramic HDR
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Post -ContentType "application/json" `
  -Body '{"type":"equirectangular","assetPath":"sky_panorama.hdr","intensity":1.5}'

# Get current skybox
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Get
```

---

## 🖥️ 9. UI MODULE (`/ui`)

### UI Element Types: `label`, `button`, `text`, `checkbox`, `radio`

### Examples (PowerShell)
```powershell
# Create a score label
Invoke-RestMethod -Uri "$API_URL/ui" -Method Post -ContentType "application/json" `
  -Body '{"type":"label","id":"score_display","props":{"label":"Score: 0","x":20,"y":20}}'

# Create a button
Invoke-RestMethod -Uri "$API_URL/ui" -Method Post -ContentType "application/json" `
  -Body '{"type":"button","id":"start_btn","props":{"label":"Start Game","x":300,"y":400}}'

# Create a text input
Invoke-RestMethod -Uri "$API_URL/ui" -Method Post -ContentType "application/json" `
  -Body '{"type":"text","id":"name_input","props":{"placeholder":"Enter name","x":200,"y":100}}'
```

---

## 🎮 10. INPUT MODULE (`/input`)

### Input Methods (In Scripts)

| Method | Description |
|:---|:---|
| `InputModule.isKeyDown('KeyW')` | Returns `true` if the key is held. |
| `InputModule.isMouseButtonDown(0)` | Left mouse button. |
| `InputModule.getMousePosition()` | Returns `{x, y}` pixel coordinates. |

### Key Codes: `KeyW`, `KeyA`, `KeyS`, `KeyD`, `Space`, `ShiftLeft`, `ControlLeft`, `Enter`, `Escape`, `Digit1`-`Digit9`, `ArrowUp/Down/Left/Right`, `KeyQ`, `KeyE`, `KeyF`

---

## 🏎️ 11. VEHICLE MODULE (`/vehicles`)

### Examples (PowerShell)
```powershell
# Create chassis
$result = Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Car","type":"dynamic","primitive":"cube","position":{"x":0,"y":2,"z":0},"scale":{"x":2,"y":0.5,"z":4},"mass":1500}'
$chassisId = $result.data.id

# Create vehicle controller
Invoke-RestMethod -Uri "$API_URL/vehicles" -Method Post -ContentType "application/json" `
  -Body "{`"id`":`"my_car`",`"chassisId`":`"$chassisId`",`"config`":{`"wheels`":[{`"connectionPoint`":{`"x`":-0.8,`"y`":0,`"z`":-1.2},`"isFront`":true},{`"connectionPoint`":{`"x`":0.8,`"y`":0,`"z`":-1.2},`"isFront`":true},{`"connectionPoint`":{`"x`":-0.8,`"y`":0,`"z`":1.2},`"isFront`":false},{`"connectionPoint`":{`"x`":0.8,`"y`":0,`"z`":1.2},`"isFront`":false}]}}"

# Drive
Invoke-RestMethod -Uri "$API_URL/vehicles/my_car/control" -Method Patch -ContentType "application/json" `
  -Body '{"engineForce":1000,"steering":0.0,"brake":0}'
```

---

## 🧊 12. COLLIDERS MODULE (`/colliders`)

```powershell
# Enable physics debug wireframes
Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -ContentType "application/json" `
  -Body '{"enabled":true}'

# Disable
Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -ContentType "application/json" `
  -Body '{"enabled":false}'
```

---

## 🗂️ 13. SCENE MODULE (`/scenes`)

### Examples (PowerShell)
```powershell
# Export current scene
Invoke-RestMethod -Uri "$API_URL/scenes/export" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"my_level.json"}'

# Load a saved scene
Invoke-RestMethod -Uri "$API_URL/scenes/load" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"my_level.json"}'

# List saved scenes
Invoke-RestMethod -Uri "$API_URL/assets/scenes" -Method Get
```

---

## 📦 14. PREFAB SYSTEM (`/prefabs`)

```powershell
# Export object as prefab
Invoke-RestMethod -Uri "$API_URL/gameobjects/OBJECT_ID/export" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"enemy_template.json"}'

# Instantiate prefab
Invoke-RestMethod -Uri "$API_URL/prefabs/instantiate" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"enemy_template.json","position":{"x":5,"y":2,"z":-3}}'
```

---

## 🔎 15. SYSTEM & DEBUGGING

```powershell
# Full state sync
Invoke-RestMethod -Uri "$API_URL/sync" -Method Get

# View module source code
Invoke-RestMethod -Uri "$API_URL/source?module=GameObjectModule" -Method Get
Invoke-RestMethod -Uri "$API_URL/source?module=PhysicsModule" -Method Get
Invoke-RestMethod -Uri "$API_URL/source?module=UIModule" -Method Get

# Full help reference
Invoke-RestMethod -Uri "$API_URL/help" -Method Get
```

---

## 🚀 COMPLETE GAME BUILDING TUTORIAL (PowerShell)

### Platformer Game — Step by Step

```powershell
$API_URL = "http://127.0.0.1:3005/api"

# 1. Set skybox
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Post -ContentType "application/json" `
  -Body '{"type":"color","color":"#2d1b69"}'

# 2. Create ground
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Ground","type":"static","primitive":"cube","position":{"x":0,"y":-1,"z":0},"scale":{"x":30,"y":1,"z":30}}'

# 3. Add sun light
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" `
  -Body '{"name":"Sun","type":"directional","color":"#ffeedd","intensity":2,"position":{"x":10,"y":20,"z":5}}'

# 4. Ground material
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"ground_mat","props":{"color":"#2a5a2a","roughness":0.8}}'

# 5. Create player
$player = Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Player","type":"dynamic","primitive":"capsule","position":{"x":0,"y":2,"z":0},"scale":{"x":0.5,"y":1,"z":0.5},"tag":"Player"}'
$playerId = $player.data.id

# 6. Player material
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" `
  -Body '{"id":"player_mat","props":{"color":"#3399ff","emissive":"#001133"}}'
Invoke-RestMethod -Uri "$API_URL/gameobjects/$playerId" -Method Patch -ContentType "application/json" `
  -Body '{"mesh":{"materialId":"player_mat"}}'

# 7. Platforms
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Platform1","type":"static","primitive":"cube","position":{"x":4,"y":2,"z":-3},"scale":{"x":3,"y":0.3,"z":3}}'
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" `
  -Body '{"name":"Platform2","type":"static","primitive":"cube","position":{"x":8,"y":4,"z":-6},"scale":{"x":3,"y":0.3,"z":3}}'

# 8. Player controller script
$script = @"
const speed = 6;
const jumpForce = 10;
let grounded = false;
function onCollisionEnter(other) { if (other.position.y < gameObject.position.y) grounded = true; }
function onCollisionExit(other) { grounded = false; }
function update(dt) {
  const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
  const curVel = body ? body.linvel() : {x:0,y:0,z:0};
  let vx = 0, vz = 0;
  if (InputModule.isKeyDown('KeyW')) vz = -speed;
  if (InputModule.isKeyDown('KeyS')) vz = speed;
  if (InputModule.isKeyDown('KeyA')) vx = -speed;
  if (InputModule.isKeyDown('KeyD')) vx = speed;
  gameObject.setLinearVelocity({x: vx, y: curVel.y, z: vz});
  if (InputModule.isKeyDown('Space') && grounded) {
    gameObject.applyImpulse({x:0, y:jumpForce, z:0});
    grounded = false;
  }
}
"@
$body = @{ fileName = "platformer_player.js"; content = $script } | ConvertTo-Json
Invoke-RestMethod -Uri "$API_URL/scripts" -Method Post -ContentType "application/json" -Body $body

# 9. Attach script to player
Invoke-RestMethod -Uri "$API_URL/gameobjects/$playerId/scripts" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"platformer_player.js"}'

# 10. Save the scene
Invoke-RestMethod -Uri "$API_URL/scenes/export" -Method Post -ContentType "application/json" `
  -Body '{"fileName":"platformer_level1.json"}'

# 11. Enable debug gizmos
Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -ContentType "application/json" `
  -Body '{"enabled":true}'
```

---

## 🧮 QUICK REFERENCE: RAW THREE & RAPIER (Scripts Only)

### THREE.js — Vector Math
```javascript
const a = new THREE.Vector3(gameObject.position.x, 0, gameObject.position.z);
const b = new THREE.Vector3(10, 0, 10);
const dist = a.distanceTo(b);
const dir = new THREE.Vector3().subVectors(b, a).normalize();
const mid = new THREE.Vector3().lerpVectors(a, b, 0.5);
```

### RAPIER — Physics Queries
```javascript
const ray = new RAPIER.Ray({ x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 });
const hit = PhysicsModule.world.castRay(ray, 100, true);
if (hit) {
    const hitGo = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle);
}
const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
const vel = body.linvel();
const pos = body.translation();
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
| `POST` | `/api/gameobjects/:id/animations/report` | Report animations. |
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
| `POST` | `/api/audio/setVolume` | Set volume. |
| `GET` | `/api/cameras` | List cameras. |
| `GET` | `/api/cameras/active` | Get active camera. |
| `POST` | `/api/cameras` | Create a camera. |
| `POST` | `/api/cameras/active` | Set active camera. |
| `PATCH` | `/api/cameras/:id` | Update a camera. |
| `DELETE` | `/api/cameras/:id` | Delete a camera. |
| `GET` | `/api/skybox` | Get skybox config. |
| `POST` | `/api/skybox` | Set skybox. |
| `POST` | `/api/ui` | Create UI element. |
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
