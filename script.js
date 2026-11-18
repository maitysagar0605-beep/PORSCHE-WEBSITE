/* ==========================================================================
   PORSCHE 911 GT3 RS — INTERACTIVE TELEMETRY, 3D ORBIT, AUDIO & STATE ENGINE
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
    wheel: '20"/21" SATIN BLACK FORGED MAGNESIUM'
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
  const saveStatus = document.getElementById('saveStatus');

  function applyBuildToDOM(build) {
    rootEl.style.setProperty('--accent-color', build.hex);
    rootEl.style.setProperty('--accent-glow', build.glow);

    heroCarImg.src = build.img;
    studioCarImg.src = build.img;
    modal360Img.src = build.img;

    activePaintBadge.textContent = build.color.toUpperCase();
    studioColorName.textContent = `${build.color.toUpperCase()} // WEISSACH SPEC`;
    studioWheelName.textContent = build.wheel;

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
      applyBuildToDOM(activeBuild);
    });
  });

  /* ------------------------------------------------------------------------
     2. HERO 3D PERSPECTIVE TILT CARD
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
     3. INTERACTIVE 360° 3D INSPECTION MODAL
     ------------------------------------------------------------------------ */
  const modal360 = document.getElementById('modal360');
  const open360Btn = document.getElementById('open360Btn');
  const card360Trigger = document.getElementById('card360Trigger');
  const close360Btn = document.getElementById('close360Btn');
  const stage360Viewport = document.getElementById('stage360Viewport');
  const car360Object = document.getElementById('car360Object');
  const angleSlider = document.getElementById('angleSlider');
  const yawReadout = document.getElementById('yawReadout');
  const autoSpinBtn = document.getElementById('autoSpinBtn');

  let currentYaw = 0;
  let isDragging360 = false;
  let startX360 = 0;
  let autoSpin = true;
  let spinRaf = null;

  function setYawAngle(deg) {
    currentYaw = ((deg + 180) % 360 + 360) % 360 - 180;
    const rounded = Math.round(currentYaw);
    car360Object.style.transform = `rotateY(${currentYaw}deg) rotateX(4deg)`;
    angleSlider.value = rounded;
    yawReadout.textContent = `${rounded}°`;
  }

  function animate360Loop() {
    if (autoSpin && modal360.classList.contains('open') && !isDragging360) {
      setYawAngle(currentYaw + 0.65);
    }
    spinRaf = requestAnimationFrame(animate360Loop);
  }

  function open360Modal() {
    modal360.classList.add('open');
    modal360.setAttribute('aria-hidden', 'false');
    if (!spinRaf) animate360Loop();
  }

  function close360Modal() {
    modal360.classList.remove('open');
    modal360.setAttribute('aria-hidden', 'true');
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
    setYawAngle(parseFloat(e.target.value));
  });

  autoSpinBtn.addEventListener('click', () => {
    autoSpin = !autoSpin;
    autoSpinBtn.textContent = `AUTO-ORBIT: ${autoSpin ? 'ON' : 'OFF'}`;
  });

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
    setYawAngle(currentYaw + deltaX * 0.6);
  });

  window.addEventListener('pointerup', () => {
    isDragging360 = false;
  });

  /* ------------------------------------------------------------------------
     4. INTERACTIVE SVG AERO HOTSPOT OVERLAY
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

  aeroPins.forEach((pin) => {
    pin.addEventListener('click', () => {
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
     5. WEB AUDIO API: AMBIENT THEME MUSIC + 9,000 RPM FLAT-6 EXHAUST REV
        WITH LIVE CANVAS WAVEFORM VISUALIZER
     ------------------------------------------------------------------------ */
  let audioCtx = null;
  let themePlaying = false;
  let themeNodes = [];
  let isRevving = false;

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

  // Ambient Motorsport Synth Pad (User Toggleable)
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

      const freqs = [55, 82.41, 110, 164.81]; // Deep D/A atmospheric chord
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

  // Synthesized 4.0L Naturally Aspirated Flat-6 9,000 RPM Exhaust Rev
  function triggerFlatSixRev() {
    if (isRevving) return;
    ensureAudioContext();
    isRevving = true;

    const now = audioCtx.currentTime;
    const duration = 2.4;

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.24, now + 0.18);
    masterGain.gain.exponentialRampToValueAtTime(0.28, now + 1.15);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(220, now);
    bandpass.frequency.exponentialRampToValueAtTime(980, now + 1.05);
    bandpass.frequency.exponentialRampToValueAtTime(260, now + duration);
    bandpass.Q.setValueAtTime(1.6, now);

    bandpass.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // 3 firing harmonics per revolution (6-cylinder boxer firing order cadence)
    const harmonics = [1, 1.5, 3];
    harmonics.forEach((mult) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55 * mult, now); // Idle ~1,100 RPM
      osc.frequency.exponentialRampToValueAtTime(225 * mult, now + 1.05); // Scream to 9,000 RPM
      osc.frequency.exponentialRampToValueAtTime(75 * mult, now + 1.55); // Lift-off
      osc.frequency.exponentialRampToValueAtTime(165 * mult, now + 1.85); // PDK downshift blip
      osc.frequency.exponentialRampToValueAtTime(55 * mult, now + duration);
      osc.connect(bandpass);
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => {
      isRevving = false;
    }, duration * 1000);
  }

  heroRevBtn.addEventListener('click', triggerFlatSixRev);
  studioRevBtn.addEventListener('click', triggerFlatSixRev);

  // Canvas Waveform Visualizer Loop
  let wavePhase = 0;
  function renderWaveform() {
    const w = exhaustCanvas.width;
    const h = exhaustCanvas.height;
    canvasCtx.clearRect(0, 0, w, h);

    const accent = getComputedStyle(rootEl).getPropertyValue('--accent-color').trim() || '#39FF14';
    canvasCtx.strokeStyle = accent;
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();

    const amp = isRevving ? 13 : 2.5;
    const freq = isRevving ? 0.16 : 0.05;
    wavePhase += isRevving ? 0.45 : 0.08;

    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * freq + wavePhase) * amp * Math.sin((x / w) * Math.PI);
      if (x === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
    requestAnimationFrame(renderWaveform);
  }
  renderWaveform();

  /* ------------------------------------------------------------------------
     6. SPECIFICATIONS TABS & INTERSECTION OBSERVER SCROLL COUNTERS
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
     7. FOOTER STAR RATING & PERSISTENT USER REVIEWS
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