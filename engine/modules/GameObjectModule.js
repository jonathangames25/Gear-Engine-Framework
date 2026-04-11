const physicsModule = require('./PhysicsModule');
const { v4: uuidv4 } = require('uuid');

class GameObjectModule {
    constructor() {
        this.gameObjects = new Map();
    }

    createGameObject(params) {
        const { 
            name = 'New GameObject', 
            type = 'dynamic', 
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0, w: 1 },
            primitive = 'cube',
            modelUrl = null,
            mass = 1,
            scale = { x: 1, y: 1, z: 1 },
            mesh = {}
        } = params;

        const id = uuidv4();

        // 1. Create Physics Body (Rapier object first)
        const rigidBody = physicsModule.createRigidBody(type, position, rotation);
        
        // Character stability: lock rotations on X and Z so they don't fall over
        if (params.isCharacter) {
            rigidBody.setEnabledRotations(false, true, false, true); // Lock X, Z. Keep Y.
        }

        // 2. Determine Collider based on primitive or if it's a model
        let colliderShape = primitive;
        let colliderParams = {};
        
        if (modelUrl && primitive === 'cube') {
            // Default to capsule for models if not specified otherwise
            colliderShape = 'capsule';
            const height = 1.0 * scale.y;
            const radius = 0.4 * scale.x;
            colliderParams = { 
                height, 
                radius,
                offset: { x: 0, y: (height / 2) + radius, z: 0 } // Offset to put bottom at model origin
            };
        } else {
            switch(primitive) {
                case 'sphere':
                    colliderParams = { radius: 0.5 * scale.x };
                    break;
                case 'cylinder':
                    colliderParams = { height: 1.0 * scale.y, radius: 0.5 * scale.x };
                    break;
                case 'cone':
                    colliderParams = { height: 1.0 * scale.y, radius: 0.5 * scale.x };
                    break;
                case 'capsule':
                    colliderParams = { height: 1.0 * scale.y, radius: 0.5 * scale.x, offset: { x: 0, y: 1.0, z: 0 } };
                    break;
                case 'torus':
                    // Rapier doesn't have a torus primitive, use cylinder approximation
                    colliderParams = { height: 0.4 * scale.y, radius: 0.7 * scale.x };
                    colliderShape = 'cylinder';
                    break;
                case 'cube':
                default:
                    colliderParams = { halfWidth: 0.5 * scale.x, halfHeight: 0.5 * scale.y, halfDepth: 0.5 * scale.z };
                    break;
            }
        }
        
        const collider = physicsModule.createCollider(colliderShape, rigidBody, colliderParams);
        
        if (params.enabled === false) {
            rigidBody.setEnabled(false);
        }

        const gameObject = {
            id,
            name,
            enabled: params.enabled !== undefined ? params.enabled : true,
            physics: {
                bodyHandle: Number(rigidBody.handle),
                colliderHandle: Number(collider.handle),
                type,
                mass,
                position,
                rotation,
                scale,
                colliderShape, // Track the shape used
                colliderParams, // Keep track of params for recreation
                isCharacter: params.isCharacter || false
            },
            mesh: {
                primitive: mesh.primitive || primitive,
                modelUrl: mesh.modelUrl || modelUrl,
                scale: mesh.scale || scale,
                visible: mesh.visible !== undefined ? mesh.visible : true,
                materialId: mesh.materialId || 'default'
            },
            animations: [],
            currentAnimation: null,
            children: [],
            parentId: null,
            scripts: [],
            is_prefab: params.is_prefab || false,
            tag: params.tag || null
        };

        if (gameObject.physics.isCharacter) {
            Object.defineProperty(gameObject.physics, 'controller', {
                value: physicsModule.createCharacterController(),
                enumerable: false,
                writable: true,
                configurable: true
            });
        }

        this.gameObjects.set(id, gameObject);

        // --- Scripting Proxies ---
        // These allow scripts to do: gameObject.position.x = 10;
        // and have it automatically sync with the physics body.
        
        const syncPhysics = () => {
            const body = physicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
            if (body) {
                body.setTranslation(gameObject.physics.position, true);
                body.setRotation(gameObject.physics.rotation, true);
            }
        };

        const posProxy = new Proxy(gameObject.physics.position, {
            set(target, prop, value) {
                target[prop] = value;
                syncPhysics();
                return true;
            }
        });

        const rotProxy = new Proxy(gameObject.physics.rotation, {
            set(target, prop, value) {
                target[prop] = value;
                syncPhysics();
                return true;
            }
        });

        Object.defineProperty(gameObject, 'position', {
            get: () => posProxy,
            set: (v) => { 
                Object.assign(gameObject.physics.position, v);
                syncPhysics();
            }
        });

        Object.defineProperty(gameObject, 'rotation', {
            get: () => rotProxy,
            set: (v) => { 
                Object.assign(gameObject.physics.rotation, v);
                syncPhysics();
            }
        });

        Object.defineProperty(gameObject, 'scale', {
            get: () => gameObject.physics.scale,
            set: (v) => { 
                Object.assign(gameObject.physics.scale, v);
                // Trigger collider update if scale changes
                this.updateGameObject(gameObject.id, { physics: { colliderScale: v } });
            }
        });

