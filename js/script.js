// --- DIYCRAFT CORE GAME ENGINE: SANCTUARY UPDATE ---

// 1. Initialize Dual Inventory Pouch Data Structures (60 slots each)
const rawInventory = new Array(60).fill(null);
const craftedInventory = new Array(60).fill(null);

// 2. Ironclad Safety Guardrail: Whitelist of allowed items (Zero weapons/harm)
const SAFE_WHITELIST = [
    "Wood Block", "Stone Block", "Flower", "Wheat Seeds", 
    "Wooden Plank", "Glass Pane", "Paintbrush", "Canvas", 
    "Apple", "Bread", "Cottage Door", "Window", "Tree Sapling", "Water Block"
];

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

function updateInventoryUI() {}

// 3. 3D World Setup & Environment
let scene, camera, renderer;
const placedBlocks = [];
const companions = []; // Stores peaceful neighbors and animals for gentle movement

function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Friendly sky blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(15, 30, 15);
    scene.add(directionalLight);

    // Generate Landscape
    generateEnvironment();

    // Spawn Peaceful Companions (Kind Neighbors & Gentle Animals)
    spawnCompanions();

    initializeInventoryUI();
    animate();
}

// Procedural Environment Generation
function generateEnvironment() {
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x557A46 });
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4682B4, transparent: true, opacity: 0.8 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x808080 });

    for (let x = -15; x <= 15; x++) {
        for (let z = -15; z <= 15; z++) {
            
            // Peaceful River
            if (x >= -2 && x <= -1) {
                const waterBlock = new THREE.Mesh(cubeGeo, waterMat);
                waterBlock.position.set(x, -0.2, z);
                scene.add(waterBlock);
                placedBlocks.push(waterBlock);
                continue;
            }

            // Mountains in the background
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

            // Grass Ground Level
            const groundBlock = new THREE.Mesh(cubeGeo, grassMat);
            groundBlock.position.set(x, 0, z);
            scene.add(groundBlock);
            placedBlocks.push(groundBlock);

            // LUSH FOREST: Scatter trees procedurally across the sides
            if ((x % 4 === 0 && z % 3 === 0) && Math.abs(x) > 3 && z < 8) {
                spawnTree(x, 1, z);
            }
        }
    }
}

// Voxel Tree Builder
function spawnTree(startX, startY, startZ) {
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });

    for (let y = 0; y < 3; y++) {
        let trunk = new THREE.Mesh(cubeGeo, woodMat);
        trunk.position.set(startX, startY + y, startZ);
        scene.add(trunk);
        placedBlocks.push(trunk);
    }

    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            for (let ly = 3; ly <= 4; ly++) {
                if (Math.abs(lx) === 1 && Math.abs(lz) === 1 && ly === 4) continue;
                let leaf = new THREE.Mesh(cubeGeo, leafMat);
                leaf.position.set(startX + lx, startY + ly, startZ + lz);
                scene.add(leaf);
                placedBlocks.push(leaf);
            }
        }
    }
}

// --- KIND NEIGHBORS & PEACEFUL ANIMALS (No talking, pure company) ---
function spawnCompanions() {
    // 1. Kind Neighbor (Gardening / Minding their own life)
    const neighborGroup = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xD2B48C }); // Tan shirt
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFDAB9 }); // Friendly face tone
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.4), bodyMat);
    body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
    head.position.y = 1.25;
    
    neighborGroup.add(body);
    neighborGroup.add(head);
    neighborGroup.position.set(5, 0, -4);
    
    // Add wandering behavior metadata
    neighborGroup.userData = { wanderSpeed: 0.01, range: 3, startX: 5 };
    scene.add(neighborGroup);
    companions.push(neighborGroup);

    // 2. Gentle Animal (Friendly sheep/bunny near the river)
    const animalGroup = new THREE.Group();
    const woolMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF }); // Soft white wool
    const woolBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), woolMat);
    woolBody.position.y = 0.3;
    
    animalGroup.add(woolBody);
    animalGroup.position.set(-5, 0, 2);
    animalGroup.userData = { wanderSpeed: 0.015, range: 2, startZ: 2 };
    scene.add(animalGroup);
    companions.push(animalGroup);
}

// Game Loop / Render Tick (Includes gentle companion pacing)
function animate() {
    requestAnimationFrame(animate);

    // Gentle, peaceful movement for neighbors and animals (minding their own business)
    let time = Date.now() * 0.001;
    companions.forEach((comp, index) => {
        if (index === 0) {
            // Neighbor gentle pacing side to side
            comp.position.x = comp.userData.startX + Math.sin(time * 0.5) * comp.userData.range;
        } else {
            // Animal gentle pacing back and forth near river
            comp.position.z = comp.userData.startZ + Math.cos(time * 0.4) * comp.userData.range;
        }
    });

    renderer.render(scene, camera);
}

// --- CLICK-TO-BUILD RAYCASTER ---
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
        const cubeMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B }); 
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
