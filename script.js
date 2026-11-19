/* ==========================================================================
   PORSCHE 911 GT3 RS — INTERACTIVE TELEMETRY, 3D INSPECTOR, AUDIO & STATE ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------------
     1. PERSISTENT CONFIGURATOR STATE (localStorage + CSS Custom Properties)
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = 'porsche_992_gt3rs_build_v1';

  const defaultBuild = {
    color: 'Acid Green',
    hex: '#39FF14',
    glow: 'rgba(57, 255, 20, 0.35)',
    img: 'assests/images/Acid Green Porsche 911 GT3 Wallpaper, Sleek Sports Car Design, Speed and Power Aesthetic.jfif',
    wheel: '20"/21" SATIN BLACK FORGED MAGNESIUM',
    wheelColor: '#2B3036',
    wheelTag: 'SATIN BLACK'
  };

  let activeBuild = { ...defaultBuild };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.color && saved.img) {
      activeBuild = { ...defaultBuild, ...saved };
    }
  } catch (e) {
    console.warn('localStorage unavailable, using default build.');
  }

  const rootEl = document.documentElement;
  const heroCarImg = document.getElementById('heroCarImg');
  const studioCarImg = document.getElementById('studioCarImg');
  const modal360Img = document.getElementById('modal360Img');
  const activePaintBadge = document.getElementById('activePaintBadge');
  const studioColorName = document.getElementById('studioColorName');
  const studioWheelName = document.getElementById('studioWheelName');
  const wheelFinishBadge = document.getElementById('wheelFinishBadge');
  const saveStatus = document.getElementById('saveStatus');

  function applyBuildToDOM(build) {
    rootEl.style.setProperty('--accent-color', build.hex);
    rootEl.style.setProperty('--accent-glow', build.glow);
    rootEl.style.setProperty('--wheel-accent', build.wheelColor || '#2B3036');

    heroCarImg.src = build.img;
    studioCarImg.src = build.img;
    modal360Img.src = build.img;

    activePaintBadge.textContent = build.color.toUpperCase();
    studioColorName.textContent = `${build.color.toUpperCase()} // WEISSACH SPEC`;
    studioWheelName.textContent = build.wheel;
    if (wheelFinishBadge) {
      wheelFinishBadge.innerHTML = `<i class="wheel-dot-live"></i> ${build.wheelTag || 'MAGNESIUM SPEC'}`;
    }

    document.querySelectorAll('.swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === build.color);
    });

    document.querySelectorAll('.wheel-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.wheel === build.wheel);
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
      saveStatus.textContent = 'SAVED TO LOCALSTORAGE ✓';
      setTimeout(() => {
        saveStatus.textContent = 'SYNCED TO LOCALSTORAGE';
      }, 1500);
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
      activeBuild.img = btn.dataset.img;
      applyBuildToDOM(activeBuild);
    });
  });

  document.querySelectorAll('.wheel-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeBuild.wheel = btn.dataset.wheel;
      activeBuild.wheelColor = btn.dataset.wheelColor || '#2B3036';
      activeBuild.wheelTag = btn.dataset.wheelTag || 'MAGNESIUM SPEC';
      applyBuildToDOM(activeBuild);
    });
  });

  /* ------------------------------------------------------------------------
     2. MOBILE MENU & NAVIGATION SCROLL-SPY
     ------------------------------------------------------------------------ */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const primaryNav = document.getElementById('primaryNav');
  const navLinks = document.querySelectorAll('.nav-link');

  if (mobileMenuBtn && primaryNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        primaryNav.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const trackedSections = document.querySelectorAll('main section[id]');
  const navSpyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.dataset.section === id);
          });
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px' }
  );

  trackedSections.forEach((sec) => navSpyObserver.observe(sec));

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
     4. INTERACTIVE 360° STUDIO INSPECTOR MODAL (MULTI-FRAME + ZOOM + KEYS)
     ------------------------------------------------------------------------ */
  const modal360 = document.getElementById('modal360');
  const open360Btn = document.getElementById('open360Btn');
  const card360Trigger = document.getElementById('card360Trigger');
  const close360Btn = document.getElementById('close360Btn');
  const stage360Viewport = document.getElementById('stage360Viewport');
  const car360Object = document.getElementById('car360Object');
  const angleSlider = document.getElementById('angleSlider');
  const yawReadout = document.getElementById('yawReadout');
  const frameLabelReadout = document.getElementById('frameLabelReadout');
  const autoSpinBtn = document.getElementById('autoSpinBtn');
  const zoomInspectBtn = document.getElementById('zoomInspectBtn');

  const studioAngleFrames = [
    { label: 'ACTIVE BUILD LIVERY', getImg: () => activeBuild.img },
    { label: 'SHARK BLUE AERO PROFILE', getImg: () => 'assests/images/CAR_IMG_BLUE.jfif' },
    { label: 'LAVA ORANGE TRACK SPEC', getImg: () => 'assests/images/CAR_IMG_ORANGE.jfif' },
    { label: 'RACING YELLOW WEISSACH', getImg: () => 'assests/images/CAR_IMG_YELLOW.jfif' }
  ];

  let currentAngle = 0; // 0 to 359
  let isDragging360 = false;
  let startX360 = 0;
  let autoSpin = true;
  let zoomLevel = 1;
  let spinRaf = null;
  let lastFrameIdx = -1;

  function updateInspectorView(deg) {
    currentAngle = ((deg % 360) + 360) % 360;
    const rounded = Math.round(currentAngle);

    // Subtle bounded 3D perspective tilt (-18deg to +18deg) so the image never flips backward
    const boundedTiltY = Math.sin((currentAngle * Math.PI) / 180) * 18;
    const boundedTiltX = Math.cos((currentAngle * Math.PI) / 180) * 4;
    car360Object.style.transform = `scale(${zoomLevel}) rotateY(${boundedTiltY.toFixed(2)}deg) rotateX(${boundedTiltX.toFixed(2)}deg)`;

    // Scrub across the 4 gallery angles smoothly every 90 degrees
    const frameIdx = Math.floor(currentAngle / 90) % studioAngleFrames.length;
    if (frameIdx !== lastFrameIdx) {
      lastFrameIdx = frameIdx;
      modal360Img.src = studioAngleFrames[frameIdx].getImg();
      if (frameLabelReadout) {
        frameLabelReadout.textContent = studioAngleFrames[frameIdx].label;
      }
    }

    angleSlider.value = rounded;
    yawReadout.textContent = `${rounded}°`;
  }

  function animate360Loop() {
    if (!modal360.classList.contains('open')) {
      spinRaf = null;
      return;
    }
    if (autoSpin && !isDragging360) {
      updateInspectorView(currentAngle + 0.45);
    }
    spinRaf = requestAnimationFrame(animate360Loop);
  }

  function open360Modal() {
    lastFrameIdx = -1;
    modal360.classList.add('open');
    modal360.setAttribute('aria-hidden', 'false');
    updateInspectorView(currentAngle);
    if (!spinRaf) {
      spinRaf = requestAnimationFrame(animate360Loop);
    }
  }

  function close360Modal() {
    modal360.classList.remove('open');
    modal360.setAttribute('aria-hidden', 'true');
    if (spinRaf) {
      cancelAnimationFrame(spinRaf);
      spinRaf = null;
    }
  }

  open360Btn.addEventListener('click', open360Modal);
  card360Trigger.addEventListener('click', open360Modal);
  close360Btn.addEventListener('click', close360Modal);

  modal360.addEventListener('click', (e) => {
    if (e.target === modal360) close360Modal();
  });

  angleSlider.addEventListener('input', (e) => {
    autoSpin = false;
    autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';
    updateInspectorView(parseFloat(e.target.value));
  });

  autoSpinBtn.addEventListener('click', () => {
    autoSpin = !autoSpin;
    autoSpinBtn.textContent = `AUTO-ORBIT: ${autoSpin ? 'ON' : 'OFF'}`;
  });

  if (zoomInspectBtn) {
    zoomInspectBtn.addEventListener('click', () => {
      zoomLevel = zoomLevel === 1 ? 1.32 : 1;
      zoomInspectBtn.textContent = `ZOOM: ${zoomLevel.toFixed(1)}x`;
      updateInspectorView(currentAngle);
    });
  }

  stage360Viewport.addEventListener('pointerdown', (e) => {
    isDragging360 = true;
    autoSpin = false;
    autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';
    startX360 = e.clientX;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging360) return;
    const deltaX = e.clientX - startX360;
    startX360 = e.clientX;
    updateInspectorView(currentAngle + deltaX * 0.65);
  });

  window.addEventListener('pointerup', () => {
    isDragging360 = false;
  });

  window.addEventListener('keydown', (e) => {
    if (!modal360.classList.contains('open')) return;
    if (e.key === 'Escape') {
      close360Modal();
    } else if (e.key === 'ArrowRight') {
      autoSpin = false;
      autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';
      updateInspectorView(currentAngle + 15);
    } else if (e.key === 'ArrowLeft') {
      autoSpin = false;
      autoSpinBtn.textContent = 'AUTO-ORBIT: OFF';
      updateInspectorView(currentAngle - 15);
    }
  });

  /* ------------------------------------------------------------------------
     5. INTERACTIVE SVG AERO HOTSPOT OVERLAY
     ------------------------------------------------------------------------ */
  const aeroData = {
    wing: {
      code: 'HOTSPOT 01',
      title: 'SWAN-NECK REAR WING & ACTIVE DRS',
      desc: 'Top-mounted swan-neck pylons leave the sensitive underside of the main wing undisturbed. At the press of the steering-wheel DRS button, the hydraulically actuated upper element flattens to slash drag on long straights—and snaps vertical under hard braking as an airbrake.',
      load200: '409 kg',
      load285: '860 kg'
    },
    sduct: {
      code: 'HOTSPOT 02',
      title: 'SINGLE CENTRAL ANGLED RADIATOR & S-DUCT',
      desc: 'Inspired by the Le Mans-winning 911 RSR, Porsche replaced the three-radiator setup with one massive central radiator. Hot air exits upward through twin bonnet nostrils while active front diffuser flaps adjust continuously in milliseconds.',
      load200: '185 kg (Front)',
      load285: '380 kg (Front)'
    },
    louvers: {
      code: 'HOTSPOT 03',
      title: 'CARBON FENDER LOUVERS & DOOR BLADES',
      desc: 'Aggressive front wheel-arch louvers evacuate high-pressure turbulent air generated by the rotating 20-inch front wheels, while sculpted side blades channel clean laminar flow toward the rear intakes.',
      load200: '+22% Efficiency',
      load285: '3x GT3 Aero'
    }
  };

  const aeroPins = document.querySelectorAll('.aero-pin');
  const aeroTitle = document.getElementById('aeroTitle');
  const aeroCode = document.getElementById('aeroCode');
  const aeroDescription = document.getElementById('aeroDescription');
  const aeroDownforceVal = document.getElementById('aeroDownforceVal');
  const aeroTotalVal = document.getElementById('aeroTotalVal');

  function activateAeroPin(pin) {
    const key = pin.dataset.aero;
    const info = aeroData[key];
    if (!info) return;

    aeroPins.forEach((p) => p.classList.remove('active'));
    pin.classList.add('active');

    aeroCode.textContent = info.code;
    aeroTitle.textContent = info.title;
    aeroDescription.textContent = info.desc;
    aeroDownforceVal.textContent = info.load200;
    aeroTotalVal.textContent = info.load285;
  }

  aeroPins.forEach((pin) => {
    pin.addEventListener('click', () => activateAeroPin(pin));
    pin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateAeroPin(pin);
      }
    });
  });

  const toggleAirflowBtn = document.getElementById('toggleAirflowBtn');
  const airflowLines = document.getElementById('airflowLines');
  let airflowVisible = true;

  toggleAirflowBtn.addEventListener('click', () => {
    airflowVisible = !airflowVisible;
    airflowLines.classList.toggle('hidden', !airflowVisible);
    toggleAirflowBtn.classList.toggle('active', airflowVisible);
    toggleAirflowBtn.textContent = `AIRFLOW VECTORS: ${airflowVisible ? 'ON' : 'OFF'}`;
  });

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
  const exhaustCanvas = document.getElementById('exhaustCanvas');
  const canvasCtx = exhaustCanvas.getContext('2d');

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
      themeAudioBtn.classList.add('playing');
      themeAudioBtn.setAttribute('aria-pressed', 'true');
      themeAudioLabel.textContent = 'THEME: ON';
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
      themeAudioBtn.classList.remove('playing');
      themeAudioBtn.setAttribute('aria-pressed', 'false');
      themeAudioLabel.textContent = 'THEME: OFF';
    }
  }

  themeAudioBtn.addEventListener('click', toggleThemeMusic);

  // Canvas Waveform Visualizer (Active during rev, static idle baseline otherwise)
  let wavePhase = 0;
  function drawIdleBaseline() {
    const w = exhaustCanvas.width;
    const h = exhaustCanvas.height;
    canvasCtx.clearRect(0, 0, w, h);
    const accent = getComputedStyle(rootEl).getPropertyValue('--accent-color').trim() || '#39FF14';
    canvasCtx.strokeStyle = accent;
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.05) * 2.2 * Math.sin((x / w) * Math.PI);
      if (x === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
  }

  function renderWaveform() {
    if (!isRevving) {
      drawIdleBaseline();
      waveRaf = null;
      return;
    }

    const w = exhaustCanvas.width;
    const h = exhaustCanvas.height;
    canvasCtx.clearRect(0, 0, w, h);

    const accent = getComputedStyle(rootEl).getPropertyValue('--accent-color').trim() || '#39FF14';
    canvasCtx.strokeStyle = accent;
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

    // Firing harmonics + sub-bass boxer rumble
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

  heroRevBtn.addEventListener('click', triggerFlatSixRev);
  studioRevBtn.addEventListener('click', triggerFlatSixRev);

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
      document.getElementById(`tab-${target}`).classList.add('active');
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
      weissachLabel.textContent = weissachEnabled
        ? 'WEISSACH PACKAGE: ON (1,435 KG)'
        : 'WEISSACH PACKAGE: OFF (1,450 KG)';
      kerbWeightCounter.dataset.target = targetWeight;
      kerbWeightCounter.textContent = targetWeight;
      kerbWeightLabel.textContent = weissachEnabled
        ? 'DIN KERB WEIGHT (WEISSACH)'
        : 'DIN KERB WEIGHT (STANDARD)';
    });
  }

  // Animated Counters on Scroll
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
      ratingLabel.textContent = ratingDescriptions[selectedStars];
    });
  });

  function renderReviews() {
    let reviews = [
      {
        name: 'Weissach Test Driver',
        stars: 5,
        text: 'The active DRS aero overlay and 9,000 RPM exhaust synthesizer capture the pure motorsport soul of the 992 GT3 RS.'
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

  renderReviews();
});