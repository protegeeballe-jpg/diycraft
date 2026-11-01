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
    placedBlocks.push(ground); // Add ground to buildable objects

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
