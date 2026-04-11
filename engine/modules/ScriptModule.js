const fs = require('fs');
const path = require('path');
const vm = require('vm');

class ScriptModule {
    constructor() {
        this.scriptInstances = new Map(); // goId -> array of instances
        this.assetsPath = path.join(process.cwd(), 'assets');
    }

    async init() {
        // Any global init for scripts
    }

    attachScript(gameObject, scriptFileName) {
        const filePath = path.join(this.assetsPath, scriptFileName);
        if (!fs.existsSync(filePath)) {
            console.error(`Script not found: ${filePath}`);
            return null;
        }

        const scriptContent = fs.readFileSync(filePath, 'utf8');
        
        // Modules to expose to the script
        const GameObjectModule = require('./GameObjectModule');
        const PhysicsModule = require('./PhysicsModule');
        const AudioModule = require('./AudioModule');
        const InputModule = require('./InputModule');
        const UIModule = require('./UIModule');
        const SkyboxModule = require('./SkyboxModule');
        const MaterialModule = require('./MaterialModule');
        const CameraModule = require('./CameraModule');
        const SceneModule = require('./SceneModule');
        const LightModule = require('./LightModule');
        const MeshModule = require('./MeshModule');
        const CollidersModule = require('./CollidersModule');

        const context = vm.createContext({
            gameObject: gameObject,
            GameObjectModule,
            PhysicsModule,
            AudioModule,
            InputModule,
            UIModule,
            SkyboxModule,
            MaterialModule,
            CameraModule,
            SceneModule,
            LightModule,
            MeshModule,
            CollidersModule,
            console: console,


            // Events
            update: null,
            fixedUpdate: null,
            onCollisionEnter: null,
            onCollisionExit: null,
            onTriggerEnter: null,
            onTriggerExit: null
        });

        try {
            const script = new vm.Script(scriptContent);
            script.runInContext(context);
            
            const instance = {
                fileName: scriptFileName,
                context: context
            };

            if (!this.scriptInstances.has(gameObject.id)) {
                this.scriptInstances.set(gameObject.id, []);
            }
            this.scriptInstances.get(gameObject.id).push(instance);
            return instance;
        } catch (error) {
            console.error(`Error running script ${scriptFileName}:`, error);
            return null;
        }
    }

    onFixedUpdate(dt) {
        this.scriptInstances.forEach((instances) => {
            if (instances.length > 0 && instances[0].context.gameObject.enabled === false) return;
            instances.forEach(instance => {
                if (instance.context.fixedUpdate) {
                    try {
                        instance.context.fixedUpdate(dt);
                    } catch (e) {
                        console.error(`Error in fixedUpdate of ${instance.fileName}:`, e);
                    }
                }
            });
        });
    }

    onUpdate(dt) {
        this.scriptInstances.forEach((instances) => {
            if (instances.length > 0 && instances[0].context.gameObject.enabled === false) return;
            instances.forEach(instance => {
                if (instance.context.update) {
                    try {
                        instance.context.update(dt);
                    } catch (e) {
                        console.error(`Error in update of ${instance.fileName}:`, e);
                    }
                }
            });
        });
    }

    handleCollision(h1, h2, started) {
        const GameObjectModule = require('./GameObjectModule');
        const go1 = GameObjectModule.getGameObjectByColliderHandle(h1);
        const go2 = GameObjectModule.getGameObjectByColliderHandle(h2);

        if (go1) this.dispatchCollision(go1, go2, started);
        if (go2) this.dispatchCollision(go2, go1, started);
    }

    handleTrigger(h1, h2, started) {
        const GameObjectModule = require('./GameObjectModule');
        const go1 = GameObjectModule.getGameObjectByColliderHandle(h1);
        const go2 = GameObjectModule.getGameObjectByColliderHandle(h2);

        if (go1) this.dispatchTrigger(go1, go2, started);
        if (go2) this.dispatchTrigger(go2, go1, started);
    }

    dispatchCollision(owner, other, started) {
        if (!owner.enabled) return;
        const instances = this.scriptInstances.get(owner.id);
        if (!instances) return;

        instances.forEach(instance => {
            const callback = started ? instance.context.onCollisionEnter : instance.context.onCollisionExit;
            if (callback) {
                try {
                    callback(other);
                } catch (e) {
                    console.error(`Error in collision callback of ${instance.fileName}:`, e);
                }
            }
        });
    }

    dispatchTrigger(owner, other, started) {
        if (!owner.enabled) return;
        const instances = this.scriptInstances.get(owner.id);
        if (!instances) return;

        instances.forEach(instance => {
            const callback = started ? instance.context.onTriggerEnter : instance.context.onTriggerExit;
            if (callback) {
                try {
                    callback(other);
                } catch (e) {
                    console.error(`Error in trigger callback of ${instance.fileName}:`, e);
                }
            }
        });
    }
}

module.exports = new ScriptModule();
