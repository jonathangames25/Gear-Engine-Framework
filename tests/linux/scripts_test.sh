#!/bin/bash
API_URL="http://127.0.0.1:3005/api"

# Helper to extract values
extract_value() {
  local json="$1"
  local key="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r "$key"
  else
    echo "$json" | grep -o "\"$(echo $key | sed 's/.*\.//')\":\"\?\([^\",]*\)\"\?" | head -n 1 | cut -d'"' -f4
  fi
}

echo "--- Testing Scripting System ---"

# 1. Create a Player Cube
echo "Creating Player Cube..."
RESP=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Player",
    "primitive": "cube",
    "position": {"x": 0, "y": 2, "z": 0},
    "type": "dynamic"
  }')
PLAYER_ID=$(extract_value "$RESP" ".data.id")

# 2. Attach the script
echo "Attaching player_controller.js to Player (ID: $PLAYER_ID)..."
curl -s -X POST "$API_URL/gameobjects/$PLAYER_ID/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "player_controller.js"}'

# 3. Create a static obstacle to test collision
echo "Creating Obstacle..."
curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Obstacle",
    "primitive": "cube",
    "position": {"x": 2, "y": 0.5, "z": 0},
    "type": "static",
    "scale": {"x": 1, "y": 1, "z": 1}
  }'

echo "Done. Try moving the cube with WASD in the Electron window!"
echo "Check the server console for collision logs."
