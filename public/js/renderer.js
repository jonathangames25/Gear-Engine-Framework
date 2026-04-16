import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import AppGUI from './AppGUI.js';


const BASE_URL = 'http://127.0.0.1:3005';
const API_URL = `${BASE_URL}/api`;

class Renderer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        this.meshMap = new Map(); // gameObjectId -> THREE.Mesh
        this.loadingMap = new Set(); // gameObjectId -> Promise
        this.failedMap = new Set(); // gameObjectId -> boolean
        this.selectedId = null;
        this.loader = new GLTFLoader();
        this.isRefreshing = false;
        this.isSyncing = false;
        this.clock = new THREE.Clock();
        this.currentSkyboxConfig = null;
        this.textureLoader = new THREE.TextureLoader();
        this.cubeTextureLoader = new THREE.CubeTextureLoader();
        this.rgbeLoader = new RGBELoader();

        
        // Input state
        this.keys = new Set();
        this.mouse = { buttons: new Set(), x: 0, y: 0 };
        
        // Audio
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        this.sounds = new Map(); // id -> THREE.Audio
        
        // UI
        this.uiElements = new Map(); // id -> HTMLElement
        this.uiOverlay = this.createUIOverlay();
        
        // Gizmo Debug Rendering
        this.debugLines = null;
        this.gizmosEnabled = localStorage.getItem('gizmosEnabled') !== 'false'; // Default to true
        this.appGui = new AppGUI(this);

        // Console UI
        this.consoleWindow = document.getElementById('console-window');
        this.consoleLogs = document.getElementById('console-logs');
        this.toggleConsoleBtn = document.getElementById('toggle-console');
        this.closeConsoleBtn = document.getElementById('close-console');
        this.clearConsoleBtn = document.getElementById('clear-console');

        this.init();
    }

    init() {
        // Setup renderer
        const container = document.getElementById('viewport');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(5, 10, 5);
        sunLight.castShadow = true;
        this.scene.add(sunLight);

        // Camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Grid & Helpers
        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(grid);

        // OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Event listeners
        window.addEventListener('resize', () => this.onResize());
        document.getElementById('add-go').addEventListener('click', () => this.addPrimitive());
        
        const gizmoToggle = document.getElementById('gizmo-toggle');
        gizmoToggle.checked = this.gizmosEnabled;
        gizmoToggle.addEventListener('change', (e) => this.toggleGizmos(e.target.checked));
        
        // Input events
        window.addEventListener('keydown', (e) => { this.keys.add(e.code); this.sendInput(); });
        window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.sendInput(); });
        window.addEventListener('mousedown', (e) => { this.mouse.buttons.add(e.button); this.sendInput(); });
        window.addEventListener('mouseup', (e) => { this.mouse.buttons.delete(e.button); this.sendInput(); });
        window.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.sendInput();
        });

        // Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                // Don't save if typing in an input
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                this.appGui.saveCurrentScene();
            }
        });

        // Console Events
        this.toggleConsoleBtn.addEventListener('click', () => this.toggleConsole());
        this.closeConsoleBtn.addEventListener('click', () => this.toggleConsole(false));
        this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());

        this.syncGizmoState();
        this.animate();
        this.refreshHierarchy();

        // Use ResizeObserver for robust resizing
        const resizeObserver = new ResizeObserver(() => this.onResize());
        resizeObserver.observe(container);
    }

    onResize() {
        const container = document.getElementById('viewport');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    async toggleGizmos(enabled) {
        this.gizmosEnabled = enabled;
        localStorage.setItem('gizmosEnabled', enabled);
        await fetch(`${API_URL}/colliders/gizmos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        
        if (!enabled && this.debugLines) {
            this.scene.remove(this.debugLines);
            this.debugLines = null;
        }
    }

    async syncGizmoState() {
        await fetch(`${API_URL}/colliders/gizmos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: this.gizmosEnabled })
        });
    }

    async sendInput() {
        // Debounce or throttle this if needed, but for now send on every change
        fetch(`${API_URL}/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keys: Array.from(this.keys),
                mouse: {
                    buttons: Array.from(this.mouse.buttons),
                    x: this.mouse.x,
                    y: this.mouse.y
                }
            })
        }).catch(() => {});
    }

    async addPrimitive(type = 'cube') {
        const res = await fetch(`${API_URL}/gameobjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Primitive ${type}`,
                position: { x: (Math.random() - 0.5) * 5, y: 5, z: (Math.random() - 0.5) * 5 },
                primitive: type,
                type: 'dynamic'
            })
        });
        const response = await res.json();
        const go = response.data;
        this.createMeshForGO(go);
        this.refreshHierarchy();
    }

    async createMeshForGO(go) {
        return new Promise((resolve, reject) => {
            if (go.mesh.modelUrl) {
                let url = go.mesh.modelUrl;
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    // Update: Check if it already has 'models/' or 'assets/' and adjust
                    if (url.startsWith('models/')) url = url.replace('models/', 'assets/');
                    url = `${BASE_URL}/${url.startsWith('assets/') ? url : 'assets/' + url}`;
                }
                console.log(`Loading model for ${go.name}: ${url}`);
                // Load GLTF Model
                this.loader.load(url, (gltf) => {
                    console.log(`Successfully loaded model for ${go.name}`);
                    const model = gltf.scene;
                    model.castShadow = true;
                    model.receiveShadow = true;
                    model.position.set(go.physics.position.x, go.physics.position.y, go.physics.position.z);
                    if (go.mesh.scale) {
                        model.scale.set(go.mesh.scale.x, go.mesh.scale.y, go.mesh.scale.z);
                    }
                    
                    // Store animations if any
                    if (gltf.animations && gltf.animations.length > 0) {
                        console.log(`[Renderer] Found ${gltf.animations.length} animations for ${go.name}`);
                        model.userData.animations = gltf.animations;
                        const animationNames = gltf.animations.map(a => a.name);
                        
                        // Report to server
                        fetch(`${API_URL}/gameobjects/${go.id}/animations/report`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ animations: animationNames })
                        });

                        const mixer = new THREE.AnimationMixer(model);
                        model.userData.mixer = mixer;
                        model.userData.currentAnimation = null;
                    }

                    this.scene.add(model);
                    this.meshMap.set(go.id, model);
                    resolve(model);
                }, undefined, (error) => {
                    // Only log error once
                    if (!this.failedMap.has(go.id)) {
                        console.error(`Error loading model for ${go.name} at ${go.mesh.modelUrl}:`, error);
                    }
                    reject(error);
                });
                return;
            }

            let geometry;
            switch (go.mesh.primitive) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case 'cone':
                    geometry = new THREE.ConeGeometry(0.5, 1, 32);
                    break;
                case 'capsule':
                    geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 32);
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
                    break;
                case 'cube':
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
            }

            const material = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            mesh.position.set(go.physics.position.x, go.physics.position.y, go.physics.position.z);
            if (go.mesh.scale) {
                mesh.scale.set(go.mesh.scale.x, go.mesh.scale.y, go.mesh.scale.z);
            }
            
            this.scene.add(mesh);
            this.meshMap.set(go.id, mesh);
            resolve(mesh);
        });
    }

    async refreshHierarchy() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;

        try {
            const res = await fetch(`${API_URL}/scenes/active`);
            const response = await res.json();
            const sceneData = response.data;
            
            const list = document.getElementById('gameobject-list');
            list.innerHTML = '';

            if (sceneData && sceneData.gameObjects) {
                for (const go of sceneData.gameObjects) {
                    const li = document.createElement('li');
                    li.className = `go-item ${this.selectedId === go.id ? 'active' : ''}`;
                    li.innerHTML = `<span>${go.name}</span>`;
                    li.onclick = () => this.selectGameObject(go.id);
                    list.appendChild(li);

                    // Ensure mesh exists and isn't already loading or failed
                    if (!this.meshMap.has(go.id) && !this.loadingMap.has(go.id) && !this.failedMap.has(go.id)) {
                        this.loadingMap.add(go.id);
                        this.createMeshForGO(go).catch(() => {
                            this.failedMap.add(go.id);
                        }).finally(() => {
                            this.loadingMap.delete(go.id);
                        });
                    }
                }
            }
        } finally {
            this.isRefreshing = false;
        }
    }

    selectGameObject(id) {
        this.selectedId = id;
        this.refreshHierarchy();
        this.updateInspector(id);
    }

    async updateInspector(id) {
        const res = await fetch(`${API_URL}/gameobjects/${id}`);
        const response = await res.json();
        const go = response.data;
        const content = document.getElementById('inspector-content');
        
        content.innerHTML = `
            <div class="prop-group">
                <label>Name</label>
                <input type="text" value="${go.name}" readonly>
            </div>
            <div class="prop-group">
                <label>Physics Type</label>
                <span>${go.physics.type}</span>
            </div>
            <div class="prop-group">
                <label>Primitive</label>
                <span>${go.mesh.primitive}</span>
            </div>
        `;
    }

    async syncPhysics() {
        if (this.isSyncing || this.isRefreshing) return;
        
        const now = Date.now();
        if (now - this.lastSyncTime < 24) return; // Sync at ~40Hz for smoother updates
        this.lastSyncTime = now;

        this.isSyncing = true;

        try {
            const res = await fetch(`${API_URL}/sync`);
            if (!res.ok) throw new Error('Sync failed');
            const response = await res.json();
            const states = response.data;
            const audioEvents = response.audio;
            const uiCommands = response.ui;
            const debugData = response.debug;
            const logs = response.logs;

            if (logs && logs.length > 0) {
                this.displayLogs(logs);
            }

            if (audioEvents) {
                audioEvents.forEach(ev => this.handleAudioEvent(ev));
            }

            if (uiCommands) {
                uiCommands.forEach(cmd => this.handleUICommand(cmd));
            }

            // Handle Camera Sync
            if (response.camera) {
                this.syncCamera(response.camera);
            }

            // Handle Skybox Sync
            if (response.skybox) {
                this.updateSkybox(response.skybox);
            }


            // Handle Debug Gizmos
            if (debugData && this.gizmosEnabled) {
                this.updateDebugLines(debugData);
            } else if (this.debugLines) {
                this.scene.remove(this.debugLines);
                this.debugLines = null;
            }

            let missingObjects = false;

            if (states) {
                states.forEach(state => {
                    const mesh = this.meshMap.get(state.id);
                    if (mesh) {
                        mesh.userData.targetPosition = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
                        mesh.userData.targetRotation = new THREE.Quaternion(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
                        
                        // Sync scale if it changed
                        if (state.scale) {
                            mesh.scale.set(state.scale.x, state.scale.y, state.scale.z);
                        }

                        // Sync Visibility
                        mesh.visible = state.visible !== false;

                        // Sync Material
                        if (state.material && mesh.material) {
                            if (state.material.color && mesh.material.color) {
                                mesh.material.color.set(state.material.color);
                            }
                            
                            if (state.material.map && mesh.userData.lastMap !== state.material.map) {
                                let url = state.material.map;
                                if (!url.startsWith('http') && !url.startsWith('/')) {
                                    url = `${BASE_URL}/assets/${url}`;
                                }
                                this.textureLoader.load(url, (tex) => {
                                    tex.colorSpace = THREE.SRGBColorSpace;
                                    mesh.material.map = tex;
                                    mesh.material.needsUpdate = true;
                                });
                                mesh.userData.lastMap = state.material.map;
                            } else if (!state.material.map && mesh.userData.lastMap) {
                                mesh.material.map = null;
                                mesh.material.needsUpdate = true;
                                mesh.userData.lastMap = null;
                            }

                            if (state.material.metalness !== undefined) mesh.material.metalness = state.material.metalness;
                            if (state.material.roughness !== undefined) mesh.material.roughness = state.material.roughness;
                            if (state.material.opacity !== undefined) mesh.material.opacity = state.material.opacity;
                            if (state.material.transparent !== undefined) mesh.material.transparent = state.material.transparent;
                            if (state.material.wireframe !== undefined) mesh.material.wireframe = state.material.wireframe;
                        }

                        // Improved Animation Sync
                        if (mesh.userData.mixer && state.currentAnimation !== mesh.userData.currentAnimation) {
                            console.log(`[Renderer] Animation state change for ${state.id}: ${mesh.userData.currentAnimation} -> ${state.currentAnimation}`);
                            
                            if (state.currentAnimation) {
                                const clip = mesh.userData.animations?.find(a => a.name === state.currentAnimation);
                                if (clip) {
                                    const newAction = mesh.userData.mixer.clipAction(clip);
                                    const oldAction = mesh.userData.activeAction;

                                    if (oldAction && oldAction !== newAction) {
                                        oldAction.fadeOut(0.2);
                                    }

                                    newAction.reset();
                                    newAction.setEffectiveTimeScale(1);
                                    newAction.setEffectiveWeight(1);
                                    newAction.fadeIn(0.2);
                                    newAction.play();
                                    
                                    mesh.userData.activeAction = newAction;
                                } else {
                                    console.warn(`[Renderer] Animation clip not found: ${state.currentAnimation}`);
                                }
                            } else {
                                // Stop animations if currentAnimation is null/empty
                                if (mesh.userData.activeAction) {
                                    mesh.userData.activeAction.fadeOut(0.2);
                                    mesh.userData.activeAction = null;
                                }
                            }
                            mesh.userData.currentAnimation = state.currentAnimation;
                        }
                    } else {
                        missingObjects = true;
                    }
                });
            }

            if (missingObjects) {
                this.refreshHierarchy();
            }
        } catch (e) {
            console.error('Core Sync Error:', e);
        } finally {
            this.isSyncing = false;
        }
    }

    syncCamera(cameraData) {
        this.activeCameraData = cameraData.cameras.find(c => c.id === cameraData.activeCameraId);
        
        if (!this.activeCameraData || this.activeCameraData.type === 'orbit') {
            this.controls.enabled = true;
        } else {
            this.controls.enabled = false;
            if (this.activeCameraData.type === 'static') {
                this.camera.position.set(
                    this.activeCameraData.position.x,
                    this.activeCameraData.position.y,
                    this.activeCameraData.position.z
                );
                this.camera.quaternion.set(
                    this.activeCameraData.rotation.x,
                    this.activeCameraData.rotation.y,
                    this.activeCameraData.rotation.z,
                    this.activeCameraData.rotation.w
                );
            }
        }
    }

    updateSkybox(config) {
        if (JSON.stringify(config) === JSON.stringify(this.currentSkyboxConfig)) return;
        this.currentSkyboxConfig = JSON.parse(JSON.stringify(config));

        console.log('[Renderer] Updating skybox:', config);

        if (config.type === 'color') {
            const color = new THREE.Color(config.color);
            this.scene.background = color;
            this.scene.environment = null;
            
            // Apply intensity if supported by the Three.js version
            if (this.scene.hasOwnProperty('backgroundIntensity')) {
                this.scene.backgroundIntensity = config.intensity !== undefined ? config.intensity : 1.0;
            }
            
            // Fallback: Set renderer clear color as well
            this.renderer.setClearColor(color, 1.0);
            console.log(`[Renderer] Applied skybox color: ${config.color} with intensity ${config.intensity}`);
        } else if (config.type === 'equirectangular' && config.assetPath) {
            let url = config.assetPath;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                url = `${BASE_URL}/assets/${url}`;
            }

            if (url.toLowerCase().endsWith('.hdr')) {
                this.rgbeLoader.load(url, (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this.scene.background = texture;
                    this.scene.environment = texture;
                    if (config.intensity !== undefined) {
                        this.scene.backgroundIntensity = config.intensity;
                    }
                });
            } else {
                this.textureLoader.load(url, (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.scene.background = texture;
                    this.scene.environment = texture;
                    if (config.intensity !== undefined) {
                        this.scene.backgroundIntensity = config.intensity;
                    }
                });
            }
        } else if (config.type === 'cubemap' && config.cubemapPaths && config.cubemapPaths.length === 6) {
            const urls = config.cubemapPaths.map(url => {
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    return `${BASE_URL}/assets/${url}`;
                }
                return url;
            });

            this.cubeTextureLoader.load(urls, (texture) => {
                this.scene.background = texture;
                this.scene.environment = texture;
                if (config.intensity !== undefined) {
                    this.scene.backgroundIntensity = config.intensity;
                }
            });
        }
    }


    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls && this.controls.enabled) this.controls.update();
        
        const delta = this.clock.getDelta();
        const lerpFactor = 0.15; // Smoothness factor

        this.meshMap.forEach(mesh => {
            // Smoothly interpolate towards physics position/rotation
            if (mesh.userData.targetPosition) {
                mesh.position.lerp(mesh.userData.targetPosition, lerpFactor);
            }
            if (mesh.userData.targetRotation) {
                mesh.quaternion.slerp(mesh.userData.targetRotation, lerpFactor);
            }

            // Update animation mixer
            if (mesh.userData.mixer) {
                mesh.userData.mixer.update(delta);
            }
        });

        // Follow Camera Logic
        if (this.activeCameraData && this.activeCameraData.type === 'follow' && this.activeCameraData.targetId) {
            const targetMesh = this.meshMap.get(this.activeCameraData.targetId);
            if (targetMesh) {
                const offset = this.activeCameraData.offset || { x: 0, y: 2, z: 5 };
                // Calculate desired position relative to target
                const desiredPosition = new THREE.Vector3().copy(targetMesh.position).add(new THREE.Vector3(offset.x, offset.y, offset.z));
                this.camera.position.lerp(desiredPosition, 0.1); // Smooth camera follow
                this.camera.lookAt(targetMesh.position);
            }
        }

        // Throttle sync slightly
        this.syncPhysics();
        
        this.renderer.render(this.scene, this.camera);
    }

    updateDebugLines(debugData) {
        if (!this.debugLines) {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ vertexColors: true });
            this.debugLines = new THREE.LineSegments(geometry, material);
            this.debugLines.frustumCulled = false;
            this.scene.add(this.debugLines);
        }

        const geometry = this.debugLines.geometry;
        
        // Convert plain objects/arrays back to Float32Arrays if needed
        const vertices = debugData.vertices instanceof Float32Array ? debugData.vertices : new Float32Array(Object.values(debugData.vertices));
        const colors = debugData.colors instanceof Float32Array ? debugData.colors : new Float32Array(Object.values(debugData.colors));

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    }

    handleAudioEvent(ev) {
        if (ev.type === 'play') {
            const audioLoader = new THREE.AudioLoader();
            let url = ev.assetPath;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                url = `${BASE_URL}/assets/${url}`;
            }

            const sound = new THREE.Audio(this.audioListener);
            audioLoader.load(url, (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(ev.loop || false);
                sound.setVolume(ev.volume || 1.0);
                sound.play();
                this.sounds.set(ev.id, sound);
            });
        } else if (ev.type === 'stop') {
            const sound = this.sounds.get(ev.id);
            if (sound) {
                sound.stop();
                this.sounds.delete(ev.id);
            }
        } else if (ev.type === 'setVolume') {
            const sound = this.sounds.get(ev.id);
            if (sound) {
                sound.setVolume(ev.volume);
            }
        }
    }

    async syncCameraPositionToServer() {
        if (!this.activeCameraData) return;
        
        await fetch(`${API_URL}/cameras/${this.activeCameraData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
                rotation: { x: this.camera.quaternion.x, y: this.camera.quaternion.y, z: this.camera.quaternion.z, w: this.camera.quaternion.w }
            })
        });
    }

    createUIOverlay() {
        let overlay = document.getElementById('ui-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ui-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '1000';
            document.getElementById('viewport').appendChild(overlay);
        }
        return overlay;
    }

    handleUICommand(cmd) {
        if (cmd.type === 'create') {
            const data = cmd.data;
            let el;
            switch (data.type) {
                case 'button':
                    el = document.createElement('button');
                    el.innerText = data.props.label;
                    el.onclick = () => this.sendUIEvent(data.id, 'click');
                    break;
                case 'label':
                    el = document.createElement('span');
                    el.innerText = data.props.label;
                    break;
                case 'text':
                    el = document.createElement('input');
                    el.type = 'text';
                    el.placeholder = data.props.placeholder;
                    el.oninput = (e) => this.sendUIEvent(data.id, 'input', { value: e.target.value });
                    break;
                case 'checkbox':
                    el = document.createElement('div');
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = data.props.checked;
                    cb.onchange = (e) => this.sendUIEvent(data.id, 'change', { checked: e.target.checked });
                    const lbl = document.createElement('label');
                    lbl.innerText = data.props.label;
                    el.appendChild(cb);
                    el.appendChild(lbl);
                    break;
                case 'radio':
                    el = document.createElement('div');
                    const rb = document.createElement('input');
                    rb.type = 'radio';
                    rb.name = data.props.group;
                    rb.checked = data.props.checked;
                    rb.onchange = (e) => this.sendUIEvent(data.id, 'change', { checked: e.target.checked });
                    const rbl = document.createElement('label');
                    rbl.innerText = data.props.label;
                    el.appendChild(rb);
                    el.appendChild(rbl);
                    break;
            }

            if (el) {
                el.id = `ui-${data.id}`;
                el.style.position = 'absolute';
                el.style.left = typeof data.props.x === 'string' ? data.props.x : `${data.props.x}px`;
                el.style.top = typeof data.props.y === 'string' ? data.props.y : `${data.props.y}px`;
                el.style.pointerEvents = 'auto';
                this.uiOverlay.appendChild(el);
                this.uiElements.set(data.id, el);
            }
        } else if (cmd.type === 'update') {
            const el = this.uiElements.get(cmd.id);
            if (el) {
                if (cmd.key === 'label') el.innerText = cmd.value;
                if (cmd.key === 'value') el.value = cmd.value;
                if (cmd.key === 'checked') {
                    const input = el.querySelector('input');
                    if (input) input.checked = cmd.value;
                    else el.checked = cmd.value;
                }
                if (cmd.key === 'x') el.style.left = `${cmd.value}px`;
                if (cmd.key === 'y') el.style.top = `${cmd.value}px`;
            }
        }
    }

    sendUIEvent(id, type, data = {}) {
        fetch(`${API_URL}/ui/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type, data })
        }).catch(() => {});
    }

    toggleConsole(force) {
        if (force !== undefined) {
            if (force) this.consoleWindow.classList.remove('console-hidden');
            else this.consoleWindow.classList.add('console-hidden');
        } else {
            this.consoleWindow.classList.toggle('console-hidden');
        }
    }

    clearConsole() {
        this.consoleLogs.innerHTML = '';
    }

    displayLogs(logs) {
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${log.type}`;
            entry.innerHTML = `<span class="log-time">[${log.timestamp}]</span> <span class="log-msg">${log.message}</span>`;
            this.consoleLogs.appendChild(entry);
        });
        
        // Auto scroll
        this.consoleLogs.scrollTop = this.consoleLogs.scrollHeight;
    }
}

// Start the renderer
window.renderer = new Renderer();
