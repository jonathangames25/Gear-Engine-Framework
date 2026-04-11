#!/bin/bash

# Test Script: Add Primitive Cube

API_URL="http://localhost:3005/api/gameobjects"

# Generate random numbers between -2 and 1 (exclusive of 2, like PowerShell's Get-Random)
X=$(( (RANDOM % 4) - 2 ))
Z=$(( (RANDOM % 4) - 2 ))

BODY=$(cat <<EOF
{
    "name": "Physics Cube",
    "type": "dynamic",
    "position": { "x": $X, "y": 10, "z": $Z },
    "primitive": "cube"
}
EOF
)

curl -s -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "$BODY" | python3 -m json.tool || cat
