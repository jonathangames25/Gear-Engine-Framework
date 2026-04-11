# ⚙️ Gear Engine: Complete AI Skill Reference

This guide provides the exhaustive command-set and usage patterns for the Gear Engine. It is intended for AI agents to understand how to manipulate materials, physics, audio, and scenes via the REST API.

---

## 🛠️ API Fundamentals
- **Base URL**: `http://127.0.0.1:3005/api`
- **Method Conventions**: 
  - `GET`: Query state.
  - `POST`: Create or perform actions.
  - `PATCH`: Update existing entities.
  - `DELETE`: Remove entities.
- **Header**: `Content-Type: application/json`

---

## 🎨 1. MATERIAL MODULE (`/materials`)
Materials define the surface properties of meshes.

### Full PBR Material Definition
Highly recommended for realistic lighting and textures.
```bash
curl -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gold_metal",
    "props": {
      "color": "#ffd700",
      "metalness": 0.9,
      "roughness": 0.1,
      "map": "gold_albedo.jpg",
      "normalMap": "gold_normal.jpg",
      "wireframe": false,
      "opacity": 1.0,
      "transparent": false
    }
  }'
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)
GameObjects combine meshes, physics, and scripting.

### Creating a Character (Player/NPC)
Initializes a Kinematic Character Controller with specific gravity and interaction logic.
```bash
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Player",
    "modelUrl": "Soldier.glb",
    "position": {"x": 0, "y": 2, "z": 0},
    "isCharacter": true,
    "tag": "player"
  }'
```

### Adding Rigid Bodies (Physics Objects)
Support for `dynamic`, `fixed`, and `kinematic` types.
```bash
curl -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HeavyCrate",
    "primitive": "box",
    "type": "dynamic",
    "position": {"x": -2, "y": 10, "z": 0},
    "scale": {"x": 2, "y": 2, "z": 2},
    "mass": 10.5,
    "mesh": {"materialId": "crate_mat"}
  }'
```

### 📂 Script Management (`/scripts`)
Save logic files directly to the engine's asset folder via API.
```bash
curl -X POST "$API_URL/scripts" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "rotation_logic.js",
    "content": "function update(dt) { gameObject.rotate({x:0, y:1, z:0}, 50 * dt); }"
  }'
```

### 🔗 Scripting Attachment
Attach logic files found in the `assets/` folder to a specific GameObject.
```bash
curl -X POST "$API_URL/gameobjects/[ID]/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "rotation_logic.js"}'
```

### 👁️ Visibility & Mastery (`/gameobjects`)
- `enabled`: `false` disables logic, physics, and hides the mesh.
- `mesh.visible`: `false` hides the mesh but keeps physics (colliders) active.

```bash
# Hide mesh but keep collider active
curl -X PATCH "$API_URL/gameobjects/[ID]" \
  -d '{"mesh": {"visible": false}}'

# Disable entire GameObject (logic + physics + mesh)
curl -X PATCH "$API_URL/gameobjects/[ID]" \
  -d '{"enabled": false}'
```

---

## 🎥 3. CAMERA MODULE (`/cameras`)

### Dynamic Follow Camera
Automatically tracks a target GameObject with an offset.
```bash
curl -X POST "$API_URL/cameras" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MainFollow",
    "type": "follow",
    "targetId": "[GO_ID]",
    "offset": {"x": 0, "y": 5, "z": 10},
    "fov": 60
  }'
```

### Switch Active Camera
```bash
curl -X POST "$API_URL/colliders/gizmos" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 🏎️ 11. VEHICLE PHYSICS (`/vehicles`)
Advanced raycast-based vehicle controllers for cars and rovers.

