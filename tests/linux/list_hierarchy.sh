#!/bin/bash

# Test Script: List Scene Hierarchy

API_URL="http://localhost:3005/api/scenes/active"

SCENE=$(curl -s "$API_URL")

# Extraction using Python 3 for portability and clean output
python3 -c "
import json, sys
try:
    scene = json.loads(sys.argv[1])
    print(f'\033[36mActive Scene: {scene.get(\"name\", \"Unknown\")}\033[0m')
    print('-----------------------------')
    for go in scene.get('gameObjects', []):
        name = go.get('name', 'Unnamed')
        # Substring of ID like PowerShell's Substring(0,8)
        id_short = go.get('id', '........')[:8]
        physics = go.get('physics', {})
        pos = physics.get('position', {'x':0, 'y':0, 'z':0})
        print(f'- {name} (ID: {id_short}...)')
        print(f'  Pos: x={pos.get(\"x\")}, y={pos.get(\"y\")}, z={pos.get(\"z\")}')
except Exception as e:
    print(f'Error parsing JSON: {e}')
" "$SCENE"
