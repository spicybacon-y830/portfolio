/* PillMusic — scène de démonstration.
   Un bureau macOS (fond dégradé, éditeur de code) ; la pilule apparaît avec ⌃⌘M,
   s'ouvre au survol, lance la lecture, affiche les paroles, passe au morceau suivant,
   se referme, puis disparaît avec le même raccourci, et la boucle recommence.
   Le bouton play utilise le vrai shader « métal liquide » de l'app, porté en WebGL2. */
(() => {
  document.querySelectorAll('[data-pm-stage]').forEach(mount);

  function mount(root) {
  // hero : la démo complète · still : image fixe · play : le bouton · lyrics : démo cliquable avec le son
  const MODE = root.dataset.pmStage || 'hero';
  const BASE = (document.currentScript?.src || '').replace(/[^/]*$/, '') || 'assets/writings/pillmusic/';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Mises en page (taille de conception, en px de scène) ───────────────
  // Pilule à sa taille moyenne réelle (échelle 0,25 de l'app). anchor : côté vers lequel elle ne bouge pas en s'ouvrant.
  const ALL_LAYOUTS = {
    hero: {
      wide:    { w: 582, h: 400, S: 0.25, win: { x: 40,   y: 52, w: 360, h: 400 }, pillRight: 542, pillY: 300, anchor: 'right' },
      compact: { w: 358, h: 380, S: 0.25, win: { x: -150, y: 48, w: 400, h: 380 }, pillRight: 338, pillY: 280, anchor: 'right' },
    },
    // Gros plans : une grande fenêtre coupée par le cadre, sans barre des menus.
    // play : son coin haut droit · lyrics : son coin bas droit. La pilule s'ouvre vers la gauche.
    still: {
      wide:    { w: 582, h: 320, S: 0.25, win: { x: -110, y: 40, w: 610, h: 600 }, pillRight: 548, pillY: 132, anchor: 'right' },
      compact: { w: 358, h: 300, S: 0.25, win: { x: -150, y: 36, w: 410, h: 600 }, pillRight: 340, pillY: 124, anchor: 'right' },
    },
    play: {
      wide:    { w: 582, h: 320, S: 0.25, win: { x: -110, y: 40, w: 610, h: 600 }, pillRight: 548, pillY: 132, anchor: 'right' },
      compact: { w: 358, h: 300, S: 0.25, win: { x: -150, y: 36, w: 410, h: 600 }, pillRight: 340, pillY: 124, anchor: 'right' },
    },
    lyrics: {
      wide:    { w: 582, h: 340, S: 0.25, win: { x: -110, y: -330, w: 610, h: 602 }, pillRight: 548, pillY: 246, anchor: 'right' },
      compact: { w: 358, h: 330, S: 0.25, win: { x: -150, y: -330, w: 410, h: 586 }, pillRight: 340, pillY: 230, anchor: 'right' },
    },
  };
  const LAYOUTS = ALL_LAYOUTS[MODE] || ALL_LAYOUTS.hero;
  const WALLPAPER = 'painting-1.jpg';
  const DARK = MODE === 'lyrics'; // la démo paroles : fenêtre et pilule en mode sombre
  const PILL_W = 777, PILL_H = 208, PAD = 24, INNER = PILL_W - 2 * PAD;

  // ── Morceaux (fictifs) ─────────────────────────────────────────────────
  const TRACKS = [
    {
      title: 'Mélatonine', artist: 'Tinashe', dur: 186, start: 64,
      art: `${BASE}melatonine.jpg`, artFallback: 0, disc: '#8f5560',
      tints: [[0.93, 0.6, 0.66, 0.85], [0.88, 0.62, 0.48, 0.3], [0.36, 0.28, 0.34, 0.16]],
      lyrics: ['♪'],
    },
  ];

  // Démo paroles : l'extrait audio est fourni à part (let-it-happen.mp3, coupé à partir de data-clip-start secondes).
  // Les paroles synchronisées sont chargées depuis LRCLIB, comme dans l'app.
  const LET_IT_HAPPEN = {
    title: 'Let It Happen', artist: 'Tame Impala', dur: 14, start: 0,
    art: `${BASE}let-it-happen.jpg`, artFallback: 2, disc: '#5a3a8a',
    tints: [[0.64, 0.47, 0.92, 0.9], [0.98, 0.32, 0.36, 0.34], [1.0, 0.72, 0.28, 0.2]],
    lrc: [[0, '♪']],
  };
  if (MODE === 'lyrics') { TRACKS.length = 0; TRACKS.push({ ...LET_IT_HAPPEN, lyrics: ['♪'] }); }

  // ── Pochettes générées (pas d'image sous droits) ──────────────────────
  function paintArt(i) {
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const g = c.getContext('2d');
    const blob = (x, y, r, stops) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr;
      g.fillRect(0, 0, 320, 320);
    };
    if (i === 0) {
      const lg = g.createLinearGradient(0, 0, 320, 320);
      lg.addColorStop(0, '#2a0710'); lg.addColorStop(1, '#8e1d1a');
      g.fillStyle = lg; g.fillRect(0, 0, 320, 320);
      blob(196, 128, 170, [[0, 'rgba(255,128,52,1)'], [0.55, 'rgba(232,74,40,.55)'], [1, 'rgba(232,74,40,0)']]);
      blob(214, 104, 46, [[0, 'rgba(255,224,110,1)'], [0.7, 'rgba(255,200,80,.6)'], [1, 'rgba(255,200,80,0)']]);
      g.strokeStyle = 'rgba(255,214,170,.55)'; g.lineWidth = 6;
      g.beginPath(); g.ellipse(150, 238, 118, 36, -0.12, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    } else if (i === 2) {
      const lg = g.createLinearGradient(0, 0, 320, 320);
      lg.addColorStop(0, '#141a4a'); lg.addColorStop(1, '#3b2a6e');
      g.fillStyle = lg; g.fillRect(0, 0, 320, 320);
      blob(230, 220, 190, [[0, 'rgba(255,140,70,.9)'], [0.5, 'rgba(220,70,110,.45)'], [1, 'rgba(220,70,110,0)']]);
      g.lineWidth = 5;
      for (let k = 0; k < 7; k++) {
        g.strokeStyle = `rgba(255,${180 + k * 10},${140 + k * 12},${0.55 - k * 0.05})`;
        g.beginPath(); g.moveTo(-10, 60 + k * 26); g.bezierCurveTo(90, 10 + k * 30, 200, 160 + k * 18, 330, 90 + k * 30); g.stroke();
      }
    } else {
      const lg = g.createLinearGradient(0, 320, 320, 0);
      lg.addColorStop(0, '#0b1f3d'); lg.addColorStop(1, '#1e7590');
      g.fillStyle = lg; g.fillRect(0, 0, 320, 320);
      blob(120, 200, 180, [[0, 'rgba(70,206,205,.95)'], [0.6, 'rgba(40,150,170,.4)'], [1, 'rgba(40,150,170,0)']]);
      blob(104, 106, 54, [[0, 'rgba(222,242,98,1)'], [0.7, 'rgba(200,230,90,.55)'], [1, 'rgba(200,230,90,0)']]);
      g.strokeStyle = 'rgba(210,245,255,.5)'; g.lineWidth = 6;
      g.beginPath(); g.arc(214, 186, 70, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    }
    // grain
    const img = g.getImageData(0, 0, 320, 320);
    let seed = 7 + i;
    for (let p = 0; p < img.data.length; p += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = ((seed / 2147483647) - 0.5) * 22;
      img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  }

  // ── Icônes ─────────────────────────────────────────────────────────────
  function roundedPoly(pts, r) {
    let d = '';
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
      const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
      const ang = Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2));
      const t = r / Math.tan(ang / 2);
      const s = [p[0] + v1[0] / l1 * t, p[1] + v1[1] / l1 * t];
      const e = [p[0] + v2[0] / l2 * t, p[1] + v2[1] / l2 * t];
      d += (i === 0 ? 'M' : 'L') + s[0].toFixed(2) + ' ' + s[1].toFixed(2);
      d += `A${r} ${r} 0 0 ${cross(v1, v2) < 0 ? 1 : 0} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
    }
    return d + 'Z';
  }
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  // Triangle arrondi du design (viewBox 0…78), pause en deux barres.
  const PLAY_D = roundedPoly([[16.54, 4.93], [74.2, 39], [16.54, 73.07]], 6.6);
  const PAUSE_D = 'M17.25 9.75h14.25a1 1 0 0 1 1 1v56.5a1 1 0 0 1-1 1H17.25a1 1 0 0 1-1-1V10.75a1 1 0 0 1 1-1Z'
                + 'M46.5 9.75h14.25a1 1 0 0 1 1 1v56.5a1 1 0 0 1-1 1H46.5a1 1 0 0 1-1-1V10.75a1 1 0 0 1 1-1Z';
  const FWD_D = roundedPoly([[6, 18], [50, 50], [6, 82]], 7) + roundedPoly([[50, 18], [94, 50], [50, 82]], 7);
  const BACK_D = roundedPoly([[94, 18], [94, 82], [50, 50]], 7) + roundedPoly([[50, 18], [50, 82], [6, 50]], 7);
  const BUBBLE_D = 'M22 10H78A16 16 0 0 1 94 26V60A16 16 0 0 1 78 76H44L24 92V76H22A16 16 0 0 1 6 60V26A16 16 0 0 1 22 10Z';
  const QUOTES_D = 'M31 36a8 8 0 1 1 16 1c0 9-5 15-12 17l-2-4c4-2 6-5 6-8a8 8 0 0 1-8-6Z'
                 + 'M55 36a8 8 0 1 1 16 1c0 9-5 15-12 17l-2-4c4-2 6-5 6-8a8 8 0 0 1-8-6Z';

  const FILE_ICON = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M2 .8h5.2L10.6 4v8.4a.8.8 0 0 1-.8.8H2a.8.8 0 0 1-.8-.8V1.6A.8.8 0 0 1 2 .8Z"/><path d="M7 .8V4h3.4"/></svg>';
  const FOLDER_ICON = '<svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M1 2.2c0-.6.4-1 1-1h3.2l1.4 1.5H12c.6 0 1 .4 1 1V10c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1Z"/></svg>';

  // ── Code (barres colorées, mots seulement là où l'œil se pose) ─────────
  const CODE = [
    [0, ['kw', 34], ['ty', 54], ['tx', 10]],
    [1, ['kw', 22], ['tx', 34], ['ty', 46]],
    [1, ['kw', 22], ['tx', 26], ['ty', 52]],
    [],
    [1, ['kw', 22], ['tx', 30], ['ty', 34], ['tx', 8]],
    [2, ['ty', 44], ['tx', 10]],
    [3, ['fn', 54], ['tx', 34]],
    [3, ['fn', 38], ['tx', 44]],
    [2, ['tx', 8]],
    [2, ['fn', 52], ['tx', 22], ['nu', 22]],
    [2, ['fn', 56], ['ty', 44], ['tx', 12]],
    [3, ['cm', 104]],
    [3, ['fn', 36], ['st', 52], ['tx', 10]],
    [2, ['tx', 8]],
    [1, ['tx', 8]],
    [],
    [1, ['kw', 34], ['fn', 46], ['tx', 30]],
    [2, ['kw', 22], ['tx', 36], ['nu', 14]],
    [2, ['ty', 40], ['tx', 24], ['st', 50]],
    [2, ['fn', 56], ['tx', 44]],
    [1, ['tx', 8]],
  ];

  function sceneHTML() {
    const lines = [...CODE, ...CODE, ...CODE].map((toks, i) => {
      const indent = toks.length ? toks[0] * 16 : 0;
      const t = toks.slice(1).map(([k, w]) => `<i class="pm-tok pm-tok--${k}" style="width:${w}px"></i>`).join('');
      return `<div class="pm-line"${i === (MODE === 'lyrics' ? 30 : 9) ? ' data-current' : ''}><span class="pm-line__n">${i + 41}</span><span style="width:${indent}px;flex-shrink:0"></span>${t}</div>`;
    }).join('');
    const files = ['App.swift', 'PillView.swift', 'Lyrics.swift', 'LiquidMetal.swift']
      .map((f) => `<div class="pm-file"${f === 'PillView.swift' ? ' data-selected' : ''}>${FILE_ICON}${f}</div>`).join('');
    const skip = (k, d, size, h) =>
      `<div class="pm-slot" data-k="${k}"><div class="pm-skip"><svg viewBox="${size}" width="${h[0]}" height="${h[1]}">${d}</svg></div></div>`;
    return `
      <div class="pm-scene">
        <div class="pm-wallpaper" style="background-image:url('${BASE}${WALLPAPER}')"></div>
        <div class="pm-menubar">
          <span class="pm-faint">File</span><span class="pm-faint">Edit</span><span class="pm-faint">View</span>
          <span class="pm-faint pm-wide">Window</span><span class="pm-faint pm-wide">Help</span>
          <span class="pm-spacer"></span>
          <span class="pm-status" aria-hidden="true"></span>
          <span class="pm-clock">Fri 27 Nov&nbsp;&nbsp;9:41</span>
        </div>
        <div class="pm-window">
          <div class="pm-window__bar"><div class="pm-lights"><i></i><i></i><i></i></div><div class="pm-window__title">${MODE === 'lyrics' ? 'Lyrics.swift' : 'PillView.swift'}</div></div>
          <div class="pm-window__body">
            <div class="pm-side"><div class="pm-file">${FOLDER_ICON}Sources</div>${files}</div>
            <div class="pm-code">${lines}</div>
          </div>
        </div>
        <div class="pm-lyrics"><div class="pm-lyrics__col"></div></div>
        <div class="pm-pill-anchor">
          <div class="pm-pill-scale">
            <div class="pm-pill-shadow"></div>
            <div class="pm-pill">
              <div class="pm-art"></div>
              <div class="pm-info">
                <div class="pm-progress"><span class="pm-t0">0:00</span><div class="pm-bar"><i></i></div><span class="pm-t1">-0:00</span></div>
              </div>
              ${skip('lyrics', `<path class="pm-bub" d="${BUBBLE_D}"/><path class="pm-quo" d="${QUOTES_D}"/>`, '0 0 100 100', [39, 39])}
              ${skip('prev', `<path d="${BACK_D}"/>`, '0 14 100 72', [36, 26])}
              ${skip('next', `<path d="${FWD_D}"/>`, '0 14 100 72', [36, 26])}
              <div class="pm-play"><div class="pm-play__disc"></div><canvas></canvas><svg viewBox="0 0 78 78"><path d="${PLAY_D}"/></svg></div>
            </div>
          </div>
        </div>
        <div class="pm-keys"><span class="pm-key">⌃</span><span class="pm-key">⌘</span><span class="pm-key">M</span></div>
        <svg class="pm-cursor" viewBox="0 0 32 32" width="32" height="32"><g transform="translate(10 7)">
          <path d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z" fill="#fff"/>
          <path d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z" fill="#000"/></g></svg>
      </div>`;
  }

  root.innerHTML = sceneHTML();
  const $ = (s) => root.querySelector(s);
  const scene = $('.pm-scene');
  const win = $('.pm-window');
  const anchor = $('.pm-pill-anchor');
  const pillScale = $('.pm-pill-scale');
  const pill = $('.pm-pill');
  const shadow = $('.pm-pill-shadow');
  const art = $('.pm-art');
  const info = $('.pm-info');
  const t0 = $('.pm-t0'), t1 = $('.pm-t1'), barFill = $('.pm-bar i');
  const slots = [...root.querySelectorAll('.pm-slot')];
  const skips = Object.fromEntries(slots.map((s) => [s.dataset.k, s.firstElementChild]));
  const play = $('.pm-play'), disc = $('.pm-play__disc'), glyph = $('.pm-play svg path'), canvas = $('.pm-play canvas');
  const lyricsBox = $('.pm-lyrics'), lyricsCol = $('.pm-lyrics__col');
  const keys = $('.pm-keys');
  const cursor = $('.pm-cursor');
  const bub = $('.pm-bub'), quo = $('.pm-quo');

  // ── Ressorts façon SwiftUI (réponse, amortissement) ───────────────────
  class Spring {
    constructor(v, response, damping) { this.v = v; this.t = v; this.vel = 0; this.set(response, damping); }
    set(response, damping) { this.k = (2 * Math.PI / response) ** 2; this.c = 4 * Math.PI * damping / response; }
    step(dt) {
      const n = Math.ceil(dt / 0.004), h = dt / n;
      for (let i = 0; i < n; i++) {
        this.vel += (-this.k * (this.v - this.t) - this.c * this.vel) * h;
        this.v += this.vel * h;
      }
      if (Math.abs(this.v - this.t) < 1e-4 && Math.abs(this.vel) < 1e-3) { this.v = this.t; this.vel = 0; }
    }
    snap(v) { this.v = this.t = v; this.vel = 0; }
  }
  const sp = {
    shown: new Spring(0, 0.45, 0.7),
    expand: new Spring(0, 0.5, 0.5),       // Design.island
    play: new Spring(1, 0.25, 0.5),        // appui / survol du bouton
    wobble: new Spring(0, 0.35, 0.3),
    lyricsY: new Spring(0, 0.7, 0.88),     // spring(duration: 0.7, bounce: 0.12)
    lprev: new Spring(1, 0.3, 0.75), lnext: new Spring(1, 0.3, 0.75), llyrics: new Spring(1, 0.3, 0.75),
  };

  // ── État ──────────────────────────────────────────────────────────────
  let L = LAYOUTS.wide, sceneScale = 1;
  const st = {
    track: 0, playing: false, pos: 0, lyricsOn: false, lyricIndex: 0,
    cx: 0, cy: 0, cursorDown: false, hover: null, hoverPill: false,
    pressed: null,
  };

  // ── Shader « métal liquide » (portage WebGL2 du shader Metal de l'app) ─
  const shader = makeShader(canvas);
  const sh = {
    time: 37, speed: 0, boost: 0,
    cur: TRACKS[0].tints.map((c) => c.slice()), target: TRACKS[0].tints.map((c) => c.slice()),
    dirty: true,
  };

  function makeShader(cv) {
    const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!gl) return null;
    const vs = `#version 300 es
      void main() { vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0); gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `#version 300 es
      precision highp float;
      uniform sampler2D tex;
      uniform vec4 tint; uniform vec4 tint2; uniform vec4 tint3;
      uniform vec2 viewSize; uniform float time;
      out vec4 fragColor;
      #define PI 3.14159265358979323846
      const float u_softness = 0.1, u_repetition = 1.99, u_shiftRed = 0.3, u_shiftBlue = 0.3;
      const float u_distortion = 0.07, u_contour = 0.54, u_angle = 70.0, u_designRes = 320.0;

      vec2 rotate2(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }
      vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m; m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tintC, float tintA) {
        float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe_p));
        float border = w[0];
        ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
        bump = smoothstep(0.2, 0.8, bump);
        border = w[0] + 0.4 * (1.0 - bump) * w[1];
        ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
        border = w[0] + 0.5 * (1.0 - bump) * w[1];
        ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
        border = w[0] + w[1];
        ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
        float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
        float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradient_t));
        ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe_p));
        ch = mix(ch, 1.0 - min(1.0, (1.0 - ch) / max(tintC, 0.0001)), tintA);
        return ch;
      }
      float blurEdge3x3(vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
        vec2 r = radius / vec2(textureSize(tex, 0));
        float sum = 4.0 * centerSample;
        sum += 2.0 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
        sum += 2.0 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
        sum += 2.0 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
        sum += 2.0 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;
        sum += textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
        sum += textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
        sum += textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
        sum += textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;
        return sum / 16.0;
      }
      void main() {
        const float firstFrameOffset = 2.8;
        float t = 0.3 * (time + firstFrameOffset);
        vec2 pos = vec2(gl_FragCoord.x, viewSize.y - gl_FragCoord.y);
        vec2 uv = pos / viewSize;
        vec2 dudx = dFdx(uv);
        vec2 dudy = dFdy(uv);
        vec4 img = textureGrad(tex, uv, dudx, dudy);
        float cycleWidth = u_repetition;

        vec2 rotatedUV = uv - vec2(0.5);
        float angle = (-u_angle + 70.0) * PI / 180.0;
        float cosA = cos(angle), sinA = sin(angle);
        rotatedUV = vec2(rotatedUV.x * cosA - rotatedUV.y * sinA, rotatedUV.x * sinA + rotatedUV.y * cosA) + vec2(0.5);

        float edge = blurEdge3x3(uv, dudx, dudy, 6.0, img.r);
        edge = pow(edge, 1.6);
        edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
        float opacity = img.g;

        float diagBLtoTR = rotatedUV.x - rotatedUV.y;
        float diagTLtoBR = rotatedUV.x + rotatedUV.y;
        vec3 color1 = vec3(0.98, 0.98, 1.0);
        vec3 color2 = vec3(0.1, 0.1, 0.1 + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR));

        vec2 grad_uv = uv - 0.5;
        float dist = length(grad_uv + vec2(0.0, 0.2 * diagBLtoTR));
        grad_uv = rotate2(grad_uv, (0.25 - 0.2 * diagBLtoTR) * PI);
        float direction = grad_uv.x;

        float bump = pow(1.8 * dist, 1.2);
        bump = 1.0 - bump;
        bump *= pow(uv.y, 0.3);

        float thin_strip_1_ratio = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
        float thin_strip_2_ratio = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
        float wide_strip_ratio = (1.0 - thin_strip_1_ratio - thin_strip_2_ratio);
        float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
        float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

        float noise = snoise(uv - t);
        edge += (1.0 - edge) * u_distortion * noise;

        direction += diagBLtoTR;
        float contour = 0.0;
        direction -= 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));
        direction *= mix(1.0, 1.0 - edge, smoothstep(0.5, 1.0, u_contour));
        direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);
        direction += 0.2 * pow(u_contour, 4.0) * (1.0 - smoothstep(0.0, 1.0, edge));

        bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);
        direction *= (0.1 + (1.1 - edge) * bump);
        direction *= (0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge)));
        direction += 0.18 * (smoothstep(0.1, 0.2, uv.y) * (1.0 - smoothstep(0.2, 0.4, uv.y)));
        direction += 0.03 * (smoothstep(0.1, 0.2, 1.0 - uv.y) * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));
        direction *= (0.5 + 0.5 * pow(uv.y, 2.0));
        direction *= cycleWidth;
        direction -= t;

        float flow = 0.5 + 0.5 * sin((direction * 0.5 + 0.35 * noise) * 2.0 * PI);
        float cov2 = tint2.a;
        vec3 tc = mix(tint.rgb, tint2.rgb, step(0.001, cov2) * smoothstep(1.0 - cov2 - 0.12, 1.0 - cov2 + 0.12, flow));
        float sweep = 0.5 + 0.5 * sin((uv.x - uv.y) * 4.0 + t * 1.7 + 2.0 * noise);
        tc = mix(tc, tint3.rgb, min(1.0, tint3.a * 2.5) * 0.85 * smoothstep(0.6, 0.95, sweep));

        float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
        float dispersionRed = colorDispersion;
        dispersionRed += 0.03 * bump * noise;
        dispersionRed += 5.0 * (smoothstep(-0.1, 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.5, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 1.0, bump)));
        dispersionRed -= diagBLtoTR;
        float dispersionBlue = colorDispersion;
        dispersionBlue *= 1.3;
        dispersionBlue += (smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.1, 0.8, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 0.8, bump)));
        dispersionBlue -= 0.2 * edge;
        dispersionRed *= (u_shiftRed / 20.0);
        dispersionBlue *= (u_shiftBlue / 20.0);

        float softness = 0.05 * u_softness;
        float blur = softness + 0.5 * smoothstep(1.0, 10.0, u_repetition) * smoothstep(0.0, 1.0, edge);
        float smallCanvasT = 1.0 - smoothstep(100.0, 500.0, u_designRes);
        blur += smallCanvasT * smoothstep(0.0, 1.0, edge);
        float rExtraBlur = softness * (0.05 + 0.1 * (u_shiftRed / 20.0) * bump);
        float gExtraBlur = softness * 0.05 / max(0.001, abs(1.0 - diagBLtoTR));
        blur += 0.3 * contour;

        vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
        w[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);
        float stripe_r = fract(direction + dispersionRed);
        float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, tc.r, 0.0);
        float stripe_g = fract(direction);
        float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, tc.g, 0.0);
        float stripe_b = fract(direction - dispersionBlue);
        float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, tc.b, 0.0);

        vec3 base = clamp(vec3(r, g, b), 0.0, 1.0);
        vec3 shaped = pow(base, vec3(1.7));
        vec3 screenC = 1.0 - 2.0 * (1.0 - shaped) * (1.0 - tc);
        vec3 multC = 2.0 * shaped * tc;
        vec3 overlay = mix(screenC, multC, vec3(lessThan(shaped, vec3(0.5))));
        vec3 color = clamp(mix(base, overlay, tint.a), 0.0, 1.0);
        if (any(isnan(color))) color = vec3(0.5);
        if (isnan(opacity)) opacity = 0.0;
        color *= opacity;
        color += 1.0 / 256.0 * (fract(sin(dot(0.014 * pos, vec2(12.9898, 78.233))) * 43758.5453123) - 0.5);
        fragColor = vec4(color, opacity);
      }`;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
    const loc = (n) => gl.getUniformLocation(prog, n);
    const U = { tint: loc('tint'), tint2: loc('tint2'), tint3: loc('tint3'), viewSize: loc('viewSize'), time: loc('time'), tex: loc('tex') };
    const vao = gl.createVertexArray();
    const S = { ready: false };
    Object.defineProperty(S, 'isReady', { get: () => S.ready });
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      S.ready = true;
      sh.dirty = true;
    };
    img.src = window.PM_SHAPE;
    S.draw = (time, tints) => {
      if (!S.ready) return;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1i(U.tex, 0);
      gl.uniform4fv(U.tint, tints[0]); gl.uniform4fv(U.tint2, tints[1]); gl.uniform4fv(U.tint3, tints[2]);
      gl.uniform2f(U.viewSize, cv.width, cv.height);
      gl.uniform1f(U.time, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    return S;
  }

  // ── Mise en page ──────────────────────────────────────────────────────
  function applyLayout() {
    const W = root.clientWidth || 582;
    L = W < 500 ? LAYOUTS.compact : LAYOUTS.wide;
    root.dataset.layout = L === LAYOUTS.compact ? 'compact' : 'wide';
    sceneScale = W / L.w;
    root.style.height = `${L.h * sceneScale}px`;
    Object.assign(scene.style, { width: `${L.w}px`, height: `${L.h}px`, transform: `scale(${sceneScale})` });
    root.dataset.mode = MODE;
    if (DARK) root.dataset.dark = '';
    if (L.win) Object.assign(win.style, { left: `${L.win.x}px`, top: `${L.win.y}px`, width: `${L.win.w}px`, height: `${L.win.h}px` });

    const S = L.S, H = PILL_H * S;
    Object.assign(anchor.style, { left: `${L.pillRight}px`, top: `${L.pillY}px`, transformOrigin: `${-PILL_W * S / 2}px ${H / 2}px` });
    // Comme l'app : titres, temps et barre ont une taille minimale à l'écran.
    const u = (v, min) => `${Math.max(v * S, min) / S}px`;
    const set = (n, v) => pill.style.setProperty(n, v);
    set('--pm-title', u(40, 12)); set('--pm-title-lh', u(48, 14));
    set('--pm-artist', u(20, 9)); set('--pm-artist-lh', u(24, 11));
    set('--pm-time', u(16, 8)); set('--pm-bar', u(7, 2.5));
    // Colonne centrée verticalement, comme le VStack de l'app.
    const num = (v) => parseFloat(v);
    const tl = num(u(48, 14)), al = num(u(24, 11)), bar = num(u(7, 2.5)), tm = num(u(16, 8));
    const progH = Math.max(bar * 2 + 2, tm * 1.25), spacing = 27 * 0.6;
    const top0 = (160 - (tl + 4 + al + spacing + progH)) / 2;
    set('--pm-meta-top', `${top0}px`);
    set('--pm-prog-top', `${top0 + tl + 4 + al + spacing}px`);
    set('--pm-prog-h', `${progH}px`);

    const k = S / 0.25;
    const lyrH = 50 * k + 40 * k;
    const lyrW = INNER * S;
    Object.assign(lyricsBox.style, {
      left: `${L.pillRight - PAD * S - lyrW}px`, width: `${lyrW}px`,
      top: `${L.pillY - 4 - lyrH}px`, height: `${lyrH}px`,
      fontSize: `${13.5 * k}px`, lineHeight: `${13.5 * k * 1.22}px`,
      textShadow: `0 0 ${9 * k}px rgba(0,0,0,.24), 0 0 ${26 * k}px rgba(0,0,0,.3)`,
      WebkitMaskImage: `linear-gradient(to bottom, #000 calc(100% - ${8 * k}px), transparent)`,
      maskImage: `linear-gradient(to bottom, #000 calc(100% - ${8 * k}px), transparent)`,
    });
    lyricsCol.style.gap = `${4 * k}px`;
    keys.style.left = `${L.pillRight - PILL_W * S / 2}px`;
    keys.style.top = `${L.pillY + H + 18}px`;
    keys.style.marginLeft = `-${keys.offsetWidth / 2 || 51}px`;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(8, Math.round(160 * S * sceneScale * dpr));
    if (canvas.width !== px) { canvas.width = canvas.height = px; sh.dirty = true; }
    placeLyrics(false);
  }

  // ── Contenu du morceau ────────────────────────────────────────────────
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let lastSec = -1;

  function metaEl(tr) {
    const m = document.createElement('div');
    m.className = 'pm-meta';
    m.innerHTML = `<div class="pm-title"></div><div class="pm-artist"></div>`;
    m.firstChild.textContent = tr.title;
    m.lastChild.textContent = tr.artist;
    return m;
  }
  function artEl(tr) {
    const i = new Image();
    i.alt = '';
    i.onerror = () => { i.onerror = null; i.src = paintArt(tr.artFallback ?? 0); };
    i.src = tr.art;
    return i;
  }

  function setTrack(i, dir = 0) {
    st.track = i;
    const tr = TRACKS[i];
    st.pos = tr.start;
    lastSec = -1;
    sh.target = tr.tints.map((c) => c.slice());
    disc.style.backgroundColor = tr.disc;
    const oldMeta = info.querySelector('.pm-meta');
    const newMeta = metaEl(tr);
    info.insertBefore(newMeta, info.firstChild);
    const oldArt = art.querySelector('img');
    const newArt = artEl(tr);
    art.appendChild(newArt);
    if (dir && !reduceMotion) {
      const ease = 'cubic-bezier(.22,1,.36,1)';
      newMeta.animate([{ transform: `translateX(${40 * dir}px)`, filter: 'blur(6px)', opacity: 0 }, { transform: 'none', filter: 'blur(0)', opacity: 1 }],
        { duration: 520, easing: ease });
      if (oldMeta) oldMeta.animate([{ transform: 'none', filter: 'blur(0)', opacity: 1 }, { transform: `translateX(${-40 * dir}px)`, filter: 'blur(6px)', opacity: 0 }],
        { duration: 420, easing: ease, fill: 'forwards' }).onfinish = () => oldMeta.remove();
      newArt.animate([{ transform: `translateX(${dir * 32}px) scale(.6)`, opacity: 0 }, { offset: 0.62, transform: 'translateX(-2px) scale(1.04)', opacity: 1 }, { transform: 'none', opacity: 1 }],
        { duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)' });
      if (oldArt) oldArt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => oldArt.remove();
    } else {
      oldMeta?.remove();
      oldArt?.remove();
      sh.cur = tr.tints.map((c) => c.slice());
      sh.dirty = true;
    }
    buildLyrics();
  }

  // ── Paroles ───────────────────────────────────────────────────────────
  function buildLyrics() {
    lyricsCol.innerHTML = '';
    for (const text of TRACKS[st.track].lyrics) {
      const d = document.createElement('div');
      d.className = 'pm-lyric';
      d.textContent = text;
      lyricsCol.appendChild(d);
    }
    st.lyricIndex = 0;
    markLyrics();
    placeLyrics(false);
  }
  function markLyrics() {
    [...lyricsCol.children].forEach((el, i) => { el.dataset.d = String(i - st.lyricIndex); });
  }
  function placeLyrics(animated = true) {
    const el = lyricsCol.children[st.lyricIndex];
    if (!el) return;
    const k = L.S / 0.25;
    const boxH = parseFloat(lyricsBox.style.height) || 0;
    const y = boxH - 8 * k - (el.offsetTop + el.offsetHeight);
    if (animated && !reduceMotion) sp.lyricsY.t = y; else sp.lyricsY.snap(y);
  }
  function setLyricIndex(i) {
    st.lyricIndex = Math.min(i, lyricsCol.children.length - 1);
    markLyrics();
    placeLyrics(true);
  }
  function setLyricsOn(on) {
    st.lyricsOn = on;
    skips.lyrics.toggleAttribute('data-active', on);
    const ink = DARK ? '#ffffff' : '#5c5c5c', paper = DARK ? '#3f3f3f' : '#e5e5e5';
    bub.setAttribute('fill', on ? ink : 'none');
    bub.setAttribute('stroke', on ? 'none' : ink);
    bub.setAttribute('stroke-width', on ? '0' : '7');
    quo.setAttribute('fill', on ? paper : ink);
    lyricsBox.style.transition = 'opacity .3s linear, transform .5s cubic-bezier(.3,1.2,.5,1)';
    const k = L.S / 0.25;
    lyricsBox.style.opacity = on && sp.shown.t ? '1' : '0';
    lyricsBox.style.transform = on && sp.shown.t ? 'none' : `translateY(${8 * k}px)`;
  }

  // ── Actions ───────────────────────────────────────────────────────────
  function setPlaying(p) {
    if (p && !st.playing) sh.boost = 7;
    st.playing = p;
    glyph.setAttribute('d', p ? PAUSE_D : PLAY_D);
  }
  function setShown(on) {
    sp.shown.t = on ? 1 : 0;
    if (!on) { lyricsBox.style.opacity = '0'; } else if (st.lyricsOn) setLyricsOn(true);
  }
  function wobble() { sp.wobble.t = 1; later(0.12, () => { sp.wobble.t = 0; }); }

  // ── Curseur ───────────────────────────────────────────────────────────
  let tween = null;
  function center(el, dx = 0, dy = 0) {
    const r = el.getBoundingClientRect(), s = scene.getBoundingClientRect();
    return [(r.left + r.width / 2 - s.left) / sceneScale + dx, (r.top + r.height / 2 - s.top) / sceneScale + dy];
  }
  function moveTo(target, dur) {
    const to = typeof target === 'function' ? target() : target;
    tween = { from: [st.cx, st.cy], to, t: 0, dur };
  }
  function restPoint() {
    if (L.win) return [L.win.x + L.win.w * 0.62, L.win.y + 196];
    return [L.w * 0.5 - 150, L.h + 40]; // hors champ, sous la scène
  }
  function click(name) {
    st.cursorDown = true;
    if (name === 'play') sp.play.t = 0.84; else sp['l' + name].t = 0.9;
    later(0.13, () => {
      st.cursorDown = false;
      if (name === 'play') { if (!st.playing) sh.boost = 7; wobble(); setPlaying(!st.playing); }
      if (name === 'lyrics') setLyricsOn(!st.lyricsOn);
      if (name === 'next') setTrack((st.track + 1) % TRACKS.length, 1);
      if (name === 'prev') setTrack((st.track + TRACKS.length - 1) % TRACKS.length, -1);
      if (name !== 'play') sp['l' + name].t = 1;
    });
  }

  // ── Horloge et scénario ───────────────────────────────────────────────
  let T = 0;
  const pending = [];
  function later(dt, fn) { pending.push({ at: T + dt, fn }); }

  const SCRIPTS = {};
  // L'ouverture : la pilule apparaît (en lecture), reste un moment, puis disparaît. Sans curseur.
  SCRIPTS.hero = [7.6, [
    [0.0, () => { reset(); st.cx = st.cy = -999; }],
    [0.8, () => { setPlaying(true); sh.boost = 0; setShown(true); }],
    [5.6, () => setShown(false)],
  ]];
  // Le bouton play : lecture (élan du métal, plus vif au survol), puis pause (le métal ralentit et s'arrête).
  SCRIPTS.play = [10.4, [
    [0.0, () => { reset(); setShown(true); sp.shown.snap(1); }],
    [0.4, () => moveTo(() => center(play, 2, 3), 1.1)],
    [1.9, () => click('play')],
    [4.6, () => moveTo(() => center(info, -12, 8), 0.7)],
    [6.4, () => moveTo(() => center(play, 2, 3), 0.6)],
    [7.2, () => click('play')],
    [8.6, () => moveTo(restPoint, 1.1)],
  ]];
  const [LOOP, SCRIPT] = SCRIPTS[MODE] || [1e9, []];
  let scriptIdx = 0;

  function reset() {
    setPlaying(false);
    setLyricsOn(false);
    setTrack(0);
    sp.shown.snap(0);
    sp.expand.snap(0);
    [st.cx, st.cy] = restPoint();
    tween = null;
  }

  // ── Boucle d'animation ────────────────────────────────────────────────
  const rectOf = (el) => {
    const r = el.getBoundingClientRect(), s = scene.getBoundingClientRect();
    return { l: (r.left - s.left) / sceneScale, t: (r.top - s.top) / sceneScale, r: (r.right - s.left) / sceneScale, b: (r.bottom - s.top) / sceneScale };
  };
  const inside = (p, r, pad = 0) => p[0] >= r.l - pad && p[0] <= r.r + pad && p[1] >= r.t - pad && p[1] <= r.b + pad;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

  function frame(dt) {
    // scénario
    T += dt;
    while (scriptIdx < SCRIPT.length && SCRIPT[scriptIdx][0] <= T) SCRIPT[scriptIdx++][1]();
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= T) { const p = pending.splice(i, 1)[0]; p.fn(); }
    if (T >= LOOP) { T = 0; scriptIdx = 0; pending.length = 0; }

    // curseur
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = ease(tween.t);
      st.cx = tween.from[0] + (tween.to[0] - tween.from[0]) * e;
      st.cy = tween.from[1] + (tween.to[1] - tween.from[1]) * e;
      if (tween.t >= 1) tween = null;
    }
    const p = [st.cx, st.cy];

    // survol (déduit de la position du curseur, comme dans l'app)
    const shown = sp.shown.t > 0;
    st.hoverPill = shown && inside(p, rectOf(pill));
    sp.expand.t = st.hoverPill ? 1 : 0;
    const hp = shown && inside(p, rectOf(play));
    for (const k of ['lyrics', 'prev', 'next']) skips[k].toggleAttribute('data-hover', shown && sp.expand.v > 0.6 && inside(p, rectOf(skips[k])));
    if (!st.cursorDown) sp.play.t = hp ? 1.07 : 1;

    for (const s of Object.values(sp)) s.step(dt);

    // pilule
    const e = Math.max(0, sp.expand.v);
    const w = PILL_W + 300 * e;
    pill.style.width = shadow.style.width = `${w}px`;
    const growth = 300 * e * L.S;
    const off = L.anchor === 'center' ? growth / 2 : L.anchor === 'left' ? growth : 0;
    pillScale.style.transform = `translateX(${off}px) scale(${L.S})`;
    const vis = Math.max(0.01, Math.min(e, 1.12));
    for (const s of slots) {
      s.style.width = `${100 * e}px`;
      const b = s.firstElementChild;
      const press = sp['l' + s.dataset.k].v;
      b.style.transform = `scale(${vis * press})`;
      b.style.opacity = String(Math.min(1, e));
    }
    const sv = sp.shown.v;
    anchor.style.transform = `scale(${0.55 + 0.45 * sv})`;
    anchor.style.opacity = String(Math.max(0, Math.min(1, sv * 1.4)));
    anchor.style.filter = sv < 0.995 ? `blur(${Math.max(0, 6 * (1 - sv))}px)` : 'none';
    const wv = sp.wobble.v;
    play.style.transform = `scale(${sp.play.v * (1 + 0.08 * wv)}, ${sp.play.v * (1 - 0.07 * wv)})`;

    // paroles
    lyricsCol.style.transform = `translateY(${sp.lyricsY.v}px)`;

    // progression
    const tr = TRACKS[st.track];
    if (MODE === 'lyrics') syncAudio(tr);
    else if (st.playing) st.pos = Math.min(tr.dur, st.pos + dt);
    barFill.style.width = `${(st.pos / tr.dur) * 100}%`;
    const sec = Math.floor(st.pos);
    if (sec !== lastSec) { lastSec = sec; t0.textContent = fmt(st.pos); t1.textContent = '-' + fmt(tr.dur - st.pos); }

    // shader
    const target = st.playing ? (hp ? 1.6 : 1) : 0;
    sh.speed += (target - sh.speed) * Math.min(1, dt * 3);
    sh.boost *= Math.exp(-dt * 2.6);
    const moving = sh.speed + sh.boost > 0.002;
    if (!moving) { sh.speed = 0; sh.boost = 0; }
    sh.time += dt * (sh.speed + sh.boost);
    let settled = true;
    for (let i = 0; i < 3; i++) for (let c = 0; c < 4; c++) {
      sh.cur[i][c] += (sh.target[i][c] - sh.cur[i][c]) * Math.min(1, dt * 3.5);
      if (Math.abs(sh.target[i][c] - sh.cur[i][c]) >= 0.002) settled = false;
    }
    if (shader && (moving || !settled || sh.dirty)) { shader.draw(sh.time, sh.cur); sh.dirty = false; }

    // curseur
    if (MODE === 'still' || MODE === 'lyrics') return;
    cursor.style.transform = `translate(${st.cx}px, ${st.cy}px) scale(${st.cursorDown ? 0.9 : 1})`;
  }

  // ── Démo cliquable (paroles + son) ────────────────────────────────────
  let audio = null, audioOk = false, clock = 0, lastNow = 0;
  function syncAudio(tr) {
    const now = performance.now() / 1000;
    if (st.playing) {
      if (audioOk && !audio.paused) clock = audio.currentTime;
      else if (!audioOk) clock += Math.min(0.05, now - lastNow);
    }
    lastNow = now;
    const dur = audioOk && isFinite(audio.duration) ? audio.duration : tr.dur;
    tr.dur = dur;
    st.pos = Math.min(clock, dur);
    if (st.playing && st.pos >= dur - 0.02) stopClip();
    let idx = 0;
    tr.lrc.forEach(([t], i) => { if (st.pos >= t) idx = i; });
    if (idx !== st.lyricIndex) setLyricIndex(idx);
  }
  function stopClip() {
    setPlaying(false);
    if (audioOk) { audio.pause(); audio.currentTime = 0; }
    clock = 0;
    setLyricIndex(0);
  }
  function togglePlay() {
    if (st.playing) {
      setPlaying(false);
      if (audioOk) audio.pause();
      return;
    }
    if (st.pos >= TRACKS[0].dur - 0.05) { clock = 0; if (audioOk) audio.currentTime = 0; }
    setPlaying(true);
    lastNow = performance.now() / 1000;
    if (audioOk) audio.play().catch(() => { audioOk = false; });
  }
  async function loadLyrics() {
    const tr = TRACKS[0];
    const clipStart = parseFloat(root.dataset.clipStart || '0') || 0;
    try {
      const q = new URLSearchParams({ artist_name: tr.artist, track_name: tr.title });
      const res = await fetch(`https://lrclib.net/api/get?${q}`);
      const data = await res.json();
      const lines = [];
      for (const row of (data.syncedLyrics || '').split('\n')) {
        const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
        if (m) lines.push([+m[1] * 60 + +m[2] - clipStart, m[3].trim() || '♪']);
      }
      const inClip = lines.filter(([t]) => t > 0);
      if (inClip.length) {
        tr.lrc = [[0, '♪'], ...inClip];
        tr.lyrics = tr.lrc.map((l) => l[1]);
        buildLyrics();
      }
    } catch { /* hors ligne : la note seule */ }
  }

  function setupInteractive() {
    loadLyrics();
    audio = new Audio(root.dataset.audio || `${BASE}let-it-happen.mp3`);
    audio.preload = 'auto';
    audioOk = true;
    audio.addEventListener('error', () => { audioOk = false; });
    audio.addEventListener('ended', () => stopClip());
    setShown(true); sp.shown.snap(1);
    setLyricsOn(true);
    st.cx = -999; st.cy = -999;
    root.tabIndex = 0;
    const toScene = (ev) => {
      const s = scene.getBoundingClientRect();
      return [(ev.clientX - s.left) / sceneScale, (ev.clientY - s.top) / sceneScale];
    };
    const hit = (pt) => {
      if (inside(pt, rectOf(play))) return 'play';
      if (sp.expand.v > 0.6) for (const k of ['lyrics', 'prev', 'next']) if (inside(pt, rectOf(skips[k]))) return k;
      return null;
    };
    root.addEventListener('pointermove', (ev) => {
      [st.cx, st.cy] = toScene(ev);
      root.style.cursor = hit([st.cx, st.cy]) ? 'pointer' : '';
    });
    root.addEventListener('pointerleave', () => { st.cx = st.cy = -999; root.style.cursor = ''; });
    root.addEventListener('pointerdown', (ev) => {
      const h = hit(toScene(ev));
      if (!h) return;
      st.cursorDown = true;
      if (h === 'play') sp.play.t = 0.84; else sp['l' + h].t = 0.9;
    });
    root.addEventListener('pointerup', (ev) => {
      const h = hit(toScene(ev));
      st.cursorDown = false;
      for (const k of ['lyrics', 'prev', 'next']) sp['l' + k].t = 1;
      if (h === 'play') { wobble(); togglePlay(); }
      if (h === 'lyrics') setLyricsOn(!st.lyricsOn);
      if (h === 'prev') { clock = 0; if (audioOk) audio.currentTime = 0; setLyricIndex(0); }
      if (h === 'next') stopClip();
    });
    root.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); togglePlay(); }
    });
  }

  // ── Démarrage ─────────────────────────────────────────────────────────
  applyLayout();
  reset();
  new ResizeObserver(() => applyLayout()).observe(root);

  if (MODE === 'still') {
    // Image fixe : la pilule ouverte au survol, en lecture.
    setShown(true); sp.shown.snap(1); setPlaying(true);
    sh.boost = 0;
    sp.expand.snap(1);
    st.cx = -999;
    const still = () => { sp.expand.t = 1; sp.expand.snap(1); frame(0); sp.expand.snap(1); };
    still();
    // une seule image du shader, dès que sa texture est prête
    const wait = () => { if (shader && !shader.ready) return requestAnimationFrame(wait); sh.dirty = true; sh.speed = 0; still(); };
    wait();
    new ResizeObserver(() => { applyLayout(); still(); }).observe(root);
    return;
  }
  if (MODE === 'lyrics') { setupInteractive(); }

  if (reduceMotion && MODE !== 'lyrics') {
    // Image fixe : la pilule ouverte, en lecture, paroles affichées.
    setShown(true); sp.shown.snap(1);
    setTrack(0); setPlaying(true);
    const c = center(info, -10, 10);
    [st.cx, st.cy] = c;
    sp.expand.snap(1);
    frame(0); sp.expand.snap(1); frame(0);
    return;
  }

  let visible = false, last = 0, raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    frame(dt);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { threshold: 0.15 }).observe(root);
  document.fonts?.ready.then(() => applyLayout());
  }
})();
