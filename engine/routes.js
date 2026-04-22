const express = require('express');
const router = express.Router();
const SceneModule = require('./modules/SceneModule');
const GameObjectModule = require('./modules/GameObjectModule');
const MaterialModule = require('./modules/MaterialModule');
const MeshModule = require('./modules/MeshModule');
const CollidersModule = require('./modules/CollidersModule');
const PhysicsModule = require('./modules/PhysicsModule');
const LightModule = require('./modules/LightModule');
const AudioModule = require('./modules/AudioModule');
const InputModule = require('./modules/InputModule');
const ScriptModule = require('./modules/ScriptModule');
const UIModule = require('./modules/UIModule');
const CameraModule = require('./modules/CameraModule');
const SkyboxModule = require('./modules/SkyboxModule');
const CharacterControllerModule = require('./modules/CharacterControllerModule');
const ConsoleModule = require('./modules/ConsoleModule');
const InterfaceModule = require('./modules/InterfaceModule');


// --- Camera Routes ---
router.get('/cameras', (req, res) => {
    res.json({ status: 'success', data: CameraModule.getAllCameras() });
});

router.post('/cameras', (req, res) => {
    try {
        const cam = CameraModule.createCamera(req.body);
        res.status(201).json({ status: 'success', data: cam });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

router.get('/cameras/active', (req, res) => {
    res.json({ status: 'success', data: CameraModule.getActiveCamera() });
});

router.post('/cameras/active', (req, res) => {
    const success = CameraModule.setActiveCamera(req.body.id);
    if (success) {
        res.json({ status: 'success', message: 'Active camera updated' });
    } else {
        res.status(404).json({ status: 'error', message: 'Camera not found' });
    }
});

router.patch('/cameras/:id', (req, res) => {
    const cam = CameraModule.updateCamera(req.params.id, req.body);
    if (cam) {
        res.json({ status: 'success', data: cam });
    } else {
        res.status(404).json({ status: 'error', message: 'Camera not found' });
    }
});

router.delete('/cameras/:id', (req, res) => {
    const success = CameraModule.deleteCamera(req.params.id);
    if (success) {
        res.json({ status: 'success', message: 'Camera deleted' });
    } else {
        res.status(404).json({ status: 'error', message: 'Camera not found' });
    }
});


// --- Scene Routes ---
// Asset Routes
router.get('/assets/scenes', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const assetsPath = path.join(process.cwd(), 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            return res.json({ status: 'success', data: [] });
        }

        const files = fs.readdirSync(assetsPath);
        const scenes = files
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const stats = fs.statSync(path.join(assetsPath, f));
                return {
                    name: f,
                    modifiedAt: stats.mtime
                };
            })
            .filter(s => s.name !== 'package.json'); 

        res.json({ status: 'success', data: scenes });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.get('/assets/models', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const assetsPath = path.join(process.cwd(), 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            return res.json({ status: 'success', data: [] });
        }

        const files = fs.readdirSync(assetsPath);
        const models = files
            .filter(f => f.endsWith('.glb') || f.endsWith('.gltf'))
            .map(f => {
                const stats = fs.statSync(path.join(assetsPath, f));
                return {
                    name: f,
                    modifiedAt: stats.mtime
                };
            });

        res.json({ status: 'success', data: models });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.post('/scenes', (req, res) => {
    try {
        const scene = SceneModule.createScene(req.body.name);
        res.status(201).json({ status: 'success', message: 'Scene created successfully', data: scene });
    } catch (error) {
        res.status(400).json({ status: 'error', message: `Failed to create scene: ${error.message}` });
    }
});

router.get('/scenes', (req, res) => {
    res.json(SceneModule.getAllScenes());
});

router.get('/scenes/active', (req, res) => {
    const scene = SceneModule.getActiveScene();
    if (scene) {
        res.json({ status: 'success', data: scene });
    } else {
        res.status(404).json({ status: 'error', message: 'No active scene found' });
    }
});

router.put('/scenes/:id', (req, res) => {
    const success = SceneModule.renameScene(req.params.id, req.body.name);
    if (success) {
        res.json({ status: 'success', message: 'Scene renamed successfully' });
    } else {
        res.status(404).json({ status: 'error', message: `Scene with ID ${req.params.id} not found` });
    }
});

router.post('/scenes/export', (req, res) => {
    try {
        const { id, fileName } = req.body;
        const sceneId = id || SceneModule.activeSceneId;
        const scene = SceneModule.getScene(sceneId);
        if (!scene) return res.status(404).json({ status: 'error', message: 'Scene not found' });

        // Use fileName from body, OR from metadata.loadedFrom, OR default to scene.json
        const actualFileName = fileName || (scene.metadata && scene.metadata.loadedFrom) || 'scene.json';
        
        const success = SceneModule.exportScene(sceneId, actualFileName);
        if (success) {
            res.json({ status: 'success', message: `Scene saved to ${actualFileName}`, fileName: actualFileName });
        } else {
            res.status(500).json({ status: 'error', message: 'Failed to export scene' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.post('/scenes/load', async (req, res) => {
    try {
        const { fileName } = req.body;
        const scene = await SceneModule.loadScene(fileName || 'scene.json');
        res.json({ status: 'success', message: `Scene loaded from ${fileName || 'scene.json'}`, data: scene });
    } catch (error) {
        res.status(400).json({ status: 'error', message: `Failed to load scene: ${error.message}` });
    }
});

router.get('/gameobjects', (req, res) => {
    res.json({ status: 'success', data: GameObjectModule.getAllGameObjects() });
});

router.post('/gameobjects', (req, res) => {
    try {
        const go = GameObjectModule.createGameObject(req.body);
        const activeScene = SceneModule.getActiveScene();
        if (activeScene) {
            SceneModule.addGameObjectToScene(activeScene.id, go);
        }
        res.status(201).json({ status: 'success', message: 'GameObject created and added to scene', data: go });
    } catch (error) {
        res.status(400).json({ status: 'error', message: `Failed to create GameObject: ${error.message}` });
    }
});

router.get('/gameobjects/:id', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (go) {
        res.json({ status: 'success', data: go });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.delete('/gameobjects/:id', (req, res) => {
    const success = GameObjectModule.deleteGameObject(req.params.id);
    if (success) {
        const activeScene = SceneModule.getActiveScene();
        if (activeScene) {
            SceneModule.removeGameObjectFromScene(activeScene.id, req.params.id);
        }
        res.json({ status: 'success', message: 'GameObject deleted successfully' });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.patch('/gameobjects/:id', (req, res) => {
    const updatedGo = GameObjectModule.updateGameObject(req.params.id, req.body);
    if (updatedGo) {
        res.json({ status: 'success', message: 'GameObject updated successfully', data: updatedGo });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.post('/gameobjects/:id/move', (req, res) => {
    const { direction, amount } = req.body;
    const updatedGo = GameObjectModule.move(req.params.id, direction || {x:0, y:0, z:0}, amount || 0);
    if (updatedGo) {
        res.json({ status: 'success', message: 'GameObject moved successfully', data: updatedGo });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.post('/gameobjects/:id/rotate', (req, res) => {
    const { axis, angle } = req.body;
    const updatedGo = GameObjectModule.rotate(req.params.id, axis || {x:0, y:1, z:0}, angle || 0);
    if (updatedGo) {
        res.json({ status: 'success', message: 'GameObject rotated successfully', data: updatedGo });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.post('/gameobjects/:id/animations/report', (req, res) => {
    const success = GameObjectModule.reportAnimations(req.params.id, req.body.animations);
    if (success) {
        res.json({ status: 'success', message: 'Animations reported successfully' });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

router.post('/gameobjects/:id/animations/play', (req, res) => {
    const success = GameObjectModule.playAnimation(req.params.id, req.body.name);
    if (success) {
        res.json({ status: 'success', message: `Playing animation: ${req.body.name}` });
    } else {
        res.status(404).json({ status: 'error', message: `GameObject with ID ${req.params.id} not found` });
    }
});

// --- Scripting Routes ---
router.post('/scripts', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { fileName, content } = req.body;
        if (!fileName || !content) {
            return res.status(400).json({ status: 'error', message: 'Missing fileName or content' });
        }
        
        const assetsPath = path.join(process.cwd(), 'assets');
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        const filePath = path.join(assetsPath, fileName);
        fs.writeFileSync(filePath, content);
        res.json({ status: 'success', message: `Script ${fileName} saved/updated in assets` });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.patch('/scripts', (req, res) => {
    // Semantic alias for POST /scripts to represent "editing"
    try {
        const fs = require('fs');
        const path = require('path');
        const { fileName, content } = req.body;
        if (!fileName || !content) {
            return res.status(400).json({ status: 'error', message: 'Missing fileName or content' });
        }
        
        const assetsPath = path.join(process.cwd(), 'assets');
        const filePath = path.join(assetsPath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ status: 'error', message: `Script ${fileName} not found` });
        }

        fs.writeFileSync(filePath, content);
        res.json({ status: 'success', message: `Script ${fileName} updated successfully` });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.delete('/scripts/:fileName', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const fileName = req.params.fileName;
        const assetsPath = path.join(process.cwd(), 'assets');
        const filePath = path.join(assetsPath, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ status: 'success', message: `Script ${fileName} deleted from assets` });
        } else {
            res.status(404).json({ status: 'error', message: `Script ${fileName} not found` });
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.post('/gameobjects/:id/scripts', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const instance = ScriptModule.attachScript(go, req.body.fileName);
    if (instance) {
        if (!go.scripts.includes(req.body.fileName)) {
            go.scripts.push(req.body.fileName);
        }
        res.json({ status: 'success', message: 'Script attached successfully', data: instance.fileName });
    } else {
        res.status(400).json({ status: 'error', message: 'Failed to attach script' });
    }
});

router.delete('/gameobjects/:id/scripts/:fileName', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const fileName = req.params.fileName;
    const success = ScriptModule.detachScript(go, fileName);
    
    if (success) {
        go.scripts = go.scripts.filter(s => s !== fileName);
        res.json({ status: 'success', message: `Script ${fileName} detached successfully` });
    } else {
        res.status(404).json({ status: 'error', message: `Script ${fileName} not found on this GameObject` });
    }
});

router.post('/gameobjects/:id/export', (req, res) => {
    const success = GameObjectModule.exportPrefab(req.params.id, req.body.fileName);
    if (success) {
        res.json({ status: 'success', message: 'GameObject exported as prefab' });
    } else {
        res.status(404).json({ status: 'error', message: 'GameObject not found' });
    }
});

// --- Interface Routes ---
router.post('/gameobjects/:id/interfaces', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const interfaceName = req.body.name;
    const initialProperties = req.body.properties || {};
    const instance = InterfaceModule.attachInterface(go, interfaceName, initialProperties);
    
    if (instance) {
        res.json({ status: 'success', message: 'Interface attached successfully', data: instance.name });
    } else {
        res.status(400).json({ status: 'error', message: 'Failed to attach interface' });
    }
});

router.delete('/gameobjects/:id/interfaces/:name', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const success = InterfaceModule.detachInterface(go, req.params.name);
    if (success) {
        res.json({ status: 'success', message: `Interface ${req.params.name} detached successfully` });
    } else {
        res.status(404).json({ status: 'error', message: `Interface ${req.params.name} not found on this GameObject` });
    }
});

router.patch('/gameobjects/:id/interfaces/:name/properties', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const properties = req.body.properties || {};
    let anySuccess = false;
    
    for (const [key, value] of Object.entries(properties)) {
        if (InterfaceModule.updateProperty(go.id, req.params.name, key, value)) {
            anySuccess = true;
        }
    }
    
    if (anySuccess) {
        res.json({ status: 'success', message: 'Properties updated successfully' });
    } else {
        res.status(400).json({ status: 'error', message: 'Failed to update properties (interface might not be attached, or bad format)' });
    }
});


// --- Character Controller Routes ---
router.post('/gameobjects/:id/character/move', (req, res) => {
    try {
        const { movement, dt } = req.body;
        CharacterControllerModule.moveCharacter(req.params.id, movement || {x:0, y:0, z:0}, dt || 1/60);
        res.json({ status: 'success' });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
});

router.post('/gameobjects/:id/character/jump', (req, res) => {
    try {
        CharacterControllerModule.jump(req.params.id);
        res.json({ status: 'success' });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
});

// --- Prefab Routes ---
router.post('/prefabs/instantiate', (req, res) => {
    try {
        const go = GameObjectModule.instantiatePrefab(req.body.fileName, req.body.position, req.body.rotation);
        if (go) {
            const activeScene = SceneModule.getActiveScene();
            if (activeScene) SceneModule.addGameObjectToScene(activeScene.id, go);
            res.status(201).json({ status: 'success', message: 'Prefab instantiated', data: go });
        } else {
            res.status(404).json({ status: 'error', message: 'Prefab file not found' });
        }
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
});

// --- Light Routes ---
router.post('/lights', (req, res) => {
    try {
        const light = LightModule.createLight(req.body);
        const activeScene = SceneModule.getActiveScene();
        if (activeScene) {
            SceneModule.addLightToScene(activeScene.id, light);
        }
        res.status(201).json({ status: 'success', message: 'Light created and added to scene', data: light });
    } catch (error) {
        res.status(400).json({ status: 'error', message: `Failed to create light: ${error.message}` });
    }
});

router.get('/lights', (req, res) => {
    res.json(LightModule.getAllLights());
});

router.patch('/lights/:id', (req, res) => {
    const light = LightModule.updateLight(req.params.id, req.body);
    if (light) {
        res.json({ status: 'success', message: 'Light updated successfully', data: light });
    } else {
        res.status(404).json({ status: 'error', message: `Light with ID ${req.params.id} not found` });
    }
});

router.delete('/lights/:id', (req, res) => {
    const success = LightModule.deleteLight(req.params.id);
    if (success) {
        res.json({ status: 'success', message: 'Light deleted successfully' });
    } else {
        res.status(404).json({ status: 'error', message: `Light with ID ${req.params.id} not found` });
    }
});

// --- Material Routes ---
router.post('/materials', (req, res) => {
    try {
        const mat = MaterialModule.createMaterial(req.body.id, req.body.props);
        res.status(201).json({ status: 'success', message: 'Material created successfully', data: mat });
    } catch (error) {
        res.status(400).json({ status: 'error', message: `Failed to create material: ${error.message}` });
    }
});

router.patch('/materials/:id', (req, res) => {
    const props = req.body.props || req.body;
    const mat = MaterialModule.updateMaterial(req.params.id, props);
    if (mat) {
        res.json({ status: 'success', message: 'Material updated successfully', data: mat });
    } else {
        res.status(404).json({ status: 'error', message: `Material with ID ${req.params.id} not found` });
    }
});

// --- Audio Routes ---
router.post('/audio/play', (req, res) => {
    const { id, assetPath, loop, volume } = req.body;
    AudioModule.playSound(id, assetPath, loop, volume);
    res.json({ status: 'success', message: 'Audio play event queued' });
});

router.post('/audio/stop', (req, res) => {
    AudioModule.stopSound(req.body.id);
    res.json({ status: 'success', message: 'Audio stop event queued' });
});

router.post('/audio/setVolume', (req, res) => {
    AudioModule.setVolume(req.body.id, req.body.volume);
    res.json({ status: 'success', message: 'Audio volume update event queued' });
});

// --- Input Routes ---
router.post('/input', (req, res) => {
    InputModule.updateState(req.body);
    res.json({ status: 'success' });
});

// --- UI Routes ---
router.post('/ui', (req, res) => {
    try {
        const { type, id, props } = req.body;
        const el = UIModule.createElement(type, id, props);
        res.json({ status: 'success', message: 'UI element created', data: el });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
});

router.post('/ui/event', (req, res) => {
    const { id, type, data } = req.body;
    UIModule.handleClientEvent(id, type, data);
    res.json({ status: 'success' });
});
// --- Skybox Routes ---
router.get('/skybox', (req, res) => {
    res.json({ status: 'success', data: SkyboxModule.getSkybox() });
});

router.post('/skybox', (req, res) => {
    try {
        const config = SkyboxModule.setSkybox(req.body);
        res.json({ status: 'success', message: 'Skybox updated', data: config });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// --- Collider Routes ---

router.get('/colliders/gizmos', (req, res) => {
    res.json({ status: 'success', enabled: CollidersModule.gizmosEnabled });
});

router.post('/colliders/gizmos', (req, res) => {
    CollidersModule.setGizmosEnabled(req.body.enabled);
    res.json({ status: 'success', message: `Gizmos ${req.body.enabled ? 'enabled' : 'disabled'}`, enabled: CollidersModule.gizmosEnabled });
});

// --- Vehicle Routes ---
const VehicleModule = require('./modules/VehicleModule');

router.post('/vehicles', (req, res) => {
    try {
        const { id, chassisId, config } = req.body;
        const vehicle = VehicleModule.createVehicle(id, chassisId, config);
        res.json({ status: 'success', data: { id: vehicle.id } });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
});

router.patch('/vehicles/:id/control', (req, res) => {
    const vehicle = VehicleModule.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ status: 'error', message: 'Vehicle not found' });
    
    const { engineForce, steering, brake } = req.body;
    
    vehicle.wheels.forEach(wheel => {
        if (engineForce !== undefined) {
            // Usually RWD or 4WD
            if (!wheel.isFront || req.body.fourWheelDrive) {
                wheel.engineForce = engineForce;
            }
        }
        if (steering !== undefined && wheel.isFront) {
            wheel.steering = steering;
        }
        if (brake !== undefined) {
            wheel.brake = brake;
        }
    });
    
    res.json({ status: 'success' });
});

// --- Physics/State Sync ---
router.get('/sync', (req, res) => {
    // This could return all physics body positions for the renderer to update
    const activeScene = SceneModule.getActiveScene();
    if (!activeScene) return res.json({ status: 'success', data: [] });

    const state = activeScene.gameObjects.map(go => {
        const body = PhysicsModule.world.getRigidBody(go.physics.bodyHandle);
        if (!body) return { id: go.id, missing: true };
        
        const mat = MaterialModule.getMaterial(go.mesh.materialId);
        
        return {
            id: go.id,
            position: body.translation(),
            rotation: body.rotation(),
            scale: go.mesh.scale,
            enabled: go.enabled,
            visible: go.enabled && go.mesh.visible,
            material: mat || { color: '#ffffff' },
            currentAnimation: go.currentAnimation,
            interfaces: go.interfaces || {}
        };
    }).filter(s => !s.missing);
    res.json({ 
        status: 'success', 
        data: state,
        audio: AudioModule.getNewEvents(),
        ui: UIModule.getSyncData(),
        camera: CameraModule.getSyncData(),
        skybox: SkyboxModule.getSkybox(),
        logs: ConsoleModule.getNewLogs(),
        debug: CollidersModule.gizmosEnabled ? PhysicsModule.world.debugRender() : null
    });
});


// --- Source Code Inspection ---
router.get('/source', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { module: moduleName } = req.query;
        
        if (!moduleName) {
            return res.status(400).json({ status: 'error', message: 'Missing module parameter. Example: ?module=GameObjectModule' });
        }

        const enginePath = path.join(process.cwd(), 'engine');
        const modulesPath = path.join(enginePath, 'modules');
        
        let filePath = null;
        
        // Search in engine root and engine/modules
        const possiblePaths = [
            path.join(enginePath, `${moduleName}.js`),
            path.join(modulesPath, `${moduleName}.js`),
            path.join(process.cwd(), moduleName) // Absolute or relative path if provided
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
                // Security check: ensure path is within process.cwd()
                if (p.startsWith(process.cwd())) {
                    filePath = p;
                    break;
                }
            }
        }

        if (filePath) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ status: 'success', module: moduleName, path: filePath, source: content });
        } else {
            res.status(404).json({ status: 'error', message: `Module or file ${moduleName} not found or access denied.` });
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});


// --- LLM Help Route ---
router.get('/help', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const skillPath = path.join(process.cwd(), 'skill.md');
        let skillContent = "Skill guide not found. Please refer to API documentation.";
        
        if (fs.existsSync(skillPath)) {
            skillContent = fs.readFileSync(skillPath, 'utf8');
        }

        const help = {
            projectName: "Gear Engine",
            description: "A professional-grade 3D engine built specifically as a robust tool for AI agents. It enables agentic control of 3D scenes, physics simulations, and live previews via a high-performance REST API. Scripts have access to ALL engine modules and can do MORE than the API alone.",
            api_root: "/api",
            coordinate_system: "Right-handed, Y-up. Units in meters. Rotations are Quaternions {x,y,z,w}.",
            full_api_skill_reference: skillContent,
            quick_start: {
                linux: 'curl -X GET http://127.0.0.1:3005/api/gameobjects',
                windows: 'Invoke-RestMethod -Uri http://127.0.0.1:3005/api/gameobjects -Method Get'
            },
            llm_guidance: {
                "ai_agent_workflow": "This engine is designed for closed-loop AI control: 1. Deploy changes via API. 2. Observe state via /api/sync or /api/gameobjects. 3. Export/Persist layouts via /api/scenes/export.",
                "initial_discovery": "CRITICAL: In the event of a 404 or engine inactivity, a ping to GET /api/gameobjects MUST be performed immediately to locate the active service path.",
                "script_errors": "CRITICAL: When script errors are encountered, Node.js logs MUST be requested from the terminal for detailed stacks.",
                "attachment_workflow": "A script MUST be saved via POST /api/scripts BEFORE attaching it to a GameObject. Failure to attach is usually due to missing files or syntax errors.",
                "physics_first": "CRITICAL: This engine is physics-optimized. Avoid moving dynamic objects via .position; use .setLinearVelocity() or .applyImpulse() for realistic simulation.",
                "module_priority": "CRITICAL: Always attempt to use built-in modules (GameObjectModule, PhysicsModule, etc.) before resorting to raw THREE or RAPIER access.",
                "source_inspection": "When unsure about a module's API surface, use GET /api/source?module=ModuleName to read engine source code directly.",
                "two_approaches": "Games can be built via: (1) LIVE API — step-by-step curl/PowerShell commands, or (2) SCRIPTS — reusable .js files attached to GameObjects that have access to ALL modules and can build entire games from a single bootstrap script."
            },
            available_modules: [
                "GameObjectModule", "PhysicsModule", "ScriptModule", "LightModule",
                "UIModule", "AudioModule", "CameraModule", "SkyboxModule",
                "InputModule", "MaterialModule", "MeshModule", "CollidersModule",
                "SceneModule", "VehicleModule", "CharacterControllerModule", "ConsoleModule"
            ],
            scripting: {
                lifecycle_events: {
                    "onStart()": "Fires once when the script is first attached. Use for initialization.",
                    "update(dt)": "Fires every frame (~60fps). dt = seconds since last frame. Main game logic loop.",
                    "fixedUpdate(dt)": "Fires every physics tick (60Hz). dt is always 1/60. Use for physics-critical logic.",
                    "onCollisionEnter(other)": "Fires when this object starts touching another. other = the other GameObject.",
                    "onCollisionExit(other)": "Fires when this object stops touching another.",
                    "onTriggerEnter(other)": "Fires when entering a trigger volume.",
                    "onTriggerExit(other)": "Fires when leaving a trigger volume."
                },
                available_in_scripts: [
                    "gameObject — The attached object. Has .position, .rotation, .scale, .name, .tag, .id, .enabled",
                    "gameObject.setLinearVelocity({x,y,z}) — Set velocity",
                    "gameObject.setAngularVelocity({x,y,z}) — Set spin",
                    "gameObject.applyImpulse({x,y,z}) — Instant force (jumps, explosions)",
                    "gameObject.applyTorqueImpulse({x,y,z}) — Instant rotational force",
                    "gameObject.move(direction, amount) — Translate",
                    "gameObject.rotate(axis, angleDegrees) — Rotate by degrees",
                    "gameObject.lookAt({x,y,z}) — Face a world position",
                    "gameObject.setEnabled(bool) — Enable/disable",
                    "GameObjectModule — Create, find, delete all objects",
                    "PhysicsModule — Access RAPIER world, raycasting",
                    "InputModule — Keyboard/mouse state (isKeyDown, isMouseButtonDown)",
                    "AudioModule — Play/stop sounds",
                    "UIModule — Create labels, buttons, inputs, checkboxes",
                    "LightModule — Create/update/delete lights",
                    "MaterialModule — Create/update materials",
                    "CameraModule — Create cameras, set active, follow targets",
                    "SkyboxModule — Change skybox color/panorama/cubemap",
                    "SceneModule — Export/load scenes",
                    "MeshModule — Mesh metadata and animation queries",
                    "CollidersModule — Debug gizmos, collider inspection",
                    "THREE — Full THREE.js library (Vector3, Quaternion, Euler, etc.)",
                    "RAPIER — Full Rapier physics (Ray, queries, etc.)",
                    "CharacterControllerModule — Move, jump, update characters with gravity",
                    "ConsoleModule — Log, warn, error, clear console",
                    "console — console.log(), console.error() (piped to ConsoleModule)"
                ],
                examples: {
                    "WASD_Movement": "const speed = 8;\nfunction update(dt) {\n  const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);\n  const curVel = body ? body.linvel() : {x:0,y:0,z:0};\n  let vx=0, vz=0;\n  if (InputModule.isKeyDown('KeyW')) vz=-speed;\n  if (InputModule.isKeyDown('KeyS')) vz=speed;\n  if (InputModule.isKeyDown('KeyA')) vx=-speed;\n  if (InputModule.isKeyDown('KeyD')) vx=speed;\n  gameObject.setLinearVelocity({x:vx, y:curVel.y, z:vz});\n  if (InputModule.isKeyDown('Space') && Math.abs(curVel.y)<0.1)\n    gameObject.applyImpulse({x:0,y:12,z:0});\n}",
                    "Spinning_Object": "function update(dt) { gameObject.setAngularVelocity({x:0, y:3, z:0}); }",
                    "Face_Movement_Direction": "function update(dt) {\n  const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);\n  if (!body) return;\n  const vel = body.linvel();\n  if (Math.abs(vel.x)>0.1 || Math.abs(vel.z)>0.1) {\n    gameObject.lookAt({x:gameObject.position.x+vel.x, y:gameObject.position.y, z:gameObject.position.z+vel.z});\n  }\n}",
                    "Animation_Controller": "let currentAnim = 'Idle';\nfunction onStart() { GameObjectModule.playAnimation(gameObject.id, 'Idle'); }\nfunction update(dt) {\n  const body = PhysicsModule.world.getRigidBody(gameObject.physics.bodyHandle);\n  if (!body) return;\n  const vel = body.linvel();\n  const speed = Math.sqrt(vel.x*vel.x + vel.z*vel.z);\n  let anim = speed > 0.5 ? 'Run' : (speed > 0.1 ? 'Walk' : 'Idle');\n  if (anim !== currentAnim) { currentAnim = anim; GameObjectModule.playAnimation(gameObject.id, anim); }\n}",
                    "HUD_UI": "let score = 0;\nfunction onStart() {\n  UIModule.createLabel('score', 'Score: 0', 20, 20);\n  UIModule.createButton('restart', 'Restart', 300, 300);\n  UIModule.on('restart', 'click', () => { score=0; UIModule.setLabel('score', 'Score: 0'); });\n}\nfunction onCollisionEnter(other) {\n  if (other.tag === 'Coin') { score += 10; other.setEnabled(false); UIModule.setLabel('score', 'Score: '+score); }\n}",
                    "Follow_Camera": "let camId = null;\nfunction onStart() {\n  const cam = CameraModule.createCamera({name:'PlayerCam', type:'follow', targetId: gameObject.id, offset:{x:0,y:4,z:8}, fov:60});\n  camId = cam.id;\n  CameraModule.setActiveCamera(camId);\n}\nfunction update(dt) {\n  const cam = CameraModule.getCamera(camId);\n  if (cam) cam.position = {x:gameObject.position.x+cam.offset.x, y:gameObject.position.y+cam.offset.y, z:gameObject.position.z+cam.offset.z};\n}",
                    "Dynamic_Lighting": "function onStart() {\n  LightModule.createLight({name:'Sun', type:'directional', color:'#ffe0a0', intensity:2, position:{x:10,y:20,z:10}});\n}\nlet t=0;\nfunction update(dt) {\n  t += dt*0.1;\n  const r = Math.floor(128+127*Math.sin(t));\n  const g = Math.floor(100+100*Math.sin(t-1));\n  const b = Math.floor(180+75*Math.sin(t+1));\n  SkyboxModule.setColor('#'+r.toString(16).padStart(2,'0')+g.toString(16).padStart(2,'0')+b.toString(16).padStart(2,'0'));\n}",
                    "Projectile_Spawner": "let cd=0;\nfunction update(dt) {\n  cd -= dt;\n  if (InputModule.isKeyDown('KeyF') && cd<=0) {\n    const p = GameObjectModule.createGameObject({name:'Bullet', type:'dynamic', primitive:'sphere', position:{x:gameObject.position.x, y:gameObject.position.y+1, z:gameObject.position.z-2}, scale:{x:0.2,y:0.2,z:0.2}, tag:'Projectile'});\n    p.setLinearVelocity({x:0,y:2,z:-30});\n    AudioModule.playSound('shoot','laser.mp3',false,0.3);\n    cd = 0.3;\n    setTimeout(() => GameObjectModule.deleteGameObject(p.id), 3000);\n  }\n}",
                    "Enemy_AI": "let player = null;\nfunction onStart() {\n  player = GameObjectModule.getAllGameObjects().find(g => g.tag === 'Player');\n}\nfunction update(dt) {\n  if (!player) return;\n  const dx = player.position.x - gameObject.position.x;\n  const dz = player.position.z - gameObject.position.z;\n  const dist = Math.sqrt(dx*dx + dz*dz);\n  if (dist > 1.5) { gameObject.setLinearVelocity({x:(dx/dist)*3, y:0, z:(dz/dist)*3}); gameObject.lookAt(player.position); }\n  else gameObject.setLinearVelocity({x:0,y:0,z:0});\n}",
                    "Raycasting": "function update(dt) {\n  const ray = new RAPIER.Ray({x:gameObject.position.x, y:gameObject.position.y, z:gameObject.position.z}, {x:0,y:-1,z:0});\n  const hit = PhysicsModule.world.castRay(ray, 10, true);\n  if (hit) {\n    const g = GameObjectModule.getGameObjectByColliderHandle(hit.collider.handle);\n    if (g) console.log('Ground: ' + g.name + ' dist: ' + hit.time.toFixed(2));\n  }\n}",
                    "Elevator_Platform": "let startY=0, t=0;\nfunction onStart() { startY = gameObject.position.y; }\nfunction update(dt) {\n  t += dt;\n  gameObject.position = {x:gameObject.position.x, y:startY+Math.sin(t)*5, z:gameObject.position.z};\n}",
                    "Material_Changes": "let hue=0;\nfunction onStart() {\n  MaterialModule.createMaterial('rainbow', {color:'#ff0000', roughness:0.3});\n  gameObject.mesh.materialId = 'rainbow';\n}\nfunction update(dt) {\n  hue = (hue + dt*50) % 360;\n  // HSL to hex conversion...\n  MaterialModule.updateMaterial('rainbow', {color:'#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')});\n}",
                    "Audio_Zones": "let playing = false;\nfunction onTriggerEnter(other) { if (other.tag==='Player' && !playing) { AudioModule.playSound('zone','ambient.mp3',true,0.3); playing=true; } }\nfunction onTriggerExit(other) { if (other.tag==='Player' && playing) { AudioModule.stopSound('zone'); playing=false; } }",
                    "Scene_Management": "function update(dt) {\n  if (InputModule.isKeyDown('Digit1')) SceneModule.exportScene(SceneModule.activeSceneId, 'level1.json');\n  if (InputModule.isKeyDown('Digit2')) SceneModule.loadScene('level1.json');\n}",
                    "Character_Movement": "function update(dt) {\n  let x=0, z=0;\n  if (InputModule.isKeyDown('KeyW')) z=-1;\n  if (InputModule.isKeyDown('KeyS')) z=1;\n  if (InputModule.isKeyDown('KeyA')) x=-1;\n  if (InputModule.isKeyDown('KeyD')) x=1;\n  CharacterControllerModule.updateCharacter(gameObject.id, {x, z}, dt);\n  if (InputModule.isKeyDown('Space')) CharacterControllerModule.jump(gameObject.id);\n}"
                }
            },
            endpoints: {
                // GameObjects
                "GET /api/gameobjects": "List all GameObjects in the scene.",
                "GET /api/gameobjects/:id": "Get a specific GameObject by ID.",
                "POST /api/gameobjects": "Create a new GameObject. Body: {name, type(dynamic|static|kinematic), primitive(cube|sphere|cylinder|cone|capsule|torus), position:{x,y,z}, rotation:{x,y,z,w}, scale:{x,y,z}, mass, modelUrl, isCharacter, tag, enabled}",
                "PATCH /api/gameobjects/:id": "Update a GameObject. Body: {position, rotation, physics:{linvel,angvel,position,rotation}, mesh:{visible,materialId}, enabled, tag, name}",
                "DELETE /api/gameobjects/:id": "Delete a GameObject and its physics body.",
                "POST /api/gameobjects/:id/move": "Move a GameObject. Body: {direction:{x,y,z}, amount:number}",
                "POST /api/gameobjects/:id/rotate": "Rotate a GameObject. Body: {axis:{x,y,z}, angle:degrees}",
                "POST /api/gameobjects/:id/animations/play": "Play an animation. Body: {name:string}",
                "POST /api/gameobjects/:id/animations/report": "Report available animations. Body: {animations:[string]}",
                "POST /api/gameobjects/:id/export": "Export as prefab. Body: {fileName:string}",
                // Scripts
                "POST /api/scripts": "Save/create a script file. Body: {fileName, content}",
                "PATCH /api/scripts": "Edit an existing script. Body: {fileName, content}",
                "DELETE /api/scripts/:fileName": "Delete a script file from assets.",
                "POST /api/gameobjects/:id/scripts": "Attach a script to a GameObject. Body: {fileName}",
                "DELETE /api/gameobjects/:id/scripts/:fileName": "Detach a script from a GameObject.",
                // Character Controller
                "POST /api/gameobjects/:id/character/move": "Move character with physics. Body: {movement:{x,y,z}, dt}",
                "POST /api/gameobjects/:id/character/jump": "Make character jump.",
                // Prefabs
                "POST /api/prefabs/instantiate": "Instantiate a prefab. Body: {fileName, position?, rotation?}",
                // Lights
                "GET /api/lights": "List all lights.",
                "POST /api/lights": "Create a light. Body: {name, type(point|directional|spot), color:hex, intensity, position:{x,y,z}, range}",
                "PATCH /api/lights/:id": "Update a light. Body: any light property.",
                "DELETE /api/lights/:id": "Delete a light.",
                // Materials
                "POST /api/materials": "Create a material. Body: {id, props:{color,emissive,roughness,wireframe,opacity,transparent}}",
                "PATCH /api/materials/:id": "Update a material. Body: props or {props:{...}}",
                // Audio
                "POST /api/audio/play": "Play a sound. Body: {id, assetPath, loop:bool, volume:0-1}",
                "POST /api/audio/stop": "Stop a sound. Body: {id}",
                "POST /api/audio/setVolume": "Set volume. Body: {id, volume:0-1}",
                // Cameras
                "GET /api/cameras": "List all cameras.",
                "GET /api/cameras/active": "Get the active camera.",
                "POST /api/cameras": "Create a camera. Body: {name, type(static|follow), position, rotation, targetId, offset:{x,y,z}, fov}",
                "POST /api/cameras/active": "Set active camera. Body: {id}",
                "PATCH /api/cameras/:id": "Update a camera.",
                "DELETE /api/cameras/:id": "Delete a camera (cannot delete default_orbit).",
                // Skybox
                "GET /api/skybox": "Get current skybox config.",
                "POST /api/skybox": "Set skybox. Body: {type(color|equirectangular|cubemap), color:hex, assetPath, cubemapPaths:[6], intensity}",
                // UI
                "POST /api/ui": "Create a UI element. Body: {type(label|button|text|checkbox|radio), id, props:{label,value,checked,placeholder,x,y}}",
                "POST /api/ui/event": "Handle UI event. Body: {id, type, data}",
                // Input
                "POST /api/input": "Push input state from client. Body: {keys:[], mouse:{buttons,x,y}}",
                // Colliders
                "GET /api/colliders/gizmos": "Check if debug wireframes are enabled.",
                "POST /api/colliders/gizmos": "Toggle physics debug wireframes. Body: {enabled:bool}",
                // Vehicles
                "POST /api/vehicles": "Create a vehicle. Body: {id, chassisId, config:{wheels:[{connectionPoint,isFront,radius}]}}",
                "PATCH /api/vehicles/:id/control": "Control a vehicle. Body: {engineForce, steering, brake}",
                // Scenes
                "GET /api/scenes": "List all scenes.",
                "GET /api/scenes/active": "Get the active scene.",
                "POST /api/scenes": "Create a new scene. Body: {name}",
                "PUT /api/scenes/:id": "Rename a scene. Body: {name}",
                "POST /api/scenes/export": "Export scene to file. Body: {id?, fileName}",
                "POST /api/scenes/load": "Load a scene from file. Body: {fileName}",
                "GET /api/assets/scenes": "List all saved scene JSON files.",
                // System
                "GET /api/sync": "Full state sync (positions, rotations, materials, audio, UI, camera, skybox, debug).",
                "GET /api/source?module=Name": "View engine source code for any module. Available: GameObjectModule, PhysicsModule, ScriptModule, LightModule, UIModule, AudioModule, CameraModule, SkyboxModule, InputModule, MaterialModule, MeshModule, CollidersModule, SceneModule, VehicleModule",
                "GET /api/help": "This comprehensive agentic reference."
            }
        };
        res.json(help);
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

module.exports = router;
