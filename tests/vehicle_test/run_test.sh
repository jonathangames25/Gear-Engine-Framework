#!/bin/bash
API_URL="http://127.0.0.1:3005/api"

echo "=== Gear Engine Vehicle Test (v2 Fixed) ==="

# 1. Create Ground
echo "[1/6] Creating Ground..."
curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ground", "type": "static", "primitive": "cube", "position": {"x": 0, "y": -0.5, "z": 0}, "scale": {"x": 150, "y": 1, "z": 150}}' > /dev/null

# 2. Spawn Car (Lowered spawn Y)
echo "[2/6] Spawning Car..."
CAR_RES=$(curl -s -X POST "$API_URL/gameobjects" \
  -H "Content-Type: application/json" \
  -d '{"name": "TestCar", "modelUrl": "car.glb", "type": "dynamic", "position": {"x": 0, "y": 1.0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}, "mass": 8000}')

CAR_ID=$(echo $CAR_RES | sed -e 's/.*"id":"\([^"]*\)".*/\1/')
echo "      Car ID: $CAR_ID"

# 3. Setup Colliders (Lowered Center of Mass for stability)
echo "[3/6] Configuring Chassis Colliders (Low CoM)..."
# Setting offset to 0.1 to keep mass center low.
curl -s -X PATCH "$API_URL/gameobjects/$CAR_ID" \
  -H "Content-Type: application/json" \
  -d '{"physics": {"colliderShape": "cube", "scale": {"x": 2.2, "y": 0.6, "z": 4.2}, "colliderOffset": {"x": 0, "y": 0.1, "z": 0}}}' > /dev/null

# 4. Attach Vehicle Controller
echo "[4/6] Attaching VehicleControllerInterface (Keyboard Controls Active)..."
curl -s -X POST "$API_URL/gameobjects/$CAR_ID/interfaces" \
  -H "Content-Type: application/json" \
  -d '{"name": "VehicleControllerInterface", "properties": {"maxEngineForce": 40, "maxSteering": 0.5, "suspensionStiffness": 40, "frictionSlip": 10.5}}' > /dev/null

echo ""
echo "=== Setup Complete! ==="
echo "USE WASD or ARROW KEYS to drive the car."
echo "Use SPACE for handbrake."
echo "The camera will now smoothly rotate behind the car as you turn."
