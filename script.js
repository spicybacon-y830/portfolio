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

// mobile "+" menu toggle
const menuToggle = document.getElementById('mobile-menu-toggle');
const menuPanel = document.getElementById('mobile-menu-panel');
menuToggle.addEventListener('click', () => {
  const isOpen = menuPanel.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

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
(function () {
  const SCROLL_SPEED = 1;
  const EASE_PER_SECOND = 0.998;

  let target = window.scrollY;
  let current = target;
  let lastTimestamp = null;
  let running = false;

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

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // let pinch-zoom pass through untouched
    if (document.documentElement.classList.contains('lightbox-open')) return; // Photos lightbox open: page stays put
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // let horizontal trackpad swipes (back/forward navigation) pass through untouched
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    e.preventDefault();
    target = Math.min(maxScroll, Math.max(0, target + e.deltaY * SCROLL_SPEED));

    if (!running) {
      running = true;
      current = window.scrollY;
      lastTimestamp = null;
      requestAnimationFrame(step);
    }
  }, { passive: false });
})();
