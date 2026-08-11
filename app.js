/* ==========================================================================
   Nine Days in Costa Rica — behaviour
   --------------------------------------------------------------------------
   REAL PHOTOS
   `scripts/process_media.py` groups the camera originals by capture date,
   writes optimized media and cropped carousel thumbnails to assets/photos/, and generates
   assets/photos/photos.js. Everything else (reel, counter, dots, lightbox)
   picks them up automatically. Until that manifest exists, a day shows the
   painted placeholder cards using the captions in PLANNED.
   ========================================================================== */

const PHOTOS = window.TRIP_PHOTOS || { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };

/* What we expect to come back with — these caption the placeholders. */
const PLANNED = {
  1: [
    ['Wheels down in San José', 'Juan Santamaría'],
    ['Loading up the car', 'Alajuela'],
    ['The climb into the clouds', 'Ruta 141'],
    ['Hedges shaped like archways', 'Zarcero'],
    ['First dinner in the highlands', 'Zarcero']
  ],
  2: [
    ['Roadside fruit stand', 'Ruta 35'],
    ['First sight of the volcano', 'La Fortuna'],
    ['Checking in', 'Tabacón'],
    ['Hot springs under the canopy', 'Tabacón'],
    ['Dinner with the volcano out', 'Arenal']
  ],
  3: [
    ['The first hanging bridge', 'Místico'],
    ['Looking down into the green', 'Místico'],
    ['Something moving in the leaves', 'Místico'],
    ['Waterfall on the loop trail', 'Místico'],
    ['Night hike: red-eyed tree frog', 'Arenal']
  ],
  4: [
    ['Harnessed up', 'Arenal'],
    ['Over the edge', 'The waterfall'],
    ['Soaked, and grinning', 'The waterfall'],
    ['Cacao pods, just opened', 'La Fortuna'],
    ['Grinding our own chocolate', 'La Fortuna']
  ],
  5: [
    ['A slow morning', 'Arenal'],
    ['La Fortuna waterfall', 'La Fortuna'],
    ['The volcano, finally clear', 'Arenal'],
    ['Back in the water', 'Tabacón']
  ],
  6: [
    ['Six hours of green', 'Ruta 34'],
    ['Lunch stop on the coast road', 'Costanera Sur'],
    ['The last climb to the ridge', 'Uvita'],
    ['Infinity pool, first look', 'Vista Celestial'],
    ['Sunset over the Pacific', 'Uvita']
  ],
  7: [
    ['Boat out of Uvita', 'Bahía Ballena'],
    ['Landing at San Pedrillo', 'Corcovado'],
    ['Into the park', 'Corcovado'],
    ['Scarlet macaws overhead', 'Corcovado'],
    ['Muddy boots, happy faces', 'San Pedrillo']
  ],
  8: [
    ['Out to Caño Island', 'Pacific'],
    ['Masks on', 'Isla del Caño'],
    ['Reef, straight down', 'Isla del Caño'],
    ['Dolphins on the way back', 'Pacific'],
    ['Last night on the ridge', 'Uvita']
  ],
  9: [
    ['Early start, empty road', 'Uvita'],
    ['Over the mountains', 'Cerro de la Muerte'],
    ['Straight through Cartago', 'Cartago'],
    ['Up to the crater rim', 'Irazú'],
    ['Last look before the airport', 'San José']
  ]
};

