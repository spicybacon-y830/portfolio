/* Chart scrub for the Suma bento.
   Poster frame is "This week / 130". The cursor walks the weeks, holds
   on the payoff, then the highlight fades out and back in at May 1–7
   so the loop never snaps. Bar heights come from the dashboard frame;
   130 is the labeled This week value. */
(function () {
  const chart = document.getElementById('suma-chart');
  const lightBtn = document.getElementById('suma-light-mode');
  const root = document.documentElement;
  if (!chart && !lightBtn) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (lightBtn) {
    const footer = document.getElementById('theme-switch');

    function syncPressed() {
      const dark = root.dataset.theme === 'dark';
      lightBtn.setAttribute('aria-pressed', String(!dark));
      lightBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      if (footer) {
        footer.setAttribute('aria-pressed', String(dark));
        footer.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      }
    }

    function setTheme(next) {
      if (next === 'dark') root.dataset.theme = 'dark';
      else delete root.dataset.theme;
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncPressed();
    }

    syncPressed();
    new MutationObserver(syncPressed).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    lightBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || reduce) { setTheme(next); return; }
      const rect = lightBtn.getBoundingClientRect();
      root.style.setProperty('--x', `${rect.left + rect.width / 2}px`);
      root.style.setProperty('--y', `${rect.top + rect.height / 2}px`);
      document.startViewTransition(() => setTheme(next));
    });
  }

  if (!chart) return;

  const bars = Array.from(chart.querySelectorAll('.bar'));
  const plot = chart.querySelector('.plot');
  const cursor = chart.querySelector('.scrub-cursor');
  const tip = chart.querySelector('.scrub-tip');
  const tipVal = chart.querySelector('.scrub-val');
  const POSTER = bars.length - 1;
  let index = POSTER;
  let timer = 0;
  let running = false;

  function place(i, snap) {
    index = i;
    const bar = bars[i];
    if (!bar || !plot) return;
    const plotRect = plot.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const fill = bar.querySelector('.bar-fill');
    const fillRect = fill.getBoundingClientRect();
    const x = barRect.right - plotRect.left - 10;
    const y = fillRect.top - plotRect.top + Math.min(18, fillRect.height * 0.22);
    const tipX = barRect.left - plotRect.left + barRect.width / 2;
    const tipY = fillRect.top - plotRect.top;

    if (snap) {
      cursor.style.transition = 'none';
      tip.style.transition = 'none';
    }
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    tip.style.transform = `translate(${tipX}px, ${tipY}px) translate(-50%, calc(-100% - 2px))`;
    tipVal.textContent = bar.dataset.value;

    bars.forEach((node, n) => node.classList.toggle('is-hot', n === i));
    chart.classList.toggle('is-away', i !== POSTER);
    chart.classList.toggle('is-poster', i === POSTER);

    if (snap) {
      void cursor.offsetWidth;
      cursor.style.transition = '';
      tip.style.transition = '';
    }
  }

  function stop() {
    running = false;
    clearTimeout(timer);
  }

  function holdPoster() {
    if (!running) return;
    timer = window.setTimeout(fadeOut, 2400);
  }

  function fadeOut() {
    if (!running) return;
    chart.classList.add('is-faded');
    timer = window.setTimeout(() => {
      if (!running) return;
      place(0, true);
      chart.classList.remove('is-faded');
      step(1);
    }, 620);
  }

  function step(next) {
    if (!running) return;
    timer = window.setTimeout(() => {
      if (!running) return;
      if (next > POSTER) { holdPoster(); return; }
      place(next, false);
      step(next + 1);
    }, 1100);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    chart.classList.add('is-scrubbing');
    if (index !== POSTER || chart.classList.contains('is-faded')) {
      chart.classList.remove('is-faded');
      place(POSTER, true);
    }
    holdPoster();
  }

  place(POSTER, true);

  if (!reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else {
          stop();
          chart.classList.remove('is-faded');
          place(POSTER, true);
        }
      });
    }, { threshold: 0.4 });
    io.observe(chart);

    window.addEventListener('resize', () => place(index, true));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => place(index, true));
    }
  }
})();
