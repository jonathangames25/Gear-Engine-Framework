#!/bin/bash
# Platformer Game Test Script
API_URL="http://127.0.0.1:3005/api"
SCENE_FILE="platformer_scene.json"

# Helper to extract values from JSON
extract_value() {
  local json="$1"
  local key="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r "$key"
  else
    # Simple regex fallback
    local pattern="\"$(echo $key | sed 's/.*\.//')\":\"\?\([^\",]*\)\"\?"
    echo "$json" | grep -o "\"$(echo $key | sed 's/.*\.//')\":\"[^\"]*\"" | head -n 1 | cut -d'"' -f4
  fi
}

echo "--- Platformer Test Initialization ---"

# 1. Try to load the scene
echo "Checking for existing scene: $SCENE_FILE..."
LOAD_RESP=$(curl -s -X POST "$API_URL/scenes/load" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\": \"$SCENE_FILE\"}")

LOAD_STATUS=$(extract_value "$LOAD_RESP" ".status")

if [ "$LOAD_STATUS" == "success" ]; then
    echo "Scene loaded successfully."
else
    echo "Scene not found or failed to load. Creating a new scene..."
    CREATE_RESP=$(curl -s -X POST "$API_URL/scenes" \
      -H "Content-Type: application/json" \
      -d '{"name": "Platformer Test Scene"}')
    CREATE_STATUS=$(extract_value "$CREATE_RESP" ".status")
    
    if [ "$CREATE_STATUS" != "success" ]; then
        echo "Error creating scene: $CREATE_RESP"
        exit 1
    fi
    echo "New scene created."
fi

# 2. Check if Soldier already exists in the active scene
echo "Checking for Soldier model..."
ACTIVE_SCENE=$(curl -s "$API_URL/scenes/active")
SOLDIER_ID=""

# Search for "Platformer Soldier" in gameObjects
if command -v jq >/dev/null 2>&1; then
    SOLDIER_ID=$(echo "$ACTIVE_SCENE" | jq -r '.data.gameObjects[] | select(.name == "Platformer Soldier") | .id')
else
    # Rough fallback for extraction
    SOLDIER_ID=$(echo "$ACTIVE_SCENE" | grep -o '"id":"[^"]*","name":"Platformer Soldier"' | cut -d'"' -f4)
fi

if [ -n "$SOLDIER_ID" ] && [ "$SOLDIER_ID" != "null" ]; then
    echo "Soldier already exists with ID: $SOLDIER_ID"
    # Ensure tag is set even if it existed
    curl -s -X PATCH "$API_URL/gameobjects/$SOLDIER_ID" \
      -H "Content-Type: application/json" \
      -d '{"tag": "player"}'
else
    echo "Soldier not found. Adding Soldier model..."
    ADD_RESP=$(curl -s -X POST "$API_URL/gameobjects" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Platformer Soldier",
        "modelUrl": "Soldier.glb",
        "position": {"x": 0, "y": 2, "z": 0},
        "isCharacter": true,
        "tag": "player"
      }')
    SOLDIER_ID=$(extract_value "$ADD_RESP" ".data.id")
    
    if [ -z "$SOLDIER_ID" ] || [ "$SOLDIER_ID" == "null" ]; then
        echo "Failed to add Soldier: $ADD_RESP"
        exit 1
    fi
    echo "Soldier added with ID: $SOLDIER_ID"
    
    # 3. Attach character_controller.js
    echo "Attaching character_controller.js..."
    ATTACH_RESP=$(curl -s -X POST "$API_URL/gameobjects/$SOLDIER_ID/scripts" \
      -H "Content-Type: application/json" \
      -d '{"fileName": "character_controller.js"}')
    echo "Script attach result: $(extract_value "$ATTACH_RESP" ".message")"
fi

# 4. Change Floor Color
echo "Updating floor color..."
# Create a material for the floor with a texture
curl -s -X POST "$API_URL/materials" \
  -H "Content-Type: application/json" \
  -d '{"id": "floor_mat", "props": {"color": "#ffffff", "map": "ground.jpg"}}'

# Find the Ground Plane and update it
GROUND_ID=$(echo "$ACTIVE_SCENE" | jq -r '.data.gameObjects[] | select(.name == "Ground Plane") | .id' 2>/dev/null || echo "")
if [ -n "$GROUND_ID" ] && [ "$GROUND_ID" != "null" ]; then
    curl -s -X PATCH "$API_URL/gameobjects/$GROUND_ID" \
      -H "Content-Type: application/json" \
      -d '{"mesh": {"materialId": "floor_mat"}}'
fi

# 5. Add Lighting
echo "Checking for lights..."
LIGHTS=$(curl -s "$API_URL/lights")
MAIN_LIGHT_ID=$(echo "$LIGHTS" | jq -r '.[] | select(.name == "Main Directional Light") | .id' 2>/dev/null || echo "")

