const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./engine/routes');
const physicsModule = require('./engine/modules/PhysicsModule');
const sceneModule = require('./engine/modules/SceneModule');
const scriptModule = require('./engine/modules/ScriptModule');
const consoleModule = require('./engine/modules/ConsoleModule');

// Redirect console to ConsoleModule for client sync
global._originalConsole = { ...console };
console.log = (msg) => consoleModule.log(msg, 'log');
console.warn = (msg) => consoleModule.log(msg, 'warn');
console.error = (msg) => consoleModule.log(msg, 'error');


const app = express();
const PORT = 3005;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.use('/api', routes);

async function start() {
    await physicsModule.init();
    await scriptModule.init();

    // Set up physics callbacks for scripting
    physicsModule.setCollisionCallbacks(
        (h1, h2, started) => scriptModule.handleCollision(h1, h2, started),
        (h1, h2, started) => scriptModule.handleTrigger(h1, h2, started)
    );

    physicsModule.startTicker(60);

    // Main logic loops
    const fixedDt = 1 / 60;
    setInterval(() => {
        scriptModule.onFixedUpdate(fixedDt);
    }, 1000 / 60);

    let lastTime = Date.now();
    setInterval(() => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        scriptModule.onUpdate(dt);
    }, 16); // ~60fps regular update

    // Create an initial scene
    const scene = sceneModule.createScene('Main Workspace');

    // Add a ground plane
    const gameObjectModule = require('./engine/modules/GameObjectModule');
    const ground = gameObjectModule.createGameObject({
        name: 'Ground Plane',
        type: 'static',
        position: { x: 0, y: -0.05, z: 0 },
        scale: { x: 20, y: 0.1, z: 20 },
        primitive: 'cube'
    });
    sceneModule.addGameObjectToScene(scene.id, ground);

    app.listen(PORT, '127.0.0.1', () => {
        console.log(`Engine Server running at http://localhost:${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start engine server:', err);
});