        // Helper methods for scripts
        gameObject.setEnabled = (enabled) => {
            this.updateGameObject(gameObject.id, { enabled });
        };

        gameObject.lookAt = (targetPos) => {
            const currentPos = gameObject.position;
            const dx = targetPos.x - currentPos.x;
            const dy = targetPos.y - currentPos.y;
            const dz = targetPos.z - currentPos.z;
            
            const angle = Math.atan2(dx, dz);
            const halfAngle = angle * 0.5;
            gameObject.rotation = {
                x: 0,
                y: Math.sin(halfAngle),
                z: 0,
                w: Math.cos(halfAngle)
            };
        };

        gameObject.applyImpulse = (impulse) => {
            const body = physicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
            if (body) body.applyImpulse(impulse, true);
        };

        gameObject.setLinearVelocity = (vel) => {
            const body = physicsModule.world.getRigidBody(gameObject.physics.bodyHandle);
            if (body) body.setLinvel(vel, true);
        };

        return gameObject;
    }

    deleteGameObject(id) {
        const go = this.gameObjects.get(id);
        if (go) {
            const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
            if (body) {
                physicsModule.world.removeRigidBody(body);
            }
            return this.gameObjects.delete(id);
        }
        return false;
    }

    clearAll() {
        for (const id of Array.from(this.gameObjects.keys())) {
            this.deleteGameObject(id);
        }
        console.log('[GameObjectModule] All objects cleared');
    }

    updateGameObject(id, updates) {
        const go = this.gameObjects.get(id);
        if (go) {
            const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
            
            // Handle top-level position/rotation updates for convenience
            if (updates.position) {
                if (!updates.physics) updates.physics = {};
                updates.physics.position = updates.position;
            }
            if (updates.rotation) {
                if (!updates.physics) updates.physics = {};
                updates.physics.rotation = updates.rotation;
            }

            // If physics properties are updated, sync with Rapier
            if (updates.physics) {
                if (body) {
                    if (updates.physics.position) {
                        body.setTranslation(updates.physics.position, true);
                    }
                    if (updates.physics.rotation) {
                        body.setRotation(updates.physics.rotation, true);
                    }
                    if (updates.physics.linvel) {
                        body.setLinvel(updates.physics.linvel, true);
                    }
                    if (updates.physics.angvel) {
                        body.setAngvel(updates.physics.angvel, true);
                    }
                }
                
                // Special case: Scaling collider
                if (updates.physics.colliderScale) {
                    const CollidersModule = require('./CollidersModule');
                    const newHandle = CollidersModule.updateColliderScale(
                        go.physics.colliderHandle,
                        updates.physics.colliderScale,
                        go.physics.colliderShape,
                        go.physics.colliderParams
                    );
                    if (newHandle !== null) {
                        go.physics.colliderHandle = newHandle;
                    }
                }

                Object.assign(go.physics, updates.physics);
            }
            
            if (updates.mesh) {
                Object.assign(go.mesh, updates.mesh);
            }
            
            if (updates.enabled !== undefined) {
                go.enabled = updates.enabled;
                if (body) {
                    body.setEnabled(go.enabled);
                }
            }

            if (updates.currentAnimation !== undefined) go.currentAnimation = updates.currentAnimation;
            if (updates.animations !== undefined) go.animations = updates.animations;
            if (updates.name) go.name = updates.name;
            if (updates.tag !== undefined) go.tag = updates.tag;

            return go;
        }
        return null;
    }

    /**
     * Syncs the physics body to the GameObject's position/rotation properties.
     * Use this when you've modified go.physics.position manually.
     */
    syncGameObjectsToPhysics() {
        for (const go of this.gameObjects.values()) {
            const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
            if (!body) continue;

            const bPos = body.translation();
            const bRot = body.rotation();

            // Check if gameObject position differs from body position (manual move)
            const gPos = go.physics.position;
            const gRot = go.physics.rotation;

            const posDiff = Math.abs(gPos.x - bPos.x) > 0.001 || 
                          Math.abs(gPos.y - bPos.y) > 0.001 || 
                          Math.abs(gPos.z - bPos.z) > 0.001;
            
            const rotDiff = Math.abs(gRot.x - bRot.x) > 0.001 || 
                          Math.abs(gRot.y - bRot.y) > 0.001 || 
                          Math.abs(gRot.z - bRot.z) > 0.001 || 
                          Math.abs(gRot.w - bRot.w) > 0.001;

            if (posDiff) {
                body.setTranslation(gPos, true);
            }
            if (rotDiff) {
                body.setRotation(gRot, true);
            }
        }
    }

    /**
     * Syncs the GameObject's position/rotation properties from the physics body.
     * Run this after world.step().
     */
    syncPhysicsToGameObjects() {
        for (const go of this.gameObjects.values()) {
            const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
            if (!body) continue;

            const bPos = body.translation();
            const bRot = body.rotation();

            // Update the JS object so scripts/renderer see the latest simulation state
            go.physics.position.x = bPos.x;
            go.physics.position.y = bPos.y;
            go.physics.position.z = bPos.z;

            go.physics.rotation.x = bRot.x;
            go.physics.rotation.y = bRot.y;
            go.physics.rotation.z = bRot.z;
            go.physics.rotation.w = bRot.w;
        }
    }

    getGameObject(id) {
        return this.gameObjects.get(id);
    }

    getGameObjectByColliderHandle(handle) {
        for (let go of this.gameObjects.values()) {
            if (go.physics.colliderHandle === handle) return go;
        }
        return null;
    }

    setParent(childId, parentId) {
        const child = this.gameObjects.get(childId);
        const parent = parentId ? this.gameObjects.get(parentId) : null;
        
        if (child) {
            // Remove from old parent if any
            if (child.parentId) {
                const oldParent = this.gameObjects.get(child.parentId);
                if (oldParent) {
                    oldParent.children = oldParent.children.filter(id => id !== childId);
                }
            }

            child.parentId = parentId;
            if (parent) {
                parent.children.push(childId);
            }
            return true;
        }
        return false;
    }

    move(id, direction, amount) {
        const go = this.gameObjects.get(id);
        if (!go) return null;

        const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
        if (!body) return null;

        const currentPos = body.translation();
        const deltaX = (direction.x || 0) * amount;
        const deltaY = (direction.y || 0) * amount;
        const deltaZ = (direction.z || 0) * amount;

        const newPos = {
            x: currentPos.x + deltaX,
            y: currentPos.y + deltaY,
            z: currentPos.z + deltaZ
        };

        body.setTranslation(newPos, true);
        go.physics.position = newPos;
        return go;
    }

    rotate(id, axis, angleDegrees) {
        const go = this.gameObjects.get(id);
        if (!go) return null;

        const body = physicsModule.world.getRigidBody(go.physics.bodyHandle);
        if (!body) return null;

        const currentRot = body.rotation(); // {x, y, z, w}
        
        // Convert degrees to radians
        const angle = angleDegrees * (Math.PI / 180);

        // Normalize axis
        const mag = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
        const normAxis = mag > 0 ? { x: axis.x / mag, y: axis.y / mag, z: axis.z / mag } : { x: 0, y: 1, z: 0 };

        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        const qIncrement = {
            x: normAxis.x * s,
            y: normAxis.y * s,
            z: normAxis.z * s,
            w: Math.cos(halfAngle)
        };

        // Multiply currentRot * qIncrement
        const newRot = {
            x: currentRot.w * qIncrement.x + currentRot.x * qIncrement.w + currentRot.y * qIncrement.z - currentRot.z * qIncrement.y,
            y: currentRot.w * qIncrement.y - currentRot.x * qIncrement.z + currentRot.y * qIncrement.w + currentRot.z * qIncrement.x,
            z: currentRot.w * qIncrement.z + currentRot.x * qIncrement.y - currentRot.y * qIncrement.x + currentRot.z * qIncrement.w,
            w: currentRot.w * qIncrement.w - currentRot.x * qIncrement.x - currentRot.y * qIncrement.y - currentRot.z * qIncrement.z
        };

        body.setRotation(newRot, true);
        go.physics.rotation = newRot;
        return go;
    }

    reportAnimations(id, animations) {
        const go = this.gameObjects.get(id);
        if (go) {
            go.animations = animations;
            return true;
        }
        return false;
    }

    playAnimation(id, name) {
        const go = this.gameObjects.get(id);
        if (go) {
            go.currentAnimation = name;
            return true;
        }
        return false;
    }

    exportPrefab(id, fileName) {
        const fs = require('fs');
        const path = require('path');
        const go = this.gameObjects.get(id);
        if (!go) return false;

        // Clean object for export (remove handles, they will be recreated)
        const exportData = JSON.parse(JSON.stringify(go));
        exportData.id = null; // Reset ID for instantiation
        exportData.is_prefab = true;
        delete exportData.physics.bodyHandle;
        delete exportData.physics.colliderHandle;

        const filePath = path.join(process.cwd(), 'assets', fileName.endsWith('.json') ? fileName : `${fileName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        return true;
    }

    instantiatePrefab(fileName, position = null, rotation = null) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'assets', fileName.endsWith('.json') ? fileName : `${fileName}.json`);
        
        if (!fs.existsSync(filePath)) return null;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Merge overrides
        if (position) data.physics.position = position;
        if (rotation) data.physics.rotation = rotation;

        // Create new GO using the data
        const goParams = {
            name: data.name,
            type: data.physics.type,
            position: data.physics.position,
            rotation: data.physics.rotation,
            primitive: data.mesh.primitive,
            modelUrl: data.mesh.modelUrl,
            mass: data.physics.mass,
            scale: data.mesh.scale,
            isCharacter: data.physics.isCharacter,
            is_prefab: true
        };

        const newGo = this.createGameObject(goParams);
        
        // Attach scripts if any
        if (data.scripts) {
            const ScriptModule = require('./ScriptModule');
            data.scripts.forEach(script => {
                ScriptModule.attachScript(newGo, script);
                newGo.scripts.push(script);
            });
        }

        return newGo;
    }
}

module.exports = new GameObjectModule();
