// UI Test Script
let score = 0;
let timer = 0;

// Initialize UI
UIModule.createLabel('lbl_score', 'Score: 0', 350, 20);
UIModule.createButton('btn_reset', 'Reset Counter', 350, 50);
UIModule.createCheckbox('chk_vis', 'Mesh Visible', true, 350, 90);
UIModule.createTextInput('txt_name', 'Enter name...', 350, 130);
UIModule.createLabel('lbl_welcome', 'Welcome!', 350, 170);

// Subscribe to events
UIModule.on('btn_reset', 'click', () => {
    score = 0;
    UIModule.setLabel('lbl_score', 'Score: 0');
    AudioModule.playSound('reset', 'assets/click.mp3');
});

UIModule.on('chk_vis', 'change', (data) => {
    GameObjectModule.updateGameObject(gameObject.id, { mesh: { visible: data.checked } });
});

UIModule.on('txt_name', 'input', (data) => {
    UIModule.setLabel('lbl_welcome', `Hello, ${data.value || 'stranger'}!`);
});

// Update loop
update = (dt) => {
    timer += dt;
    if (timer >= 1.0) {
        score++;
        UIModule.setLabel('lbl_score', `Score: ${score}`);
        timer = 0;
    }
    
    // Test Input access
    if (InputModule.isKeyDown('Space')) {
        UIModule.setLabel('lbl_score', 'SPACE PRESSED!');
    }
};
