// --- DIYCRAFT CORE GAME ENGINE ---

// 1. Initialize Dual Inventory Pouch Data Structures (60 slots each)
const rawInventory = new Array(60).fill(null);
const craftedInventory = new Array(60).fill(null);

// 2. Ironclad Safety Guardrail: Whitelist of allowed items (Zero weapons/harm)
const SAFE_WHITELIST = [
    "Wood Block", "Stone Block", "Flower", "Wheat Seeds", 
    "Wooden Plank", "Glass Pane", "Paintbrush", "Canvas", 
    "Apple", "Bread", "Cottage Door", "Window"
];

// Function to safely add items with guardrail verification
function addItemToPouch(pouchType, itemName) {
    // GUARDRAIL CHECK: Reject any item not on the safe whitelist
    if (!SAFE_WHITELIST.includes(itemName)) {
        console.warn(`[SAFETY GUARD] Blocked unauthorized or harmful item attempt: "${itemName}"`);
        return false;
    }

    let pouch = (pouchType === 'crafted') ? craftedInventory : rawInventory;
    let emptyIndex = pouch.indexOf(null);
    
    if (emptyIndex !== -1) {
        pouch[emptyIndex] = itemName;
        updateInventoryUI();
        return true;
    } else {
        console.log("Pouch is full (Max 60 slots reached).");
        return false;
    }
}

// Populate Inventory UI slots visually on load
function initializeInventoryUI() {
    const rawContainer = document.getElementById('raw-slots');
    const craftedContainer = document.getElementById('crafted-slots');

    // Clear existing slots to prevent duplication if re-initialized
    rawContainer.innerHTML = '';
    craftedContainer.innerHTML = '';

    for (let i = 0; i < 60; i++) {
        let rawDiv = document.createElement('div');
        rawDiv.className = 'slot';
        rawDiv.innerText = i + 1;
        rawContainer.appendChild(rawDiv);

        let craftedDiv = document.createElement('div');
        craftedDiv.className = 'slot';
        craftedDiv.innerText = i + 1;
        craftedContainer.appendChild(craftedDiv);
    }
}

function updateInventoryUI() {
    // Logic to visually sync inventory arrays with HTML UI can go here
}

// 3. Basic 3D World Setup using Three.js
let scene, camera, renderer;

function initGame() {
    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Friendly sky blue

    // Create Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add Friendly Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add a simple green grass floor baseplate (Fixed syntax)
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x557A46 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial); 
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Initialize UI
    initializeInventoryUI();

    // Start Animation Loop
    animate();
}

// Game Loop / Render Tick
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// --- UI TOGGLE CONTROLS ---

// Toggle Inventory Modal using the CSS .hidden class
function toggleInventory() {
    const modal = document.getElementById('inventory-modal');
    modal.classList.toggle('hidden');
}

// Toggle entire top HUD visibility
function toggleHUD() {
    const topPanel = document.querySelector('#ui-layer .hud-panel');
    topPanel.classList.toggle('hidden');
}

// Keyboard shortcut listener for 'E' key
window.addEventListener('keydown', (event) => {
    if (event.key === 'e' || event.key === 'E') {
        toggleInventory();
    }
});

// Run engine when window loads
window.onload = initGame;
