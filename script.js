// live clock
function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(now);
  document.getElementById('clock-time').textContent = time;
}
updateClock();
setInterval(updateClock, 1000);

// mobile "+" menu toggle
const menuToggle = document.getElementById('mobile-menu-toggle');
const menuIcon = document.getElementById('mobile-menu-icon');
const menuPanel = document.getElementById('mobile-menu-panel');
menuToggle.addEventListener('click', () => {
  const isOpen = menuPanel.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuIcon.src = isOpen ? 'assets/close-icon.svg' : 'assets/plus-icon.svg';
});

// site-wide, slightly slower wheel scroll (same SCROLL_SPEED value used by
// Home's marquee, for a consistent feel). Only kicks in where the page
// actually has room to scroll - on Home desktop (locked, marquee owns the
// wheel) maxScroll is 0 so this stays out of the way entirely. Only wheel
// input is touched; keyboard, scrollbar drag and touch scrolling stay native.
(function () {
  const SCROLL_SPEED = 0.95;
  const EASE_PER_SECOND = 0.92;

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
