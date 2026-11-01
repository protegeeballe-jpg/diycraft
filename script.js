// --- DIYCRAFT CORE GAME ENGINE: ECOSYSTEM UPDATE ---

// 1. Initialize Dual Inventory Pouch Data Structures (60 slots each)
const rawInventory = new Array(60).fill(null);
const craftedInventory = new Array(60).fill(null);

// 2. Ironclad Safety Guardrail: Whitelist of allowed items (Zero weapons/harm)
const SAFE_WHITELIST = [
    "Wood Block", "Stone Block", "Flower", "Wheat Seeds", 
    "Wooden Plank", "Glass Pane", "Paintbrush", "Canvas", 
    "Apple", "Bread", "Cottage Door", "Window", "Tree Sapling", "Water Block"
];

// Function to safely add items with guardrail verification
function addItemToPouch(pouchType, itemName) {
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
    // Visual syncing logic placeholder
}

// 3. 3D World Setup & Environment Generation
let scene, camera, renderer;
const placedBlocks = [];

function initGame() {
    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Friendly sky blue

    // Create Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add Friendly Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(15, 30, 15);
    scene.add(directionalLight);

    // --- GENERATE ENVIRONMENT: Ground, River, Mountains, and Trees ---
    generateEnvironment();

    // Initialize UI
    initializeInventoryUI();

    // Start Animation Loop
    animate();
}

// Function to procedurally build the nature landscape
function generateEnvironment() {
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

    // 1. Base Grass Floor
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x557A46 });
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4682B4, transparent: true, opacity: 0.8 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });

    // Build flat-to-rolling terrain grid
    for (let x = -15; x <= 15; x++) {
        for (let z = -15; z <= 15; z++) {
            
            // 2. The Peaceful River (A strip where x is between -2 and -1 running down z)
            if (x >= -2 && x <= -1) {
                const waterBlock = new THREE.Mesh(cubeGeo, waterMat);
                waterBlock.position.set(x, -0.2, z);
                scene.add(waterBlock);
                placedBlocks.push(waterBlock);
                continue;
            }

            // 3. Mountains in the far background (positive z)
            if (z > 10) {
                let mountainHeight = Math.floor(Math.abs(Math.sin(x * 0.5)) * 4) + 1;
                for (let y = 0; y < mountainHeight; y++) {
                    let mat = (y === mountainHeight - 1) ? stoneMat : dirtMat;
                    let mBlock = new THREE.Mesh(cubeGeo, mat);
                    mBlock.position.set(x, y, z);
                    scene.add(mBlock);
                    placedBlocks.push(mBlock);
                }
                continue;
            }

            // Standard Grass Ground Level
            const groundBlock = new THREE.Mesh(cubeGeo, grassMat);
            groundBlock.position.set(x, 0, z);
            scene.add(groundBlock);
            placedBlocks.push(groundBlock);

            // 4. Scatter Initial Cozy Trees (Check specific coordinates to plant trees)
            if ((x === -8 && z === -5) || (x === 6 && z === 4) || (x === -6 && z === 8)) {
                spawnTree(x, 1, z);
            }
        }
    }
}

// Helper function to build a blocky voxel tree[cite: 3]
function spawnTree(startX, startY, startZ) {
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });

    // Trunk (3 blocks high)
    for (let y = 0; y < 3; y++) {
        let trunk = new THREE.Mesh(cubeGeo, woodMat);
        trunk.position.set(startX, startY + y, startZ);
        scene.add(trunk);
        placedBlocks.push(trunk);
    }

    // Leaf canopy
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            for (let ly = 3; ly <= 4; ly++) {
                // Skip corners for a rounded blocky look
                if (Math.abs(lx) === 1 && Math.abs(lz) === 1 && ly === 4) continue;
                
                let leaf = new THREE.Mesh(cubeGeo, leafMat);
                leaf.position.set(startX + lx, startY + ly, startZ + lz);
                scene.add(leaf);
                placedBlocks.push(leaf);
            }
        }
    }
}

// Game Loop / Render Tick
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// --- 4. CLICK-TO-BUILD RAYCASTER MECHANIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    const modal = document.getElementById('inventory-modal');
    if (!modal.classList.contains('hidden')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const hit = intersects[0];

        const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        const cubeMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B }); // Cozy wood block
        const newBlock = new THREE.Mesh(cubeGeo, cubeMat);

        newBlock.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(0.5));
        newBlock.position.x = Math.floor(newBlock.position.x) + 0.5;
        newBlock.position.y = Math.floor(newBlock.position.y) + 0.5;
        newBlock.position.z = Math.floor(newBlock.position.z) + 0.5;

        scene.add(newBlock);
        placedBlocks.push(newBlock);
    }
});

// --- UI TOGGLE CONTROLS ---
function toggleInventory() {
    const modal = document.getElementById('inventory-modal');
    modal.classList.toggle('hidden');
}

function toggleHUD() {
    const topPanel = document.querySelector('#ui-layer .hud-panel');
    topPanel.classList.toggle('hidden');
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'e' || event.key === 'E') {
        toggleInventory();
    }
});

window.onload = initGame;
