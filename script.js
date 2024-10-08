let scene, camera, renderer, earthMesh, light, particleSystem, cloudMesh, earthMaterial;
let isPaused = false;
let moonMesh;
let isHyperSpace = false; // Flag pour contrôler l'activation de l'hyperespace
let hyperSpeed = 0.05; // Vitesse normale initiale
let razorCrest;
const maxHyperSpeed = 3; // Vitesse maximale en hyperespace (augmentée pour plus de visibilité)
const hyperSpaceTriggerDistance = 2; // Distance de déclenchement de l'hyperespace (ajustée)
const planetPosition = new THREE.Vector3(0, 0, 0); // Position de la planète
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load('circle-particle.png');

let fleet = []; // Array to store the fleet of Star Destroyers
let hyperSpaceParticles; // Pour stocker les particules de l'hyperespace
const loader = new THREE.GLTFLoader(); // Loader for GLTF files

let plasmaRays = []; // Tableau pour stocker les rayons plasma

// Fonction pour créer une boule de feu à l'impact
function createFireball(globalPosition, direction) {
    console.log("Boule de feu créée!");

    // Convertir la position globale de l'impact en coordonnées locales par rapport au Razor Crest
    const localPosition = razorCrest.worldToLocal(globalPosition.clone());

    // Charger la texture "fire.jpg" et la bump map "fire_bump.jpg"
    const textureLoader = new THREE.TextureLoader();
    const fireTexture = textureLoader.load('fire.jpg'); // Texture de la boule de feu
    const normalTexture = textureLoader.load('fire_normal.png'); // Normal map associée à fire.jpg

    // Créer un matériau avec la texture et la normal map
    const fireballMaterial = new THREE.MeshPhongMaterial({
        map: fireTexture,        // Texture de la boule de feu
        normalMap: normalTexture, // Normal map pour simuler le relief détaillé
        normalScale: new THREE.Vector2(0.5, 0.5), // Ajuster l'intensité du relief
        transparent: true,
        opacity: 0.8
    });

    // Créer la boule de feu
    const fireball = new THREE.Mesh(
        new THREE.SphereGeometry(5, 32, 32),  // Géométrie de la boule de feu
        fireballMaterial                      // Matériau avec texture et bump map
    );

    fireball.position.copy(localPosition);

    // Appliquer une rotation aléatoire initiale sur les axes x, y et z
    fireball.rotation.x = Math.random() * 2 * Math.PI;
    fireball.rotation.y = Math.random() * 2 * Math.PI;
    fireball.rotation.z = Math.random() * 2 * Math.PI;

    // Ajouter l'explosion comme enfant du Razor Crest pour qu'elle suive ses mouvements
    razorCrest.add(fireball);

    // Animer la boule de feu pour qu'elle se dissipe progressivement et tourne
    let fireballLife = 1.0; // Durée de vie initiale
    const fireballInterval = setInterval(() => {
        fireballLife -= 0.05;  // Réduction de la durée de vie
        fireball.scale.set(fireballLife, fireballLife, fireballLife);  // Réduire progressivement la taille
        fireball.material.opacity = fireballLife;  // Réduire progressivement l'opacité

        // Faire tourner la boule de feu autour de ses propres axes de manière aléatoire
        fireball.rotation.x += 0.1 * Math.random(); // Rotation sur l'axe X
        fireball.rotation.y += 0.1 * Math.random(); // Rotation sur l'axe Y
        fireball.rotation.z += 0.1 * Math.random(); // Rotation sur l'axe Z

        if (fireballLife <= 0) {
            razorCrest.remove(fireball); // Retirer la boule de feu du Razor Crest
            clearInterval(fireballInterval); // Arrêter l'intervalle une fois la boule de feu disparue
        }
    }, 50);  // Intervalle pour une animation fluide
}

// Fonction pour animer les particules de débris
function animateDebrisParticle(debris) {
    const debrisInterval = setInterval(() => {
        debris.position.add(debris.userData.direction.clone().multiplyScalar(0.05)); // Mouvement dans la direction
        debris.userData.life -= 0.1; // Diminuer la durée de vie

        // Faire diminuer l'opacité et la taille des débris
        debris.scale.multiplyScalar(0.95);
        debris.material.opacity *= 0.95;

        if (debris.userData.life <= 0) {
            scene.remove(debris); // Supprimer les débris lorsqu'ils disparaissent
            clearInterval(debrisInterval);
        }
    }, 100);
}

