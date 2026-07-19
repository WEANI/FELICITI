/* ============================================================
   FELICITI — hero scroll-driven
   Séquence de frames webp scrubée au scroll (technique Apple)
   Lenis + GSAP ScrollTrigger · chapitres synchronisés · reveal
   Fallback mobile / reduced-motion : lecture vidéo + timeupdate
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Réglages ---------- */
  var FRAME_COUNT = 181;                      /* nb de frames extraites (voir README) */
  var FRAME_DIR   = 'public/hero/frames/';
  var REVEAL_AT   = 0.90;                     /* progression à laquelle la révélation apparaît */
  var CHAP_SPAN   = 0.13;                     /* durée de visibilité d'un chapitre (± autour de data-at) */

  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;

  var loader    = document.getElementById('loader');
  var loaderFill= document.getElementById('loader-fill');
  var section   = document.getElementById('hero-scroll');
  var canvas    = document.getElementById('hero-canvas');
  var poster    = document.getElementById('hero-poster');
  var video     = document.getElementById('hero-video');
  var dust      = document.getElementById('hero-dust');
  var reveal    = document.getElementById('hero-reveal');
  var cue       = document.getElementById('scroll-cue');
  var tint      = document.querySelector('.tint');
  var chapitres = Array.prototype.slice.call(document.querySelectorAll('.chapitre'));

  function src(i) {
    var n = String(i + 1);
    while (n.length < 3) n = '0' + n;
    return FRAME_DIR + 'frame_' + n + '.webp';
  }

  /* Si les CDN (gsap/Lenis) n'ont pas encore répondu, retenter une fois
     au window.load avant de se rabattre sur le mode vidéo. */
  if (!reduced && !isMobile && (typeof gsap === 'undefined' || typeof Lenis === 'undefined')) {
    if (!window.__feliciti_retry) {
      window.__feliciti_retry = true;
      window.addEventListener('load', function () { setTimeout(init, 300); });
      return;
    }
  }
  init();

  function init() {

  /* ============================================================
     MODE VIDÉO — mobile & prefers-reduced-motion
     Pas de scrub : lecture douce, chapitres sur timeupdate.
     ============================================================ */
  if (reduced || isMobile || typeof gsap === 'undefined') {
    document.body.classList.add('hero-video-mode');
    if (loader) loader.classList.add('done');
    if (video) {
      video.preload = 'auto';
      var showReveal = function () {
        reveal.classList.add('on');
        if (cue) cue.classList.add('off');
      };
      if (reduced) {
        /* Reduced motion : pas d'autoplay — poster + révélation immédiate */
        showReveal();
      } else {
        video.classList.add('on');
        var played = video.play();
        if (played && played.catch) played.catch(showReveal);
        video.addEventListener('timeupdate', function () {
          var p = video.duration ? video.currentTime / video.duration : 0;
          chapitres.forEach(function (el) {
            var at = parseFloat(el.getAttribute('data-at'));
            el.classList.toggle('on', p >= at - CHAP_SPAN / 2 && p <= at + CHAP_SPAN);
          });
          if (p >= REVEAL_AT) showReveal();
        });
        video.addEventListener('ended', showReveal);
      }
    } else {
      reveal.classList.add('on');
    }
    return;
  }

  /* ============================================================
     MODE SCRUB — desktop
     ============================================================ */
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis (scroll pacing : doux, jamais de snap) ---------- */
  var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  window.lenis = lenis; /* exposé pour le défilement d'ancres (site.js) */
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* ---------- Canvas ---------- */
  var ctx = canvas.getContext('2d');
  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }
  resizeCanvas();

  var imgs = new Array(FRAME_COUNT);
  var loaded = new Array(FRAME_COUNT);
  var state = { frame: 0 };

  /* Dessine la frame demandée (ou la plus proche chargée), en cover */
  function render(frame) {
    var f = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(frame)));
    if (!loaded[f]) {
      for (var d = 1; d < FRAME_COUNT; d++) {
        if (f - d >= 0 && loaded[f - d]) { f = f - d; break; }
        if (f + d < FRAME_COUNT && loaded[f + d]) { f = f + d; break; }
      }
      if (!loaded[f]) return;
    }
    var img = imgs[f];
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  /* ---------- Préchargement par lots (loader wordmark + barre bronze) ---------- */
  function preload(onDone) {
    var BATCH = 30, count = 0;
    function batch(start) {
      if (start >= FRAME_COUNT) { onDone(); return; }
      var end = Math.min(start + BATCH, FRAME_COUNT), jobs = [];
      for (var i = start; i < end; i++) (function (idx) {
        jobs.push(new Promise(function (res) {
          var im = new Image();
          im.onload = im.onerror = function () {
            imgs[idx] = im; loaded[idx] = true; count++;
            loaderFill.style.width = Math.round(count / FRAME_COUNT * 100) + '%';
            if (count === 20) { section.classList.add('ready'); render(state.frame); }
            res();
          };
          im.src = src(idx);
        }));
      })(i);
      Promise.all(jobs).then(function () { batch(end); });
    }
    batch(0);
  }

  /* ---------- Scrub : progression scroll → frame + narration ----------
     Le pin est assuré par position:sticky (CSS) ; ScrollTrigger ne fait
     que mesurer la progression sur la hauteur de la section (450vh).   */
  var st = ScrollTrigger.create({
    trigger: '#hero-scroll',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.7,
    onUpdate: function (self) {
      var p = self.progress;

      /* frame */
      state.frame = p * (FRAME_COUNT - 1);
      render(state.frame);

      /* chapitres : fondu autour de leur data-at */
      chapitres.forEach(function (el) {
        var at = parseFloat(el.getAttribute('data-at'));
        el.classList.toggle('on', p >= at - CHAP_SPAN / 2 && p <= at + CHAP_SPAN);
      });

      /* color tint : voile chaud qui se réchauffe vers la fin */
      if (tint) tint.style.opacity = (p * 0.14).toFixed(3);

      /* reveal + cue */
      reveal.classList.toggle('on', p >= REVEAL_AT);
      if (cue) cue.classList.toggle('off', p > 0.02);
    }
  });

  preload(function () {
    loader.classList.add('done');
    render(state.frame);
    ScrollTrigger.refresh();
  });

  /* ---------- Particules : fines poussières dorées (très basse densité) ---------- */
  var dctx = dust.getContext('2d');
  var parts = [];
  function resizeDust() {
    dust.width = dust.clientWidth; dust.height = dust.clientHeight;
  }
  resizeDust();
  for (var i = 0; i < 22; i++) {
    parts.push({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00006 - Math.random() * 0.00012,
      a: 0.08 + Math.random() * 0.20,
      ph: Math.random() * Math.PI * 2
    });
  }
  var dustTime = 0;
  gsap.ticker.add(function () {
    dustTime += 0.016;
    var w = dust.width, h = dust.height;
    dctx.clearRect(0, 0, w, h);
    parts.forEach(function (pt) {
      pt.x += pt.vx; pt.y += pt.vy;
      if (pt.y < -0.02) { pt.y = 1.02; pt.x = Math.random(); }
      if (pt.x < -0.02) pt.x = 1.02; else if (pt.x > 1.02) pt.x = -0.02;
      var tw = pt.a * (0.7 + 0.3 * Math.sin(dustTime * 0.8 + pt.ph));
      dctx.beginPath();
      dctx.arc(pt.x * w, pt.y * h, pt.r, 0, Math.PI * 2);
      dctx.fillStyle = 'rgba(212, 178, 122,' + tw.toFixed(3) + ')';
      dctx.fill();
    });
  });

  /* ---------- Resize ---------- */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      resizeCanvas(); resizeDust(); render(state.frame);
      ScrollTrigger.refresh();
    }, 150);
  });

  } /* fin init() */
})();
