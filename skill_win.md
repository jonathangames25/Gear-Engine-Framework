# ⚙️ Gear Engine: Complete AI Skill Reference (PowerShell)

This guide provides the exhaustive command-set and usage patterns for the Gear Engine using PowerShell (`Invoke-RestMethod`).

---

## 🛠️ API Fundamentals
- **Base URL**: `$API_URL = "http://127.0.0.1:3005/api"`
- **Headers**: `-ContentType "application/json"`

### 🤖 AI Self-Healing & Discovery
> [!IMPORTANT]
> If the Gear Engine base URL returns a **404** or appears unresponsive, the AI **MUST** immediately ping `GET /api/gameobjects` via `Invoke-RestMethod`. This confirms the engine's availability and retrieves the current scene's state to locate the correct service path.

---

## 🎨 1. MATERIAL MODULE (`/materials`)

### Create PBR Material
```powershell
Invoke-RestMethod -Uri "$API_URL/materials" -Method Post -ContentType "application/json" -Body '{
    "id": "gold_metal",
    "props": {
      "color": "#ffd700",
      "metalness": 0.9,
      "roughness": 0.1,
      "map": "gold_albedo.jpg",
      "wireframe": false
    }
}'
```

---

## 📦 2. GAMEOBJECT MODULE (`/gameobjects`)

### List All Active Objects
Always start by listing objects to understand the current scene context.
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Get
```

### Creating a Character
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" -Body '{
    "name": "Player",
    "modelUrl": "Soldier.glb",
    "position": {"x": 0, "y": 2, "z": 0},
    "isCharacter": true,
    "tag": "player"
}'
```

### Adding Rigid Bodies
```powershell
Invoke-RestMethod -Uri "$API_URL/gameobjects" -Method Post -ContentType "application/json" -Body '{
    "name": "HeavyCrate",
    "primitive": "box",
    "type": "dynamic",
    "position": {"x": -2, "y": 10, "z": 0},
    "mesh": {"materialId": "crate_mat"}
}'
```

---

## 🎥 3. CAMERA MODULE (`/cameras`)

### Create Follow Camera
```powershell
Invoke-RestMethod -Uri "$API_URL/cameras" -Method Post -ContentType "application/json" -Body '{
    "name": "MainFollow",
    "type": "follow",
    "targetId": "[GO_ID]",
    "offset": {"x": 0, "y": 5, "z": 10}
}'
```

### Switch Active Camera
```powershell
Invoke-RestMethod -Uri "$API_URL/cameras/active" -Method Post -ContentType "application/json" -Body '{"id": "[CAM_ID]"}'
```

---

## 💡 4. LIGHT MODULE (`/lights`)

### Add Lights
```powershell
# Directional Sun
Invoke-RestMethod -Uri "$API_URL/lights" -Method Post -ContentType "application/json" -Body '{"type": "directional", "intensity": 2.5, "color": "#ffffff", "position": {"x": 10, "y": 20, "z": 10}}'
```

---

## 🔊 5. AUDIO MODULE (`/audio`)

### Play & Volume
```powershell
Invoke-RestMethod -Uri "$API_URL/audio/play" -Method Post -ContentType "application/json" -Body '{"id": "bg_music", "assetPath": "music.mp3", "loop": true, "volume": 0.3}'

Invoke-RestMethod -Uri "$API_URL/audio/setVolume" -Method Post -ContentType "application/json" -Body '{"id": "bg_music", "volume": 1.0}'
```

---

## 🌆 6. SKYBOX & ENVIRONMENT (`/skybox`)

### Set HDR
```powershell
Invoke-RestMethod -Uri "$API_URL/skybox" -Method Post -ContentType "application/json" -Body '{
    "type": "equirectangular",
    "assetPath": "venice_sunset_1k.hdr",
    "intensity": 1.5
}'
```

---

## 🖼️ 7. UI OVERLAY MODULE (`/ui`)

### Create UI
```powershell
Invoke-RestMethod -Uri "$API_URL/ui" -Method Post -ContentType "application/json" -Body '{
    "type": "button",
    "id": "play_btn",
    "props": {"label": "PLAY", "x": 100, "y": 100}
}'
```

---

## 💾 8. SCENE PERSISTENCE (`/scenes`)

### Export / Load
```powershell
Invoke-RestMethod -Uri "$API_URL/scenes/export" -Method Post -ContentType "application/json" -Body '{"fileName": "world_v1.json"}'

Invoke-RestMethod -Uri "$API_URL/scenes/load" -Method Post -ContentType "application/json" -Body '{"fileName": "world_v1.json"}'
```

---

## 🏎️ 9. VEHICLE PHYSICS (`/vehicles`)

### Create Car
```powershell
Invoke-RestMethod -Uri "$API_URL/vehicles" -Method Post -ContentType "application/json" -Body '{
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

### Drive Car
```powershell
Invoke-RestMethod -Uri "$API_URL/vehicles/sports_car/control" -Method Patch -ContentType "application/json" -Body '{
    "engineForce": 500.0,
    "steering": 0.2,
    "fourWheelDrive": true
}'
```

---

## ⚡ 10. DEBUGGING & SYNC
- **Collider Gizmos**: `Invoke-RestMethod -Uri "$API_URL/colliders/gizmos" -Method Post -ContentType "application/json" -Body '{"enabled": true}'`
- **State Sync**: `Invoke-RestMethod -Uri "$API_URL/sync" -Method Get`
