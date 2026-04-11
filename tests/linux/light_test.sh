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

echo "--- Adding Point Light ---"
RESP=$(curl -s -X POST "$API_URL/lights" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Point Light",
    "type": "point",
    "color": "#ffffff",
    "intensity": 2,
    "position": {"x": 0, "y": 3, "z": 0},
    "range": 20
  }')
LIGHT_ID=$(extract_value "$RESP" ".data.id")

echo "Light ID: $LIGHT_ID"

echo "Waiting 3 seconds..."
sleep 3

echo "--- Increasing Intensity +10 ---"
# Get current intensity
RESP=$(curl -s "$API_URL/lights")
if command -v jq >/dev/null 2>&1; then
  CURRENT_INT=$(echo "$RESP" | jq ".[] | select(.id==\"$LIGHT_ID\") | .intensity")
else
  CURRENT_INT=$(echo "$RESP" | grep -o '"intensity":[0-9.]*' | head -n 1 | cut -d: -f2)
fi
NEW_INT=$(awk "BEGIN {print $CURRENT_INT + 10}")

curl -s -X PATCH "$API_URL/lights/$LIGHT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"intensity\": $NEW_INT}"

echo "Light intensity increased to $NEW_INT"