### Create Vehicle from Chassis
Requires an existing GameObject to act as the car body.
```bash
curl -X POST "$API_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sports_car",
    "chassisId": "[GO_ID]",
    "config": {
      "wheels": [
        {"connectionPoint": {"x": -0.8, "y": 0, "z": -1.2}, "isFront": true, "radius": 0.4},
        {"connectionPoint": {"x": 0.8, "y": 0, "z": -1.2}, "isFront": true, "radius": 0.4},
        {"connectionPoint": {"x": -0.8, "y": 0, "z": 1.2}, "isFront": false, "radius": 0.4},
        {"connectionPoint": {"x": 0.8, "y": 0, "z": 1.2}, "isFront": false, "radius": 0.4}
      ]
    }
  }'
```

### Drive Vehicle
Control engine force, steering, and braking.
```bash
curl -X PATCH "$API_URL/vehicles/sports_car/control" \
  -H "Content-Type: application/json" \
  -d '{
    "engineForce": 500.0,
    "steering": 0.2,
    "fourWheelDrive": true
  }'
```

---

## 💡 4. LIGHT MODULE (`/lights`)

### Dynamic Lighting Setup
```bash
# Directional (Sunlight)
curl -X POST "$API_URL/lights" \
  -d '{"type": "directional", "intensity": 2.5, "color": "#ffffff", "position": {"x": 10, "y": 20, "z": 10}}'

# Point Light (Torch/Bulb)
curl -X POST "$API_URL/lights" \
  -d '{"type": "point", "intensity": 5.0, "color": "#ffaa00", "range": 25, "position": {"x": 0, "y": 2, "z": 0}}'
```

---

## 🔊 5. AUDIO MODULE (`/audio`)

### Spatial & Background Audio
```bash
# Play Ambient Loop
curl -X POST "$API_URL/audio/play" \
  -d '{"id": "bg_music", "assetPath": "music.mp3", "loop": true, "volume": 0.3}'

# Update Volume dynamically
curl -X POST "$API_URL/audio/setVolume" \
  -d '{"id": "bg_music", "volume": 1.0}'
```

---

## 🌆 6. SKYBOX & ENVIRONMENT (`/skybox`)

### HDR Environment Mapping
```bash
curl -X POST "$API_URL/skybox" \
  -d '{
    "type": "equirectangular",
    "assetPath": "venice_sunset_1k.hdr",
    "intensity": 1.5
  }'
```

---

## 🖼️ 7. UI OVERLAY MODULE (`/ui`)

### 2D Interface Creation
```bash
# Create Interactive Button
curl -X POST "$API_URL/ui" \
  -d '{
    "type": "button",
    "id": "play_btn",
    "props": {"label": "PLAY", "x": 100, "y": 100}
  }'

# Update Label Text
curl -X PATCH "$API_URL/ui/[ID]" \
  -d '{"props": {"label": "Score: 100"}}'
```

---

## 💾 8. SCENE PERSISTENCE (`/scenes`)

### Export Current State
```bash
curl -X POST "$API_URL/scenes/export" \
  -d '{"fileName": "world_state_v1.json"}'
```

### Load Entire Level
Wipes current world and recreates all materials, cameras, and physics bodies.
```bash
curl -X POST "$API_URL/scenes/load" \
  -d '{"fileName": "world_state_v1.json"}'
```

---

## ⚡ 9. SCRIPTING API EXPOSURE
Inside `.js` files in `assets/`, the following global objects are available for direct logic:

```javascript
// Accessing Materials
MaterialModule.updateMaterial('player_mat', { color: '#ffffff' });

// Accessing Audio
AudioModule.playSound('hit', 'hit_sfx.mp3', false, 1.0);

// Physics Forces
const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
body.applyImpulse({ x: 0, y: 10, z: 0 }, true);

// Scene Manipulation
const newBox = MeshModule.createPrimitive('box');
```

---

## 🔎 10. DEBUGGING & SYNC
- **Collider Gizmos**: `POST /api/colliders/gizmos` with `{ "enabled": true }` to see wireframes.
- **State Sync**: `GET /api/sync` to get real-time positions of all physics-driven objects.
- **Input Polling**: `POST /api/input` with current key/mouse state for custom manual controllers.
