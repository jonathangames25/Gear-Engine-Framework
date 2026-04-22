// Camera Follow Interface
// Exposes properties to control camera behavior
properties.targetId = properties.targetId !== undefined ? properties.targetId : null;
properties.offset = properties.offset || { x: 0, y: 5, z: 10 };
properties.smoothness = properties.smoothness !== undefined ? properties.smoothness : 0.1;
properties.fov = properties.fov !== undefined ? properties.fov : 60;

let cameraId = null;

onStart = () => {
    // Check if gameObject is a camera
    if (gameObject.type === 'camera' || CameraModule.getCamera(gameObject.id)) {
        cameraId = gameObject.id;
    } else {
        // If attached to a normal object, maybe find active camera or create one?
        // User asked to "attach interface to available camera", so we assume we are on a camera
        cameraId = gameObject.id;
    }
};

update = (dt) => {
    if (!cameraId) return;
    
    const cam = CameraModule.getCamera(cameraId);
    if (!cam) return;

    // Apply FOV
    cam.fov = properties.fov;

    if (properties.targetId) {
        const target = GameObjectModule.getGameObject(properties.targetId);
        if (target) {
            // Calculate relative offset based on target rotation
            const offsetVec = new THREE.Vector3(properties.offset.x, properties.offset.y, properties.offset.z);
            const targetQuat = new THREE.Quaternion(
                target.rotation.x,
                target.rotation.y,
                target.rotation.z,
                target.rotation.w
            );
            
            // Rotate the offset vector by the target's orientation
            offsetVec.applyQuaternion(targetQuat);

            // Desired camera position
            const tx = target.position.x + offsetVec.x;
            const ty = target.position.y + offsetVec.y;
            const tz = target.position.z + offsetVec.z;

            // Simple lerp for smooth follow
            cam.position.x += (tx - cam.position.x) * properties.smoothness;
            cam.position.y += (ty - cam.position.y) * properties.smoothness;
            cam.position.z += (tz - cam.position.z) * properties.smoothness;

            // Engine's CameraModule handles looking at target if targetId is set
            CameraModule.updateCamera(cameraId, {
                position: cam.position,
                targetId: properties.targetId
            });
        }
    }
};
