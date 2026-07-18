/* ============================================================
   FELICITI — comportements partagés (toutes pages)
   En-tête au scroll · navigation mobile · formulaire de devis
   ============================================================ */
(function () {
  'use strict';

  var brand = document.querySelector('.brand');
  var toggle = document.querySelector('.nav-toggle');

  /* ---------- En-tête : passe en clair après le hero ---------- */
  if (brand && !brand.classList.contains('solid')) {
    var onScroll = function () {
      if (window.scrollY > window.innerHeight * 0.7) brand.classList.add('scrolled');
      else brand.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Navigation mobile ---------- */
  if (toggle && brand) {
    toggle.addEventListener('click', function () {
      var open = brand.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    Array.prototype.forEach.call(brand.querySelectorAll('.brand-nav a'), function (a) {
      a.addEventListener('click', function () { brand.classList.remove('nav-open'); });
    });
  }

  /* ---------- Défilement d'ancres (compatible ScrollTrigger/Lenis) ---------- */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scrollToTarget = function (target) {
    /* Recalcule les positions pinnées (les sections épinglées insèrent des espaceurs) */
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    var top = Math.round(target.getBoundingClientRect().top + window.scrollY);
    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      /* Sur l'accueil, Lenis contrôle le scroll : viser directement (fiable). */
      if (window.lenis.resize) window.lenis.resize();
      window.lenis.scrollTo(top, { immediate: true });
    } else {
      window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (link) {
    var id = link.getAttribute('href');
    if (id.length < 2) return;
    link.addEventListener('click', function (e) {
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (brand) brand.classList.remove('nav-open');
      scrollToTarget(target);
      history.replaceState(null, '', id);
    });
  });
  /* Ancre au chargement (ex. arrivée depuis une page produit sur /#contact) */
  if (window.location.hash.length > 1) {
    var initial = document.querySelector(window.location.hash);
    if (initial) {
      window.addEventListener('load', function () {
        setTimeout(function () {
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
          scrollToTarget(initial);
        }, 400);
      });
    }
  }

  /* ---------- Formulaire de devis ---------- */
  var form = document.getElementById('devis-form');
  if (form) {
    var confirmEl = document.getElementById('form-confirm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var endpoint = form.getAttribute('action');

      var showConfirm = function () {
        if (confirmEl) {
          form.style.display = 'none';
          confirmEl.classList.add('show');
          confirmEl.focus();
          confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      /* Endpoint Formspree placeholder — remplacer par le vrai. */
      if (endpoint && endpoint.indexOf('formspree.io/f/') !== -1 &&
          endpoint.indexOf('xxxxxxxx') === -1) {
        fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        }).then(showConfirm).catch(showConfirm);
      } else {
        showConfirm();
      }
    });
  }
})();