// Fonction de gestion des impacts
function handlePlasmaImpact(ray) {
    // Créer une boule de feu à l'endroit de l'impact
    createFireball(ray.position.clone(), ray.userData.direction);

    // Retirer le rayon de la scène après l'impact
    scene.remove(ray);
}

// Fonction pour créer un rayon plasma
function createPlasmaRay(position, direction) {
    const plasmaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 32); // Forme du rayon
    const plasmaMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Couleur verte
    const plasmaRay = new THREE.Mesh(plasmaGeometry, plasmaMaterial);

    // Position initiale du tir
    plasmaRay.position.copy(position);

    // Calculer la direction du tir
    const targetDirection = direction.clone().normalize();

    // Calculer l'orientation correcte du cylindre pour qu'il suive la direction du tir
    const up = new THREE.Vector3(0, 1, 0); // Axe vertical de référence (Y)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, targetDirection); // Calculer la rotation

    // Appliquer la rotation au plasma
    plasmaRay.setRotationFromQuaternion(quaternion);

    // Stocker la direction du tir pour le mouvement ultérieur
    plasmaRay.userData.direction = targetDirection;

    // Ajouter le plasma à la scène
    scene.add(plasmaRay);
    plasmaRays.push(plasmaRay); // Ajouter à la liste des tirs
}

// Fonction pour tirer des rayons plasma avec meilleure précision
function firePlasmaRay(ship) {
    if (!razorCrest) return; // Assurez-vous que le Razor Crest est chargé

    // Calculer la direction précise en prenant en compte la position actuelle du Razor Crest
    const targetPosition = razorCrest.position.clone();
    
    // Ajouter un léger décalage aléatoire pour éviter des tirs toujours parfaits
    targetPosition.x += (Math.random() - 0.5) * 0.2; // Décalage horizontal aléatoire
    targetPosition.y += (Math.random() - 0.5) * 0.2; // Décalage vertical aléatoire
    
    // Calculer la direction du tir
    const rayDirection = new THREE.Vector3().subVectors(targetPosition, ship.position).normalize();
    
    // Position initiale du tir, depuis le destroyer
    const initialPosition = ship.position.clone();
    
    // Créer le rayon plasma avec la direction ajustée
    createPlasmaRay(initialPosition, rayDirection);
}

// Appeler cette fonction pour tirer des rayons périodiquement depuis les destroyers
function firePlasmaRaysFromFleet() {
    fleet.forEach((ship, index) => {
        if (!isHyperSpace) { // Ne pas tirer en hyperespace
            const delay = Math.random() * 500 + 500; // Délai aléatoire entre 500ms et 1000ms

            // Utilisation de setTimeout pour introduire un délai
            setTimeout(() => {
                firePlasmaRay(ship);
            }, delay * index); // Délai croissant en fonction de l'index pour éviter des tirs simultanés
        }
    });
}

// Appeler cette fonction pour animer les rayons plasma
function animatePlasmaRays() {
    plasmaRays.forEach((ray, index) => {
        // Déplacer le rayon vers sa cible
        ray.position.add(ray.userData.direction.clone().multiplyScalar(0.9));

        // Vérifier si le rayon touche le Razor Crest
        if (ray.position.distanceTo(razorCrest.position) < 0.5) {
            handlePlasmaImpact(ray); // Gérer l'impact du tir
            plasmaRays.splice(index, 1); // Retirer de la liste
        } else if (ray.position.distanceTo(camera.position) > 50) {
            scene.remove(ray); // Supprimer si le rayon est trop loin
            plasmaRays.splice(index, 1);
        }
    });
}

// Chargement du modèle et initialisation de la flotte
loader.load('destroyer-decimate025.glb', function(gltf) {
    const starDestroyer = gltf.scene;
    
    // Ajuster l'échelle du modèle
    starDestroyer.scale.set(0.02, 0.02, 0.02);

    // Initialiser la flotte avec ce modèle
    initFleet(starDestroyer);
}, undefined, function(error) {
    console.error('An error occurred while loading the model:', error);
});

