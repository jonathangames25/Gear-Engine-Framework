#!/bin/bash

# Configuration
API_URL="http://localhost:3005/api"

echo "=== Gear Engine Move/Rotate Test ==="

# 1. Create a Cube
echo "[1/4] Creating a dynamic cube..."
RESPONSE=$(curl -s -X POST "$API_URL/gameobjects" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "DynamicTestCube",
           "type": "dynamic",
           "position": {"x": 0, "y": 5, "z": 0},
           "primitive": "cube",
           "scale": {"x": 1, "y": 1, "z": 1}
         }')

# Extract ID from response using grep (handles JSON "id":"...")
OBJECT_ID=$(echo $RESPONSE | grep -oP '"id":"\K[^"]+' | head -n 1)

if [ -z "$OBJECT_ID" ]; then
    echo "ERROR: Failed to create cube. Response:"
    echo "$RESPONSE"
    exit 1
fi

echo "SUCCESS: Cube created with ID: $OBJECT_ID"

# 2. Wait for 4 seconds
echo "[2/4] Waiting for 4 seconds (let it fall if physics is running)..."
sleep 4

# 3. Move the Cube
echo "[3/4] Moving cube in +X direction..."
MOVE_RESPONSE=$(curl -s -X POST "$API_URL/gameobjects/$OBJECT_ID/move" \
     -H "Content-Type: application/json" \
     -d '{
           "direction": {"x": 1, "y": 0, "z": 0},
           "amount": 2.0
         }')

if echo "$MOVE_RESPONSE" | grep -q "success"; then
    echo "SUCCESS: Cube moved."
else
    echo "ERROR: Move failed. Response: $MOVE_RESPONSE"
fi

# 4. Rotate the Cube
echo "[4/4] Rotating cube around Y axis (45 degrees)..."
ROTATE_RESPONSE=$(curl -s -X POST "$API_URL/gameobjects/$OBJECT_ID/rotate" \
     -H "Content-Type: application/json" \
     -d '{
           "axis": {"x": 0, "y": 1, "z": 0},
           "angle": 45
         }')

if echo "$ROTATE_RESPONSE" | grep -q "success"; then
    echo "SUCCESS: Cube rotated."
else
    echo "ERROR: Rotation failed. Response: $ROTATE_RESPONSE"
fi

echo "=== Test Complete ==="
