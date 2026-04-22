// premade behaviour script for Vehicle Controller
properties.engineForce = properties.engineForce !== undefined ? properties.engineForce : 0;
properties.steering = properties.steering !== undefined ? properties.steering : 0;
properties.brake = properties.brake !== undefined ? properties.brake : 0;

// Config limits
properties.maxEngineForce = properties.maxEngineForce !== undefined ? properties.maxEngineForce : 50;
properties.maxSteering = properties.maxSteering !== undefined ? properties.maxSteering : 0.7;

// Wheel configuration properties
properties.wheelRadius = properties.wheelRadius !== undefined ? properties.wheelRadius : 0.3;
properties.suspensionStiffness = properties.suspensionStiffness !== undefined ? properties.suspensionStiffness : 40.0;
properties.suspensionRestLength = properties.suspensionRestLength !== undefined ? properties.suspensionRestLength : 0.2;
properties.frictionSlip = properties.frictionSlip !== undefined ? properties.frictionSlip : 10.5;
properties.wheelYOffset = properties.wheelYOffset !== undefined ? properties.wheelYOffset : -0.1;

// Mesh name properties for assignment
properties.wheel_FL_name = properties.wheel_FL_name !== undefined ? properties.wheel_FL_name : "Wheel_FL";
properties.wheel_FR_name = properties.wheel_FR_name !== undefined ? properties.wheel_FR_name : "Wheel_FR";
properties.wheel_RL_name = properties.wheel_RL_name !== undefined ? properties.wheel_RL_name : "Wheel_RL";
properties.wheel_RR_name = properties.wheel_RR_name !== undefined ? properties.wheel_RR_name : "Wheel_RR";

let vehicle = null;

onStart = () => {
    // If not already a vehicle, register it
    if (!gameObject.isVehicle) {
        // Configuration mapped loosely to typical car.glb dimensions
        const config = {
            wheels: [
                { connectionPoint: { x: -0.9, y: properties.wheelYOffset, z: -1.3 }, isFront: true, radius: properties.wheelRadius, suspensionRestLength: properties.suspensionRestLength, suspensionStiffness: properties.suspensionStiffness, frictionSlip: properties.frictionSlip, meshName: properties.wheel_FL_name },
                { connectionPoint: { x: 0.9, y: properties.wheelYOffset, z: -1.3 }, isFront: true, radius: properties.wheelRadius, suspensionRestLength: properties.suspensionRestLength, suspensionStiffness: properties.suspensionStiffness, frictionSlip: properties.frictionSlip, meshName: properties.wheel_FR_name },
                { connectionPoint: { x: -0.9, y: properties.wheelYOffset, z: 1.3 }, isFront: false, radius: properties.wheelRadius, suspensionRestLength: properties.suspensionRestLength, suspensionStiffness: properties.suspensionStiffness, frictionSlip: properties.frictionSlip, meshName: properties.wheel_RL_name },
                { connectionPoint: { x: 0.9, y: properties.wheelYOffset, z: 1.3 }, isFront: false, radius: properties.wheelRadius, suspensionRestLength: properties.suspensionRestLength, suspensionStiffness: properties.suspensionStiffness, frictionSlip: properties.frictionSlip, meshName: properties.wheel_RR_name }
            ]
        };
        const vehicleId = gameObject.id + "_veh";
        try {
            vehicle = VehicleModule.createVehicle(vehicleId, gameObject.id, config);
        } catch (e) {
            console.error("Failed to create vehicle (ensure object has physics body): " + e.message);
        }
    } else {
        vehicle = VehicleModule.getVehicle(gameObject.vehicleId);
    }
};

update = (dt) => {
    if (vehicle) {
        // Read Input if properties aren't being overridden by API/Scripts
        let moveX = 0;
        let moveZ = 0;
        let brakeVal = 0;

        const wDown = InputModule.isKeyDown('KeyW') || InputModule.isKeyDown('ArrowUp');
        const sDown = InputModule.isKeyDown('KeyS') || InputModule.isKeyDown('ArrowDown');

        if (wDown) {
            moveZ = 1;
        }
        if (sDown) moveZ = -0.6; // Reduced reverse power to prevent wheelies/flipping
        if (InputModule.isKeyDown('KeyA') || InputModule.isKeyDown('ArrowLeft')) moveX = -1;
        if (InputModule.isKeyDown('KeyD') || InputModule.isKeyDown('ArrowRight')) moveX = 1;
        if (InputModule.isKeyDown('Space')) brakeVal = 5; // Reduced from 100

        const finalSteer = properties.steering !== 0 ? properties.steering : moveX;
        const finalEngine = properties.engineForce !== 0 ? properties.engineForce : moveZ;
        const finalBrake = properties.brake !== 0 ? properties.brake : brakeVal;

        // Apply to wheels
        vehicle.wheels.forEach(wheel => {
            if (wheel.isFront) {
                wheel.steering = finalSteer * properties.maxSteering; 
            } else {
                wheel.engineForce = finalEngine * properties.maxEngineForce;
            }
            wheel.brake = finalBrake;
        });
    }
};
