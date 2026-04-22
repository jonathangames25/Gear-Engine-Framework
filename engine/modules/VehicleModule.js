const RAPIER = require('@dimforge/rapier3d-compat');
const physicsModule = require('./PhysicsModule');

class Vehicle {
    constructor(id, chassisId, config = {}, world) {
        this.id = id;
        this.chassisId = chassisId;
        const GameObjectModule = require('./GameObjectModule');
        const chassisGO = GameObjectModule.getGameObject(chassisId);
        if (!chassisGO) throw new Error("Chassis GameObject not found");
        
        chassisGO.isVehicle = true;
        chassisGO.vehicleId = id;

        this.chassisBody = physicsModule.world.getRigidBody(chassisGO.physics.bodyHandle);
        if (!this.chassisBody) throw new Error("Chassis body not found");

        this.controller = physicsModule.world.createVehicleController(this.chassisBody);
        
        this.wheels = [];
        const wheelMeshes = ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"];

        (config.wheels || []).forEach((w, index) => {
            this.controller.addWheel(
                w.connectionPoint, 
                { x: 0, y: -1, z: 0 }, 
                { x: -1, y: 0, z: 0 }, 
                w.suspensionRestLength || 0.3, 
                w.radius || 0.35
            );
            
            if (w.suspensionStiffness) this.controller.setWheelSuspensionStiffness(index, w.suspensionStiffness);
            if (w.frictionSlip) this.controller.setWheelFrictionSlip(index, w.frictionSlip);

            this.wheels.push({
                index,
                isFront: w.isFront || false,
                engineForce: 0,
                steering: 0,
                brake: 0,
                meshName: w.meshName || wheelMeshes[index] || `Wheel_${index}`
            });
        });
    }

    update(world) {
        const GameObjectModule = require('./GameObjectModule');
        const chassisGO = GameObjectModule.getGameObject(this.chassisId);
        
        // Apply forces to controller
        this.wheels.forEach((wheel, index) => {
            this.controller.setWheelEngineForce(wheel.index, wheel.engineForce);
            this.controller.setWheelBrake(wheel.index, wheel.brake);
            
            if (wheel.isFront) {
                this.controller.setWheelSteering(wheel.index, wheel.steering);
            }

            // --- Visual Sync to Model sub-meshes ---
            if (chassisGO) {
                const steering = this.controller.wheelSteering(index) || 0;
                const rotation = this.controller.wheelRotation(index) || 0;
                const susp = this.controller.wheelSuspensionLength(index) || 0;
                const conn = this.controller.wheelChassisConnectionPointCs(index);

                // Calculate orientation (Steer then Roll)
                const sS = Math.sin(steering/2), cS = Math.cos(steering/2);
                const sR = Math.sin(rotation/2), cR = Math.cos(rotation/2);
                
                // Quat multiplication: qSteer * qRoll
                const qTotal = {
                    x: cS * sR,  // Final quat from simplified Euler (Y then X)
                    y: sS * cR,
                    z: -sS * sR,
                    w: cS * cR
                };

                chassisGO.setChildTransform(wheel.meshName, {
                    position: { x: conn.x, y: conn.y - susp, z: conn.z },
                    rotation: qTotal
                });
            }
        });

        // Fixed dt update for vehicle
        this.controller.updateVehicle(1 / 60);

        if (this.chassisBody.isSleeping()) {
            // Wake if we are trying to move
            let wantsMove = this.wheels.some(w => Math.abs(w.engineForce) > 0 || Math.abs(w.steering) > 0);
            if (wantsMove) {
                this.chassisBody.wakeUp(true);
            }
        }
    }