/* Each day paints its placeholders from its own pots. */
const DAY_PAINT = {
  1: { sky: ['#f6c85a', '#e79a1f'], sun: '#fff2cf', far: '#a8712a', mid: '#5f6b2c', near: '#33461f', ink: '#2c1705', band: '#e79a1f' },
  2: { sky: ['#2b7d59', '#0f4b34'], sun: '#f0a81c', far: '#1c6544', mid: '#14523a', near: '#0a3524', ink: '#f6ecd6', band: '#0f4b34' },
  3: { sky: ['#cfe7db', '#7fae95'], sun: '#ffffff', far: '#5f9a7d', mid: '#3d7a60', near: '#1f5541', ink: '#113526', band: '#bcdcc6' },
  4: { sky: ['#f0a81c', '#c2312a'], sun: '#fff0d9', far: '#8f2018', mid: '#5c1a16', near: '#2f1210', ink: '#fff0d9', band: '#c2312a' },
  5: { sky: ['#f2e2b4', '#d8c288'], sun: '#fffaf0', far: '#b0a068', mid: '#7d7a48', near: '#4b5029', ink: '#2c2a1a', band: '#ecdfc0' },
  6: { sky: ['#4d86d8', '#1b4a9c'], sun: '#f0a81c', far: '#12356f', mid: '#0d2a58', near: '#081f42', ink: '#eaf1ff', band: '#1b4a9c' },
  7: { sky: ['#4f7a3a', '#14351d'], sun: '#d1382b', far: '#20512b', mid: '#173d20', near: '#0c2415', ink: '#e8f0d0', band: '#14351d' },
  8: { sky: ['#7fdce0', '#10a3a8'], sun: '#ffffff', far: '#0d8489', mid: '#0a6266', near: '#064245', ink: '#04302f', band: '#10a3a8' },
  9: { sky: ['#f5b04a', '#d1552b'], sun: '#fff1e3', far: '#9c3a1d', mid: '#6b2a17', near: '#3b1a10', ink: '#fff1e3', band: '#d1552b' }
};
DAY_PAINT[6].near = '#081f42';

/* ── Placeholder artwork ─────────────────────────────────────────────────
   A tiny deterministic scene painter: same day + same slot always draws the
   same picture, so the page doesn't shuffle on every reload. */
