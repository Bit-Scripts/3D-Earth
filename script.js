let scene, camera, renderer, earthMesh, light, particleSystem, cloudMesh, earthMaterial;
let isPaused = false;
let moonMesh;
let isHyperSpace = false; // Flag pour contrôler l'activation de l'hyperespace
let hyperSpeed = 0.05; // Vitesse normale initiale
const maxHyperSpeed = 2; // Vitesse maximale en hyperespace
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load('circle-particle.png'); // Remplacez par le chemin de votre texture

let fleet = []; // Array to store the fleet of Star Destroyers
let hyperSpaceParticles; // Pour stocker les particules de l'hyperespace
const loader = new THREE.GLTFLoader(); // Loader for GLTF files

// Chargement du modèle et initialisation de la flotte
loader.load('destroyer-decimate025.gltf', function(gltf) {
    const starDestroyer = gltf.scene;
    starDestroyer.scale.set(0.02, 0.02, 0.02);
    initFleet(starDestroyer); // Initialiser la flotte après le chargement du modèle
}, undefined, function(error) {
    console.error('An error occurred while loading the model:', error);
});

function addParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCnt = 5000; // Adjust as needed

    const posArray = new Float32Array(particlesCnt * 3);
    for (let i = 0; i < particlesCnt * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        map: particleTexture, // Utiliser la texture circulaire
        transparent: true, // Important pour les textures avec transparence
        depthTest: true
    });

    particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.set(0, 0, 5); // Position de la caméra en hauteur pour capturer l'effet d'apparition
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Fixer la caméra sur le centre de la scène

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.gammaOutput = true;        
    renderer.gammaFactor = 2.0;
    document.body.appendChild(renderer.domElement);

    renderer.domElement.addEventListener('mousemove', onMouseMove, false);

    const textureLoader = new THREE.TextureLoader();

    // Définition de la géométrie de la Terre
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);

    // Définition du matériau de la Terre (assurez-vous que ceci est fait après le chargement des textures)
    const earthDiffuseMap = textureLoader.load(
        'Earth_Diffuse.jpg',
        function () { console.log('Diffuse map loaded successfully'); },
        undefined,
        function (err) { console.error('Error loading diffuse map:', err); }
    );
    
    const earthSpecularMap = textureLoader.load(
        'Earth_Specular.jpg',
        function () { console.log('Specular map loaded successfully'); },
        undefined,
        function (err) { console.error('Error loading specular map:', err); }
    );
    
    const earthNormalMap = textureLoader.load(
        'Earth_Normal.jpg',
        function () { console.log('Normal map loaded successfully'); },
        undefined,
        function (err) { console.error('Error loading normal map:', err); }
    );
    const earthNightMap = new THREE.TextureLoader().load('Earth_Night.jpg');

    earthMaterial = new THREE.MeshPhongMaterial({
        map: earthDiffuseMap,
        specularMap: earthSpecularMap,
        normalMap: earthNormalMap,
        emissiveMap: earthNightMap,
        specular: new THREE.Color(0x222222),
        shininess: 5, // Ajuster ces valeurs
        emissive: new THREE.Color(0xffffaa),
        emissiveIntensity: 1.5
    });   
    
    // Création de la mesh de la Terre
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);

    // Rotation initiale pour centrer sur l'Europe
    earthMesh.rotation.y = -1.5; // Ajustez cette valeur pour l'axe Y
    earthMesh.rotation.x = 0; // Ajustez cette valeur si nécessaire pour l'axe X

    const cloudGeometry = new THREE.SphereGeometry(1.01, 32, 32); // Un peu plus grande que la Terre
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('Earth_Cloud.png'),
        transparent: true,
        opacity: 1.0,
        emissive: new THREE.Color(0xffffff), // Ajouter une couleur émissive blanche
        emissiveIntensity: 0.0001, // Ajuster l'intensité selon vos besoins
        alpha: true
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);

    // Ajoutez d'abord la Terre à la scène
    scene.add(earthMesh);

    scene.add(cloudMesh);

    // Définition de la géométrie de la Lune
    const moonGeometry = new THREE.SphereGeometry(0.27, 32, 32); // Taille de la Lune relative à la Terre

    // Définition du matériau de la Lune
    const distanceTerreLune = 150; // Distance Terre-Lune en unités, à ajuster selon vos besoins
    const moonTexture = textureLoader.load('Moon.jpg');
    const moonNormalMap = textureLoader.load('Moon_Normal.jpg');

    const moonMaterial = new THREE.MeshPhongMaterial({
        map: moonTexture,
        normalMap: moonNormalMap,  // Appliquez la carte normale ici
        specular: new THREE.Color(0x000000), // Couleur spéculaire noire (aucune réflexion)
        shininess: 0 // Pas de brillance
    });
    
    moonMaterial.normalScale = new THREE.Vector2(1, 1); // Ajustez les valeurs pour changer l'intensité du relief

    // Création de la mesh de la Lune
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);

    // Positionner la Lune à une certaine distance de la Terre
    moonMesh.position.x = Math.cos(Date.now() * 0.001) * distanceTerreLune;
    moonMesh.position.z = Math.sin(Date.now() * 0.001) * distanceTerreLune;

    // Ajoutez la Lune à la scène
    scene.add(moonMesh);

    // Ensuite, ajoutez les particules
    addParticles();

    light = new THREE.DirectionalLight(0xffffff, 1); // Essayez d'augmenter l'intensité
    light.position.set(10, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.002); // Ajustez l'intensité selon besoin
    scene.add(ambientLight);

    scene.fog = new THREE.Fog(0x000000, 10, 100); // Crée un effet de brouillard pour ajouter de la profondeur

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(10, 5, 5).normalize();
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(10, -5, -5).normalize();
    scene.add(directionalLight2);

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onMouseMove(event) {
    // Calculer la position de la souris en coordonnées normalisées
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earthMesh);

    if (intersects.length > 0) {
        isPaused = true; // Mettre en pause lors du survol de la Terre
    } else {
        isPaused = false; // Reprendre l'animation lorsque la souris quitte la Terre
    }
}

