/* ============================================================
   FELICITI — le fil d'or · scroll-scrub engine
   GSAP ScrollTrigger + Lenis · frames webp 12 fps · pacing map
   ============================================================ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (reduced || typeof gsap === 'undefined') {
    document.body.classList.add('reduced');
    var loaderEl = document.getElementById('loader');
    if (loaderEl) loaderEl.classList.add('done');
    return; // frames-clés statiques via CSS, aucun scrub
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis (scroll doux) ---------- */
  var lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  window.lenis = lenis; /* exposé pour le défilement d'ancres (site.js) */
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* ---------- Séquences de frames ---------- */
  var FRAME_COUNT = 181;
  var dir1 = isMobile ? 'public/frames/acte1-m/' : 'public/frames/acte1/';
  var dir2 = isMobile ? 'public/frames/acte2-m/' : 'public/frames/acte2/';

  function src(dir, i) {
    var n = String(i + 1);
    while (n.length < 4) n = '0' + n;
    return dir + 'f_' + n + '.webp';
  }

  function makeSeq(dir) {
    return { dir: dir, imgs: new Array(FRAME_COUNT), loaded: new Array(FRAME_COUNT), started: false, done: false };
  }
  var seq1 = makeSeq(dir1);
  var seq2 = makeSeq(dir2);

  /* Préchargement par lots de 30 (progressif, sans bloquer la 1re peinture) */
  function loadSeq(seq, onProgress, onDone) {
    if (seq.started) return;
    seq.started = true;
    var BATCH = 30;
    var count = 0;

    function loadBatch(start) {
      if (start >= FRAME_COUNT) {
        seq.done = true;
        if (onDone) onDone();
        return;
      }
      var end = Math.min(start + BATCH, FRAME_COUNT);
      var jobs = [];
      for (var i = start; i < end; i++) {
        (function (idx) {
          jobs.push(new Promise(function (resolve) {
            var img = new Image();
            img.onload = img.onerror = function () {
              seq.imgs[idx] = img;
              seq.loaded[idx] = true;
              count++;
              if (onProgress) onProgress(count / FRAME_COUNT);
              resolve();
            };
            img.src = src(seq.dir, idx);
          }));
        })(i);
      }
      Promise.all(jobs).then(function () { loadBatch(end); });
    }
    loadBatch(0);
  }

  /* ---------- Canvas ---------- */
  function setupCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    }
    resize();
    return { canvas: canvas, ctx: ctx, resize: resize };
  }

  var c1 = setupCanvas(document.getElementById('canvas1'));
  var c2 = setupCanvas(document.getElementById('canvas2'));

  /* Rend la frame demandée, ou la plus proche déjà chargée */
  function render(c, seq, frame) {
    var f = Math.round(frame);
    if (!seq.loaded[f]) {
      var found = -1;
      for (var d = 1; d < FRAME_COUNT; d++) {
        if (f - d >= 0 && seq.loaded[f - d]) { found = f - d; break; }
        if (f + d < FRAME_COUNT && seq.loaded[f + d]) { found = f + d; break; }
      }
      if (found === -1) return;
      f = found;
    }
    var img = seq.imgs[f];
    var cw = c.canvas.width, ch = c.canvas.height;
    var scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    var w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    c.ctx.clearRect(0, 0, cw, ch);
    c.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  var state1 = { frame: 0 };
  var state2 = { frame: 0 };

  /* ---------- Timelines à pacing différencié (timecode map) ----------
     Frames = secondes × 12. Durée du tween ∝ distance de scroll :
     tunnels courts (accélérés), scènes longues (lentes).            */

  var SEGS_1 = [
    { to: 36,  d: 3.0 },  /* 0–3 s   couture, café — lent            */
    { to: 60,  d: 0.9 },  /* 3–5 s   thread-tunnel 1 — accéléré      */
    { to: 96,  d: 3.0 },  /* 5–8 s   fenêtre pluie — lent            */
    { to: 120, d: 0.9 },  /* 8–10 s  thread-tunnel 2 — accéléré      */
    { to: 156, d: 3.0 },  /* 10–13 s pique-nique — lent              */
    { to: 180, d: 3.2 }   /* 13–15 s bague — très lent (pause)       */
  ];
  var SEGS_2 = [
    { to: 36,  d: 2.6 },  /* 0–3 s   écrin — lent                    */
    { to: 60,  d: 0.9 },  /* 3–5 s   tunnel diamant — accéléré       */
    { to: 96,  d: 3.0 },  /* 5–8 s   demande golden hour — lent      */
    { to: 120, d: 0.9 },  /* 8–10 s  tunnel dentelle — accéléré      */
    { to: 156, d: 2.2 },  /* 10–13 s grue cathédrale — décélération  */
    { to: 180, d: 3.4 }   /* 13–15 s fin de grue — très lent → CTA   */
  ];

  function buildActe(sectionId, c, seq, state, segs, endDist) {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionId,
        pin: true,
        scrub: 0.8,
        start: 'top top',
        end: '+=' + endDist
      }
    });
    segs.forEach(function (s) {
      tl.to(state, {
        frame: s.to,
        duration: s.d,
        snap: 'frame',
        ease: 'none',
        onUpdate: function () { render(c, seq, state.frame); }
      });
    });
    return tl;
  }

  var end1 = isMobile ? 2500 : 4200;
  var end2 = isMobile ? 2350 : 3900;

  var tl1 = buildActe('#acte1', c1, seq1, state1, SEGS_1, end1);
  var tl2 = buildActe('#acte2', c2, seq2, state2, SEGS_2, end2);

  /* ---------- Textes : jamais pendant un tunnel ----------
     Positions = temps cumulés de la timeline (bornes SEGS).  */

  function cap(tl, el, tIn, tOut) {
    tl.to(el, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power1.out' }, tIn);
    tl.to(el, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, tOut);
  }
  gsap.set(['#cap-pluie', '#cap-picnic', '#cap-bague', '#cap-ecrin'], { y: 24 });

  /* Acte I — bornes : 0 · 3.0 · 3.9 · 6.9 · 7.8 · 10.8 · 14.0 */
  tl1.to(['#hero', '#scroll-cue'], { autoAlpha: 0, duration: 0.8, ease: 'power1.in' }, 0.15);
  cap(tl1, '#cap-pluie', 4.3, 6.4);
  cap(tl1, '#cap-picnic', 8.2, 10.3);
  cap(tl1, '#cap-bague', 11.6, 13.5);

  /* Acte II — bornes : 0 · 2.6 · 3.5 · 6.5 · 7.4 · 9.6 · 13.0 */
  cap(tl2, '#cap-ecrin', 0.35, 2.1);

  /* ---------- Le trait rouge (signature) + color tint ---------- */
  var filPath = document.getElementById('fil-path');
  var fil = document.querySelector('.fil');
  var tint = document.querySelector('.tint');

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) {
      filPath.style.strokeDashoffset = 1000 * (1 - self.progress);
      tint.style.opacity = (self.progress * 0.16).toFixed(3);
    }
  });

  /* Le fil s'affirme dans l'interlude et au final, discret sur les canvases */
  ScrollTrigger.create({
    trigger: '#interlude',
    start: 'top 70%',
    end: 'bottom 20%',
    onToggle: function (self) {
      gsap.to(fil, { opacity: self.isActive ? 1 : 0.45, duration: 0.6 });
    }
  });
  ScrollTrigger.create({
    trigger: '#final',
    start: 'top 60%',
    onToggle: function (self) {
      gsap.to(fil, { opacity: self.isActive ? 0.85 : 0.45, duration: 0.6 });
    }
  });

  /* ---------- Préchargement orchestré ---------- */
  var loader = document.getElementById('loader');
  var loaderFill = document.getElementById('loader-fill');
  var loaderLabel = document.getElementById('loader-label');
  var acte1El = document.getElementById('acte1');
  var acte2El = document.getElementById('acte2');

  loadSeq(seq1, function (p) {
    loaderFill.style.width = Math.round(p * 100) + '%';
    if (p >= 30 / FRAME_COUNT && !acte1El.classList.contains('ready')) {
      acte1El.classList.add('ready');
      render(c1, seq1, state1.frame);
    }
  }, function () {
    loader.classList.add('done');
    render(c1, seq1, state1.frame);
    /* Acte II en différé, une fois l'Acte I complet */
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function () { startSeq2(); });
    } else {
      setTimeout(startSeq2, 800);
    }
  });

  function startSeq2() {
    loadSeq(seq2, null, function () {
      acte2El.classList.add('ready');
      render(c2, seq2, state2.frame);
    });
  }
  /* Filet de sécurité : l'utilisateur approche de l'Acte II */
  ScrollTrigger.create({
    trigger: '#interlude',
    start: 'top bottom',
    once: true,
    onEnter: startSeq2
  });

  /* ---------- Resize ---------- */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      c1.resize(); c2.resize();
      render(c1, seq1, state1.frame);
      render(c2, seq2, state2.frame);
    }, 150);
  });
})();
