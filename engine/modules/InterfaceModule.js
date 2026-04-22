const fs = require('fs');
const path = require('path');
const vm = require('vm');
const THREE = require('three');
const RAPIER = require('@dimforge/rapier3d-compat');

class InterfaceModule {
    constructor() {
        this.interfaceInstances = new Map(); // goId -> array of instances
        this.interfacesPath = path.join(process.cwd(), 'interfaces');
        if (!fs.existsSync(this.interfacesPath)) {
            fs.mkdirSync(this.interfacesPath, { recursive: true });
        }
    }

    async init() {
        // Initialization if needed
    }

    attachInterface(gameObject, interfaceName, initialProperties = {}) {
        const fileName = interfaceName.endsWith('.js') ? interfaceName : interfaceName + '.js';
        const filePath = path.join(this.interfacesPath, fileName);
        if (!fs.existsSync(filePath)) {
            console.error(`Interface not found: ${filePath}`);
            return null;
        }

        const scriptContent = fs.readFileSync(filePath, 'utf8');

        const GameObjectModule = require('./GameObjectModule');
        const PhysicsModule = require('./PhysicsModule');
        const AudioModule = require('./AudioModule');
        const InputModule = require('./InputModule');
        const UIModule = require('./UIModule');
        const ScriptModule = require('./ScriptModule');
        const VehicleModule = require('./VehicleModule');
        const CharacterControllerModule = require('./CharacterControllerModule');

        const properties = { ...initialProperties };

        const context = vm.createContext({
            gameObject: gameObject,
            properties: properties,
            GameObjectModule,
            PhysicsModule,
            AudioModule,
            InputModule,
            UIModule,
            ScriptModule,
            VehicleModule,
            CharacterControllerModule,
            THREE,
            RAPIER,
            console: console,

            onStart: null,
            update: null,
            fixedUpdate: null
        });

        try {
            const script = new vm.Script(scriptContent);
            script.runInContext(context);

            const instance = {
                name: interfaceName.replace('.js', ''),
                context: context,
                properties: context.properties
            };

            if (!gameObject.interfaces) {
                gameObject.interfaces = {};
            }
            // Bind properties reference so it's globally accessible on the gameObject
            gameObject.interfaces[instance.name] = instance.properties;

            if (context.onStart) {
                try {
                    context.onStart();
                } catch (e) {
                    console.error(`Error in onStart of interface ${interfaceName}:`, e);
                }
            }

            if (!this.interfaceInstances.has(gameObject.id)) {
                this.interfaceInstances.set(gameObject.id, []);
            }
            this.interfaceInstances.get(gameObject.id).push(instance);
            return instance;
        } catch (error) {
            console.error(`Error running interface ${interfaceName}:`, error);
            return null;
        }
    }

    detachInterface(gameObject, interfaceName) {
        if (!this.interfaceInstances.has(gameObject.id)) return false;

        const instances = this.interfaceInstances.get(gameObject.id);
        const nameWithoutExt = interfaceName.replace('.js', '');
        const index = instances.findIndex(inst => inst.name === nameWithoutExt);

        if (index !== -1) {
            instances.splice(index, 1);
            if (gameObject.interfaces && gameObject.interfaces[nameWithoutExt]) {
                delete gameObject.interfaces[nameWithoutExt];
            }
            return true;
        }
        return false;
    }

    updateProperty(goId, interfaceName, propertyName, value) {
        const instances = this.interfaceInstances.get(goId);
        if (instances) {
            const nameWithoutExt = interfaceName.replace('.js', '');
            const inst = instances.find(i => i.name === nameWithoutExt);
            if (inst) {
                inst.properties[propertyName] = value;
                return true;
            }
        }
        return false;
    }

    getProperties(goId, interfaceName) {
        const instances = this.interfaceInstances.get(goId);
        if (instances) {
            const nameWithoutExt = interfaceName.replace('.js', '');
            const inst = instances.find(i => i.name === nameWithoutExt);
            if (inst) return inst.properties;
        }
        return null;
    }

    onFixedUpdate(dt) {
        this.interfaceInstances.forEach((instances) => {
            if (instances.length > 0 && instances[0].context.gameObject.enabled === false) return;
            instances.forEach(instance => {
                if (instance.context.fixedUpdate) {
                    try {
                        instance.context.fixedUpdate(dt);
                    } catch (e) {
                        console.error(`Error in fixedUpdate of interface ${instance.name}:`, e);
                    }
                }
            });
        });
    }

    onUpdate(dt) {
        this.interfaceInstances.forEach((instances) => {
            if (instances.length > 0 && instances[0].context.gameObject.enabled === false) return;
            instances.forEach(instance => {
                if (instance.context.update) {
                    try {
                        instance.context.update(dt);
                    } catch (e) {
                        console.error(`Error in update of interface ${instance.name}:`, e);
                    }
                }
            });
        });
    }
}

module.exports = new InterfaceModule();