function calculateEmissiveIntensity(angleRadians) {
    // Convertir l'angle en degrés pour simplifier la compréhension
    const angleDegrees = angleRadians * (180 / Math.PI);

    // L'intensité émissive basée sur l'angle
    /*let emissiveIntensity;

    if (angleDegrees < 90) {
        // Jour : diminuer l'intensité
        emissiveIntensity = 0.2 * (1 - angleDegrees / 90);
    } else {
        // Nuit : augmenter l'intensité, mais pas trop
        // Utiliser une fonction logarithmique ou exponentielle pour une augmentation douce
        emissiveIntensity = 0.2 + Math.log10((angleDegrees - 90) + 1) / 2;
    }*/

    // Assurer que l'intensité reste dans une plage raisonnable
    return 0.2; Math.min(Math.max(emissiveIntensity, 0), 1);
}

function initFleet(starDestroyer) {
    const fleetSize = 3; // Nombre de vaisseaux par groupe
    const initialHeight = 2.0; // Hauteur des vaisseaux

    for (let i = 0; i < fleetSize; i++) {
        const clone = starDestroyer.clone();
        clone.position.set(-10, initialHeight, i * -1); // Position initiale avec hauteur ajustée
        fleet.push(clone);
        scene.add(clone);
    }
}

function animateFleet() {
    const heightOffset = 2.0; // Hauteur de base

    fleet.forEach((ship, index) => {
        if (isHyperSpace) {
            ship.position.x += hyperSpeed;
            hyperSpeed *= 1.05; // Accélération exponentielle

            if (ship.position.x > 10 || hyperSpeed > maxHyperSpeed) {
                ship.position.x = -10; // Réinitialiser la position après l'hyperespace
                hyperSpeed = 0.05; // Réinitialiser la vitesse
                isHyperSpace = false; // Désactiver l'hyperespace
            }
        } else {
            ship.position.x += 0.05; // Déplacement de gauche à droite
            if (ship.position.x > 0 && !isHyperSpace) {
                isHyperSpace = true;
            }
        }

        // Positionnez les vaisseaux en formation triangulaire plus proche
        if (index === 0) {
            ship.position.set(ship.position.x, heightOffset + 1, 0); // Vaisseau du haut
        } else if (index === 1) {
            ship.position.set(ship.position.x, heightOffset, -0.5); // Vaisseau en bas à gauche
        } else if (index === 2) {
            ship.position.set(ship.position.x, heightOffset, 0.5); // Vaisseau en bas à droite
        }
    });
}

function createHyperSpaceEffect() {
    const hyperSpaceGeometry = new THREE.BufferGeometry();
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20; // Position X
        positions[i + 1] = (Math.random() - 0.5) * 20; // Position Y
        positions[i + 2] = (Math.random() - 0.5) * 50; // Position Z
    }

    hyperSpaceGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const hyperSpaceMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.0,
    });

    hyperSpaceParticles = new THREE.Points(hyperSpaceGeometry, hyperSpaceMaterial);
    scene.add(hyperSpaceParticles);
}

function animate() {
    requestAnimationFrame(animate);

    // Exemple avec le pôle Nord (0, 1, 0 en coordonnées cartésiennes)
    const northPoleDirection = new THREE.Vector3(0, 1, 0);
    const lightDirection = light.position.clone().normalize();

    const angleRadians = Math.acos(lightDirection.dot(northPoleDirection));
    earthMaterial.emissiveIntensity = calculateEmissiveIntensity(angleRadians);

    if (!isPaused) {
        animateFleet();

        // Animation des particules d'hyperespace (allongement des traînées de lumière)
        if (isHyperSpace) {
            const positions = hyperSpaceParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += 0.5; // Allonger les traînées sur l'axe Z
            }
            hyperSpaceParticles.geometry.attributes.position.needsUpdate = true;
        }

        earthMesh.rotation.y += 0.001; // Rotation de la Terre
        cloudMesh.rotation.y += 0.0005; // Rotation des nuages
        // Rotation de la Lune autour de la Terre
        moonMesh.position.x = Math.cos(Date.now() * 0.001) * 2;
        moonMesh.position.z = Math.sin(Date.now() * 0.001) * 2;

        // Mise à jour des positions des particules
        let positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += 0.0001; // Déplacement sur l'axe X

            // Réinitialisez la position de la particule si elle dépasse une certaine limite (par exemple, 5)
            if (positions[i] > 5) {
                positions[i] = -5;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    checkIntersection();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
createHyperSpaceEffect(); // Créez l'effet d'hyperespace après la scène