if [ -z "$MAIN_LIGHT_ID" ] || [ "$MAIN_LIGHT_ID" == "null" ]; then
    echo "Adding Main Directional Light..."
    curl -s -X POST "$API_URL/lights" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Main Directional Light",
        "type": "directional",
        "color": "#ffffff",
        "intensity": 2.5,
        "position": {"x": 10, "y": 20, "z": 10}
      }'
fi

# 6. Add 4 Spheres around the player
echo "Checking for spheres..."
for i in {1..4}; do
    SPHERE_NAME="Sphere $i"
    SPHERE_ID=$(echo "$ACTIVE_SCENE" | jq -r ".data.gameObjects[] | select(.name == \"$SPHERE_NAME\") | .id" 2>/dev/null || echo "")
    
    if [ -z "$SPHERE_ID" ] || [ "$SPHERE_ID" == "null" ]; then
        echo "Adding $SPHERE_NAME..."
        angle=$(echo "($i-1) * 1.57" | bc -l)
        radius=4
        x=$(printf "%.4f" $(echo "$radius * s($angle)" | bc -l))
        z=$(printf "%.4f" $(echo "$radius * c($angle)" | bc -l))
        
        # Determine color - each sphere a different color for flair
        colors=("#ff0000" "#00ff00" "#0000ff" "#ffff00")
        color=${colors[$((i-1))]}
        
        # Create material for sphere
        curl -s -X POST "$API_URL/materials" \
          -H "Content-Type: application/json" \
          -d "{\"id\": \"sphere_mat_$i\", \"props\": {\"color\": \"$color\"}}"

        SPHERE_ADD_RESP=$(curl -s -X POST "$API_URL/gameobjects" \
          -H "Content-Type: application/json" \
          -d "{
            \"name\": \"$SPHERE_NAME\",
            \"primitive\": \"sphere\",
            \"position\": {\"x\": $x, \"y\": 2, \"z\": $z},
            \"type\": \"dynamic\",
            \"mesh\": {\"materialId\": \"sphere_mat_$i\"}
          }")
        
        SPHERE_ID=$(extract_value "$SPHERE_ADD_RESP" ".data.id")
        
        # Attach sphere_script.js
        echo "Attaching sphere_script.js to $SPHERE_NAME..."
        curl -s -X POST "$API_URL/gameobjects/$SPHERE_ID/scripts" \
          -H "Content-Type: application/json" \
          -d '{"fileName": "sphere_script.js"}'
    fi
done

# 7. Add Follow Camera
echo "Setting up follow camera..."
CAM_RESP=$(curl -s -X POST "$API_URL/cameras" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Soldier Follow Cam\",
    \"type\": \"follow\",
    \"targetId\": \"$SOLDIER_ID\",
    \"offset\": {\"x\": 0, \"y\": 4, \"z\": 8}
  }")
CAM_ID=$(extract_value "$CAM_RESP" ".data.id")

if [ -n "$CAM_ID" ] && [ "$CAM_ID" != "null" ]; then
    echo "Follow camera created. Setting as active..."
    curl -s -X POST "$API_URL/cameras/active" \
      -H "Content-Type: application/json" \
      -d "{\"id\": \"$CAM_ID\"}"
else
    echo "Failed to create camera: $CAM_RESP"
fi

# 8. Set Skybox
echo "Setting skybox to Venice Sunset..."
curl -s -X POST "$API_URL/skybox" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "equirectangular",
    "assetPath": "venice_sunset_1k.hdr",
    "intensity": 1.0
  }'

# 9. Save the scene
echo "Saving scene to $SCENE_FILE..."
SAVE_RESP=$(curl -s -X POST "$API_URL/scenes/export" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\": \"$SCENE_FILE\"}")

if [ "$(extract_value "$SAVE_RESP" ".status")" == "success" ]; then
    echo "Scene saved successfully."
    # Double check file exists in assets (root assets folder)
    if [ -f "../../../assets/$SCENE_FILE" ]; then
        echo "Validated: assets/$SCENE_FILE exists."
    else
        echo "Error: Scene file assets/$SCENE_FILE was reported saved but could not be found!"
        exit 1
    fi
else
    echo "Failed to save scene: $SAVE_RESP"
    exit 1
fi

# 10. Play Background Music
echo "Playing background music..."
curl -s -X POST "$API_URL/audio/play" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "bg_music",
    "assetPath": "bg_music.mp3",
    "loop": true,
    "volume": 0.3
  }'

echo "--- Platformer Test Ready ---"
echo "Character stability fixed (locking rotation). Colors should now be visible."
echo "Camera is now FOLLOWING the player!"

