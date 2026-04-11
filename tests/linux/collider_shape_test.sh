#!/bin/bash
API_URL="http://localhost:3005/api"

# Helper to extract values without jq if needed
extract_value() {
  local json="$1"
  local key="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r "$key"
  else
    echo "$json" | grep -o "\"$(echo $key | sed 's/.*\.//')\":\"\?\([^\",]*\)\"\?" | head -n 1 | cut -d'"' -f4
  fi
}

echo "--- Spawning Primitive Shapes with Colliders ---"

SHAPES=("cube" "sphere" "cylinder" "cone" "torus" "capsule")
OFFSET=0

for shape in "${SHAPES[@]}"; do
  echo "Adding $shape..."
  RESP=$(curl -s -X POST "$API_URL/gameobjects" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test $shape\",
      \"primitive\": \"$shape\",
      \"position\": {\"x\": $OFFSET, \"y\": 5, \"z\": -5},
      \"type\": \"dynamic\"
    }")
  ID=$(extract_value "$RESP" ".data.id")
  echo "Object $shape added with ID: $ID"
  OFFSET=$((OFFSET + 2))
done

echo "Check the viewport to see all primitives and their collider gizmos."
echo "Test complete."
