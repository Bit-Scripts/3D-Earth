let scene, camera, renderer, earthMesh, light, particleSystem, cloudMesh;
let isPaused = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function addParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCnt = 5000; // Adjust as needed

    const posArray = new Float32Array(particlesCnt * 3);
    for (let i = 0; i < particlesCnt * 3; i++) {
        // Random positions
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: 0xffffff,
        depthTest: true // Assurez-vous que ceci est activé
    });
    

    particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

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

    const earthMaterial = new THREE.MeshPhongMaterial({
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

    // Ensuite, ajoutez les particules
    addParticles();

    light = new THREE.DirectionalLight(0xffffff, 1); // Essayez d'augmenter l'intensité
    light.position.set(10, 5, 5);
    scene.add(light);

    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.02); // Ajustez l'intensité selon besoin
    // scene.add(ambientLight);

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

function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        earthMesh.rotation.y += 0.001; // Rotation de la Terre
        cloudMesh.rotation.y += 0.0005; // Rotation des nuages

        // Mise à jour des positions des particules
        let positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += 0.001; // Déplacement sur l'axe X

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
