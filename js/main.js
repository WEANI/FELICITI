/* ============================================================
   FELICITI — hero scroll-driven
   Séquence de frames webp scrubée au scroll (technique Apple)
   Lenis + GSAP ScrollTrigger · chapitres synchronisés · reveal
   Fallback mobile / reduced-motion : lecture vidéo + timeupdate
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Réglages ---------- */
  var FRAME_COUNT = 181;                      /* hero : nb de frames extraites (voir README) */
  var FRAME_DIR   = 'public/hero/frames/';
  var SLP_COUNT   = 165;                      /* section « Sous le pouce » : nb de frames */
  var SLP_DIR     = 'public/sous-le-pouce/frames/';
  var REVEAL_AT   = 0.90;                     /* progression à laquelle la révélation apparaît */
  var CHAP_SPAN   = 0.13;                     /* durée de visibilité d'un chapitre (± autour de data-at) */

  function slpSrc(i) {
    var n = String(i + 1);
    while (n.length < 3) n = '0' + n;
    return SLP_DIR + 'slp_' + n + '.webp';
  }

  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Mode vidéo (scroll natif) dès qu'on est sur un écran étroit OU tactile.
     Lenis (mode scrub) détournerait le scroll au doigt sur mobile/tablette :
     on ne l'active donc que sur un pointeur fin (souris/trackpad). */
  var isMobile = window.matchMedia('(max-width: 768px)').matches
              || window.matchMedia('(pointer: coarse)').matches;

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
        /* Vidéo verticale 9:16 dédiée au mobile */
        video.classList.add('on');
        video.src = 'public/hero/hero-mobile.mp4';
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.load();
        var tryPlay = function () {
          if (!video.paused) return;
          var pl = video.play();
          if (pl && pl.catch) pl.catch(function () {});
        };
        tryPlay();
        /* iOS/Low-Power peut différer l'autoplay : on relance à chaque geste
           tant que la vidéo n'a pas démarré (la garde ci-dessus rend l'appel
           inoffensif une fois qu'elle joue). */
        ['touchstart', 'pointerdown', 'scroll'].forEach(function (ev) {
          window.addEventListener(ev, tryPlay, { passive: true });
        });
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
    slpVideoMode();
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

  /* ============================================================
     SECTION 6 — scrub « Sous le pouce »
     Préchargement DIFFÉRÉ (IntersectionObserver ~1500px avant) :
     le hero garde la priorité réseau au chargement initial.
     ============================================================ */
  var slpSection = document.getElementById('sous-le-pouce');
  if (slpSection) {
    var slpCanvas = document.getElementById('slp-canvas');
    var slpCtx = slpCanvas.getContext('2d');
    var slpTint = slpSection.querySelector('.slp-tint');
    var slpChaps = Array.prototype.slice.call(slpSection.querySelectorAll('.slp-chap'));
    var slpImgs = new Array(SLP_COUNT);
    var slpLoaded = new Array(SLP_COUNT);
    var slpState = { frame: 0 };
    var slpStarted = false;

    var resizeSlp = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      slpCanvas.width  = slpCanvas.clientWidth  * dpr;
      slpCanvas.height = slpCanvas.clientHeight * dpr;
    };
    resizeSlp();

    var renderSlp = function (frame) {
      var f = Math.max(0, Math.min(SLP_COUNT - 1, Math.round(frame)));
      if (!slpLoaded[f]) {
        for (var d = 1; d < SLP_COUNT; d++) {
          if (f - d >= 0 && slpLoaded[f - d]) { f = f - d; break; }
          if (f + d < SLP_COUNT && slpLoaded[f + d]) { f = f + d; break; }
        }
        if (!slpLoaded[f]) return;
      }
      var img = slpImgs[f];
      var cw = slpCanvas.width, ch = slpCanvas.height;
      var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * s, h = img.naturalHeight * s;
      slpCtx.clearRect(0, 0, cw, ch);
      slpCtx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    var preloadSlp = function () {
      if (slpStarted) return;
      slpStarted = true;
      var BATCH = 30, count = 0;
      (function batch(start) {
        if (start >= SLP_COUNT) return;
        var end = Math.min(start + BATCH, SLP_COUNT), jobs = [];
        for (var i = start; i < end; i++) (function (idx) {
          jobs.push(new Promise(function (res) {
            var im = new Image();
            im.onload = im.onerror = function () {
              slpImgs[idx] = im; slpLoaded[idx] = true; count++;
              if (count === 15) { slpSection.classList.add('ready'); renderSlp(slpState.frame); }
              res();
            };
            im.src = slpSrc(idx);
          }));
        })(i);
        Promise.all(jobs).then(function () { batch(end); });
      })(0);
    };

    /* Déclenche le préchargement ~1500px avant l'arrivée sur la section */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { preloadSlp(); io.disconnect(); }
        });
      }, { rootMargin: '1500px 0px' });
      io.observe(slpSection);
    } else {
      window.addEventListener('load', function () { setTimeout(preloadSlp, 2500); });
    }

    ScrollTrigger.create({
      trigger: '#sous-le-pouce',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.7,
      onUpdate: function (self) {
        var p = self.progress;
        slpState.frame = p * (SLP_COUNT - 1);
        renderSlp(slpState.frame);
        slpChaps.forEach(function (el) {
          var at = parseFloat(el.getAttribute('data-at'));
          el.classList.toggle('on', p >= at - CHAP_SPAN / 2 && p <= at + CHAP_SPAN);
        });
        /* tint chaud local : s'intensifie vers la fin du scrub */
        if (slpTint) slpTint.style.opacity = (p * 0.5).toFixed(3);
      }
    });

    var rtSlp;
    window.addEventListener('resize', function () {
      clearTimeout(rtSlp);
      rtSlp = setTimeout(function () { resizeSlp(); renderSlp(slpState.frame); }, 160);
    });
  }

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

  /* ---------- Section 6, mode vidéo (mobile / reduced-motion) ---------- */
  function slpVideoMode() {
    var sec = document.getElementById('sous-le-pouce');
    if (!sec) return;
    var v = document.getElementById('slp-video');
    var chaps = Array.prototype.slice.call(sec.querySelectorAll('.slp-chap'));
    if (reduced || !v) return; /* reduced : poster statique, rien d'autre */
    /* Vidéo verticale 9:16 dédiée au mobile, en boucle */
    v.src = 'public/sous-le-pouce/sous-le-pouce-mobile.mp4';
    v.loop = true;
    v.muted = true;
    v.setAttribute('playsinline', '');
    v.classList.add('on');
    var slpInView = false;
    /* Ne (re)lance que si la section est visible ET la vidéo en pause :
       inoffensif à répéter, ne joue jamais hors écran. */
    var playSlp = function () {
      if (!slpInView || !v.paused) return;
      var pl = v.play();
      if (pl && pl.catch) pl.catch(function () {});
    };
    ['touchstart', 'pointerdown', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, playSlp, { passive: true });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            slpInView = true;
            v.preload = 'auto';
            playSlp();
          } else {
            slpInView = false;
            v.pause();
          }
        });
      }, { rootMargin: '200px 0px' });
      io.observe(sec);
    } else {
      slpInView = true;
      v.preload = 'auto';
      playSlp();
    }
    v.addEventListener('timeupdate', function () {
      var p = v.duration ? v.currentTime / v.duration : 0;
      chaps.forEach(function (el) {
        var at = parseFloat(el.getAttribute('data-at'));
        el.classList.toggle('on', p >= at - CHAP_SPAN / 2 && p <= at + CHAP_SPAN);
      });
    });
  }
})();
