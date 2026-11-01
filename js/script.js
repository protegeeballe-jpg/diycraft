// --- DIYCRAFT MAIN GAME SCRIPT ---

let scene, camera, renderer;
let placedBlocks = [];
let raycaster, mouse;
let isInventoryOpen = false;

function init() {
    // 1. Setup Game Container & Scene
    const container = document.getElementById('game-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

  // 5. Base Ground / Terrain Plane
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
    const ground = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    placedBlocks.push(ground);

    // ✨ CALL IT HERE:
    spawnWorldElements();
    
    // 6. Raycaster & Mouse Initialization
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 7. Setup UI & Event Listeners
    setupUI();

    // 8. Window Resize Handler
    window.addEventListener('resize', onWindowResize);

    // 9. Start Render Loop
    animate();
}

function setupUI() {
    const inventoryModal = document.getElementById('inventory-modal');
    const inventoryBtn = document.getElementById('inventory-btn'); 
    const closeInventoryBtn = document.getElementById('close-inventory'); 

    // --- WORLD LIFE (TREES, NPCS, ANIMALS) ---

function spawnWorldElements() {
    // 1. Spawn a forest of low-poly trees
    for (let i = 0; i < 20; i++) {
        // Keep them spread out, away from the immediate center spawn
        const x = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        if (Math.abs(x) > 4 || Math.abs(z) > 4) {
            createTree(x, z);
        }
    }

    // 2. Spawn a friendly neighbor NPC standing nearby
    createNPC(3, 3);

    // 3. Spawn a friendly animal companion
    createAnimal(-4, 3);
}

function createTree(x, z) {
    // Tree Trunk
    const trunkGeo = new THREE.BoxGeometry(0.8, 3, 0.8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 }); // Brown wood
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    placedBlocks.push(trunk); // Make trees solid/buildable around!

    // Tree Leaves
    const leavesGeo = new THREE.BoxGeometry(3, 3, 3);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2E8B57 }); // Sea green leaves
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 3.5, z);
    leaves.castShadow = true;
    scene.add(leaves);
    placedBlocks.push(leaves);
}

function createNPC(x, z) {
    const npcGroup = new THREE.Group();
    
    // Body (Blue shirt)
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3498DB });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    npcGroup.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFD1B3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.5;
    head.castShadow = true;
    npcGroup.add(head);

    npcGroup.position.set(x, 0, z);
    scene.add(npcGroup);
}

function createAnimal(x, z) {
    const animalGroup = new THREE.Group();

    // Body (Fluffy white sheep body)
    const bodyGeo = new THREE.BoxGeometry(1, 0.8, 1.4);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    animalGroup.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xBDC3C7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.9, 0.8);
    head.castShadow = true;
    animalGroup.add(head);

    animalGroup.position.set(x, 0, z);
    scene.add(animalGroup);
}
    // Toggle Inventory Modal
    window.toggleInventory = function() {
        if (!inventoryModal) return;
        isInventoryOpen = !isInventoryOpen;
        if (isInventoryOpen) {
            inventoryModal.classList.remove('hidden');
        } else {
            inventoryModal.classList.add('hidden');
        }
    };

    if (inventoryBtn) {
        inventoryBtn.addEventListener('click', toggleInventory);
    }

    if (closeInventoryBtn) {
        closeInventoryBtn.addEventListener('click', toggleInventory);
    }

    // Open/Close Inventory with 'E' Key
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE') {
            toggleInventory();
        }
    });

    // Block Placement Click Handler
    window.addEventListener('click', (event) => {
        // Prevent building if inventory modal is open
        if (isInventoryOpen) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        // Raycast only against buildable blocks/ground
        const intersects = raycaster.intersectObjects(placedBlocks);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Safety guard: ensure hit.face exists to prevent TypeError
            if (!hit.face) return;

            // Create new block
            const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
            const cubeMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B }); 
            const newBlock = new THREE.Mesh(cubeGeo, cubeMat);
            newBlock.castShadow = true;
            newBlock.receiveShadow = true;

            // Position calculation and grid snapping
            newBlock.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(0.5));
            newBlock.position.x = Math.floor(newBlock.position.x) + 0.5;
            newBlock.position.y = Math.floor(newBlock.position.y) + 0.5;
            newBlock.position.z = Math.floor(newBlock.position.z) + 0.5;

            scene.add(newBlock);
            placedBlocks.push(newBlock);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialize game on window load
window.onload = init;
