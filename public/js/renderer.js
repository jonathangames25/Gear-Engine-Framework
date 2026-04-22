import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
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
        this.expandedIds = new Set();
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
        
        // Gizmo Debug Rendering & Transform Tool
        this.debugLines = null;
        this.gizmosEnabled = localStorage.getItem('gizmosEnabled') !== 'false'; // Default to true
        this.transformGizmo = null;
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

        // Transform Gizmo
        this.transformGizmo = new TransformControls(this.camera, this.renderer.domElement);
        this.isGizmoDragging = false;
        this.transformGizmo.addEventListener('dragging-changed', async (e) => {
            this.isGizmoDragging = e.value;
            this.controls.enabled = !this.isGizmoDragging;
            
            const mesh = this.transformGizmo.object;
            if (mesh && this.selectedId) {
                if (this.isGizmoDragging) {
                    // Save original type and switch to kinematic
                    try {
                        const res = await fetch(`${API_URL}/gameobjects/${this.selectedId}`);
                        const json = await res.json();
                        if (json.data) mesh.userData.originalPhysicsType = json.data.physics.type;
                        
                        await fetch(`${API_URL}/gameobjects/${this.selectedId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ physics: { type: 'kinematic' } })
                        });
                    } catch (e) {}
                } else {
                    // Restore original type
                    const type = mesh.userData.originalPhysicsType || 'dynamic';
                    await fetch(`${API_URL}/gameobjects/${this.selectedId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            physics: { type: type },
                            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                            rotation: { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w },
                            scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
                        })
                    });
                }
            }
        });
        this.transformGizmo.addEventListener('change', () => {
            if (this.transformGizmo.object && this.selectedId) {
                this.onGizmoUpdate();
            }
        });
        this.scene.add(this.transformGizmo);

        // Event listeners
        window.addEventListener('resize', () => this.onResize());
        
        const gizmoToggle = document.getElementById('gizmo-toggle');
        gizmoToggle.checked = this.gizmosEnabled;
        gizmoToggle.addEventListener('change', (e) => this.toggleGizmos(e.target.checked));
        
        // Spawn Panel Listeners
        document.querySelectorAll('.spawn-item').forEach(item => {
            item.onclick = (e) => {
                const type = e.target.dataset.type;
                const collider = e.target.dataset.collider;
                if (type) this.addPrimitive(type);
                if (collider) this.addCollider(collider);
            };
        });

        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.getElementById(`${tab}-list`).classList.remove('hidden');
                if (tab === 'models') this.refreshModelsList();
            };
        });

        // Raycasting for selection
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.handleMouseClick(e);
            }
        });

        // Transform Tools Listeners
        const toolBtns = {
            'translate': document.getElementById('tool-translate'),
            'rotate': document.getElementById('tool-rotate'),
            'scale': document.getElementById('tool-scale')
        };
        
        const setGizmoMode = (mode) => {
            this.transformGizmo.setMode(mode);
            Object.values(toolBtns).forEach(b => b.classList.remove('active'));
            if (toolBtns[mode]) toolBtns[mode].classList.add('active');
        };

        toolBtns['translate'].onclick = () => setGizmoMode('translate');
        toolBtns['rotate'].onclick = () => setGizmoMode('rotate');
        toolBtns['scale'].onclick = () => setGizmoMode('scale');

        // Input events
        window.addEventListener('keydown', (e) => { 
            this.keys.add(e.code); 
            this.sendInput(); 
            
            // Gizmo Shortcuts
            if (e.code === 'KeyW') setGizmoMode('translate');
            if (e.code === 'KeyE') setGizmoMode('rotate');
            if (e.code === 'KeyR') setGizmoMode('scale');
            if (e.code === 'Delete' && this.selectedId) this.deleteGameObject(this.selectedId);
        });
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
            // Don't trigger shortcuts if typing in an input
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.appGui.saveCurrentScene();
            }

            if (e.code === 'KeyF' || e.key === 'f') {
                if (this.selectedId) {
                    const mesh = this.meshMap.get(this.selectedId);
                    if (mesh) {
                        // Focus the camera on the mesh
                        const box = new THREE.Box3().setFromObject(mesh);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());
                        
                        this.controls.target.copy(center);
                        
                        // Move camera back a bit based on object size
                        const maxDim = Math.max(size.x, size.y, size.z);
                        // Unity style framing: 
                        const fov = this.camera.fov * (Math.PI / 180);
                        const aspect = this.camera.aspect;
                        
                        // Calculate distance to fit the bounding box
                        let distance = (maxDim / 2) / Math.tan(fov / 2);
                        // Padding factor
                        distance *= 1.5; 

                        if (distance === 0 || isNaN(distance)) distance = 5;
                        
                        const direction = new THREE.Vector3().subVectors(this.camera.position, center);
                        if (direction.lengthSq() < 0.0001) {
                            direction.set(0, 0, 1);
                        } else {
                            direction.normalize();
                        }
                        
                        this.camera.position.copy(center).add(direction.multiplyScalar(distance));
                        this.controls.update();
                    }
                }
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
                position: { x: 0, y: 5, z: 0 },
                primitive: type,
                type: 'dynamic'
            })
        });
        this.refreshHierarchy();
    }

    async addModel(modelName) {
        const res = await fetch(`${API_URL}/gameobjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: modelName.split('.')[0],
                position: { x: 0, y: 5, z: 0 },
                modelUrl: modelName,
                type: 'dynamic'
            })
        });
        this.refreshHierarchy();
    }

    async addCollider(type = 'cube') {
        const res = await fetch(`${API_URL}/gameobjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Collider ${type}`,
                position: { x: 0, y: 5, z: 0 },
                primitive: type,
                type: 'dynamic',
                mesh: { visible: false } // Only collider, no mesh
            })
        });
        this.refreshHierarchy();
    }

    async refreshModelsList() {
        const list = document.getElementById('models-list');
        list.innerHTML = '<p class="empty-msg">Scanning assets...</p>';
        try {
            const res = await fetch(`${API_URL}/assets/models`);
            const json = await res.json();
            if (json.status === 'success' && json.data.length > 0) {
                list.innerHTML = '';
                json.data.forEach(model => {
                    const div = document.createElement('div');
                    div.className = 'spawn-item';
                    div.innerText = model.name;
                    div.onclick = () => this.addModel(model.name);
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = '<p class="empty-msg">No models found in assets/</p>';
            }
        } catch (e) {
            list.innerHTML = '<p class="empty-msg">Error loading models</p>';
        }
    }

    handleMouseClick(event) {
        // Raycast logic
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const container = document.getElementById('viewport');
        const rect = container.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isGizmoDragging) return;

        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        // check if we hit the gizmo first
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            let isGizmo = false;
            let curr = obj;
            while(curr) {
                if (curr.isTransformControls || curr.name.includes("gizmo") || curr.type === "TransformControlsPlane" || curr.userData.isGizmo) {
                    isGizmo = true;
                    break;
                }
                curr = curr.parent;
            }
            if (isGizmo) return; 
            break; 
        }

        // Filter out helper objects and gizmos for selection
        const validIntersects = intersects.filter(i => {
            let obj = i.object;
            while(obj) {
                if (obj.isTransformControls || obj.isGridHelper || obj.isLineSegments || obj.type === "TransformControlsPlane") return false;
                obj = obj.parent;
            }
            return true;
        });

        if (validIntersects.length > 0) {
            let target = validIntersects[0].object;
            let goId = null;
            
            for (const [id, mesh] of this.meshMap) {
                let curr = target;
                while (curr) {
                    if (curr === mesh) {
                        goId = id;
                        break;
                    }
                    curr = curr.parent;
                }
                if (goId) break;
            }

            if (goId) {
                this.selectGameObject(goId);
            } else {
                this.selectGameObject(null);
            }
        } else {
            this.selectGameObject(null);
        }
    }

    async deleteGameObject(id) {
        await fetch(`${API_URL}/gameobjects/${id}`, { method: 'DELETE' });
        const mesh = this.meshMap.get(id);
        if (mesh) {
            this.scene.remove(mesh);
            this.meshMap.delete(id);
        }
        if (this.selectedId === id) this.selectGameObject(null);
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
                    // Extract and report model structure (children names)
                    const getStructure = (node) => {
                        const struct = { name: node.name, type: node.type };
                        if (node.children && node.children.length > 0) {
                            struct.children = node.children.map(c => getStructure(c));
                        }
                        return struct;
                    };
                    const structure = gltf.scene.children.map(c => getStructure(c));
                    fetch(`${API_URL}/gameobjects/${go.id}/model-structure/report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ structure })
                    });

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
                    
                    const hasChildren = go.modelStructure && go.modelStructure.length > 0;
                    const isExpanded = this.expandedIds.has(go.id);
                    const arrowText = hasChildren ? (isExpanded ? '▼' : '▶') : '';

                    li.innerHTML = `
                        <div class="go-header">
                            <span class="go-arrow">${arrowText}</span>
                            <span class="go-name">${go.name}</span>
                        </div>
                    `;

                    li.onclick = (e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            if (isExpanded) this.expandedIds.delete(go.id);
                            else this.expandedIds.add(go.id);
                        }
                        this.selectGameObject(go.id);
                    };
                    
                    // Render Model Structure (Internal nodes like wheels)
                    if (this.expandedIds.has(go.id) && go.modelStructure && go.modelStructure.length > 0) {
                        const subTree = document.createElement('ul');
                        subTree.className = 'model-hierarchy';
                        
                        const renderNodes = (nodes, parentEl) => {
                            nodes.forEach(node => {
                                const subLi = document.createElement('li');
                                subLi.className = 'model-node-item';
                                subLi.innerHTML = `<span class="node-name">${node.name}</span>`;
                                parentEl.appendChild(subLi);
                                if (node.children && node.children.length > 0) {
                                    const subUl = document.createElement('ul');
                                    subLi.appendChild(subUl);
                                    renderNodes(node.children, subUl);
                                }
                            });
                        };
                        
                        renderNodes(go.modelStructure, subTree);
                        li.appendChild(subTree);
                    }

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
        
        // Attachment
        const mesh = id ? this.meshMap.get(id) : null;
        if (mesh) {
            this.transformGizmo.attach(mesh);
        } else {
            this.transformGizmo.detach();
        }
    }

    async onGizmoUpdate() {
        const mesh = this.transformGizmo.object;
        if (!mesh || !this.selectedId) return;

        // Sync with server
        await this.updateTransform(this.selectedId, {
            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            rotation: { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w },
            scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
        });
        
        // Refresh Inspector ONLY if not dragging to avoid jumping
        // But since we want live feedback, we can update specific fields
        this.updateInspectorFields(mesh);
    }

    async updateTransform(id, transform) {
        await fetch(`${API_URL}/gameobjects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transform)
        });
    }

    updateInspectorFields(mesh) {
        const px = document.getElementById('prop-pos-x');
        const py = document.getElementById('prop-pos-y');
        const pz = document.getElementById('prop-pos-z');
        if (px) {
            px.value = mesh.position.x.toFixed(3);
            py.value = mesh.position.y.toFixed(3);
            pz.value = mesh.position.z.toFixed(3);
        }
        
        const rx = document.getElementById('prop-rot-x');
        const ry = document.getElementById('prop-rot-y');
        const rz = document.getElementById('prop-rot-z');
        if (rx) {
            const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion);
            rx.value = THREE.MathUtils.radToDeg(euler.x).toFixed(1);
            ry.value = THREE.MathUtils.radToDeg(euler.y).toFixed(1);
            rz.value = THREE.MathUtils.radToDeg(euler.z).toFixed(1);
        }

        const sx = document.getElementById('prop-scale-x');
        const sy = document.getElementById('prop-scale-y');
        const sz = document.getElementById('prop-scale-z');
        if (sx) {
            sx.value = mesh.scale.x.toFixed(3);
            sy.value = mesh.scale.y.toFixed(3);
            sz.value = mesh.scale.z.toFixed(3);
        }
    }

    async updateInspector(id) {
        if (!id) {
            document.getElementById('inspector-content').innerHTML = '<p class="empty-msg">Select an object to see properties</p>';
            return;
        }

        const res = await fetch(`${API_URL}/gameobjects/${id}`);
        const response = await res.json();
        const go = response.data;
        const content = document.getElementById('inspector-content');
        
        const mesh = this.meshMap.get(id);
        const pos = mesh ? mesh.position : go.physics.position;
        const scale = go.mesh.scale || { x: 1, y: 1, z: 1 };
        const euler = mesh ? new THREE.Euler().setFromQuaternion(mesh.quaternion) : new THREE.Euler();

        content.innerHTML = `
            <div class="prop-group">
                <label>Name</label>
                <input type="text" value="${go.name}" id="prop-name">
            </div>
            
            <div class="prop-group">
                <label>Position</label>
                <div class="transform-row">
                    <div class="vec-input"><span>X</span><input type="number" step="0.1" value="${pos.x.toFixed(3)}" id="prop-pos-x"></div>
                    <div class="vec-input"><span>Y</span><input type="number" step="0.1" value="${pos.y.toFixed(3)}" id="prop-pos-y"></div>
                    <div class="vec-input"><span>Z</span><input type="number" step="0.1" value="${pos.z.toFixed(3)}" id="prop-pos-z"></div>
                </div>
            </div>

            <div class="prop-group">
                <label>Rotation</label>
                <div class="transform-row">
                    <div class="vec-input"><span>X</span><input type="number" step="1" value="${THREE.MathUtils.radToDeg(euler.x).toFixed(1)}" id="prop-rot-x"></div>
                    <div class="vec-input"><span>Y</span><input type="number" step="1" value="${THREE.MathUtils.radToDeg(euler.y).toFixed(1)}" id="prop-rot-y"></div>
                    <div class="vec-input"><span>Z</span><input type="number" step="1" value="${THREE.MathUtils.radToDeg(euler.z).toFixed(1)}" id="prop-rot-z"></div>
                </div>
            </div>

            <div class="prop-group">
                <label>Scale</label>
                <div class="transform-row">
                    <div class="vec-input"><span>X</span><input type="number" step="0.1" value="${scale.x.toFixed(3)}" id="prop-scale-x"></div>
                    <div class="vec-input"><span>Y</span><input type="number" step="0.1" value="${scale.y.toFixed(3)}" id="prop-scale-y"></div>
                    <div class="vec-input"><span>Z</span><input type="number" step="0.1" value="${scale.z.toFixed(3)}" id="prop-scale-z"></div>
                </div>
            </div>

            <div class="prop-group">
                <label>Physics Type</label>
                <select id="prop-type">
                    <option value="dynamic" ${go.physics.type === 'dynamic' ? 'selected' : ''}>Dynamic</option>
                    <option value="static" ${go.physics.type === 'static' ? 'selected' : ''}>Static</option>
                    <option value="kinematic" ${go.physics.type === 'kinematic' ? 'selected' : ''}>Kinematic</option>
                </select>
            </div>

            ${go.scriptData && go.scriptData.length > 0 ? `
                <div class="section-divider">Scripts</div>
                ${(() => {
                    const getAllNodes = (nodes) => {
                        let list = [];
                        nodes.forEach(n => {
                            list.push(n.name);
                            if (n.children) list = list.concat(getAllNodes(n.children));
                        });
                        return list;
                    };
                    const allModelNodes = go.modelStructure ? getAllNodes(go.modelStructure) : [];

                    return go.scriptData.map(s => `
                        <div class="script-block" data-file="${s.fileName}">
                            <div class="script-header">${s.fileName}</div>
                            ${Object.entries(s.properties).map(([key, val]) => {
                                const isMeshRef = key.toLowerCase().includes('name') && allModelNodes.length > 0;
                                return `
                                    <div class="prop-group">
                                        <label>${key.replace(/_/g, ' ')}</label>
                                        ${isMeshRef ? `
                                            <select data-script="${s.fileName}" data-key="${key}" class="script-prop-input">
                                                <option value="">None</option>
                                                ${allModelNodes.map(nodeName => `
                                                    <option value="${nodeName}" ${val === nodeName ? 'selected' : ''}>${nodeName}</option>
                                                `).join('')}
                                            </select>
                                        ` : `
                                            <input type="${typeof val === 'number' ? 'number' : 'text'}" 
                                                   step="${typeof val === 'number' ? '0.1' : ''}"
                                                   value="${val}" 
                                                   data-script="${s.fileName}" 
                                                   data-key="${key}" 
                                                   class="script-prop-input">
                                        `}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('');
                })()}
            ` : ''}
        `;

        // Event listeners for inspector inputs
        const updateFromProps = () => {
            const name = document.getElementById('prop-name').value;
            const type = document.getElementById('prop-type').value;
            const position = {
                x: parseFloat(document.getElementById('prop-pos-x').value),
                y: parseFloat(document.getElementById('prop-pos-y').value),
                z: parseFloat(document.getElementById('prop-pos-z').value)
            };
            const rotationDeg = {
                x: parseFloat(document.getElementById('prop-rot-x').value),
                y: parseFloat(document.getElementById('prop-rot-y').value),
                z: parseFloat(document.getElementById('prop-rot-z').value)
            };
            const scale = {
                x: parseFloat(document.getElementById('prop-scale-x').value),
                y: parseFloat(document.getElementById('prop-scale-y').value),
                z: parseFloat(document.getElementById('prop-scale-z').value)
            };

            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(rotationDeg.x),
                THREE.MathUtils.degToRad(rotationDeg.y),
                THREE.MathUtils.degToRad(rotationDeg.z)
            ));

            // Extract script property updates
            const scriptProperties = [];
            content.querySelectorAll('.script-block').forEach(block => {
                const fileName = block.dataset.file;
                const properties = {};
                block.querySelectorAll('.script-prop-input').forEach(input => {
                    const key = input.dataset.key;
                    const val = input.type === 'number' ? parseFloat(input.value) : input.value;
                    properties[key] = val;
                });
                scriptProperties.push({ fileName, properties });
            });

            this.updateTransform(id, {
                name,
                physics: { type },
                position,
                rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
                scale,
                scriptProperties
            });

            // Update mesh locally for immediate feedback
            if (mesh) {
                mesh.position.set(position.x, position.y, position.z);
                mesh.quaternion.copy(q);
                mesh.scale.set(scale.x, scale.y, scale.z);
            }
        };

        content.querySelectorAll('input, select').forEach(input => {
            input.onchange = updateFromProps;
        });
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
                        // Skip sync for the object being manipulated by the gizmo to avoid jitter
                        const isBeingManipulated = this.transformGizmo.object === mesh && this.isGizmoDragging;
                        
                        if (!isBeingManipulated) {
                            mesh.userData.targetPosition = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
                            mesh.userData.targetRotation = new THREE.Quaternion(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
                        }
                        
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
 
                        // Synchronize Child Transforms (Sub-meshes of models like wheels)
                        if (state.childTransforms) {
                            for (const [nodeName, transform] of Object.entries(state.childTransforms)) {
                                const subMesh = mesh.getObjectByName(nodeName);
                                if (subMesh) {
                                    if (transform.position) {
                                        subMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
                                    }
                                    if (transform.rotation) {
                                        subMesh.quaternion.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);
                                    }
                                    if (transform.scale) {
                                        subMesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
                                    }
                                }
                            }
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
        
        // Respect Gizmo drag first
        if (this.isGizmoDragging) {
            this.controls.enabled = false;
        } else if (!this.activeCameraData || this.activeCameraData.type === 'orbit') {
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
            // CRITICAL: If this object is being moved by the gizmo, DO NOT interpolate
            const isBeingManipulated = this.transformGizmo.object === mesh && this.isGizmoDragging;
            
            if (!isBeingManipulated) {
                // Smoothly interpolate towards physics position/rotation
                if (mesh.userData.targetPosition) {
                    mesh.position.lerp(mesh.userData.targetPosition, lerpFactor);
                }
                if (mesh.userData.targetRotation) {
                    mesh.quaternion.slerp(mesh.userData.targetRotation, lerpFactor);
                }
            } else {
                // Clear targets while manipulating to prevent a "pop" when releasing
                mesh.userData.targetPosition = null;
                mesh.userData.targetRotation = null;
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