function scene(day, i) {
  const p = DAY_PAINT[day];
  const id = `g${day}_${i}`;
  const variant = (day * 3 + i) % 4;
  const sunX = 60 + ((day * 37 + i * 71) % 280);
  const sunY = variant === 1 ? 190 : 70 + ((day * 13 + i * 29) % 40);

  let art = '';
  if (variant === 1) {
    // Water: sun low, banded sea
    art += `<rect x="0" y="190" width="400" height="110" fill="${p.mid}"/>`;
    for (let w = 0; w < 5; w++) {
      art += `<path d="M0 ${205 + w * 20} q 50 -10 100 0 t 100 0 t 100 0 t 100 0" fill="none" stroke="${p.near}" stroke-width="3" opacity="${0.75 - w * 0.1}"/>`;
    }
    art += `<path d="M-20 190 l 90 -55 l 70 55 Z" fill="${p.far}"/>`;
  } else if (variant === 2) {
    // Canopy: overlapping leaf arcs
    art += `<rect x="0" y="215" width="400" height="85" fill="${p.near}"/>`;
    for (let a = 0; a < 7; a++) {
      const cx = a * 62 - 10;
      art += `<ellipse cx="${cx}" cy="${60 + ((a * 43) % 70)}" rx="72" ry="46" fill="${a % 2 ? p.mid : p.far}" opacity="0.9"/>`;
    }
    art += `<path d="M0 215 q 100 -40 200 0 t 200 0 v 90 H0 Z" fill="${p.near}"/>`;
  } else if (variant === 3) {
    // Ridges in rain
    art += `<path d="M-20 300 L110 130 L230 300 Z" fill="${p.far}"/>`;
    art += `<path d="M120 300 L260 105 L400 300 Z" fill="${p.mid}"/>`;
    art += `<rect x="0" y="250" width="400" height="50" fill="${p.near}"/>`;
    for (let r = 0; r < 26; r++) {
      const x = (r * 53) % 420;
      art += `<line x1="${x}" y1="${(r * 37) % 200}" x2="${x - 14}" y2="${((r * 37) % 200) + 46}" stroke="${p.sun}" stroke-width="1.6" opacity="0.32"/>`;
    }
  } else {
    // The classic: volcano and hills
    art += `<path d="M-30 300 L90 150 L210 300 Z" fill="${p.far}"/>`;
    art += `<path d="M140 300 L268 96 L400 300 Z" fill="${p.mid}"/>`;
    art += `<path d="M236 140 q 32 -22 64 0 q -32 14 -64 0 Z" fill="${p.sun}" opacity="0.55"/>`;
    art += `<path d="M-20 300 q 120 -70 230 -18 q 110 52 210 12 v 40 H-20 Z" fill="${p.near}"/>`;
  }

  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
    </linearGradient></defs>
    <rect width="400" height="300" fill="url(#${id})"/>
    <circle cx="${sunX}" cy="${sunY}" r="26" fill="${p.sun}" opacity="0.85"/>
    ${art}
  </svg>`;
}

/* ── Reels ───────────────────────────────────────────────────────────────── */
const reels = [];

function buildReel(host) {
  const day = Number(host.dataset.reel);
  const real = PHOTOS[day] || [];
  const items = real.length
    ? real.map((f) => ({ ...f, pending: false }))
    : (PLANNED[day] || []).map(([caption, place]) => ({ caption, place, pending: true }));

  host.innerHTML = `
    <div class="reel-bar">
      <p class="reel-title">Day ${day} in pictures</p>
      <div class="reel-tools">
        <p class="reel-count" role="status" aria-live="polite"></p>
        <button class="reel-btn" type="button" data-dir="-1" aria-label="Previous picture from day ${day}">‹</button>
        <button class="reel-btn" type="button" data-dir="1" aria-label="Next picture from day ${day}">›</button>
      </div>
    </div>
    <div class="reel-viewport" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Pictures from day ${day}"></div>
    <ol class="reel-dots"></ol>`;

  const viewport = host.querySelector('.reel-viewport');
  const dots = host.querySelector('.reel-dots');
  const count = host.querySelector('.reel-count');

  items.forEach((item, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const media = item.pending
      ? scene(day, i)
      : `<img src="${item.thumb || item.src}" alt="${item.caption}" loading="lazy" decoding="async" />`;
    slide.innerHTML = `
      <button class="slide-btn" type="button" aria-label="Open “${item.caption}” full size">
        <span class="slide-frame">
          ${media}
          ${item.type === 'video' ? '<span class="slide-play" aria-hidden="true">▶</span>' : ''}
          <span class="slide-num">${i + 1}</span>
          ${item.pending ? '<span class="slide-soon">Photo to come</span>' : ''}
        </span>
        <span class="slide-cap">${item.caption}</span>
        <span class="slide-place">${item.place}</span>
      </button>`;
    slide.querySelector('.slide-btn').addEventListener('click', () => openLightbox(day, i));
    viewport.appendChild(slide);

    const dot = document.createElement('li');
    dot.innerHTML = `<button type="button" aria-label="Picture ${i + 1} of ${items.length}"></button>`;
    dot.querySelector('button').addEventListener('click', () => goTo(reel, i));
    dots.appendChild(dot);
  });

  const reel = { day, host, viewport, dots, count, items, index: 0 };
  reels.push(reel);

  host.querySelectorAll('[data-dir]').forEach((btn) =>
    btn.addEventListener('click', () => goTo(reel, reel.index + Number(btn.dataset.dir)))
  );

  viewport.addEventListener('scroll', () => {
    clearTimeout(reel.t);
    reel.t = setTimeout(() => sync(reel), 90);
  }, { passive: true });

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(reel, reel.index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(reel, reel.index - 1); }
  });

  sync(reel);
}

function goTo(reel, i) {
  const next = Math.max(0, Math.min(reel.items.length - 1, i));
  const slide = reel.viewport.children[next];
  if (!slide) return;
  reel.viewport.scrollTo({
    left: slide.offsetLeft - reel.viewport.children[0].offsetLeft,
    behavior: 'smooth'
  });
  reel.index = next;
  paint(reel);
}

function sync(reel) {
  const origin = reel.viewport.children[0].offsetLeft;
  let best = 0;
  let bestDist = Infinity;
  [...reel.viewport.children].forEach((slide, i) => {
    const d = Math.abs(slide.offsetLeft - origin - reel.viewport.scrollLeft);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  reel.index = best;
  paint(reel);
}

function paint(reel) {
  reel.count.textContent = `${reel.index + 1} / ${reel.items.length}`;
  [...reel.dots.children].forEach((li, i) =>
    li.firstElementChild.setAttribute('aria-current', String(i === reel.index))
  );
  reel.host.querySelectorAll('[data-dir]').forEach((btn) => {
    const dir = Number(btn.dataset.dir);
    btn.disabled = dir < 0 ? reel.index === 0 : reel.index === reel.items.length - 1;
  });
}

document.querySelectorAll('.reel').forEach(buildReel);

/* ── Lightbox ────────────────────────────────────────────────────────────── */
const lb = document.getElementById('lightbox');
const lbStage = document.getElementById('lb-stage');
const lbCaption = document.getElementById('lb-caption');
const lbMeta = document.getElementById('lb-meta');
const lbFullscreen = document.getElementById('lb-fullscreen');
let lbDay = 1;
let lbIndex = 0;
let lastFocus = null;
let lbSwipe = null;
let activeVideoObserver = null;

function pauseActiveVideo() {
  lbStage.querySelector('video')?.pause();
}

function watchActiveVideo(video) {
  activeVideoObserver?.disconnect();
  activeVideoObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) video.pause();
  }, { threshold: 0.25 });
  activeVideoObserver.observe(video);
}

function openLightbox(day, index) {
  lbDay = day;
  lbIndex = index;
  lastFocus = document.activeElement;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  renderLightbox();
  lb.querySelector('.lb-close').focus();
}

function renderLightbox() {
  const reel = reels.find((r) => r.day === lbDay);
  const item = reel.items[lbIndex];
  lbStage.innerHTML = item.pending
    ? scene(lbDay, lbIndex)
    : item.type === 'video'
      ? `<video src="${item.src}" controls loop playsinline></video>`
      : `<img src="${item.src}" alt="${item.caption}" />`;
  const video = lbStage.querySelector('video');
  if (video) {
    video.muted = false;
    video.volume = 1;
    watchActiveVideo(video);
    video.play().catch(() => {
      // Some browsers may still require the user to press Play.
    });
  } else {
    activeVideoObserver?.disconnect();
    activeVideoObserver = null;
  }
  lbFullscreen.hidden = item.type !== 'video' || item.pending;
  lbCaption.textContent = item.caption;
  lbMeta.textContent = `Day ${lbDay} · ${item.place}${item.pending ? ' · photo to come' : ''}`;
  goTo(reel, lbIndex);
}

async function fullscreenVideo() {
  const video = lbStage.querySelector('video');
  if (!video) return;
  try {
    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
    await video.requestFullscreen();
    if (video.videoWidth > video.videoHeight && screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (_) {
    // Fullscreen and orientation locking vary by browser; native controls remain available.
  }
}

function stepLightbox(delta) {
  const reel = reels.find((r) => r.day === lbDay);
  if (delta > 0 && lbIndex === reel.items.length - 1) {
    const nextDay = lbDay + 1;
    closeLightbox();
    if (nextDay <= reels.length) jumpToDay(nextDay);
    return;
  }
  lbIndex = (lbIndex + delta + reel.items.length) % reel.items.length;
  renderLightbox();
}

function closeLightbox() {
  pauseActiveVideo();
  activeVideoObserver?.disconnect();
  activeVideoObserver = null;
  lb.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
lb.querySelector('.lb-prev').addEventListener('click', () => stepLightbox(-1));
lb.querySelector('.lb-next').addEventListener('click', () => stepLightbox(1));
lbFullscreen.addEventListener('click', fullscreenVideo);
lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
lb.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' || e.target.closest('button, video')) return;
  lbSwipe = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
  lb.setPointerCapture(e.pointerId);
});
lb.addEventListener('pointerup', (e) => {
  if (!lbSwipe || e.pointerId !== lbSwipe.pointerId) return;
  const dx = e.clientX - lbSwipe.x;
  const dy = e.clientY - lbSwipe.y;
  const minimum = Math.max(50, Math.min(90, lb.clientWidth * 0.15));
  lbSwipe = null;
  if (Math.abs(dx) < minimum || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
  stepLightbox(dx < 0 ? 1 : -1);
});
lb.addEventListener('pointercancel', () => { lbSwipe = null; });
document.addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') stepLightbox(1);
  if (e.key === 'ArrowLeft') stepLightbox(-1);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseActiveVideo();
});

/* ── Map ─────────────────────────────────────────────────────────────────── */
const stops = {
  sjo: [9.9937, -84.2088], zarcero: [10.1857, -84.3915], arenal: [10.4949, -84.7227],
  uvita: [9.1639, -83.7444], cartago: [9.8644, -83.9194], irazu: [9.9793, -83.8521],
  sanpedrillo: [8.6515, -83.7424], cano: [8.701, -83.866]
};

const STOPS = [
  { key: 'sjo', icon: '\u2708\uFE0F', title: 'San José airport', sub: 'Where it starts and ends', day: 1, accent: true, label: 'left' },
  { key: 'zarcero', icon: '\uD83C\uDF33', title: 'Zarcero', sub: 'Highlands, night one', day: 1, label: 'top' },
  { key: 'arenal', icon: '\uD83C\uDF0B', title: 'Arenal volcano', sub: 'Nights two to five', day: 2, accent: true, label: 'left' },
  { key: 'uvita', icon: '\uD83C\uDFDD\uFE0F', title: 'Uvita', sub: 'Pacific, nights six to eight', day: 6, accent: true, label: 'left' },
  { key: 'irazu', icon: '\u26F0\uFE0F', title: 'Irazú crater', sub: 'The high point, on the way home', day: 9, label: 'right' }
];

const SEA_STOPS = [
  { key: 'sanpedrillo', icon: '\uD83D\uDC12', title: 'Corcovado', sub: 'Rainforest by boat', day: 7, label: 'bottom' },
  { key: 'cano', icon: '\uD83D\uDC20', title: 'Caño Island', sub: 'Snorkelling day', day: 8, label: 'left' }
];

const legs = [
  { points: ['sjo', 'zarcero'], color: '#d1382b' },
  { points: ['zarcero', 'arenal'], color: '#f0a81c' },
  { points: ['arenal', 'uvita'], color: '#10a3a8' },
  { points: ['uvita', 'cartago', 'irazu', 'sjo'], color: '#1b4a9c' }
];

const map = L.map('map', { scrollWheelZoom: false, zoomControl: false }).setView([9.72, -84.21], 8);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18, attribution: '© OpenStreetMap'
}).addTo(map);

/* Every pin carries a picture and its name, so the map reads without a key. */
const pinIcon = (stop, kind = '') => L.divIcon({
  className: 'trip-pin',
  html: `<span class="pin ${kind}">${stop.icon}</span>
         <b class="pin-name pin-name--${stop.label}">${stop.title}</b>`,
  iconSize: [38, 38], iconAnchor: [19, 19]
});

const roadLines = [];
legs.forEach((leg, i) => {
  const line = L.polyline(leg.points.map((k) => stops[k]), {
    color: leg.color, weight: 5, opacity: 0.95, lineCap: 'round',
    className: `route-path leg-${i + 1}`
  }).addTo(map);
  roadLines.push(line);
});

/* Both boat days left Uvita and came back the same evening, so each one is drawn
   as a loop: out on one curve, home on the other. A straight there-and-back would
   retrace its own pixels and the return leg would be invisible. */
function arc(from, to, bend) {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const cLng = (lng1 + lng2) / 2 - (lat2 - lat1) * bend;
  const cLat = (lat1 + lat2) / 2 + (lng2 - lng1) * bend;
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    points.push([a * lat1 + b * cLat + c * lat2, a * lng1 + b * cLng + c * lng2]);
  }
  return points;
}

const boatLines = [
  { to: 'sanpedrillo', bend: 0.30 },
  { to: 'cano', bend: 0.34 }
].map(({ to, bend }) => L.polyline(
  [...arc(stops.uvita, stops[to], bend), ...arc(stops[to], stops.uvita, bend)],
  { color: '#0a6266', weight: 3, opacity: 0.9, dashArray: '2 9', lineCap: 'round',
    className: 'route-path boat' }
).addTo(map));

const markers = {};
[...STOPS, ...SEA_STOPS].forEach((s) => {
  const kind = s.accent ? 'accent' : SEA_STOPS.includes(s) ? 'sea' : '';
  markers[s.key] = L.marker(stops[s.key], { icon: pinIcon(s, kind), keyboard: true, title: s.title })
    .addTo(map)
    .bindTooltip(`${s.title} — ${s.sub}. Click to read the day.`, { direction: 'top', offset: [0, -22] })
    .on('click', () => jumpToDay(s.day));
});

function revealPin(key) {
  markers[key]?.getElement()?.classList.add('is-in');
}

const fullBounds = L.latLngBounds(Object.values(stops)).pad(0.14);
map.fitBounds(fullBounds);

const routeSection = document.querySelector('.route');

/* Swap the straight legs for real road geometry when the network allows. */
const roadsReady = Promise.allSettled(legs.map(async (leg, i) => {
  const coords = leg.points.map((k) => stops[k].slice().reverse().join(',')).join(';');
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error('routing unavailable');
  const data = await res.json();
  const line = data.routes?.[0]?.geometry?.coordinates;
  /* If this fails the straight-line leg stays on screen and still reads correctly. */
  if (line) roadLines[i].setLatLngs(line.map(([lng, lat]) => [lat, lng]));
}));

/* Draw the route like a pen following the road: San José to Zarcero to Arenal
   to the coast and home, each leg picking up exactly where the last one stopped.
   One continuous stroke, ~6 seconds end to end. */
const DRAW_SPEED = 200;        /* px per second */
const MIN_LEG = 1.1;           /* so the two short hops don't flick past */
const slowMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!slowMotion) routeSection.classList.add('will-draw');

/* Trip order: down to the coast, both boat days out of Uvita, then home. Each
   leg lists the places the pen passes and how far along it reaches them, so a
   pin and its name only appear once we have actually arrived there. */
const drawPlan = () => [
  { line: roadLines[0], arrivals: [[0, 'sjo'], [1, 'zarcero']] },
  { line: roadLines[1], arrivals: [[1, 'arenal']] },
  { line: roadLines[2], arrivals: [[1, 'uvita']] },
  { line: boatLines[0], arrivals: [[0.5, 'sanpedrillo']] },   /* halfway = the island */
  { line: boatLines[1], arrivals: [[0.5, 'cano']] },
  { line: roadLines[3], arrivals: [[0.66, 'irazu']] }
];

function drawRoute() {
  let delay = 0;
  const timings = drawPlan().map(({ line, arrivals }) => {
    const path = line._path;
    if (!path) return 0;
    const len = path.getTotalLength();
    const seconds = Math.max(MIN_LEG, len / DRAW_SPEED);

    /* Dash and gap both equal the path length, so the pattern never repeats and
       no stray segment can flash into view part-way through. */
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = len;
    path.style.visibility = 'visible';
    path.getBoundingClientRect();   /* commit the hidden state before animating */

    path.style.transition = `stroke-dashoffset ${seconds}s linear ${delay}s`;
    path.style.strokeDashoffset = 0;

    arrivals.forEach(([along, key]) => {
      setTimeout(() => revealPin(key), (delay + seconds * along) * 1000);
    });

    /* Hand this leg back to Leaflet the moment the pen lands, so the boat loops
       pick their dotted line back up and later pans redraw cleanly. */
    const done = delay + seconds;
    setTimeout(() => {
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    }, done * 1000 + 60);

    delay = done;                   /* strictly one leg at a time — no overlap */
    return done;
  });
  return Math.max(...timings, 0);
}

const mapLabel = document.getElementById('map-label');
const dayBounds = {
  1: () => L.latLngBounds([stops.sjo, stops.zarcero]),
  2: () => L.latLngBounds([stops.zarcero, stops.arenal]),
  3: () => L.latLngBounds([[10.40, -84.82], [10.62, -84.60]]),
  4: () => L.latLngBounds([[10.40, -84.82], [10.62, -84.60]]),
  5: () => L.latLngBounds([[10.40, -84.82], [10.62, -84.60]]),
  6: () => L.latLngBounds([stops.arenal, stops.uvita]),
  7: () => L.latLngBounds([stops.uvita, stops.sanpedrillo]),
  8: () => L.latLngBounds([stops.uvita, stops.cano]),
  9: () => L.latLngBounds([stops.uvita, stops.irazu, stops.sjo])
};

function focusMapOnDay(day) {
  const card = document.getElementById(`day-${day}`);
  const title = card.querySelector('h3').textContent;
  mapLabel.textContent = `Day ${day} · ${title}`;
  document.getElementById('map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  map.flyToBounds(dayBounds[day]().pad(0.25), { duration: 1.1 });
}

function jumpToDay(day) {
  document.getElementById(`day-${day}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('[data-focus-map]').forEach((btn) =>
  btn.addEventListener('click', () => focusMapOnDay(Number(btn.dataset.focusMap)))
);

document.getElementById('map-reset').addEventListener('click', () => {
  mapLabel.textContent = 'The whole trip · 682 km';
  map.flyToBounds(fullBounds, { duration: 1 });
});

/* Stop list under the map — each one jumps to the day it belongs to. */
const stopList = document.querySelector('.stop-list');
[...STOPS, ...SEA_STOPS].forEach((s) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button">
      <span class="n" aria-hidden="true">${s.icon}</span>
      <span class="t">${s.title}</span>
      <span class="s">${s.sub}</span>
    </button>`;
  li.querySelector('button').addEventListener('click', () => jumpToDay(s.day));
  stopList.appendChild(li);
});

/* Draw the route in once the map is on screen — after the real roads land. */
new IntersectionObserver((entries, obs) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    routeSection.classList.add('is-seen');
    if (slowMotion) return;
    /* Don't wait on a slow router — draw the straight legs rather than nothing. */
    Promise.race([roadsReady, new Promise((r) => setTimeout(r, 2500))]).then(drawRoute);
  });
}, { threshold: 0.25 }).observe(routeSection);

/* ── The trail: jump nav, active day, rolling wheel ──────────────────────── */
const trail = document.getElementById('trail');
const trailStops = trail.querySelector('.trail-stops');
const days = [...document.querySelectorAll('.day')];

days.forEach((card) => {
  const day = card.dataset.day;
  const li = document.createElement('li');
  li.innerHTML = `<a href="#day-${day}" data-name="Day ${day} · ${card.querySelector('h3').textContent}">${day}</a>`;
  trailStops.appendChild(li);
});

const root = document.documentElement;
const journal = document.getElementById('journal');

function setActiveDay(day) {
  trailStops.querySelectorAll('a').forEach((a) =>
    a.setAttribute('aria-current', String(a.getAttribute('href') === `#day-${day}`))
  );
  const paint = DAY_PAINT[day];
  root.style.setProperty('--rail-ink', paint.ink);
  root.style.setProperty('--rail-bg', hexToRgba(paint.band, 0.92));
  trail.querySelector('.trail-legend').textContent = `Day ${day}`;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const dayObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) setActiveDay(Number(e.target.dataset.day)); });
}, { rootMargin: '-45% 0px -45% 0px' });
days.forEach((d) => dayObserver.observe(d));

function updateTrail() {
  const box = journal.getBoundingClientRect();
  const inside = box.top < window.innerHeight * 0.5 && box.bottom > window.innerHeight * 0.4;
  trail.classList.toggle('is-on', inside);

  const travelled = -box.top + window.innerHeight * 0.5;
  const pos = Math.max(0, Math.min(1, travelled / box.height));
  root.style.setProperty('--trail-pos', (pos * 100).toFixed(2));
}
window.addEventListener('scroll', updateTrail, { passive: true });
window.addEventListener('resize', updateTrail);
updateTrail();

/* ── Reveal on scroll ────────────────────────────────────────────────────── */
const revealer = new IntersectionObserver((entries, obs) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    obs.unobserve(e.target);
  });
}, { threshold: 0.15 });

document.querySelectorAll('.day-inner, .reel, .route-head, .map-frame, .journal-intro > *').forEach((el) => {
  el.classList.add('reveal');
  revealer.observe(el);
});
