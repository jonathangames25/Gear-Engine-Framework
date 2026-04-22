const RAPIER = require('@dimforge/rapier3d-compat');
RAPIER.init().then(() => {
    let world = new RAPIER.World({x: 0, y: -9.81, z: 0});
    try {
        let v = world.createDynamicRayCastVehicleController([], []);
        console.log("createDynamicRayCastVehicleController exists!");
    } catch (e) {
        console.log("createDynamicRayCastVehicleController error: " + e.message);
    }
});
