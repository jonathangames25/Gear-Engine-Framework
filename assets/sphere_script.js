
// sphere_script.js
console.log("Sphere script attached to: " + gameObject.name);

let collided = false;

onCollisionEnter = (other) => {
    if (collided) return;
    
    if (other && other.tag === 'player') {
        console.log(gameObject.name + " collided with Player!");
        collided = true;
        
        // Find the material of this sphere
        const materialId = gameObject.mesh.materialId;
        
        // Import MaterialModule to update the material properties
        // MaterialModule is available in the VM context
        MaterialModule.updateMaterial(materialId, {
            color: '#ffffff',
            map: 'metal_test.png',
            metalness: 0.9,
            roughness: 0.1
        });
        
        // Play hit sound
        AudioModule.playSound("hit_" + gameObject.id, "hit_sfx.mp3", false, 0.8);
    }
}
