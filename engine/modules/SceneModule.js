const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SceneModule {
    constructor() {
        this.scenes = new Map();
        this.activeSceneId = null;
    }

    createScene(name) {
        const id = require('uuid').v4();
        const scene = {
            id,
            name: name || 'New Scene',
            gameObjects: [],
            lights: [],
            skybox: { type: 'color', color: '#1a1a2e' },
            metadata: {

                createdAt: new Date(),
                modifiedAt: new Date()
            }
        };
        this.scenes.set(id, scene);
        if (!this.activeSceneId) this.activeSceneId = id;
        return scene;
    }

    getScene(id) {
        return this.scenes.get(id);
    }

    getActiveScene() {
        return this.scenes.get(this.activeSceneId);
    }

    renameScene(id, newName) {
        const scene = this.scenes.get(id);
        if (scene) {
            scene.name = newName;
            scene.metadata.modifiedAt = new Date();
            return true;
        }
        return false;
    }

    addGameObjectToScene(sceneId, gameObject) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.gameObjects.push(gameObject);
            scene.metadata.modifiedAt = new Date();
            return true;
        }
        return false;
    }

    removeGameObjectFromScene(sceneId, gameObjectId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.gameObjects = scene.gameObjects.filter(go => go.id !== gameObjectId);
            scene.metadata.modifiedAt = new Date();
            return true;
        }
        return false;
    }

    addLightToScene(sceneId, light) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.lights.push(light);
            scene.metadata.modifiedAt = new Date();
            return true;
        }
        return false;
    }

    removeLightFromScene(sceneId, lightId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.lights = scene.lights.filter(l => l.id !== lightId);
            scene.metadata.modifiedAt = new Date();
            return true;
        }
        return false;
    }

    getAllScenes() {
        return Array.from(this.scenes.values());
    }

    exportScene(sceneId, fileName) {
        const scene = this.scenes.get(sceneId);
        if (!scene) return false;

        const assetsPath = path.join(process.cwd(), 'assets');
        if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath, { recursive: true });

        const filePath = path.join(assetsPath, fileName.endsWith('.json') ? fileName : `${fileName}.json`);
        
        // Preparation for export: we might want to clean up some runtime-only data
        const exportData = JSON.parse(JSON.stringify(scene));
        
        // Include global states
        const skyboxModule = require('./SkyboxModule');
        const materialModule = require('./MaterialModule');
        const cameraModule = require('./CameraModule');
        
        exportData.skybox = skyboxModule.getSkybox();
        exportData.materials = Array.from(materialModule.materials.values());
        exportData.cameraData = cameraModule.getSyncData();
        
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`Scene exported to ${filePath}`);
        return true;
    }

    async loadScene(fileName) {
        const assetsPath = path.join(process.cwd(), 'assets');
        const filePath = path.join(assetsPath, fileName.endsWith('.json') ? fileName : `${fileName}.json`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Scene file not found: ${fileName}`);
        }

        const sceneData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const gameObjectModule = require('./GameObjectModule');
        const lightModule = require('./LightModule');
        const skyboxModule = require('./SkyboxModule');
        const cameraModule = require('./CameraModule');
        const materialModule = require('./MaterialModule');


        // Create a new scene or clear existing? 
        // Let's create a new one with a new ID to avoid conflicts if loading into a running engine
        const id = uuidv4();
        
        // Clear engine state first
        gameObjectModule.clearAll();
        lightModule.clearAll();
        materialModule.clearAll();
        cameraModule.clearAll();

        const scene = {
            id,
            name: sceneData.name || 'Loaded Scene',
            gameObjects: [],
            lights: [],
            skybox: sceneData.skybox || { type: 'color', color: '#1a1a2e' },
            metadata: {
                createdAt: new Date(),
                modifiedAt: new Date(),
                loadedFrom: fileName
            }
        };

        this.scenes.set(id, scene);
        this.activeSceneId = id;
        
        // Restore Materials
        if (sceneData.materials && Array.isArray(sceneData.materials)) {
            for (const mat of sceneData.materials) {
                materialModule.createMaterial(mat.id, mat);
            }
        }

        // Recreate GameObjects
        if (sceneData.gameObjects && Array.isArray(sceneData.gameObjects)) {
            for (const goData of sceneData.gameObjects) {
                const goParams = {
                    name: goData.name,
                    type: goData.physics.type,
                    position: goData.physics.position,
                    rotation: goData.physics.rotation,
                    primitive: goData.mesh.primitive,
                    modelUrl: goData.mesh.modelUrl,
                    mass: goData.physics.mass,
                    scale: goData.mesh.scale,
                    isCharacter: goData.physics.isCharacter,
                    tag: goData.tag
                };
                const newGo = gameObjectModule.createGameObject(goParams);
                
                // Restore other properties
                newGo.mesh.visible = goData.mesh.visible;
                newGo.mesh.materialId = goData.mesh.materialId;
                
                // Attach scripts
                if (goData.scripts && goData.scripts.length > 0) {
                    const scriptModule = require('./ScriptModule');
                    for (const scriptFile of goData.scripts) {
                        scriptModule.attachScript(newGo, scriptFile);
                        newGo.scripts.push(scriptFile);
                    }
                }
                
                this.addGameObjectToScene(id, newGo);
            }
        }

        // Recreate Lights
        if (sceneData.lights && Array.isArray(sceneData.lights)) {
            for (const lightData of sceneData.lights) {
                const newLight = lightModule.createLight(lightData);
                this.addLightToScene(id, newLight);
            }
        }

        // Restore Skybox
        if (sceneData.skybox) {
            skyboxModule.setSkybox(sceneData.skybox);
        }

        // Restore Cameras
        if (sceneData.cameraData) {
            if (sceneData.cameraData.cameras) {
                sceneData.cameraData.cameras.forEach(cam => {
                    if (cam.id !== 'default_orbit') {
                        cameraModule.cameras.set(cam.id, cam);
                    }
                });
            }
            if (sceneData.cameraData.activeCameraId) {
                cameraModule.setActiveCamera(sceneData.cameraData.activeCameraId);
            }
        }

        return scene;

    }
}

module.exports = new SceneModule();
