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
> If the Gear Engine base URL returns a **404** or appears unresponsive, the AI **MUST** immediately ping `GET /api/gameobjects`. This confirms the engine's availability and retrieves the current scene's state to locate the correct service path.

---

## ⚡ 1. SCRIPTING & LOGIC (`/scripts`)
Scripts are the brain of your GameObjects. They are standard JavaScript files saved in `assets/`.

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
Always start by listing objects to understand the current scene context.
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
