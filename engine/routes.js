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
            // Filter out obvious non-scenes if needed, but for now all JSONs in assets might be scenes or prefabs
            .filter(s => s.name !== 'package.json'); 

        res.json({ status: 'success', data: scenes });
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
        const success = SceneModule.exportScene(sceneId, fileName || 'scene.json');
        if (success) {
            res.json({ status: 'success', message: `Scene exported to ${fileName || 'scene.json'}` });
        } else {
            res.status(404).json({ status: 'error', message: 'Scene not found' });
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

// --- GameObject Routes ---
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
router.post('/gameobjects/:id/scripts', (req, res) => {
    const go = GameObjectModule.getGameObject(req.params.id);
    if (!go) return res.status(404).json({ status: 'error', message: 'GameObject not found' });

    const instance = ScriptModule.attachScript(go, req.body.fileName);
    if (instance) {
        go.scripts.push(req.body.fileName);
        res.json({ status: 'success', message: 'Script attached successfully', data: instance.fileName });
    } else {
        res.status(400).json({ status: 'error', message: 'Failed to attach script' });
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
            visible: go.mesh.visible,
            material: mat || { color: '#ffffff' },
            currentAnimation: go.currentAnimation
        };
    }).filter(s => !s.missing);
    res.json({ 
        status: 'success', 
        data: state,
        audio: AudioModule.getNewEvents(),
        ui: UIModule.getSyncData(),
        camera: CameraModule.getSyncData(),
        skybox: SkyboxModule.getSkybox(),
        debug: CollidersModule.gizmosEnabled ? PhysicsModule.world.debugRender() : null
    });
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
            description: "A professional-grade 3D engine built specifically as a robust tool for AI agents. It enables agentic control of 3D scenes, physics simulations, and live previews via a high-performance REST API. Optimized for automated world-building and iterative scene design.",
            api_root: "/api",
            full_api_skill_reference: skillContent,
            llm_guidance: {
                "ai_agent_workflow": "This engine is designed for closed-loop AI control: 1. Deploy changes via API. 2. Observe state via /api/sync. 3. Export/Persist layouts via /api/scenes/export.",
                "physics_priority": "CRITICAL: Physics is the source of truth. Moving objects via PATCH /api/gameobjects updates the underlying Rapier3D rigid body.",
                "coordinate_system": "Right-handed, Y-up. Units in meters. Rotations are Quaternions {x,y,z,w}."
            },
            endpoints: {
                "GET /api/help": "This comprehensive agentic reference.",
                "GET /api/sync": "Real-time physics state of all objects.",
                "POST /api/scenes/export": "Persist the current workspace to assets.",
                "POST /api/scenes/load": "Restore a workspace from assets.",
                "GET /api/assets/scenes": "List all available scene files."
            }
        };
        res.json(help);
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

module.exports = router;
