#!/bin/bash

# Configuration
API_URL="http://localhost:3005/api"
MODEL_URL="http://localhost:3005/models/Soldier.glb"

echo "=== Gear Engine Animation & Movement Test ==="

# 1. Create the Soldier
echo "[1/6] Loading Soldier model..."
RESPONSE=$(curl -s -X POST "$API_URL/gameobjects" \
     -H "Content-Type: application/json" \
     -d "{
           \"name\": \"Soldier\",
           \"type\": \"dynamic\",
           \"position\": {\"x\": 0, \"y\": 5, \"z\": 0},
           \"modelUrl\": \"$MODEL_URL\"
         }")

OBJECT_ID=$(echo $RESPONSE | grep -oP '"id":"\K[^"]+' | head -n 1)

if [ -z "$OBJECT_ID" ]; then
    echo "ERROR: Failed to create soldier. Response: $RESPONSE"
    exit 1
fi

echo "SUCCESS: Soldier created with ID: $OBJECT_ID"

# 2. Wait for renderer to load model and report animations
echo "[2/6] Waiting 3 seconds for model to load and report animations to server..."
sleep 3

# 3. List animations
echo "[3/6] Listing available animations from server..."
GO_DATA=$(curl -s -X GET "$API_URL/gameobjects/$OBJECT_ID")
ANIM_ARRAY=$(echo $GO_DATA | grep -oP '"animations":\[\K[^\]]+')

if [ -z "$ANIM_ARRAY" ]; then
    echo "ERROR: No animations reported yet. Make sure the browser window is open at http://localhost:3005"
    exit 1
fi

echo "Animations found: $ANIM_ARRAY"

# Get the last animation name (handling quotes and commas)
LAST_ANIM=$(echo $ANIM_ARRAY | tr ',' '\n' | tail -n 1 | tr -d '"' | tr -d ' ')

if [ -z "$LAST_ANIM" ]; then
    echo "ERROR: Could not parse animation names."
    exit 1
fi

echo "Selected last animation: $LAST_ANIM"

# 4. Play the last animation
echo "[4/6] Playing animation: $LAST_ANIM..."
curl -s -X POST "$API_URL/gameobjects/$OBJECT_ID/animations/play" \
     -H "Content-Type: application/json" \
     -d "{\"name\": \"$LAST_ANIM\"}"

# 5. Move loop
echo "[5/6] Starting movement loop (5 iterations)..."
for i in {1..5}
do
   echo "Iteration $i/5: Moving +1 on X axis..."
   curl -s -X POST "$API_URL/gameobjects/$OBJECT_ID/move" \
        -H "Content-Type: application/json" \
        -d '{"direction": {"x": 1, "y": 0, "z": 0}, "amount": 1}'
   sleep 1
done

# 6. Rotate 45 degrees
echo "[6/6] Final rotation: 45 degrees around Y..."
curl -s -X POST "$API_URL/gameobjects/$OBJECT_ID/rotate" \
     -H "Content-Type: application/json" \
     -d '{"axis": {"x": 0, "y": 1, "z": 0}, "angle": 45}'

echo "=== Test Complete ==="
