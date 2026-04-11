const RAPIER = require('@dimforge/rapier3d-compat');
const physicsModule = require('./PhysicsModule');

class Vehicle {
    constructor(id, chassisBody, wheelsConfig = []) {
        this.id = id;
        this.chassisBody = chassisBody;
        this.wheels = wheelsConfig.map(w => ({
            connectionPoint: w.connectionPoint || { x: 0, y: 0, z: 0 },
            radius: w.radius || 0.4,
            suspensionRestLength: w.suspensionRestLength || 0.5,
            suspensionStiffness: 20.0,
            damping: 2.0,
            engineForce: 0,
            steering: 0,
            brake: 0,
            isFront: w.isFront || false,
            // Runtime state
            raycastDistance: 0,
            contactPoint: null,
            contactNormal: null,
            isInContact: false
        }));
    }

    update(world) {
        const chassisTranslation = this.chassisBody.translation();
        const chassisRotation = this.chassisBody.rotation();
        
        // Convert chassis rotation to vectors
        const up = { x: 0, y: 1, z: 0 }; // Simplified up vector
        // In reality, we should rotate the up vector by chassisRotation
        const q = chassisRotation;
        const rotateVector = (v) => {
            const x = v.x, y = v.y, z = v.z;
            const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
            const ix = qw * x + qy * z - qz * y;
            const iy = qw * y + qz * x - qx * z;
            const iz = qw * z + qx * y - qy * x;
            const iw = -qx * x - qy * y - qz * z;
            return {
                x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
                y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
                z: iz * qw + iw * -qz + ix * -qy - iy * -qx
            };
        };

        this.wheels.forEach(wheel => {
            // Calculate wheel source in world space
            const localPos = rotateVector(wheel.connectionPoint);
            const rayOrigin = {
                x: chassisTranslation.x + localPos.x,
                y: chassisTranslation.y + localPos.y,
                z: chassisTranslation.z + localPos.z
            };
            
            // Raycast direction (downwards relative to chassis)
            const rayDir = rotateVector({ x: 0, y: -1, z: 0 });
            
            const ray = new RAPIER.Ray(rayOrigin, rayDir);
            const hit = world.castRay(ray, wheel.suspensionRestLength + wheel.radius, true);
            
            if (hit) {
                wheel.isInContact = true;
                wheel.raycastDistance = hit.time;
                
                const compression = wheel.suspensionRestLength - (hit.time - wheel.radius);
                if (compression > 0) {
                    const forceMag = compression * wheel.suspensionStiffness;
                    const force = {
                        x: -rayDir.x * forceMag,
                        y: -rayDir.y * forceMag,
                        z: -rayDir.z * forceMag
                    };
                    
                    // Apply suspension force to chassis
                    this.chassisBody.applyImpulseAtPoint(force, rayOrigin, true);
                    
                    // Simple engine force (forward)
                    if (wheel.engineForce !== 0) {
                        const forward = rotateVector({ x: 0, y: 0, z: -1 });
                        const driveForce = {
                            x: forward.x * wheel.engineForce,
                            y: forward.y * wheel.engineForce,
                            z: forward.z * wheel.engineForce
                        };
                        this.chassisBody.applyImpulseAtPoint(driveForce, rayOrigin, true);
                    }

                    // Simple steering (lateral force if rotating)
                    // (Omitted for brevity in this simple model, but would apply lateral impulses)
                }
            } else {
                wheel.isInContact = false;
            }
        });
    }
}

class VehicleModule {
    constructor() {
        this.vehicles = new Map();
    }

    createVehicle(id, chassisId, config = {}) {
        const GameObjectModule = require('./GameObjectModule');
        const go = GameObjectModule.getGameObject(chassisId);
        if (!go) throw new Error('Chassis GameObject not found');
        
        const chassisBody = physicsModule.world.getRigidBody(go.physics.bodyHandle);
        
        const wheels = config.wheels || [
            { connectionPoint: { x: -0.8, y: 0, z: -1.2 }, isFront: true, radius: 0.4 },
            { connectionPoint: { x: 0.8, y: 0, z: -1.2 }, isFront: true, radius: 0.4 },
            { connectionPoint: { x: -0.8, y: 0, z: 1.2 }, isFront: false, radius: 0.4 },
            { connectionPoint: { x: 0.8, y: 0, z: 1.2 }, isFront: false, radius: 0.4 }
        ];

        const vehicle = new Vehicle(id, chassisBody, wheels);
        this.vehicles.set(id, vehicle);
        
        // Tag the gameobject as a vehicle chassis
        go.isVehicle = true;
        go.vehicleId = id;
        
        return vehicle;
    }

    getVehicle(id) {
        return this.vehicles.get(id);
    }

    step() {
        if (!physicsModule.world) return;
        this.vehicles.forEach(v => v.update(physicsModule.world));
    }

    clearAll() {
        this.vehicles.clear();
    }
}

module.exports = new VehicleModule();
