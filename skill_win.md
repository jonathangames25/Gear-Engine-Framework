# ⚙️ Gear Engine: Complete AI Skill Reference (PowerShell)

This guide provides the exhaustive command-set and usage patterns for the Gear Engine using PowerShell (`Invoke-RestMethod`).

---

## 🛠️ API Fundamentals
- **Base URL**: `$API_URL = "http://127.0.0.1:3005/api"`
- **Headers**: `-ContentType "application/json"`

### 🤖 AI Self-Healing & Discovery
> [!IMPORTANT]
> - **404 Errors**: In the event that the Gear Engine base URL returns a **404** or appears unresponsive, a ping to `GET /api/gameobjects` **MUST** be performed immediately via `Invoke-RestMethod`. This confirms engine availability and retrieves the current scene's state.
> - **Script Errors**: When errors are encountered during script execution or attachment, **NODE.JS LOGS MUST BE REQUESTED** from the terminal. Detailed error stacks are often output to the Node console and are not visible via the API.
> - **FULL ACCESS**: For advanced logic, direct access to the **`THREE`** and **`RAPIER`** libraries is provided. These are to be used for custom math, complex physics queries, or direct engine manipulation.

---

## ⚡ 1. SCRIPTING & LOGIC (`/scripts`)
Scripts serve as the logic for GameObjects. They are standard JavaScript files saved in `assets/`.

### 📂 Script Asset Management
| Action | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Save/Create** | `Post` | `/scripts` | Save a new script or overwrite an existing one. |
| **Edit** | `Patch` | `/scripts` | Update the content of an existing script. |
| **Delete** | `Delete` | `/scripts/[fileName]` | Permanently remove a script from assets. |

#### Example: Save/Edit Script
```powershell
Invoke-RestMethod -Uri "$API_URL/scripts" -Method Post -ContentType "application/json" -Body '{
    "fileName": "rotation_logic.js",
    "content": "function update(dt) { gameObject.rotate({x:0, y:1, z:0}, 50 * dt); }"
}'
```

#### Example: Delete Script from Assets
```powershell
Invoke-RestMethod -Uri "$API_URL/scripts/rotation_logic.js" -Method Delete
```

### 🔗 Script Attachment & Detachment
Attach or remove logic from specific GameObjects.

| Action | Method | Endpoint |
| :--- | :--- | :--- |
| **Attach** | `Post` | `/gameobjects/[ID]/scripts` |
| **Detach** | `Delete` | `/gameobjects/[ID]/scripts/[fileName]` |

#### Example: Attach to Object
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects/[ID]/scripts" -Method Post -ContentType "application/json" -Body '{"fileName": "rotation_logic.js"}'
```

#### Example: Detach from Object
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects/[ID]/scripts/rotation_logic.js" -Method Delete
```

### 🧠 Essential Script Events
```javascript
function onStart() {
    // Called once when script is attached or scene loaded
    console.log("Entity " + gameObject.name + " initialized!");
}

function update(dt) {
    // Called every frame (~60fps). dt is delta time in seconds.
    gameObject.position.x += 1 * dt; 
}

function onCollisionEnter(other) {
    // Called when this object hits another collider
    console.log("Collided with: " + other.name);
}
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)
GameObjects combine meshes, physics, and scripting.

### List All Active Objects
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Get
```

### Creating Objects
```powershell
# Character (Kinematic)
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" -Body '{"name": "Player", "modelUrl": "Soldier.glb", "isCharacter": true}'

# Rigid Body (Dynamic)
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" -Body '{"name": "Crate", "primitive": "box", "type": "dynamic", "position": {"y": 5}}'
```

---

## 🎨 3. MATERIAL MODULE (`/materials`)
```powershell
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" -Body '{
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
```powershell
Invoke-RestMethod -Uri "$API_URL/cameras" -Method Post -ContentType "application/json" -Body '{
    "name": "MainFollow",
    "type": "follow",
    "targetId": "[GO_ID]",
    "offset": {"x": 0, "y": 5, "z": 10}
}'
```

---

## 🏎️ 5. VEHICLE PHYSICS (`/vehicles`)
```powershell
# Create
Invoke-RestMethod -Uri "$API_URL/vehicles" -Method Post -ContentType "application/json" -Body '{"id": "car", "chassisId": "[GO_ID]", "config": {...}}'

# Drive
Invoke-RestMethod -Uri "$API_URL/vehicles/car/control" -Method Patch -ContentType "application/json" -Body '{"engineForce": 500.0, "steering": 0.2}'
```

---

## 💡 6. LIGHT MODULE (`/lights`)
```powershell
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" -Body '{"type": "directional", "intensity": 2.5, "color": "#ffffff"}'
```

---

## 🔊 7. AUDIO MODULE (`/audio`)
```powershell
Invoke-RestMethod -Uri "$API_URL/audio/play" -Method Post -ContentType "application/json" -Body '{"id": "bgm", "assetPath": "music.mp3", "loop": true}'
```

---

## 🌆 8. SKYBOX & ENVIRONMENT (`/skybox`)
```powershell
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Post -ContentType "application/json" -Body '{"type": "equirectangular", "assetPath": "sky.hdr"}'
```

---

## 💾 9. SCENE PERSISTENCE (`/scenes`)
```powershell
# Export
Invoke-RestMethod -Uri "$API_URL/scenes/export" -Method Post -ContentType "application/json" -Body '{"fileName": "save.json"}'

# Load
Invoke-RestMethod -Uri "$API_URL/scenes/load" -Method Post -ContentType "application/json" -Body '{"fileName": "save.json"}'
```

---

## 🔎 10. SYSTEM & DEBUGGING
- **State Sync**: `Invoke-RestMethod -Uri "$API_URL/sync" -Method Get`
- **Source Inspection**: `Invoke-RestMethod -Uri "$API_URL/source?module=[ModuleName]" -Method Get`
- **Collider Gizmos**: `Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -ContentType "application/json" -Body '{"enabled": true}'`
