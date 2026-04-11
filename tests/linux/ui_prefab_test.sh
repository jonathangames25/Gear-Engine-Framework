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

echo "--- Testing UI and Prefab Systems ---"

# 1. UI Test
echo "Spawning GameObject for UI test..."
RESP=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UI Controller",
    "primitive": "sphere",
    "position": {"x": -2, "y": 1, "z": 0},
    "type": "static"
  }')
UI_GO_ID=$(extract_value "$RESP" ".data.id")

echo "Attaching ui_test_script.js..."
curl -s -X POST "$API_URL/gameobjects/$UI_GO_ID/scripts" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "ui_test_script.js"}'

# 2. Prefab Test
echo "Creating object to export as prefab..."
RESP=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyPrefabSource",
    "primitive": "cube",
    "position": {"x": 2, "y": 2, "z": 2},
    "scale": {"x": 2.5, "y": 0.5, "z": 1}
  }')
PRE_ID=$(extract_value "$RESP" ".data.id")

echo "Exporting as 'my_cool_box'..."
curl -s -X POST "$API_URL/gameobjects/$PRE_ID/export" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "my_cool_box"}'

echo "Deleting original object..."
curl -s -X DELETE "$API_URL/gameobjects/$PRE_ID"

echo "Instantiating prefab at a new location..."
curl -s -X POST "$API_URL/prefabs/instantiate" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "my_cool_box",
    "position": {"x": 5, "y": 1, "z": 0}
  }'

echo "Test complete. Look at the UI overlay and the instantiated prefab!"
