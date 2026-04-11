# ⚙️ Gear Engine: Complete AI Skill Reference (PowerShell)

This guide provides the exhaustive command-set and usage patterns for the Gear Engine using PowerShell (`Invoke-RestMethod`).

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
> - **Physics-First Workflow**: This engine is optimized for physics. Moving dynamic objects by setting `.position` directly is discouraged for gameplay; instead, **impulses and velocities** should be used to ensure Realistic Physics interaction.
> - **Module Priority**: Always attempt to use built-in modules (`GameObjectModule`, `PhysicsModule`, etc.) before using raw **`THREE`** or **`RAPIER`** libraries. Raw libraries should only be used for high-complexity math or direct engine manipulation beyond module capabilities.

---

## ⚡ 1. SCRIPTING & LOGIC (`/scripts`)

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
    
    gameObject.setLinearVelocity(vel);
    
    if (InputModule.isKeyDown('Space') && Math.abs(gameObject.position.y) < 0.1) {
        gameObject.applyImpulse({ x: 0, y: 10, z: 0 });
    }
}
```

#### Advanced Physics Rotation
```javascript
function update(dt) {
    // Apply angular velocity to spin the object
    gameObject.setAngularVelocity({ x: 0, y: 5, z: 0 });
}
```

#### Module Helpers (Spawning)
```javascript
function update(dt) {
    if (InputModule.isKeyDown('KeyF')) {
        const spawnPos = { x: gameObject.position.x, y: gameObject.position.y + 1, z: gameObject.position.z };
        GameObjectModule.instantiatePrefab('bullet.json', spawnPos);
    }
}
```

### 📂 Asset Management Examples
```powershell
# Save a script
Invoke-RestMethod -Uri "$API_URL/scripts" -Method Post -Body '{"fileName": "logic.js", "content": "..."}'

# Attach to GameObject
Invoke-RestMethod -Uri "$API_URL/gameobjects/[ID]/scripts" -Method Post -Body '{"fileName": "logic.js"}'
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)

### List All Active Objects
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Get
```

### Creating Complex Objects
```powershell
# Character (Kinematic)
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -Body '{"name": "Player", "modelUrl": "Soldier.glb", "isCharacter": true, "position": {"x": 0, "y": 2, "z": 0}}'

# Dynamic Physics Box
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -Body '{"name": "Box", "primitive": "cube", "type": "dynamic", "position": {"y": 10}}'
```

---

## 🏎️ 3. VEHICLE PHYSICS (`/vehicles`)
```powershell
Invoke-RestMethod -Uri "$API_URL/vehicles/player_car/control" -Method Patch -Body '{"engineForce": 1000.0, "steering": 0.5}'
```

---

## 🔎 4. SYSTEM & DEBUGGING
- **Physics Debug**: `Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -Body '{"enabled": true}'`
- **Source Inspection**: `Invoke-RestMethod -Uri "$API_URL/source?module=GameObjectModule" -Method Get`
