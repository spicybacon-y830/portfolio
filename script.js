// theme switch (footer): toggles dark mode on <html> and remembers it.
// The icon swap and the reveal are CSS (style.css, THEME SWITCH)
(function () {
  const root = document.documentElement;
  const button = document.getElementById('theme-switch');
  if (!button) return;

  function sync() {
    const dark = root.dataset.theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  }

  sync();
  // only animate icon swaps after the first painted frames, so a page that
  // loads in dark mode never spins its switch
  requestAnimationFrame(() => requestAnimationFrame(() => button.classList.add('settled')));

  function setTheme(next) {
    if (next === 'dark') root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  }

  // "reveal": the new theme grows as a circle from the centre of the switch
  // (--x / --y, read by the ::view-transition-new(root) keyframes)
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition) { setTheme(next); return; }
    const { left, top, width, height } = button.getBoundingClientRect();
    root.style.setProperty('--x', `${left + width / 2}px`);
    root.style.setProperty('--y', `${top + height / 2}px`);
    document.startViewTransition(() => setTheme(next));
  });
})();

// mobile "+" menu toggle — panel height follows content (see style.css
// .mobile-menu-panel grid 0fr/1fr). Wrap children once so the open state
// never needs a hard-coded max-height when links are added.
const menuToggle = document.getElementById('mobile-menu-toggle');
const menuPanel = document.getElementById('mobile-menu-panel');
if (menuToggle && menuPanel) {
  if (!menuPanel.querySelector(':scope > .mobile-menu-panel-inner')) {
    const inner = document.createElement('div');
    inner.className = 'mobile-menu-panel-inner';
    while (menuPanel.firstChild) inner.appendChild(menuPanel.firstChild);
    menuPanel.appendChild(inner);
  }
  menuToggle.addEventListener('click', () => {
    const isOpen = menuPanel.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// project pages: "Go back" button above the project name. Falls back to its
// href (index.html) when there's no same-site history to go back to, e.g.
// the page was opened directly in a new tab.
document.querySelectorAll('.back-button').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (window.history.length > 1 && document.referrer) {
      e.preventDefault();
      window.history.back();
    }
  });
});

// site-wide, slightly slower wheel scroll (same SCROLL_SPEED value used by
// Home's marquee, for a consistent feel). Only kicks in where the page
// actually has room to scroll - on Home desktop (locked, marquee owns the
// wheel) maxScroll is 0 so this stays out of the way entirely. Only wheel
// input is touched; keyboard, scrollbar drag and touch scrolling stay native.
// Exposes window.siteScrollTo(y) so the writings TOC can share the same ease.
(function () {
  const SCROLL_SPEED = 1;
  const EASE_PER_SECOND = 0.998;

  let target = window.scrollY;
  let current = target;
  let lastTimestamp = null;
  let running = false;

  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function step(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.25);
    lastTimestamp = timestamp;

    const diff = target - current;
    const ease = 1 - Math.pow(1 - EASE_PER_SECOND, dt);
    current += diff * ease;

    if (Math.abs(target - current) < 0.5) {
      current = target;
      window.scrollTo(0, current);
      running = false;
      return;
    }
    window.scrollTo(0, current);
    requestAnimationFrame(step);
  }

  function startToward(next) {
    target = Math.min(maxY(), Math.max(0, next));
    if (!running) {
      running = true;
      current = window.scrollY;
      lastTimestamp = null;
      requestAnimationFrame(step);
    }
  }

  window.siteScrollTo = function siteScrollTo(y, { instant } = {}) {
    const next = Math.min(maxY(), Math.max(0, y));
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target = next;
      current = next;
      running = false;
      window.scrollTo(0, next);
      return;
    }
    startToward(next);
  };

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // let pinch-zoom pass through untouched
    if (document.documentElement.classList.contains('lightbox-open')) return; // Photos lightbox open: page stays put
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // let horizontal trackpad swipes (back/forward navigation) pass through untouched
    if (maxY() <= 0) return;

    e.preventDefault();
    startToward(target + e.deltaY * SCROLL_SPEED);
  }, { passive: false });
})();

// article videos loop muted; keep them on the poster when motion is reduced
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.writing-media video').forEach((video) => {
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.pause();
  });
}

// Writings articles: left sticky index from h2/h3 (benji.org-style). Built in
// JS so any .writing-page with a .writing-body gets it automatically.
(function initWritingToc() {
  const page = document.querySelector('.writing-page');
  const body = page && page.querySelector('.writing-body');
  const titleEl = page && page.querySelector('.writing-header h1');
  if (!page || !body) return;

  const headings = Array.from(body.querySelectorAll('h2, h3'));
  if (!headings.length) return;

  function slugify(text) {
    const base = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'section';
  }

  const used = new Set();
  function uniqueId(text) {
    let id = slugify(text);
    let n = 2;
    while (used.has(id) || document.getElementById(id)) {
      id = `${slugify(text)}-${n++}`;
    }
    used.add(id);
    return id;
  }

  headings.forEach((heading) => {
    if (!heading.id) heading.id = uniqueId(heading.textContent || '');
  });

  const toc = document.createElement('nav');
  toc.className = 'writing-toc';
  toc.setAttribute('aria-label', 'On this page');

  const list = document.createElement('ul');
  const links = new Map();

  if (titleEl) {
    if (!titleEl.id) titleEl.id = uniqueId(titleEl.textContent || 'top');
    const titleBtn = document.createElement('a');
    titleBtn.className = 'writing-toc-title';
    titleBtn.href = `#${titleEl.id}`;
    titleBtn.textContent = titleEl.textContent || '';
    titleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToId(titleEl.id);
    });
    toc.appendChild(titleBtn);
    links.set(titleEl, titleBtn);
  }

  headings.forEach((heading) => {
    const li = document.createElement('li');
    li.dataset.level = heading.tagName.toLowerCase();
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent || '';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToId(heading.id);
    });
    li.appendChild(a);
    list.appendChild(li);
    links.set(heading, a);
  });

  toc.appendChild(list);
  page.appendChild(toc);

  const HEADER_OFFSET = 96;

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    if (typeof window.siteScrollTo === 'function') window.siteScrollTo(y);
    else window.scrollTo(0, y);
    history.replaceState(null, '', `#${id}`);
  }

  let activeEl = null;
  function setActive(el) {
    if (activeEl === el) return;
    activeEl = el;
    toc.querySelectorAll('[data-active="true"]').forEach((node) => {
      node.removeAttribute('data-active');
    });
    const link = links.get(el);
    if (!link) return;
    link.setAttribute('data-active', 'true');
    const li = link.closest('li');
    if (li) li.setAttribute('data-active', 'true');
  }

  function update() {
    const scrolled = window.scrollY > 24;
    toc.toggleAttribute('data-scrolled', scrolled);

    const marker = HEADER_OFFSET + 8;
    const track = titleEl ? [titleEl, ...headings] : headings;
    let current = null;
    for (const heading of track) {
      if (heading.getBoundingClientRect().top <= marker) current = heading;
    }
    setActive(current || headings[0]);
  }

  update();
  requestAnimationFrame(() => toc.setAttribute('data-ready', 'true'));
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) {
      requestAnimationFrame(() => scrollToId(id));
    }
  }
})();
