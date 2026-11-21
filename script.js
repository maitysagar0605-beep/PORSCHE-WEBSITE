/* ==========================================================================
   PORSCHE 911 GT3 RS — INTERACTIVE TELEMETRY, 3D INSPECTOR, AUDIO & STATE ENGINE
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------------
     1. PERSISTENT CONFIGURATOR STATE (localStorage + CSS Custom Properties)
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = 'porsche_992_gt3rs_build_v1';

  const hueRotationMap = {
    'Acid Green': '0deg',
    'Shark Blue': '92deg',
    'Lava Orange': '-88deg',
    'Racing Yellow': '-55deg'
  };

  const defaultBuild = {
    color: 'Acid Green',
    hex: '#39FF14',
    glow: 'rgba(57, 255, 20, 0.35)',
    hue: '0deg',
    img: 'assests/images/Acid_Green_Porsche_911_GT3_Wallpaper.jfif'
  };

  let activeBuild = { ...defaultBuild };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.color && saved.img) {
      activeBuild = {
        ...defaultBuild,
        color: saved.color,
        hex: saved.hex || defaultBuild.hex,
        glow: saved.glow || defaultBuild.glow,
        hue: saved.hue || hueRotationMap[saved.color] || '0deg',
        img: saved.img
      };
    }
  } catch (e) {
    console.warn('localStorage unavailable, using default build.');
  }

  const rootEl = document.documentElement;
  const heroCarImg = document.getElementById('heroCarImg');
  const studioCarImg = document.getElementById('studioCarImg');
  const activePaintBadge = document.getElementById('activePaintBadge');
  const studioColorName = document.getElementById('studioColorName');
  const saveStatus = document.getElementById('saveStatus');
  const exhaustCanvas = document.getElementById('exhaustCanvas');
  const canvasCtx = exhaustCanvas ? exhaustCanvas.getContext('2d') : null;

  let scene, camera, renderer, controls, carGroup, turntableRing, bodyPaintMat, wheelRimMat, rimLight;
  let gltfPaintMaterials = [];
  let wheelsList = [];
  let autoSpin = true;
  let threeInitialized = false;
  let wavePhase = 0;

  // Map neon UI swatch colors to deep, rich automotive factory clearcoat tones
  const deepAutomotivePaintMap = {
    '#39FF14': '#188C08', // Deep Porsche Acid / Lizard Green
    '#00B4FF': '#00569E', // Deep Porsche Shark Blue
    '#FF5500': '#B82900', // Deep Porsche Lava Orange
    '#FFD000': '#C48F00'  // Deep Porsche Racing Yellow
  };

  function getDeepCarPaintColor(hex) {
    const upper = (hex || '').toUpperCase();
    if (deepAutomotivePaintMap[upper]) {
      return new THREE.Color(deepAutomotivePaintMap[upper]);
    }
    const c = new THREE.Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), hsl.l * 0.58);
    return c;
  }

  function drawIdleBaseline(overrideHex) {
    if (!exhaustCanvas || !canvasCtx) return;
    const w = exhaustCanvas.width;
    const h = exhaustCanvas.height;
    canvasCtx.clearRect(0, 0, w, h);
    canvasCtx.strokeStyle = overrideHex || activeBuild.hex || '#39FF14';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.05) * 2.2 * Math.sin((x / w) * Math.PI);
      if (x === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
  }

  function update3DCarPaint(hex) {
    const deepPaint = getDeepCarPaintColor(hex);

    // 1. Update procedural fallback mesh (if active)
    if (bodyPaintMat) bodyPaintMat.color.copy(deepPaint);

    // 2. Keep showroom turntable ring & subtle rim light matched to UI accent
    if (turntableRing) turntableRing.material.color.set(hex);
    if (rimLight) rimLight.color.set(hex);

    // 3. Update loaded .glb car body paint materials with deep clearcoat finish
    gltfPaintMaterials.forEach((mat) => {
      mat.color.copy(deepPaint);
      if ('metalness' in mat) mat.metalness = Math.max(mat.metalness ?? 0.4, 0.45);
      if ('roughness' in mat) mat.roughness = Math.min(mat.roughness ?? 0.25, 0.22);
      if ('clearcoat' in mat) {
        mat.clearcoat = 1.0;
        mat.clearcoatRoughness = 0.06;
      }
      mat.needsUpdate = true;
    });
  }

  function applyBuildToDOM(build) {
    const resolvedHue = build.hue || hueRotationMap[build.color] || '0deg';
    rootEl.style.setProperty('--accent-color', build.hex);
    rootEl.style.setProperty('--accent-glow', build.glow);
    rootEl.style.setProperty('--bg-hue', resolvedHue);

    if (heroCarImg) heroCarImg.src = build.img;
    if (studioCarImg) studioCarImg.src = build.img;
    update3DCarPaint(build.hex);
    drawIdleBaseline(build.hex);

    if (activePaintBadge) activePaintBadge.textContent = build.color.toUpperCase();
    if (studioColorName) studioColorName.textContent = `${build.color.toUpperCase()} // WEISSACH SPEC`;

    document.querySelectorAll('.swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === build.color);
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
      if (saveStatus) {
        saveStatus.textContent = 'SAVED TO LOCALSTORAGE ✓';
        setTimeout(() => {
          saveStatus.textContent = 'SYNCED TO LOCALSTORAGE';
        }, 1500);
      }
    } catch (e) {
      // Ignore storage quota errors
    }
  }

  applyBuildToDOM(activeBuild);

  document.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeBuild.color = btn.dataset.color;
      activeBuild.hex = btn.dataset.hex;
      activeBuild.glow = btn.dataset.glow;
      activeBuild.hue = btn.dataset.hue || hueRotationMap[btn.dataset.color] || '0deg';
      activeBuild.img = btn.dataset.img;
      applyBuildToDOM(activeBuild);
    });
  });

  
/* ------------------------------------------------------------------------
     2. MOBILE MENU & NAVIGATION SCROLL-SPY
     ------------------------------------------------------------------------ */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const primaryNav = document.getElementById('primaryNav');
  const navLinks = document.querySelectorAll('.nav-link');

  function setActiveNav(id) {
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === id);
    });
  }

  function isAtFooter() {
    const footerEl = document.getElementById('footer');
    if (!footerEl) return false;
    const atPageBottom =
      window.innerHeight + Math.ceil(window.scrollY) >=
      document.documentElement.scrollHeight - 24;
    const footerReached = footerEl.getBoundingClientRect().top <= window.innerHeight * 0.65;
    return atPageBottom || footerReached;
  }

  if (mobileMenuBtn && primaryNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        primaryNav.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        if (link.dataset.section) {
          setActiveNav(link.dataset.section);
        }
      });
    });
  }

  // Also sync active state if any footer anchor link elsewhere on the page is clicked
  document.querySelectorAll('a[href="#footer"]').forEach((anchor) => {
    anchor.addEventListener('click', () => setActiveNav('footer'));
  });

  const trackedSections = document.querySelectorAll('main section[id], footer[id]');
  const navSpyObserver = new IntersectionObserver(
    (entries) => {
      if (isAtFooter()) {
        setActiveNav('footer');
        return;
      }

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.id !== 'footer') {
          setActiveNav(entry.target.getAttribute('id'));
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px' }
  );

  trackedSections.forEach((sec) => navSpyObserver.observe(sec));

  window.addEventListener(
    'scroll',
    () => {
      if (isAtFooter()) {
        setActiveNav('footer');
      } else if (document.querySelector('.nav-link[data-section="footer"].active')) {
        setActiveNav('specs');
      }
    },
    { passive: true }
  );

  /* ------------------------------------------------------------------------
     3. HERO 3D PERSPECTIVE TILT CARD
     ------------------------------------------------------------------------ */
  const heroTiltCard = document.getElementById('heroTiltCard');
  if (heroTiltCard) {
    heroTiltCard.addEventListener('mousemove', (e) => {
      const rect = heroTiltCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroTiltCard.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
    });

    heroTiltCard.addEventListener('mouseleave', () => {
      heroTiltCard.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  }

  /* ------------------------------------------------------------------------
     4. INTERACTIVE 360° WEBGL 3D INSPECTION MODAL (PUBG SHOWROOM ENGINE)
     ------------------------------------------------------------------------ */
  const modal360 = document.getElementById('modal360');
  const open360Btn = document.getElementById('open360Btn');
  const card360Trigger = document.getElementById('card360Trigger');
  const close360Btn = document.getElementById('close360Btn');
  const stage360Viewport = document.getElementById('stage360Viewport');
  const car3dCanvas = document.getElementById('car3dCanvas');
  const angleSlider = document.getElementById('angleSlider');
  const yawReadout = document.getElementById('yawReadout');
  const autoSpinBtn = document.getElementById('autoSpinBtn');
  const resetCamBtn = document.getElementById('resetCamBtn');
  const modelSourceBadge = document.getElementById('modelSourceBadge');
  const modelLoaderOverlay = document.getElementById('modelLoaderOverlay');
  const loaderProgress = document.getElementById('loaderProgress');

  function buildProceduralGT3RS(paintHex) {
    const group = new THREE.Group();

    bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: getDeepCarPaintColor(paintHex),
      metalness: 0.55,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x14171a,
      metalness: 0.35,
      roughness: 0.42
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x090c10,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.55,
      transparent: true,
      opacity: 0.88
    });

    wheelRimMat = new THREE.MeshStandardMaterial({
      color: 0x2b3036,
      metalness: 0.82,
      roughness: 0.24
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x0d0e10,
      roughness: 0.85
    });

    // Lower Widebody Chassis
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.46, 4.45), bodyPaintMat);
    lowerBody.position.y = 0.52;
    group.add(lowerBody);

    // Sculpted Front Hood & Fenders
    const frontHood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.22, 1.45), bodyPaintMat);
    frontHood.position.set(0, 0.72, 1.42);
    frontHood.rotation.x = 0.14;
    group.add(frontHood);

    // Carbon Nostrils / S-Duct Vent
    const hoodVent = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.55), carbonMat);
    hoodVent.position.set(0, 0.82, 1.35);
    hoodVent.rotation.x = 0.14;
    group.add(hoodVent);

    // Teardrop 911 Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.48, 2.05), glassMat);
    cabin.position.set(0, 0.98, -0.15);
    group.add(cabin);

    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 1.35), carbonMat);
    roofPanel.position.set(0, 1.23, -0.2);
    group.add(roofPanel);

    // Front Carbon Splitter & Canards
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.06, 0.55), carbonMat);
    splitter.position.set(0, 0.27, 2.15);
    group.add(splitter);

    // Rear Diffuser & Twin Center Exhausts
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.24, 0.45), carbonMat);
    diffuser.position.set(0, 0.34, -2.18);
    group.add(diffuser);

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.95, roughness: 0.15 });
    [-0.14, 0.14].forEach((xPos) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 16), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(xPos, 0.32, -2.36);
      group.add(pipe);
    });

    // Signature Swan-Neck Rear Wing & DRS Flap
    [-0.58, 0.58].forEach((xPos) => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.26), carbonMat);
      pylon.position.set(xPos, 1.08, -1.95);
      pylon.rotation.x = -0.18;
      group.add(pylon);
    });

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.06, 0.42), carbonMat);
    mainWing.position.set(0, 1.34, -2.06);
    mainWing.rotation.x = 0.08;
    group.add(mainWing);

    [-0.99, 0.99].forEach((xPos) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.54), bodyPaintMat);
      endplate.position.set(xPos, 1.34, -2.06);
      group.add(endplate);
    });

    // LED Matrix Headlights & Full-Width Rear Lightbar
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xeafff5 });
    [-0.68, 0.68].forEach((xPos) => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), headLightMat);
      hl.scale.set(1.1, 0.65, 1.4);
      hl.position.set(xPos, 0.68, 2.15);
      group.add(hl);
    });

    const tailBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.06, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff1e27 })
    );
    tailBar.position.set(0, 0.72, -2.23);
    group.add(tailBar);

    // 4 Forged Center-Lock Wheels + Brake Calipers
    const wheelCoords = [
      [-0.94, 0.38, 1.38],
      [0.94, 0.38, 1.38],
      [-0.98, 0.41, -1.36],
      [0.98, 0.41, -1.36]
    ];

    wheelsList = [];
    wheelCoords.forEach(([x, y, z], idx) => {
      const radius = idx >= 2 ? 0.41 : 0.38;
      const wheelUnit = new THREE.Group();

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.32, 28), tireMat);
      tire.rotation.z = Math.PI / 2;
      wheelUnit.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.33, 20), wheelRimMat);
      rim.rotation.z = Math.PI / 2;
      wheelUnit.add(rim);

      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xffd000, metalness: 0.5, roughness: 0.3 })
      );
      caliper.position.set(x > 0 ? -0.08 : 0.08, 0.06, 0.1);
      wheelUnit.add(caliper);

      wheelUnit.position.set(x, y, z);
      group.add(wheelUnit);
      wheelsList.push(wheelUnit);
    });

    return group;
  }

  function initThreeShowroom() {
    if (threeInitialized) return;
    threeInitialized = true;

    scene = new THREE.Scene();

    const width = stage360Viewport.clientWidth || 900;
    const height = stage360Viewport.clientHeight || 460;

    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(3.8, 1.85, 4.3);

    renderer = new THREE.WebGLRenderer({ canvas: car3dCanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    // Realistic PBR Studio Environment Reflections (balanced so paint stays rich & deep)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pmremGenerator.dispose();

    // Studio Showroom Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080a0c, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    rimLight = new THREE.DirectionalLight(new THREE.Color(activeBuild.hex), 1.1);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // PUBG Showroom Reflective Floor & Glowing Turntable Ring
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c0f12, metalness: 0.7, roughness: 0.25 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    turntableRing = new THREE.Mesh(
      new THREE.RingGeometry(2.65, 2.74, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(activeBuild.hex), side: THREE.DoubleSide })
    );
    turntableRing.rotation.x = -Math.PI / 2;
    turntableRing.position.y = 0.005;
    scene.add(turntableRing);

    // Show sleek loading overlay while turntable remains empty until .glb loads
    if (modelLoaderOverlay) modelLoaderOverlay.classList.remove('hidden');
    if (modelSourceBadge) modelSourceBadge.textContent = 'LOADING 3D CHASSIS...';

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load Real .glb Model from assests/models/porsche_911_gt3_rs_992.glb
    gltfLoader.load(
      'assests/models/porsche_911_gt3_rs_992.glb',
      (gltf) => {
        if (carGroup) scene.remove(carGroup);
        carGroup = gltf.scene;

        // Auto-scale & center model on the turntable
        const box = new THREE.Box3().setFromObject(carGroup);
        const size = box.getSize(new THREE.Vector3());
        const scale = 4.4 / Math.max(size.x, size.y, size.z);
        carGroup.scale.setScalar(scale);
        box.setFromObject(carGroup);
        const center = box.getCenter(new THREE.Vector3());
        carGroup.position.set(-center.x, -box.min.y, -center.z);

        // Scan and bind body-paint materials for live color switching
        gltfPaintMaterials = [];
        const matchedPaintSet = new Set();

        const paintKeywords = /paint|body|carpaint|chassis|hood|bonnet|door|fender|wing|spoiler|bumper|shell|coat|exterior|livery/i;
        const excludeKeywords = /glass|window|windshield|tire|tyre|rubber|brake|caliper|disc|rotor|light|headlight|taillight|lamp|interior|seat|dash|steering|carbon|grille|grill|mesh|exhaust|pipe|chrome|mirror|badge|logo|emblem|plate|shadow|floor|rim|wheel|alloy|magnesium|spoke/i;

        carGroup.traverse((child) => {
          if (!child.isMesh || !child.material) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((mat) => {
            const combinedName = `${child.name} ${mat.name}`;
            if (excludeKeywords.test(combinedName)) return;

            if (paintKeywords.test(combinedName) && !matchedPaintSet.has(mat)) {
              matchedPaintSet.add(mat);
              gltfPaintMaterials.push(mat);
            }
          });
        });

        // Fallback: If model uses generic names (e.g., Material.001), pick the largest non-excluded mesh
        if (gltfPaintMaterials.length === 0) {
          let largestMesh = null;
          let maxVolume = 0;

          carGroup.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const combinedName = `${child.name} ${child.material.name || ''}`;
            if (excludeKeywords.test(combinedName)) return;

            child.geometry.computeBoundingBox();
            const bSize = new THREE.Vector3();
            child.geometry.boundingBox.getSize(bSize);
            const vol = bSize.x * bSize.y * bSize.z;

            if (vol > maxVolume) {
              maxVolume = vol;
              largestMesh = child;
            }
          });

          if (largestMesh) {
            const mats = Array.isArray(largestMesh.material) ? largestMesh.material : [largestMesh.material];
            mats.forEach((m) => gltfPaintMaterials.push(m));
          }
        }

        scene.add(carGroup);
        update3DCarPaint(activeBuild.hex);
        if (modelSourceBadge) modelSourceBadge.textContent = '3D GLTF MODEL • 360° ORBIT';
        if (modelLoaderOverlay) modelLoaderOverlay.classList.add('hidden');
      },
      (xhr) => {
        if (xhr.total && loaderProgress) {
          const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          loaderProgress.textContent = `${pct}%`;
        }
      },
      (error) => {
        console.warn('GLB failed to load, building procedural fallback:', error);
        carGroup = buildProceduralGT3RS(activeBuild.hex);
        scene.add(carGroup);
        if (modelSourceBadge) modelSourceBadge.textContent = 'WEBGL 3D CHASSIS • 360° ORBIT';
        if (modelLoaderOverlay) modelLoaderOverlay.classList.add('hidden');
      }
    );

    // OrbitControls (360° Drag + Zoom + Damping)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.72, 0);
    controls.minDistance = 2.4;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = autoSpin;
    controls.autoRotateSpeed = 1.6;

    controls.addEventListener('start', () => {
      autoSpin = false;
      controls.autoRotate = false;
      if (autoSpinBtn) autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';
    });

    window.addEventListener('resize', () => {
      if (!modal360.classList.contains('open')) return;
      const w = stage360Viewport.clientWidth;
      const h = stage360Viewport.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    function animateShowroom() {
      requestAnimationFrame(animateShowroom);
      if (!modal360.classList.contains('open')) return;

      controls.update();

      const azDeg = Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));
      if (yawReadout) yawReadout.textContent = `${azDeg}°`;
      if (angleSlider) angleSlider.value = azDeg;

      renderer.render(scene, camera);
    }
    animateShowroom();
  }

  function setCameraPreset(preset) {
    if (!camera || !controls) return;
    autoSpin = false;
    controls.autoRotate = false;
    if (autoSpinBtn) autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';

    const positions = {
      hero: [3.8, 1.85, 4.3],
      front: [0.0, 1.25, 5.2],
      side: [5.4, 1.25, 0.0],
      rear: [-2.6, 1.95, -4.4]
    };
    const pos = positions[preset] || positions.hero;
    camera.position.set(...pos);
    controls.target.set(0, 0.72, 0);
    controls.update();
  }

  function open360Modal() {
    if (!modal360) return;
    modal360.classList.add('open');
    modal360.setAttribute('aria-hidden', 'false');
    initThreeShowroom();
    const w = stage360Viewport.clientWidth;
    const h = stage360Viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    update3DCarPaint(activeBuild.hex);
  }

  function close360Modal() {
    if (!modal360) return;
    modal360.classList.remove('open');
    modal360.setAttribute('aria-hidden', 'true');
  }

  if (open360Btn) open360Btn.addEventListener('click', open360Modal);
  if (card360Trigger) card360Trigger.addEventListener('click', open360Modal);
  if (close360Btn) close360Btn.addEventListener('click', close360Modal);

  if (modal360) {
    modal360.addEventListener('click', (e) => {
      if (e.target === modal360) close360Modal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal360 && modal360.classList.contains('open')) {
      close360Modal();
    }
  });

  if (angleSlider) {
    angleSlider.addEventListener('input', (e) => {
      if (!camera || !controls) return;
      autoSpin = false;
      controls.autoRotate = false;
      if (autoSpinBtn) autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';

      const rad = THREE.MathUtils.degToRad(parseFloat(e.target.value));
      const radius = Math.hypot(camera.position.x, camera.position.z);
      camera.position.x = Math.sin(rad) * radius;
      camera.position.z = Math.cos(rad) * radius;
      controls.update();
    });
  }

  if (autoSpinBtn) {
    autoSpinBtn.addEventListener('click', () => {
      autoSpin = !autoSpin;
      if (controls) controls.autoRotate = autoSpin;
      autoSpinBtn.textContent = `AUTO-ORBIT: ${autoSpin ? 'ON' : 'OFF'}`;
    });
  }

  if (resetCamBtn) {
    resetCamBtn.addEventListener('click', () => {
      document.querySelectorAll('.cam-preset-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.cam === 'hero');
      });
      setCameraPreset('hero');
    });
  }

  document.querySelectorAll('.cam-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cam-preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setCameraPreset(btn.dataset.cam);
    });
  });

  /* ------------------------------------------------------------------------
     5. INTERACTIVE SVG AERO HOTSPOTS & STREAMLINE VECTOR CONTROLS
     ------------------------------------------------------------------------ */
  const aeroData = {
    wing: {
      stream: 's1',
      code: 'HOTSPOT 01',
      title: 'SWAN-NECK REAR WING & ACTIVE DRS',
      desc: 'Top-mounted swan-neck pylons leave the sensitive underside of the main wing undisturbed. At the press of the steering-wheel DRS button, the hydraulically actuated upper element flattens to slash drag on long straights—and snaps vertical under hard braking as an airbrake.',
      load200: '409 kg',
      load285: '860 kg'
    },
    sduct: {
      stream: 's2',
      code: 'HOTSPOT 02',
      title: 'SINGLE CENTRAL ANGLED RADIATOR & S\u2011DUCT',
      desc: 'Inspired by the Le Mans-winning 911 RSR, Porsche replaced the three-radiator setup with one massive central radiator. Hot air exits upward through twin bonnet nostrils while active front diffuser flaps adjust continuously in milliseconds.',
      load200: '185 kg (Front)',
      load285: '380 kg (Front)'
    },
    louvers: {
      stream: 's3',
      code: 'HOTSPOT 03',
      title: 'CARBON FENDER LOUVERS & DOOR BLADES',
      desc: 'Aggressive front wheel-arch louvers evacuate high-pressure turbulent air generated by the rotating 20-inch front wheels, while sculpted side blades channel clean laminar flow toward the rear intakes.',
      load200: '+22% Efficiency',
      load285: '3x GT3 Aero'
    }
  };

  const streamToAeroKey = {
    s1: 'wing',
    s2: 'sduct',
    s3: 'louvers'
  };

  const aeroPins = document.querySelectorAll('.aero-pin');
  const aeroTitle = document.getElementById('aeroTitle');
  const aeroCode = document.getElementById('aeroCode');
  const aeroDescription = document.getElementById('aeroDescription');
  const aeroDownforceVal = document.getElementById('aeroDownforceVal');
  const aeroTotalVal = document.getElementById('aeroTotalVal');

  function updateAeroTelemetry(key) {
    const info = aeroData[key];
    if (!info) return;

    aeroPins.forEach((p) => {
      p.classList.toggle('active', p.dataset.aero === key);
    });

    if (aeroCode) aeroCode.textContent = info.code;
    if (aeroTitle) aeroTitle.textContent = info.title;
    if (aeroDescription) aeroDescription.textContent = info.desc;
    if (aeroDownforceVal) aeroDownforceVal.textContent = info.load200;
    if (aeroTotalVal) aeroTotalVal.textContent = info.load285;
  }

  const toggleAirflowBtn = document.getElementById('toggleAirflowBtn');
  const airflowLines = document.getElementById('airflowLines');
  const streamlineBtns = document.querySelectorAll('#streamlineControls .stream-btn');
  const streamlines = document.querySelectorAll('.streamline');
  let airflowVisible = true;
  let activeStream = null;

  function highlightStreamline(targetStream, forceSelect = false) {
    // Clicking the already-active button resets back to all 3 streamlines equal
    activeStream = !forceSelect && activeStream === targetStream ? null : targetStream;

    streamlineBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.stream === activeStream);
    });

    if (airflowLines) {
      airflowLines.classList.toggle('has-focus', Boolean(activeStream));
    }

    streamlines.forEach((line) => {
      line.classList.toggle('highlighted', Boolean(activeStream) && line.classList.contains(activeStream));
    });

    // Sync the telemetry card (Title, Hotspot Badge, Description & both Downforce boxes)
    const aeroKey = activeStream ? streamToAeroKey[activeStream] : 'wing';
    updateAeroTelemetry(aeroKey);
  }

  aeroPins.forEach((pin) => {
    const handlePinSelect = () => {
      const key = pin.dataset.aero;
      const info = aeroData[key];
      if (!info) return;

      if (!airflowVisible && airflowLines && toggleAirflowBtn) {
        airflowVisible = true;
        airflowLines.classList.remove('hidden');
        toggleAirflowBtn.classList.add('active');
        toggleAirflowBtn.textContent = 'AIRFLOW VECTORS: ON';
      }

      highlightStreamline(info.stream, true);
    };

    pin.addEventListener('click', handlePinSelect);
    pin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePinSelect();
      }
    });
  });

  streamlineBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Automatically turn airflow vectors ON if user clicks a vector button while toggled off
      if (!airflowVisible && airflowLines && toggleAirflowBtn) {
        airflowVisible = true;
        airflowLines.classList.remove('hidden');
        toggleAirflowBtn.classList.add('active');
        toggleAirflowBtn.textContent = 'AIRFLOW VECTORS: ON';
      }
      highlightStreamline(btn.dataset.stream);
    });
  });

  if (toggleAirflowBtn && airflowLines) {
    toggleAirflowBtn.addEventListener('click', () => {
      airflowVisible = !airflowVisible;
      airflowLines.classList.toggle('hidden', !airflowVisible);
      toggleAirflowBtn.classList.toggle('active', airflowVisible);
      toggleAirflowBtn.textContent = `AIRFLOW VECTORS: ${airflowVisible ? 'ON' : 'OFF'}`;

      // Reset focused streamline when vectors are toggled off
      if (!airflowVisible && activeStream) {
        highlightStreamline(activeStream);
      }
    });
  }

  /* ------------------------------------------------------------------------
     6. WEB AUDIO API: AMBIENT THEME MUSIC + 9,000 RPM FLAT-6 EXHAUST REV
        WITH ON-DEMAND CANVAS WAVEFORM VISUALIZER
     ------------------------------------------------------------------------ */
  let audioCtx = null;
  let themePlaying = false;
  let themeNodes = [];
  let isRevving = false;
  let waveRaf = null;

  const themeAudioBtn = document.getElementById('themeAudioBtn');
  const themeAudioLabel = document.getElementById('themeAudioLabel');
  const heroRevBtn = document.getElementById('heroRevBtn');
  const studioRevBtn = document.getElementById('studioRevBtn');

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function makeDistortionCurve(amount = 40) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function toggleThemeMusic() {
    ensureAudioContext();
    if (!themePlaying) {
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 1.2);
      masterGain.connect(audioCtx.destination);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, audioCtx.currentTime);
      filter.connect(masterGain);

      const freqs = [55, 82.41, 110, 164.81];
      const oscs = freqs.map((f, idx) => {
        const osc = audioCtx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);
        osc.detune.setValueAtTime((idx - 1.5) * 6, audioCtx.currentTime);
        osc.connect(filter);
        osc.start();
        return osc;
      });

      themeNodes = [masterGain, filter, ...oscs];
      themePlaying = true;
      if (themeAudioBtn) {
        themeAudioBtn.classList.add('playing');
        themeAudioBtn.setAttribute('aria-pressed', 'true');
      }
      if (themeAudioLabel) themeAudioLabel.textContent = 'THEME: ON';
    } else {
      themeNodes.forEach((node) => {
        if (typeof node.stop === 'function') {
          try { node.stop(); } catch (e) {}
        }
        if (typeof node.disconnect === 'function') {
          node.disconnect();
        }
      });
      themeNodes = [];
      themePlaying = false;
      if (themeAudioBtn) {
        themeAudioBtn.classList.remove('playing');
        themeAudioBtn.setAttribute('aria-pressed', 'false');
      }
      if (themeAudioLabel) themeAudioLabel.textContent = 'THEME: OFF';
    }
  }

  if (themeAudioBtn) themeAudioBtn.addEventListener('click', toggleThemeMusic);

  function renderWaveform() {
    if (!exhaustCanvas || !canvasCtx) return;
    if (!isRevving) {
      drawIdleBaseline();
      waveRaf = null;
      return;
    }

    const w = exhaustCanvas.width;
    const h = exhaustCanvas.height;
    canvasCtx.clearRect(0, 0, w, h);

    canvasCtx.strokeStyle = activeBuild.hex || '#39FF14';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();

    wavePhase += 0.45;
    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.16 + wavePhase) * 13 * Math.sin((x / w) * Math.PI);
      if (x === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
    waveRaf = requestAnimationFrame(renderWaveform);
  }

  drawIdleBaseline();

  function triggerFlatSixRev() {
    if (isRevving) return;
    ensureAudioContext();
    isRevving = true;
    if (!waveRaf) {
      waveRaf = requestAnimationFrame(renderWaveform);
    }

    const now = audioCtx.currentTime;
    const duration = 2.4;

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.22, now + 0.18);
    masterGain.gain.exponentialRampToValueAtTime(0.26, now + 1.15);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const shaper = audioCtx.createWaveShaper();
    shaper.curve = makeDistortionCurve(35);
    shaper.oversample = '2x';

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(220, now);
    bandpass.frequency.exponentialRampToValueAtTime(1050, now + 1.05);
    bandpass.frequency.exponentialRampToValueAtTime(260, now + duration);
    bandpass.Q.setValueAtTime(1.5, now);

    shaper.connect(bandpass);
    bandpass.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    const harmonics = [
      { mult: 0.5, type: 'triangle' },
      { mult: 1, type: 'sawtooth' },
      { mult: 1.5, type: 'sawtooth' },
      { mult: 3, type: 'sawtooth' }
    ];

    harmonics.forEach(({ mult, type }) => {
      const osc = audioCtx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(55 * mult, now);
      osc.frequency.exponentialRampToValueAtTime(225 * mult, now + 1.05);
      osc.frequency.exponentialRampToValueAtTime(75 * mult, now + 1.55);
      osc.frequency.exponentialRampToValueAtTime(165 * mult, now + 1.85);
      osc.frequency.exponentialRampToValueAtTime(55 * mult, now + duration);
      osc.connect(shaper);
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => {
      isRevving = false;
    }, duration * 1000);
  }

  if (heroRevBtn) heroRevBtn.addEventListener('click', triggerFlatSixRev);
  if (studioRevBtn) studioRevBtn.addEventListener('click', triggerFlatSixRev);

  /* ------------------------------------------------------------------------
     7. SPECIFICATIONS TABS, WEISSACH PACKAGE TOGGLE & SCROLL COUNTERS
     ------------------------------------------------------------------------ */
  const specTabs = document.querySelectorAll('.spec-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  specTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      specTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  const weissachToggleBtn = document.getElementById('weissachToggleBtn');
  const weissachLabel = document.getElementById('weissachLabel');
  const kerbWeightCounter = document.getElementById('kerbWeightCounter');
  const kerbWeightLabel = document.getElementById('kerbWeightLabel');
  let weissachEnabled = false;

  if (weissachToggleBtn) {
    weissachToggleBtn.addEventListener('click', () => {
      weissachEnabled = !weissachEnabled;
      const targetWeight = weissachEnabled ? '1435' : '1450';
      weissachToggleBtn.classList.toggle('active', weissachEnabled);
      weissachToggleBtn.setAttribute('aria-pressed', String(weissachEnabled));
      if (weissachLabel) {
        weissachLabel.textContent = weissachEnabled
          ? 'WEISSACH PACKAGE: ON (1,435 KG)'
          : 'WEISSACH PACKAGE: OFF (1,450 KG)';
      }
      if (kerbWeightCounter) {
        kerbWeightCounter.dataset.target = targetWeight;
        kerbWeightCounter.textContent = targetWeight;
      }
      if (kerbWeightLabel) {
        kerbWeightLabel.textContent = weissachEnabled
          ? 'DIN KERB WEIGHT (WEISSACH)'
          : 'DIN KERB WEIGHT (STANDARD)';
      }
    });
  }

  let countersStarted = false;
  const countersBanner = document.getElementById('countersBanner');
  const countEls = document.querySelectorAll('.count-up');

  function runCounters() {
    if (countersStarted) return;
    countersStarted = true;

    countEls.forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const duration = 1400;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        el.textContent = current.toFixed(decimals);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target === countersBanner) {
            runCounters();
          }
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal-up').forEach((el) => observer.observe(el));
  if (countersBanner) observer.observe(countersBanner);

  /* ------------------------------------------------------------------------
     8. FOOTER STAR RATING & PERSISTENT USER REVIEWS
     ------------------------------------------------------------------------ */
  const REVIEWS_KEY = 'porsche_gt3rs_reviews_v1';
  const starBtns = document.querySelectorAll('.star-btn');
  const ratingLabel = document.getElementById('ratingText');
  const reviewForm = document.getElementById('reviewForm');
  const reviewsFeed = document.getElementById('reviewsFeed');

  const ratingDescriptions = {
    1: '1 / 5 — Needs Track Tuning',
    2: '2 / 5 — Street Spec',
    3: '3 / 5 — Carrera Pace',
    4: '4 / 5 — GT3 Precision',
    5: '5 / 5 — Weissach Track Perfection'
  };

  let selectedStars = 5;

  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedStars = parseInt(btn.dataset.star, 10);
      starBtns.forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.star, 10) <= selectedStars);
      });
      if (ratingLabel) ratingLabel.textContent = ratingDescriptions[selectedStars];
    });
  });

  function renderReviews() {
    if (!reviewsFeed) return;
    let reviews = [
      {
        name: 'Weissach Test Driver',
        stars: 5,
        text: 'The active DRS aero overlay and 9,000 RPM exhaust synthesizer capture the pure motorsport soul of the 911 GT3 RS.'
      }
    ];
    try {
      const stored = JSON.parse(localStorage.getItem(REVIEWS_KEY));
      if (Array.isArray(stored) && stored.length) {
        reviews = stored;
      }
    } catch (e) {}

    reviewsFeed.innerHTML = '';
    reviews.forEach((rev) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const starString = '★'.repeat(rev.stars) + '☆'.repeat(5 - rev.stars);
      item.innerHTML = `
        <div class="review-item-head">
          <strong>${escapeHTML(rev.name)}</strong>
          <span class="review-stars">${starString}</span>
        </div>
        <p>${escapeHTML(rev.text)}</p>
      `;
      reviewsFeed.appendChild(item);
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('reviewerName');
      const msgInput = document.getElementById('reviewMessage');

      let existing = [];
      try {
        existing = JSON.parse(localStorage.getItem(REVIEWS_KEY)) || [];
      } catch (err) {}

      existing.unshift({
        name: nameInput.value.trim(),
        stars: selectedStars,
        text: msgInput.value.trim()
      });

      try {
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(existing.slice(0, 10)));
      } catch (err) {}

      nameInput.value = '';
      msgInput.value = '';
      renderReviews();
    });
  }

  renderReviews();
});
