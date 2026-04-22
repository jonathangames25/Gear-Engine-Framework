// premade behaviour script for Vehicle Controller
properties.engineForce = properties.engineForce !== undefined ? properties.engineForce : 0;
properties.steering = properties.steering !== undefined ? properties.steering : 0;
properties.brake = properties.brake !== undefined ? properties.brake : 0;

// Config limits
properties.maxEngineForce = properties.maxEngineForce !== undefined ? properties.maxEngineForce : 1500;
properties.maxSteering = properties.maxSteering !== undefined ? properties.maxSteering : 0.5;

let vehicle = null;

onStart = () => {
    // If not already a vehicle, register it
    if (!gameObject.isVehicle) {
        // Configuration mapped loosely to typical car.glb dimensions
        const config = {
            wheels: [
                { connectionPoint: { x: -0.7, y: -0.1, z: -1.1 }, isFront: true, radius: 0.35, suspensionRestLength: 0.4 },
                { connectionPoint: { x: 0.7, y: -0.1, z: -1.1 }, isFront: true, radius: 0.35, suspensionRestLength: 0.4 },
                { connectionPoint: { x: -0.7, y: -0.1, z: 1.1 }, isFront: false, radius: 0.35, suspensionRestLength: 0.4 },
                { connectionPoint: { x: 0.7, y: -0.1, z: 1.1 }, isFront: false, radius: 0.35, suspensionRestLength: 0.4 }
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
        // Apply properties to the underlying vehicle object
        vehicle.wheels.forEach(wheel => {
            if (wheel.isFront) {
                wheel.steering = properties.steering * properties.maxSteering; 
            } else {
                // RWD engine force mapping
                wheel.engineForce = properties.engineForce * properties.maxEngineForce;
            }
            wheel.brake = properties.brake;
        });
    }
};
