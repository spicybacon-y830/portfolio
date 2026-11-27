/* PillChat — scènes de l'article, en gros plan sur le coin haut droit d'un écran de Mac.
   hero  : une notif arrive, s'ouvre au survol, on revient à l'accueil et on choisit une autre conversation ;
   still : la pilule ouverte, image fixe ;
   emoji : un message tapé, deux emojis ajoutés au texte, envoyé ;
   voice : un message vocal enregistré, arrêté, envoyé.
   Noms, messages et photos sont inventés (photos = dégradés peints, aucun visage). */
(() => {
  const BASE = (document.currentScript?.src || '').replace(/[^/]*$/, '') || 'assets/writings/pillchat/';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const STOP = Symbol('stop');

  // ── Verre liquide ──────────────────────────────────────────────────────
  // Le fond de la scène (fond d'écran + fenêtre) est redessiné dans un canvas, flouté une fois.
  // La pilule le lit sous elle, en déplaçant les pixels près du bord (lentille) et en séparant
  // un peu le rouge et le bleu, comme le verre de macOS 26.
  function makeBackdrop(scene, wallImg, wp, q) {
    const W = Math.round(scene.offsetWidth * q), H = Math.round(scene.offsetHeight * q);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (wallImg.naturalWidth) {
      const dw = W * wp.size / 100, dh = dw * wallImg.naturalHeight / wallImg.naturalWidth;
      g.drawImage(wallImg, (W - dw) * wp.x / 100, (H - dh) * wp.y / 100, dw, dh);
    }
    // La fenêtre, élément par élément (rectangles arrondis et couleurs calculées).
    const sr = scene.getBoundingClientRect(), k = q * scene.offsetWidth / sr.width;
    const rr = (el) => { const r = el.getBoundingClientRect(); return [(r.left - sr.left) * k, (r.top - sr.top) * k, r.width * k, r.height * k]; };
    const win = scene.querySelector('.pc-window');
    const [wx, wy, ww, wh] = rr(win);
    g.save();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40 * q; g.shadowOffsetY = 18 * q;
    g.fillStyle = '#fff';
    g.beginPath(); g.roundRect(wx, wy, ww, wh, 12 * q); g.fill();
    g.restore();
    g.save();
    g.beginPath(); g.roundRect(wx, wy, ww, wh, 12 * q); g.clip();
    for (const el of win.querySelectorAll('div, i, svg')) {
      const cs = getComputedStyle(el);
      const [x, y, w, h] = rr(el);
      if (el.tagName === 'svg') { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(x + w * .2, y + h * .2, w * .6, h * .6, 3 * q); g.fill(); continue; }
      if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
        g.fillStyle = cs.backgroundColor;
        g.beginPath(); g.roundRect(x, y, w, h, (parseFloat(cs.borderTopLeftRadius) || 0) * q); g.fill();
      }
      if (parseFloat(cs.borderBottomWidth) > 0) { g.fillStyle = cs.borderBottomColor; g.fillRect(x, y + h - q, w, q); }
    }
    g.restore();
    // Flou : réductions successives puis agrandissement lissé (marche partout, sans ctx.filter).
    const shrink = (src, f) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(src.width / f)); t.height = Math.max(1, Math.round(src.height / f)); const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, 0, 0, t.width, t.height); return t; };
    const small = shrink(shrink(shrink(c, 2), 2), 2.5);
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(shrink(small, 0.5), 0, 0, W, H);
    return { W, H, data: og.getImageData(0, 0, W, H).data };
  }

  function drawLens(canvas, bd, box, q, radiusRatio) {
    const cw = Math.max(1, Math.round(box.w * q)), ch = Math.max(1, Math.round(box.h * q));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const g = canvas.getContext('2d');
    const img = g.createImageData(cw, ch);
    const out = img.data, src = bd.data, W = bd.W, H = bd.H;
    const r = Math.min(cw * radiusRatio, ch / 2, cw / 2);
    const bezel = r * 1.05, strength = r * 0.85;
    const ox = box.l * q, oy = box.t * q, hw = cw / 2, hh = ch / 2;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const px = x + 0.5 - hw, py = y + 0.5 - hh;
        const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
        const ex = qx > 0 ? qx : 0, ey = qy > 0 ? qy : 0;
        const depth = r - (Math.hypot(ex, ey) + Math.min(Math.max(qx, qy), 0));
        let dx = 0, dy = 0;
        if (depth > 0 && depth < bezel) {
          let nx, ny;
          if (qx > 0 && qy > 0) { const l = Math.hypot(ex, ey) || 1; nx = ex / l * Math.sign(px); ny = ey / l * Math.sign(py); }
          else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
          const t = 1 - depth / bezel;
          const m = t * t * strength;
          dx = -nx * m; dy = -ny * m;
        }
        const i = (y * cw + x) * 4;
        const sx = ox + x, sy = oy + y;
        for (let c = 0; c < 3; c++) {
          const f = 1 - c * 0.09; // dispersion : le bleu dévie un peu moins que le rouge
          let X = Math.round(sx + dx * f), Y = Math.round(sy + dy * f);
          X = X < 0 ? 0 : X >= W ? W - 1 : X; Y = Y < 0 ? 0 : Y >= H ? H - 1 : Y;
          out[i + c] = src[(Y * W + X) * 4 + c];
        }
        out[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  // ── Icônes ─────────────────────────────────────────────────────────────
  const svg = (inner, { color = 'currentColor', w = 2.2, size } = {}) =>
    `<svg viewBox="0 0 24 24"${size ? ` width="${size}" height="${size}"` : ''} fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const I = {
    back: svg('<path d="m15 18-6-6 6-6"/>', { color: '#000', w: 2.4 }),
    mic: svg('<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>', { color: '#555' }),
    send: svg('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>', { color: '#fff', w: 2.6 }),
    clip: svg('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', { color: '#000', w: 2 }),
    phone: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    trash: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>', { color: '#ff3a2c' }),
    playRed: '<svg viewBox="0 0 24 24" fill="#ff3a2c"><path d="M6 3l14 9-14 9z" stroke="#ff3a2c" stroke-width="2" stroke-linejoin="round"/></svg>',
    playWhite: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M6 3l14 9-14 9z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    // barre des menus
    cc: svg('<rect width="20" height="12" x="2" y="6" rx="6"/><circle cx="16" cy="12" r="2.2" fill="#fff"/>', { color: '#fff', w: 1.8, size: 16 }),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>', { color: '#fff', w: 2.2, size: 14 }),
    wifi: svg('<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>', { color: '#fff', w: 2.2, size: 16 }),
    battery: '<svg width="24" height="12" viewBox="0 0 24 12"><rect x=".75" y=".75" width="19.5" height="10.5" rx="3" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/><rect x="2.4" y="2.4" width="13" height="7.2" rx="1.6" fill="#fff"/><path d="M21.8 4.2v3.6" stroke="rgba(255,255,255,.55)" stroke-width="1.4" stroke-linecap="round"/></svg>',
    // barre d'outils de la fenêtre
    share: svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>', { w: 1.8, size: 18 }),
    plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>', { w: 1.8, size: 18 }),
    tabs: svg('<rect width="13" height="13" x="8" y="8" rx="2.5"/><path d="M4 16c-1.1 0-2-.9-2-2V5c0-1.7 1.3-3 3-3h9c1.1 0 2 .9 2 2"/>', { w: 1.8, size: 18 }),
  };
  const CURSOR = `<svg class="pc-cursor" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <g class="pc-arrow" transform="translate(10 7)">
        <path d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z" fill="#fff"/>
        <path d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z" fill="#000"/></g>
      <g class="pc-ibeam" transform="translate(6 1)">
        <path d="M2 1.5c2 0 3 .6 4 1.6 1-1 2-1.6 4-1.6M2 22.5c2 0 3-.6 4-1.6 1 1 2 1.6 4 1.6M6 3v18M3.5 12h5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M2 1.5c2 0 3 .6 4 1.6 1-1 2-1.6 4-1.6M2 22.5c2 0 3-.6 4-1.6 1 1 2 1.6 4 1.6M6 3v18M3.5 12h5" stroke="#000" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>
    </svg>`;

  const EMOJIS = ['🤘🏿', '🌶️', '💜', '✨', '🤪', '🤔', '🧟', '👽', '🐤'];

  // ── « Photos » de contact : dégradés peints, aucun visage ─────────────
  const avatarCache = {};
  function paintAvatar(stops) {
    const key = stops.join();
    if (avatarCache[key]) return avatarCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = 240;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 240, 240);
    lg.addColorStop(0, stops[0]); lg.addColorStop(1, stops[1]);
    g.fillStyle = lg; g.fillRect(0, 0, 240, 240);
    const blob = (x, y, r, col) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 240, 240);
    };
    blob(150, 92, 120, stops[2]);
    blob(70, 190, 110, stops[3]);
    const img = g.getImageData(0, 0, 240, 240);
    let seed = key.length * 31 + 7;
    for (let p = 0; p < img.data.length; p += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = ((seed / 2147483647) - 0.5) * 18;
      img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return (avatarCache[key] = c.toDataURL('image/jpeg', 0.9));
  }
  const PHOTOS = {
    nora: ['#ff7a2f', '#c2185b', 'rgba(255,214,120,.95)', 'rgba(120,40,160,.7)'],
    jules: ['#1d4fd8', '#22c1c3', 'rgba(170,240,255,.9)', 'rgba(20,30,120,.7)'],
    ines: ['#7b2ff7', '#f107a3', 'rgba(255,170,220,.85)', 'rgba(60,20,140,.7)'],
    theo: ['#0f9b6c', '#cddc39', 'rgba(250,255,170,.85)', 'rgba(0,80,90,.6)'],
  };
  const CONTACTS = [
    { id: 'nora', name: 'Nora', photo: 'nora', preview: 'Tu passes à quelle heure ce soir ?' },
    { id: 'sam', name: 'Sam', initials: 'S' },
    { id: 'jules', name: 'Jules', photo: 'jules', preview: 'Trop bien 😂', unread: true },
    { id: 'maya', name: 'Maya', initials: 'M' },
    { id: 'theo', name: 'Théo', photo: 'theo' },
    { id: 'ines', name: 'Inès', photo: 'ines' },
  ];

  // ── HTML ────────────────────────────────────────────────────────────────
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const isEmojiOnly = (t) => /^[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️\s]+$/u.test(t);
  const VOICE_BARS = Array.from({ length: 26 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 0.9 + 3)));
  function msgHTML(m, extra = '') {
    let inner;
    if (m.voice) {
      inner = `<div class="pc-voice"><div class="pc-voice__play">${I.playWhite}</div>
        <div class="pc-voice__bars">${VOICE_BARS.map((b) => `<i style="height:${4.5 + b * 28}px"></i>`).join('')}</div>
        <div class="pc-voice__t">${m.voice}</div></div>`;
    } else if (isEmojiOnly(m.t)) inner = `<div class="pc-emoji-msg">${m.t}</div>`;
    else inner = `<div class="pc-bubble">${esc(m.t)}</div>`;
    return `<div class="pc-msg"${m.me ? ' data-me' : ''}${m.gap ? ' data-gap' : ''}${extra}>${inner}</div>`;
  }

  const convHTML = () => `
    <div class="pc-screen pc-conv">
      <div class="pc-header">
        <div class="pc-circle pc-circle--solid" data-t="back">${I.back}</div>
        <div class="pc-name"></div>
        <div class="pc-circle pc-glass pc-glass--dim" data-t="call">${I.phone}</div>
      </div>
      <div class="pc-list"><div class="pc-list__in"></div></div>
      <div class="pc-fadeblur" data-off></div>
      <div class="pc-bottom" data-off>
        <div class="pc-row">
          <div class="pc-field pc-glass" data-t="field">${I.clip}<div class="pc-field__text"><span class="pc-field__ph">Entrez votre message</span><span class="pc-field__val"></span><i class="pc-caret"></i></div></div>
          <div class="pc-circle pc-glass" data-t="mic">${I.mic}</div>
          <div class="pc-circle pc-glass pc-glass--blue" data-t="send">${I.send}</div>
          <div class="pc-rec pc-glass">
            <div class="pc-rec__btn">${I.trash}</div>
            <div class="pc-rec__wave"></div>
            <div class="pc-rec__btn" data-t="stop"><i class="pc-rec__stop"></i><span class="pc-rec__play">${I.playRed}</span></div>
          </div>
        </div>
        <div class="pc-emojis" data-off>${EMOJIS.map((e) => `<div class="pc-emoji">${e}</div>`).join('')}</div>
        <div class="pc-grabber"></div>
      </div>
    </div>`;

  const homeHTML = () => `
    <div class="pc-screen pc-home" data-off>
      <div class="pc-grid">${CONTACTS.map((c) => `
        <div class="pc-contact" data-c="${c.id}">
          <div class="pc-disc" style="${c.photo ? `background-image:url('${paintAvatar(PHOTOS[c.photo])}')` : ''}">${c.initials || ''}
            <div class="pc-preview"${c.unread ? ' data-unread' : ''}${c.preview ? '' : ' hidden'}><i${c.unread ? '' : ' hidden'}></i><span>${c.preview || ''}</span></div>
          </div>
          <div class="pc-contact__name">${c.name}</div>
        </div>`).join('')}
      </div>
      <div class="pc-fadeblur"></div>
      <div class="pc-search">
        <div class="pc-row">
          <div class="pc-field pc-glass" data-t="search"><div class="pc-field__text"><span class="pc-field__ph">Rechercher</span></div></div>
          <div class="pc-blue-btn pc-glass pc-glass--blue" data-t="go">Rechercher</div>
        </div>
        <div class="pc-grabber" style="margin:13px auto 9px"></div>
      </div>
    </div>`;

  const pillHTML = () => `<div class="pc-pill-anchor"><div class="pc-pill"><div class="pc-pill__inner">
      <div class="pc-pill__body"><canvas class="pc-pill__lens"></canvas><div class="pc-pill__tint"></div>${homeHTML()}${convHTML()}<div class="pc-pill__rim"></div></div></div></div></div>`;

  const sk = (ws) => ws.map((w) => `<i class="pc-sk" style="width:${w}%"></i>`).join('');
  const deskHTML = () => `
    <div class="pc-window">
      <div class="pc-toolbar"><div class="pc-address"></div>${I.share}${I.plus}${I.tabs}</div>
      <div class="pc-page">
        <div class="pc-page__col"><i class="pc-sk pc-sk--h" style="width:58%"></i>${sk([94, 88, 97, 64])}<i class="pc-sk pc-sk--img"></i>${sk([92, 85, 96, 72, 90, 58])}</div>
        <div class="pc-page__side"><i class="pc-sk" style="width:60%"></i><i class="pc-sk pc-sk--card"></i><i class="pc-sk pc-sk--card"></i><i class="pc-sk pc-sk--card"></i></div>
      </div>
    </div>
    <div class="pc-menubar">${I.battery}${I.wifi}${I.search}${I.cc}<span class="pc-clock">Fri 27 Nov&nbsp;&nbsp;9:41</span></div>
    ${pillHTML()}`;

  // ── Une pilule pilotable ───────────────────────────────────────────────
  function pillCtl(root) {
    const el = root.querySelector('.pc-pill');
    const q = (s) => el.querySelector(s);
    const p = {
      el, body: q('.pc-pill__body'),
      conv: q('.pc-conv'), home: q('.pc-home'), name: q('.pc-name'),
      list: q('.pc-list'), listIn: q('.pc-list__in'), bottom: q('.pc-bottom'), fadeblur: q('.pc-conv .pc-fadeblur'),
      row: q('.pc-conv .pc-row'), rec: q('.pc-rec'), wave: q('.pc-rec__wave'),
      emojis: [...el.querySelectorAll('.pc-emoji')], emojiRow: q('.pc-emojis'),
      field: q('[data-t="field"]'), val: q('.pc-field__val'), ph: q('.pc-conv .pc-field__ph'),
      send: q('[data-t="send"]'), call: q('[data-t="call"]'), back: q('[data-t="back"]'), mic: q('[data-t="mic"]'), stop: q('[data-t="stop"]'),
      open: false, screen: 'conv',
      place(x, y, S) {
        Object.assign(el.parentElement.style, { left: `${x}px`, top: `${y}px` });
        el.style.setProperty('--S', S);
      },
      height() {
        if (p.screen === 'home') return 590;
        const content = p.listIn.offsetHeight;
        const room = p.open ? 590 - 138 - p.bottom.offsetHeight - 19 : 285;
        const vis = Math.min(content, room);
        p.list.style.height = `${vis}px`;
        return 138 + vis + (p.open ? p.bottom.offsetHeight + 19 : 28);
      },
      onSize: null,
      fit() {
        const h = p.height();
        el.style.height = `${h}px`;
        p.onSize?.();
      },
      setChat(name, msgs) { p.name.textContent = name; p.listIn.innerHTML = msgs.map((m) => msgHTML(m)).join(''); },
      add(m) {
        p.listIn.insertAdjacentHTML('beforeend', msgHTML(m, ' data-new'));
        const n = p.listIn.lastElementChild;
        p.fit();
        requestAnimationFrame(() => requestAnimationFrame(() => n.removeAttribute('data-new')));
      },
      setOpen(on, stagger = true) {
        p.open = on;
        p.bottom.toggleAttribute('data-off', !on);
        p.fadeblur.toggleAttribute('data-off', !on);
        p.emojis.forEach((e, i) => { e.style.transitionDelay = on && stagger ? `${0.15 + i * 0.045}s` : '0s'; });
        p.emojiRow.toggleAttribute('data-off', !on);
        if (on && stagger) setTimeout(() => p.emojis.forEach((e) => (e.style.transitionDelay = '0s')), 1100);
        p.fit();
      },
      show(which) {
        p.screen = which;
        p.home.toggleAttribute('data-off', which !== 'home');
        p.conv.toggleAttribute('data-off', which !== 'conv');
        p.fit();
      },
      shown(on) { el.toggleAttribute('data-hidden', !on); },
      setDraft(t) {
        p.val.textContent = t;
        p.ph.style.opacity = t ? 0 : 1;
      },
      focus(on) { p.field.toggleAttribute('data-focus', on); },
      hoverEmoji(i) {
        p.emojis.forEach((e, k) => {
          e.toggleAttribute('data-hover', k === i);
          e.toggleAttribute('data-near', i != null && Math.abs(k - i) === 1);
        });
      },
    };
    // La barre d'enregistrement couvre le champ et le micro.
    p.rec.style.width = `${p.field.offsetWidth + 16 + 76}px`;
    return p;
  }

  // ── Montage d'une scène ────────────────────────────────────────────────
  const SCENES = { hero: heroScene, still: stillScene, emoji: emojiScene, voice: voiceScene };
  document.querySelectorAll('[data-pc-stage]').forEach(mount);

  function mount(root) {
    const def = (SCENES[root.dataset.pcStage] || heroScene)();
    root.innerHTML = `<div class="pc-scene">
      <div class="pc-wallpaper" style="background-image:url('${BASE}${def.wallpaper}');background-size:${def.wp.size}% auto;background-position:${def.wp.x}% ${def.wp.y}%"></div>
      ${deskHTML()}${CURSOR}</div>`;
    const scene = root.querySelector('.pc-scene');
    const cursor = root.querySelector('.pc-cursor');
    const win = root.querySelector('.pc-window');
    const p = pillCtl(root);
    let L, sceneScale = 1, gen = 0, visible = false, started = false;

    // Verre : fond redessiné à chaque mise en page, lentille redessinée tant que la pilule change de taille.
    const wallImg = new Image();
    let backdrop = null, lensUntil = 0, lensRaf = 0;
    const lens = root.querySelector('.pc-pill__lens');
    const Q = () => Math.min(2, (window.devicePixelRatio || 1)) * sceneScale * 0.5;
    function paintLens() {
      if (!backdrop) return;
      const r = p.body.getBoundingClientRect(), s = scene.getBoundingClientRect();
      const k = scene.offsetWidth / s.width;
      drawLens(lens, backdrop, { l: (r.left - s.left) * k, t: (r.top - s.top) * k, w: r.width * k, h: r.height * k }, Q(), 72 / 727);
    }
    function kickLens(ms = 750) {
      lensUntil = Math.max(lensUntil, performance.now() + ms);
      if (lensRaf) return;
      const f = () => { paintLens(); lensRaf = performance.now() < lensUntil ? requestAnimationFrame(f) : 0; };
      lensRaf = requestAnimationFrame(f);
    }
    function rebuildBackdrop() {
      backdrop = makeBackdrop(scene, wallImg, def.wp, Q());
      kickLens(50);
    }
    p.onSize = () => kickLens();
    p.el.addEventListener('transitionrun', () => kickLens(800));

    const ctx = {
      root, p, get L() { return L; },
      $: (s) => root.querySelector(s),
      wait(ms) {
        const my = gen;
        return new Promise((res, rej) => {
          let left = ms, last = performance.now();
          const f = (now) => {
            if (my !== gen) return rej(STOP);
            if (visible) left -= now - last;
            last = now;
            if (left <= 0) res(); else requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        });
      },
      pos(el, fx = 0.5, fy = 0.5) {
        const r = el.getBoundingClientRect(), s = scene.getBoundingClientRect();
        return { x: (r.left - s.left + r.width * fx) / sceneScale, y: (r.top - s.top + r.height * fy) / sceneScale };
      },
      cx: 0, cy: 0,
      place(x, y) {
        ctx.cx = x; ctx.cy = y;
        cursor.style.transition = 'none';
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      async move(x, y, ms) {
        const d = Math.hypot(x - ctx.cx, y - ctx.cy);
        ms = ms ?? Math.min(1000, Math.max(450, d * 3));
        cursor.style.transition = `transform ${ms}ms cubic-bezier(.45, 0, .1, 1), opacity .3s ease`;
        cursor.style.transform = `translate(${x}px, ${y}px)`;
        ctx.cx = x; ctx.cy = y;
        await ctx.wait(ms);
      },
      async moveTo(el, fx, fy, ms) { const q = ctx.pos(el, fx, fy); await ctx.move(q.x, q.y, ms); },
      async click(el, hold = 130) {
        cursor.style.transition = 'transform .1s ease, opacity .3s ease';
        cursor.style.transform = `translate(${ctx.cx}px, ${ctx.cy}px) scale(.86)`;
        el?.setAttribute('data-down', '');
        await ctx.wait(hold);
        cursor.style.transform = `translate(${ctx.cx}px, ${ctx.cy}px)`;
        el?.removeAttribute('data-down');
        await ctx.wait(60);
      },
      kind(k) { cursor.dataset.kind = k; },
      showCursor(on) { cursor.toggleAttribute('data-shown', on); },
      snap(fn) {
        root.setAttribute('data-snap', '');
        p.el.removeAttribute('data-animate');
        fn();
        void root.offsetHeight;
        requestAnimationFrame(() => requestAnimationFrame(() => { root.removeAttribute('data-snap'); p.el.setAttribute('data-animate', ''); }));
      },
      async type(text, base = '') {
        const chars = [...text];
        for (let i = 1; i <= chars.length; i++) {
          p.setDraft(base + chars.slice(0, i).join(''));
          await ctx.wait(60 + (chars[i - 1] === ' ' ? 60 : 0));
        }
      },
    };

    function applyLayout() {
      const W = root.clientWidth || 582;
      const compact = W < 500;
      L = compact ? { w: 352, h: 340, S: 0.42 } : { w: 460, h: 350, S: 0.46 };
      root.dataset.layout = compact ? 'compact' : 'wide';
      sceneScale = W / L.w;
      root.style.height = `${L.h * sceneScale}px`;
      Object.assign(scene.style, { width: `${L.w}px`, height: `${L.h}px`, transform: `scale(${sceneScale})` });
      // La fenêtre est ouverte en grand, décalée vers la gauche : on n'en voit que le coin haut droit.
      Object.assign(win.style, { left: `${L.w - (L.w > 400 ? 200 : 150) - 900}px`, top: '42px', width: '900px', height: '700px' });
      p.place(L.w - 10, 32, L.S);
      p.rec.style.width = `${p.field.offsetWidth + 16 + 76}px`;
      p.fit();
      rebuildBackdrop();
    }
    wallImg.onload = () => rebuildBackdrop();

    async function loop() {
      const my = ++gen;
      try {
        for (;;) {
          ctx.snap(() => def.reset(ctx));
          await ctx.wait(80);
          await def.play(ctx);
          if (my !== gen) return;
        }
      } catch (e) { if (e !== STOP) console.error(e); }
    }

    applyLayout();
    wallImg.src = BASE + def.wallpaper;
    const still = reduceMotion || !def.play;
    ctx.snap(() => (still ? def.poster(ctx) : def.reset(ctx)));

    let lastW = root.clientWidth;
    new ResizeObserver(() => {
      if (root.clientWidth === lastW) return;
      lastW = root.clientWidth;
      applyLayout();
      if (!still && started) loop();
    }).observe(root);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started && !still) { started = true; loop(); }
    }, { threshold: 0.35 }).observe(root);
  }

  // ════════════════════════════════════════════════════════════════════
  // Intro : la notif arrive, s'ouvre au survol, puis on choisit une autre conversation
  // ════════════════════════════════════════════════════════════════════
  function heroScene() {
    const NORA = [{ t: 'Coucou !' }, { t: 'Tu passes à quelle heure ce soir ?' }];
    const JULES = [{ t: 'Regarde la vidéo que je t’ai envoyée', me: true }, { t: 'Trop bien 😂', gap: true }];
    return {
      wallpaper: 'wallpaper-1.jpg',
      wp: { size: 230, x: 50, y: 30 },
      reset(ctx) {
        const { p } = ctx;
        p.setChat('Nora', NORA); p.setDraft(''); p.focus(false);
        p.show('conv'); p.setOpen(false, false); p.shown(false);
        ctx.$('[data-c="jules"]').removeAttribute('data-hover');
        ctx.kind('arrow'); ctx.showCursor(true);
        ctx.place(ctx.L.w * 0.2, ctx.L.h * 0.62);
      },
      poster(ctx) {
        const { p } = ctx;
        p.show('home'); p.shown(true); ctx.showCursor(false);
      },
      async play(ctx) {
        const { p } = ctx;
        await ctx.wait(700);
        p.shown(true);                                    // la notif arrive, compacte
        await ctx.wait(1800);
        await ctx.moveTo(p.list, 0.5, 0.55);             // survol : toute la pilule s'ouvre
        p.setOpen(true); p.focus(true);
        await ctx.wait(1500);
        await ctx.moveTo(p.back, 0.5, 0.5, 700);         // retour à l'accueil
        await ctx.click(p.back);
        p.focus(false);
        p.show('home');
        await ctx.wait(1100);
        const jules = ctx.$('[data-c="jules"]');
        await ctx.moveTo(jules.querySelector('.pc-disc'), 0.5, 0.6, 800);
        jules.setAttribute('data-hover', '');
        await ctx.wait(450);
        await ctx.click(jules);                           // on choisit une conversation
        jules.removeAttribute('data-hover');
        p.setChat('Jules', JULES);
        p.show('conv');
        await ctx.wait(2600);
        await ctx.move(ctx.L.w * 0.2, ctx.L.h * 0.66, 900); // la souris s'en va : elle se replie et part
        await ctx.wait(400);
        p.setOpen(false);
        await ctx.wait(800);
        p.shown(false);
        await ctx.wait(900);
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // Image fixe : la conversation ouverte
  // ════════════════════════════════════════════════════════════════════
  function stillScene() {
    return {
      wallpaper: 'wallpaper-2.jpg',
      wp: { size: 190, x: 70, y: 18 },
      poster(ctx) {
        const { p } = ctx;
        p.setChat('Nora', [{ t: 'Tu passes à quelle heure ce soir ?' }, { t: 'J’arrive vers 20h 🍰', me: true, gap: true }]);
        p.show('conv'); p.setOpen(true, false); p.shown(true);
        ctx.showCursor(false);
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // Emojis : ils vont dans le message, rien ne part avant « envoyer »
  // ════════════════════════════════════════════════════════════════════
  function emojiScene() {
    const START = [{ t: 'Ce soir chez moi ?' }, { t: 'Tu ramènes quoi ?' }];
    const TEXT = 'Des chips ';
    const PICKS = [1, 4];
    return {
      wallpaper: 'wallpaper-3.jpg',
      wp: { size: 200, x: 60, y: 22 },
      reset(ctx) {
        const { p } = ctx;
        p.setChat('Nora', START); p.setDraft(''); p.focus(false); p.hoverEmoji(null);
        p.show('conv'); p.setOpen(true, false); p.shown(false);
        ctx.kind('arrow'); ctx.showCursor(true);
        ctx.place(ctx.L.w * 0.16, ctx.L.h * 0.7);
      },
      poster(ctx) {
        this.reset(ctx);
        ctx.p.setDraft(TEXT + PICKS.map((i) => EMOJIS[i]).join(''));
        ctx.p.shown(true); ctx.showCursor(false);
      },
      async play(ctx) {
        const { p } = ctx;
        await ctx.wait(300);
        p.shown(true);
        await ctx.wait(1100);
        await ctx.moveTo(p.field, 0.4, 0.5);
        ctx.kind('text');
        await ctx.click(null);
        p.focus(true);
        await ctx.wait(300);
        await ctx.type(TEXT);
        ctx.kind('arrow');
        let draft = TEXT;
        for (const i of PICKS) {
          await ctx.moveTo(p.emojis[i], 0.5, 0.55, 650);
          p.hoverEmoji(i);
          await ctx.wait(280);
          p.emojis[i].setAttribute('data-pop', '');
          await ctx.click(null, 110);
          p.emojis[i].removeAttribute('data-pop');
          draft += EMOJIS[i];
          p.setDraft(draft);                              // dans le champ, pas envoyé
          await ctx.wait(450);
        }
        p.hoverEmoji(null);
        await ctx.wait(500);
        await ctx.moveTo(p.send, 0.5, 0.5, 600);
        await ctx.click(p.send);
        p.setDraft('');
        p.add({ t: draft, me: true, gap: true });
        await ctx.wait(2600);
        await ctx.move(ctx.L.w * 0.16, ctx.L.h * 0.7, 900); // la souris s'en va, la pilule repart
        p.focus(false);
        await ctx.wait(300);
        p.setOpen(false);
        await ctx.wait(700);
        p.shown(false);
        await ctx.wait(700);
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // Vocal : un clic sur le micro, un clic pour arrêter, un clic pour envoyer
  // ════════════════════════════════════════════════════════════════════
  function voiceScene() {
    const START = [{ t: 'Tu me racontes ?' }];
    let timer;
    const bars = (wave, n) => { wave.innerHTML = Array.from({ length: n }, () => '<i style="height:4px"></i>').join(''); };
    return {
      wallpaper: 'wallpaper-1.jpg',
      wp: { size: 210, x: 30, y: 75 },
      reset(ctx) {
        const { p } = ctx;
        clearInterval(timer);
        p.setChat('Maya', START); p.setDraft(''); p.focus(false);
        p.row.removeAttribute('data-rec'); p.rec.removeAttribute('data-done');
        bars(p.wave, 34);
        p.show('conv'); p.setOpen(true, false); p.shown(false);
        ctx.kind('arrow'); ctx.showCursor(true);
        ctx.place(ctx.L.w * 0.16, ctx.L.h * 0.68);
      },
      poster(ctx) {
        this.reset(ctx);
        ctx.p.add({ voice: '0:04', me: true, gap: true });
        ctx.p.shown(true); ctx.showCursor(false);
      },
      async play(ctx) {
        const { p } = ctx;
        await ctx.wait(300);
        p.shown(true);
        await ctx.wait(1100);
        await ctx.moveTo(p.mic, 0.5, 0.5);
        await ctx.click(p.mic);
        p.row.setAttribute('data-rec', '');              // le champ devient la barre d'enregistrement
        let t = 0;
        timer = setInterval(() => {                       // l'onde défile de droite à gauche
          const b = p.wave.firstElementChild;
          b.style.height = `${Math.max(4, 23 * (0.25 + 0.75 * Math.abs(Math.sin(t * 0.9) * Math.cos(t * 0.37))))}px`;
          p.wave.appendChild(b);
          t++;
        }, 110);
        await ctx.moveTo(p.stop, 0.5, 0.5, 900);
        await ctx.wait(2600);
        await ctx.click(p.stop);
        clearInterval(timer);
        p.rec.setAttribute('data-done', '');              // arrêté : on peut réécouter
        await ctx.wait(900);
        await ctx.moveTo(p.send, 0.5, 0.5, 500);
        await ctx.click(p.send);
        p.row.removeAttribute('data-rec');
        p.add({ voice: '0:04', me: true, gap: true });    // le vocal part
        await ctx.wait(2800);
        await ctx.move(ctx.L.w * 0.16, ctx.L.h * 0.68, 900);
        await ctx.wait(300);
        p.setOpen(false);
        await ctx.wait(700);
        p.shown(false);
        await ctx.wait(700);
      },
    };
  }
})();
