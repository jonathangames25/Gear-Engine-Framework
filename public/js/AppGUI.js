
/**
 * AppGUI Module
 * Handles high-level Electron UI interactions like Scene Management and Onboarding.
 */
class AppGUI {
    constructor(renderer) {
        this.renderer = renderer;
        this.API_URL = 'http://127.0.0.1:3005/api';
        
        // Elements
        this.saveBtn = document.getElementById('save-scene');
        this.openBtn = document.getElementById('open-scenes');
        this.modal = document.getElementById('scene-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.sceneList = document.getElementById('scene-list');
        
        // Prompt Elements
        this.promptModal = document.getElementById('prompt-modal');
        this.promptTitle = document.getElementById('prompt-title');
        this.promptMessage = document.getElementById('prompt-message');
        this.promptInput = document.getElementById('prompt-input');
        this.promptConfirm = document.getElementById('prompt-confirm');
        this.promptCancel = document.getElementById('prompt-cancel');
        
        this.init();
    }

    init() {
        // Event Listeners
        this.saveBtn.addEventListener('click', () => this.saveCurrentScene());
        this.openBtn.addEventListener('click', () => this.openSceneManager());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        
        // Close modal on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        console.log('[AppGUI] Initialized');
    }

    async saveCurrentScene() {
        try {
            const activeSceneResp = await fetch(`${this.API_URL}/scenes/active`);
            const activeSceneData = await activeSceneResp.json();
            
            if (activeSceneData.status === 'success') {
                const defaultName = (activeSceneData.data.name || 'default_scene').toLowerCase().replace(/ /g, '_');
                let fileName = await this.showPrompt('Save Scene', 'Enter filename to save as (e.g. level1.json):', defaultName + '.json');
                
                if (!fileName) return; // Cancelled
                if (!fileName.endsWith('.json')) fileName += '.json';

                // Sync renderer camera to server first (for orbit camera persistence)
                if (this.renderer) {
                    await this.renderer.syncCameraPositionToServer();
                }
                
                const saveResp = await fetch(`${this.API_URL}/scenes/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName })
                });
                
                const result = await saveResp.json();
                if (result.status === 'success') {
                    this.showNotification(`Scene saved as ${fileName}`, 'success');
                } else {
                    throw new Error(result.message);
                }
            }
        } catch (e) {
            this.showNotification(`Save failed: ${e.message}`, 'error');
        }
    }

    async openSceneManager() {
        this.modal.classList.add('active');
        this.renderSceneList();
    }

    closeModal() {
        this.modal.classList.remove('active');
    }

    async renderSceneList() {
        this.sceneList.innerHTML = '<p style="text-align:center; padding: 20px;">Scanning assets...</p>';
        
        try {
            const resp = await fetch(`${this.API_URL}/assets/scenes`);
            const json = await resp.json();
            
            if (json.status === 'success') {
                this.sceneList.innerHTML = '';
                
                if (json.data.length === 0) {
                    this.sceneList.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">No scenes found in assets folder.</p>';
                    return;
                }

                json.data.forEach(scene => {
                    const li = document.createElement('li');
                    li.className = 'scene-item';
                    
                    const date = new Date(scene.modifiedAt).toLocaleString();
                    
                    li.innerHTML = `
                        <span>${scene.name}</span>
                        <span class="date">${date}</span>
                    `;
                    
                    li.onclick = () => this.loadScene(scene.name);
                    this.sceneList.appendChild(li);
                });
            }
        } catch (e) {
            this.sceneList.innerHTML = `<p style="color:#ef4444; padding: 20px;">Error: ${e.message}</p>`;
        }
    }

    async loadScene(fileName) {
        try {
            this.showNotification(`Loading ${fileName}...`, 'info');
            
            const resp = await fetch(`${this.API_URL}/scenes/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            });
            
            const result = await resp.json();
            if (result.status === 'success') {
                this.showNotification(`Scene ${fileName} loaded!`, 'success');
                this.closeModal();
                // Renderer will pick up the new state in next sync
                if (this.renderer) this.renderer.refreshHierarchy();
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            this.showNotification(`Load failed: ${e.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // ... (existing notification logic)
        console.log(`[AppGUI] ${type.toUpperCase()}: ${message}`);
        
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.background = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        toast.style.zIndex = '2000';
        toast.style.fontFamily = 'Inter, sans-serif';
        toast.style.fontSize = '0.9rem';
        toast.innerText = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    showPrompt(title, message, defaultValue = '') {
        return new Promise((resolve) => {
            this.promptTitle.innerText = title;
            this.promptMessage.innerText = message;
            this.promptInput.value = defaultValue;
            this.promptModal.classList.add('active');
            this.promptInput.focus();
            this.promptInput.select();

            const cleanup = () => {
                this.promptModal.classList.remove('active');
                this.promptConfirm.onclick = null;
                this.promptCancel.onclick = null;
                window.removeEventListener('keydown', handleKeydown);
            };

            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    cleanup();
                    resolve(this.promptInput.value);
                } else if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            };

            this.promptConfirm.onclick = () => {
                cleanup();
                resolve(this.promptInput.value);
            };

            this.promptCancel.onclick = () => {
                cleanup();
                resolve(null);
            };

            window.addEventListener('keydown', handleKeydown);
        });
    }
}

export default AppGUI;