// Charger le modèle Razor Crest
loader.load('razor_crest_-_star_wars/scene.gltf', function(gltf) {
    razorCrest = gltf.scene;
    razorCrest.scale.set(.07, .07, .07);
    razorCrest.position.set(-5, 5, -5); // Position initiale du Razor Crest
    
    // Appliquer une rotation sur l'axe y une seule fois
    razorCrest.rotation.y = Math.PI / 2;

    scene.add(razorCrest);
}, undefined, function(error) {
    console.error('An error occurred while loading the Razor Crest model:', error);
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
        emissive: new THREE.Color(0xffffaa),
        emissiveIntensity: 5 // Réduire l'intensité de base de l'émissive
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

    scene.fog = new THREE.Fog(0x000000, 10, 100); // Crée un effet de brouillard pour ajouter de la profondeur

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, -5, -5).normalize();
    scene.add(directionalLight);

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

function initFleet(starDestroyer) {
    const fleetSize = 3;
    for (let i = 0; i < fleetSize; i++) {
        const clone = starDestroyer.clone();
        clone.position.set(-10, 2.0, i * -1);
        fleet.push(clone);
        scene.add(clone);
    }
}

function animateFleet() {
    let heightOffset = 2;
    
    fleet.forEach((ship, index) => {
        if (isHyperSpace) {
            // Déplacement rapide en hyperespace
            ship.position.x += hyperSpeed;
            hyperSpeed = Math.min(hyperSpeed * 1.05, maxHyperSpeed); // Accélération exponentielle

            if (ship.position.x > 60) { 
                // Réinitialiser la position après avoir quitté l'écran
                ship.position.x = -30;
                razorCrest.position.x = -40;
                hyperSpeed = 0.05; // Réinitialiser la vitesse
                isHyperSpace = false; // Désactiver l'hyperespace pour recommencer
            }
        } else {
            // Mouvement normal des vaisseaux
            ship.position.x += 0.05; // Déplacement normal vers la droite
            if (ship.position.x > 2 && !isHyperSpace) { // Déclenche l'hyperespace
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

    if (razorCrest) {
        if (isHyperSpace) {
            // Déplacement du Razor Crest en hyperespace
            let speedoffsethyperespace = 0.03;
            razorCrest.position.x += hyperSpeed + speedoffsethyperespace;
            hyperSpeed = Math.min(hyperSpeed * 1.05, maxHyperSpeed); // Accélération exponentielle
        } else {
            // Mouvement normal du Razor Crest
            let speedoffset = 0.03;
            razorCrest.position.x += 0.05 + speedoffset; // Déplacement normal vers la droite
        }
    }
}

// Fonction pour mettre à jour l'émissivité de la Terre en fonction de la lumière
function updateEmissivityBasedOnLight(earthMesh, lightPosition) {
    const positionAttribute = earthMesh.geometry.attributes.position;

    // Parcourir chaque vertex de la sphère
    for (let i = 0; i < positionAttribute.count; i++) {
        // Extraire les coordonnées x, y, z du vertex
        const vertex = new THREE.Vector3(
            positionAttribute.getX(i),
            positionAttribute.getY(i),
            positionAttribute.getZ(i)
        );

        // Transformer en position globale
        vertex.applyMatrix4(earthMesh.matrixWorld);

        // Calculer la direction de la lumière pour ce vertex
        const lightDirection = new THREE.Vector3().subVectors(lightPosition, vertex).normalize();

        // Calculer la normale locale de la Terre à ce vertex
        const normalDirection = vertex.clone().normalize(); // La normale de la Terre pointe depuis le centre

        // Calculer le produit scalaire (cosinus de l'angle entre la lumière et la normale)
        const dotProduct = lightDirection.dot(normalDirection);

        // Appliquer l'émissivité en fonction de la lumière reçue
        if (dotProduct < 0) {
            // Si le produit scalaire est négatif, cela signifie que le point est dans l'ombre (côté nuit)
            // L'émissivité (lumières artificielles) doit être appliquée
            earthMesh.material.emissiveIntensity = Math.abs(dotProduct) * 1.0; // Échelle de l'émissivité
        } else {
            // Si le produit scalaire est positif, cela signifie que le point est du côté éclairé
            earthMesh.material.emissiveIntensity = 0.0; // Pas d'émissivité du côté éclairé
        }
    }
}

// Appeler cette fonction dans la boucle d'animation pour mettre à jour l'émissivité
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        animateFleet();
        animatePlasmaRays();

        // Rotation de la Terre et des nuages
        earthMesh.rotation.y += 0.001;
        cloudMesh.rotation.y += 0.0005;

        moonMesh.position.x = Math.cos(Date.now() * 0.001) * 2;
        moonMesh.position.z = Math.sin(Date.now() * 0.001) * 2;

        // Mise à jour de l'émissivité basée sur la lumière pour chaque point de la Terre
        updateEmissivityBasedOnLight(earthMesh, light.position);
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
// Tirer les rayons plasma à intervalles réguliers
setInterval(firePlasmaRaysFromFleet, 1000); // Tirer toutes les 1 seconde