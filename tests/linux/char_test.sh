#!/bin/bash
API_URL="http://127.0.0.1:3005/api"

# Helper to extract values without jq if needed
extract_value() {
  local json="$1"
  local key="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r "$key"
  else
    # Simple regex fallback for "key":"value"
    local pattern="\"$(echo $key | sed 's/.*\.//')\":\"\?\([^\",]*\)\"\?"
    echo "$json" | grep -o "\"$(echo $key | sed 's/.*\.//')\":\"[^\"]*\"" | head -n 1 | cut -d'"' -f4
  fi
}

echo "--- Adding Character ---"
RESP=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Target Character",
    "modelUrl": "models/Soldier.glb",
    "scale": {"x": 1.2, "y": 1.2, "z": 1.2},
    "position": {"x": 0, "y": 2, "z": 0},
    "isCharacter": true
  }')
CHAR_ID=$(extract_value "$RESP" ".data.id")

echo "Character ID: $CHAR_ID"

sleep 2

echo "--- Checking Animations ---"
RESP=$(curl -s "$API_URL/gameobjects/$CHAR_ID")
if command -v jq >/dev/null 2>&1; then
  ANIMATIONS=$(echo "$RESP" | jq -r '.data.animations[]')
else
  # Fallback for animations array extraction
  ANIMATIONS=$(echo "$RESP" | grep -o '"animations":\[[^]]*\]' | sed 's/.*:\[//;s/\]//;s/"//g;s/,/ /g')
fi
echo "Available animations: $ANIMATIONS"

LAST_ANIM=$(echo "$ANIMATIONS" | tail -n 1)
echo "Playing last animation: $LAST_ANIM"

curl -s -X POST "$API_URL/gameobjects/$CHAR_ID/animations/play" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$LAST_ANIM\"}"

echo "--- Adding Cube ---"
RESP=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Cube",
    "primitive": "cube",
    "position": {"x": 3, "y": 5, "z": 0}
  }')
CUBE_ID=$(extract_value "$RESP" ".data.id")

echo "Cube ID: $CUBE_ID"

sleep 1

echo "--- Changing Cube Color to Blue ---"
# Assume materialId is 'default' for now as per GameObjectModule
curl -s -X PATCH "$API_URL/materials/default" \
  -H "Content-Type: application/json" \
  -d '{"color": "#0000ff"}'

echo "--- Increasing Cube's Collider Size ---"
curl -s -X PATCH "$API_URL/gameobjects/$CUBE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "physics": {
      "colliderScale": {"x": 2, "y": 2, "z": 2}
    }
  }'

echo "Test complete."