    getDebugLines() {
        const vertices = [];
        const colors = [];
        const chassisPos = this.chassisBody.translation();
        const chassisRot = this.chassisBody.rotation();
        
        // Helper to transform to world space
        const toWorld = (p) => {
            const q = chassisRot;
            // q * p * q^-1
            const x = p.x, y = p.y, z = p.z;
            const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
            
            const ix = qw * x + qy * z - qz * y;
            const iy = qw * y + qz * x - qx * z;
            const iz = qw * z + qx * y - qy * x;
            const iw = -qx * x - qy * y - qz * z;
            
            return {
                x: chassisPos.x + ix * qw + iw * -qx + iy * -qz - iz * -qy,
                y: chassisPos.y + iy * qw + iw * -qy + iz * -qx - ix * -qz,
                z: chassisPos.z + iz * qw + iw * -qz + ix * -qy - iy * -qx
            };
        };

        this.wheels.forEach((wheel, index) => {
            const conn = this.controller.wheelChassisConnectionPointCs(index);
            const susp = this.controller.wheelSuspensionLength(index);
            const radius = this.controller.wheelRadius(index);
            
            // Wheel center in chassis space
            const wheelCenterCs = { x: conn.x, y: conn.y - susp, z: conn.z };
            
            // 1. Draw suspension line (Yellow)
            const pStart = toWorld(conn);
            const pEnd = toWorld(wheelCenterCs);
            vertices.push(pStart.x, pStart.y, pStart.z, pEnd.x, pEnd.y, pEnd.z);
            colors.push(1, 1, 0, 1, 1, 1, 0, 1);

            // 2. Draw Wheel wireframe (Green)
            // Properly scaled: Diameter on Y and Z, thin on X (axle)
            const halfWidth = radius * 0.4;
            const r = radius;
            
            const points = [
                // Right side face
                {x: halfWidth, y: -r, z: -r}, {x: halfWidth, y: r, z: -r},
                {x: halfWidth, y: r, z: -r}, {x: halfWidth, y: r, z: r},
                {x: halfWidth, y: r, z: r}, {x: halfWidth, y: -r, z: r},
                {x: halfWidth, y: -r, z: r}, {x: halfWidth, y: -r, z: -r},
                
                // Left side face
                {x: -halfWidth, y: -r, z: -r}, {x: -halfWidth, y: r, z: -r},
                {x: -halfWidth, y: r, z: -r}, {x: -halfWidth, y: r, z: r},
                {x: -halfWidth, y: r, z: r}, {x: -halfWidth, y: -r, z: r},
                {x: -halfWidth, y: -r, z: r}, {x: -halfWidth, y: -r, z: -r},
                
                // Connecting lines
                {x: -halfWidth, y: -r, z: -r}, {x: halfWidth, y: -r, z: -r},
                {x: -halfWidth, y: r, z: -r}, {x: halfWidth, y: r, z: -r},
                {x: -halfWidth, y: r, z: r}, {x: halfWidth, y: r, z: r},
                {x: -halfWidth, y: -r, z: r}, {x: halfWidth, y: -r, z: r}
            ];

            points.forEach(p => {
                const wp = toWorld({ x: wheelCenterCs.x + p.x, y: wheelCenterCs.y + p.y, z: wheelCenterCs.z + p.z });
                vertices.push(wp.x, wp.y, wp.z);
                colors.push(0, 1, 0, 1);
            });
        });

        return { vertices: new Float32Array(vertices), colors: new Float32Array(colors) };
    }
}

class VehicleModule {
    constructor() {
        this.vehicles = new Map();
    }

    createVehicle(id, chassisId, config = {}) {
        const vehicle = new Vehicle(id, chassisId, config, physicsModule.world);
        this.vehicles.set(id, vehicle);
        return vehicle;
    }

    getVehicle(id) {
        return this.vehicles.get(id);
    }

    getDebugLines() {
        let allVertices = [];
        let allColors = [];
        
        this.vehicles.forEach(v => {
            const lines = v.getDebugLines();
            allVertices.push(...lines.vertices);
            allColors.push(...lines.colors);
        });
        
        return {
            vertices: new Float32Array(allVertices),
            colors: new Float32Array(allColors)
        };
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
