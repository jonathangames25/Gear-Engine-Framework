
// Test script to change skybox color
console.log("Skybox test script loaded");

let timer = 0;
const colors = ['#1a1a2e', '#2e1a1a', '#1a2e1a', '#2e2e1a', '#1a2e2e'];
let colorIndex = 0;

update = (dt) => {
    timer += dt;
    if (timer > 2) {
        timer = 0;
        colorIndex = (colorIndex + 1) % colors.length;
        console.log("Changing skybox color to: " + colors[colorIndex]);
        SkyboxModule.setColor(colors[colorIndex]);
    }
}
