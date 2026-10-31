/* Looping rebuild of the second Sobry mockup.
   One clock per copy (desktop + mobile). Pauses off-screen and when the
   tab is hidden. prefers-reduced-motion holds the finished frame.
   Cycle: fade in the empty state, play the build, hold, fade the whole
   drawing out, then reset while fully transparent and fade in again. */
(function () {
  var STAGE_W = 565.5 * 4;
  var FADE = 700;
  var PLAY0 = FADE;
  var BAR0 = PLAY0 + 240;
  var BAR_DUR = 720;
  var BAR_STAGGER = 95;
  var PRICE0 = PLAY0 + 240;
  var PRICE_DUR = 1180;
  var LINE0 = PLAY0 + 1520;
  var LINE_DUR = 1760;
  var EURO0 = PLAY0 + 2680;
  var EURO_DUR = 1160;
  var TIP0 = PLAY0 + 3280;
  var TIP_DUR = 520;
  var KWH0 = PLAY0 + 3280;
  var KWH_DUR = 920;
  var BUILD_END = KWH0 + KWH_DUR;
  var HOLD_DUR = 3500;
  var FADE_OUT0 = BUILD_END + HOLD_DUR;
  var CYCLE = FADE_OUT0 + FADE;
  var HOLD = BUILD_END + 400;

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var tpl = document.getElementById("sobry-v2-tpl");
  if (!tpl) return;

  var players = [];
  var raf = 0;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function stageOpacity(t) {
    if (t < FADE) return easeInOut(t / FADE);
    if (t < FADE_OUT0) return 1;
    return 1 - easeInOut((t - FADE_OUT0) / FADE);
  }
  function span(t, start, dur) {
    return clamp((t - start) / dur, 0, 1);
  }
  function fmt(value, digits) {
    return value.toFixed(digits).replace(".", ",");
  }
  function indicatorAt(path) {
    var len = path.getTotalLength();
    var best = 0;
    var bestD = Infinity;
    var i;
    for (i = 0; i <= 280; i++) {
      var p = path.getPointAtLength((len * i) / 280);
      var d = (p.x - 148.995) * (p.x - 148.995) + (p.y - 51.906) * (p.y - 51.906);
      if (d < bestD) {
        bestD = d;
        best = i / 280;
      }
    }
    return { len: len, frac: best };
  }

  function paint(ui, t) {
    var i;
    ui.group.style.opacity = String(stageOpacity(t));
    for (i = 0; i < ui.bars.length; i++) {
      var grown = easeOut(span(t, BAR0 + i * BAR_STAGGER, BAR_DUR));
      ui.bars[i].style.transform = "scaleY(" + grown + ")";
    }
    var price = easeOut(span(t, PRICE0, PRICE_DUR));
    ui.price.textContent = fmt(0.309 * price, 3) + "€";

    var lineP = easeInOut(span(t, LINE0, LINE_DUR));
    ui.line.style.strokeDashoffset = String(ui.len * (1 - lineP));

    var euro = easeOut(span(t, EURO0, EURO_DUR));
    ui.euro.textContent = fmt(77.87 * euro, 2) + "€";

    var reach = ui.frac <= 0 ? 1 : clamp((lineP - (ui.frac - 0.015)) / 0.07, 0, 1);
    var appear = easeOut(reach);
    ui.indicator.style.opacity = String(appear);
    ui.stem.style.transform = "scaleY(" + appear + ")";
    ui.ring.style.transform = "scale(" + (0.62 + 0.38 * appear) + ")";

    var tipIn = easeOut(span(t, TIP0, TIP_DUR));
    ui.tip.style.opacity = String(tipIn);
    ui.tip.style.transform = "translateY(calc(" + ((1 - tipIn) * 4) + "px * var(--s)))";

    ui.kwh.textContent = fmt(447.89 * easeOut(span(t, KWH0, KWH_DUR)), 2);
  }

  function fit(root, stage) {
    var w = root.clientWidth;
    if (!w) return;
    stage.style.transform = "scale(" + w / STAGE_W + ")";
  }

  function kick() {
    if (raf) return;
    if (players.some(function (p) { return p.playing; })) raf = requestAnimationFrame(tick);
  }

  function tick(ts) {
    raf = 0;
    var any = false;
    players.forEach(function (p) {
      if (!p.playing) return;
      any = true;
      if (p.last == null) p.last = ts;
      var dt = Math.min(48, ts - p.last);
      p.last = ts;
      p.elapsed = (p.elapsed + dt) % CYCLE;
      paint(p.ui, p.elapsed);
    });
    if (any) raf = requestAnimationFrame(tick);
  }

  document.querySelectorAll("[data-sobry-v2]").forEach(function (root, index) {
    var frag = tpl.content.cloneNode(true);
    var stage = frag.querySelector(".sobry-v2__stage");
    var uid = "sv2stem" + index;
    var grad = frag.querySelector("linearGradient");
    grad.id = uid;
    frag.querySelector(".sv2-stem").setAttribute("stroke", "url(#" + uid + ")");
    root.appendChild(frag);

    var line = root.querySelector(".sv2-line");
    var measured = indicatorAt(line);
    line.style.strokeDasharray = String(measured.len);

    var ui = {
      bars: root.querySelectorAll(".sv2-bar"),
      price: root.querySelector("[data-sv2-price]"),
      euro: root.querySelector("[data-sv2-euro]"),
      kwh: root.querySelector("[data-sv2-kwh]"),
      line: line,
      len: measured.len,
      frac: measured.frac,
      group: root.querySelector(".sv2-group"),
      indicator: root.querySelector(".sv2-indicator"),
      stem: root.querySelector(".sv2-stem-scale"),
      ring: root.querySelector(".sv2-ring"),
      tip: root.querySelector(".sv2-tip")
    };

    fit(root, stage);
    var reduced = reduceQuery.matches;
    paint(ui, reduced ? HOLD : 0);
    root.classList.add("is-ready");

    var player = { root: root, stage: stage, ui: ui, elapsed: reduced ? HOLD : 0, playing: false, intersecting: false, last: null, reduced: reduced };
    players.push(player);

    var ro = new ResizeObserver(function () { fit(root, stage); });
    ro.observe(root);

    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          player.intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
          player.playing = player.intersecting && !player.reduced && document.visibilityState === "visible";
          player.last = null;
          kick();
        });
      }, { threshold: [0, 0.08] });
      io.observe(root);
    }
  });

  document.addEventListener("visibilitychange", function () {
    var visible = document.visibilityState === "visible";
    players.forEach(function (p) {
      p.last = null;
      p.playing = visible && p.intersecting && !p.reduced;
    });
    kick();
  });

  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", function () {
      var reduced = reduceQuery.matches;
      players.forEach(function (p) {
        p.reduced = reduced;
        p.last = null;
        if (reduced) {
          p.playing = false;
          p.elapsed = HOLD;
          paint(p.ui, HOLD);
        } else {
          p.elapsed = 0;
          paint(p.ui, 0);
          p.playing = p.intersecting && document.visibilityState === "visible";
        }
      });
      kick();
    });
  }

  function refitAll() {
    players.forEach(function (p) { fit(p.root, p.stage); });
  }
  window.addEventListener("resize", refitAll);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refitAll);
  }
})();
