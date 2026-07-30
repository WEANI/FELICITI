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
    var panel = brand.querySelector('.brand-nav');
    var closeBtn = brand.querySelector('.menu-close');

    var openMenu = function () {
      brand.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (closeBtn) closeBtn.focus();
    };
    /* returnFocus : ramène le focus sur le hamburger (croix, Échap) */
    var closeMenu = function (returnFocus) {
      brand.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', function () {
      if (brand.classList.contains('nav-open')) closeMenu(true);
      else openMenu();
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });

    /* Clic sur un lien → fermeture (le focus part vers la cible du lien) */
    Array.prototype.forEach.call(brand.querySelectorAll('.brand-nav a'), function (a) {
      a.addEventListener('click', function () { closeMenu(false); });
    });

    /* Touche Échap → fermeture + focus au hamburger */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && brand.classList.contains('nav-open')) {
        closeMenu(true);
      }
    });

    /* Clic hors du panneau (et hors du hamburger) → fermeture */
    document.addEventListener('click', function (e) {
      if (!brand.classList.contains('nav-open')) return;
      if ((panel && panel.contains(e.target)) || toggle.contains(e.target)) return;
      closeMenu(false);
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

  /* ---------- Formulaire de devis → Supabase (table demandes_devis) ----------
     Clé PUBLISHABLE (anon) : conçue pour vivre côté client, protégée par les
     politiques RLS de la base (insertion seule autorisée sur cette table).
     ⇢ Colle ta clé anon ci-dessous (Dashboard Supabase → Project Settings →
       API Keys → « anon / publishable »). Sans elle, le formulaire affiche la
       confirmation + WhatsApp mais n'enregistre rien.                        */
  var SUPABASE_URL      = 'https://wrpiggqshnoykqtmuprx.supabase.co';
  var SUPABASE_ANON_KEY = ''; /* ← colle ta clé publishable (anon) ici */

  var form = document.getElementById('devis-form');
  if (form) {
    var confirmEl = document.getElementById('form-confirm');
    var submitBtn = form.querySelector('button[type="submit"]');

    var showConfirm = function () {
      if (confirmEl) {
        form.style.display = 'none';
        confirmEl.classList.add('show');
        confirmEl.setAttribute('tabindex', '-1');
        confirmEl.focus();
        confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);

      var payload = {
        prenoms:        (data.get('prenoms')    || '').trim() || null,
        date_envisagee: (data.get('date')       || '').trim() || null,
        lieu:           (data.get('lieu')        || '').trim() || null,
        nombre_invites: (data.get('invites')     || '').trim() || null,
        prestation:     (data.get('prestation')  || '').trim() || null,
        email:          (data.get('email')       || '').trim() || null,
        whatsapp:       (data.get('whatsapp')     || '').trim() || null,
        message:        (data.get('histoire')     || '').trim() || null
      };

      if (!SUPABASE_ANON_KEY) { showConfirm(); return; } /* clé non configurée */

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi…'; }

      fetch(SUPABASE_URL + '/rest/v1/demandes_devis', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) { console.warn('FELICITI · devis non enregistré (HTTP ' + r.status + ')'); }
        showConfirm();
      }).catch(function (err) {
        console.warn('FELICITI · devis : erreur réseau', err);
        showConfirm();
      });
    });
  }

  /* ---------- Carrousel « coverflow » des prestations (accueil) ----------
     La carte la plus proche du centre devient active (nette + agrandie).
     Défilement : doigt (mobile), trackpad, molette, et glissé souris (desktop). */
  var cover = document.getElementById('prestaCover');
  if (cover) {
    var cards = Array.prototype.slice.call(cover.children);

    var updateActive = function () {
      var r = cover.getBoundingClientRect();
      var center = r.left + r.width / 2;
      var best = null, bestDist = Infinity;
      cards.forEach(function (card) {
        var cr = card.getBoundingClientRect();
        var d = Math.abs(cr.left + cr.width / 2 - center);
        if (d < bestDist) { bestDist = d; best = card; }
      });
      cards.forEach(function (c) { c.classList.toggle('active', c === best); });
    };
    cover.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);

    /* Glissé à la souris (desktop) — plus naturel pour un coverflow */
    var down = false, startX = 0, startScroll = 0, moved = false;
    cover.addEventListener('mousedown', function (e) {
      down = true; moved = false;
      startX = e.pageX; startScroll = cover.scrollLeft;
      cover.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      cover.scrollLeft = startScroll - dx;
    });
    var endDrag = function () {
      if (!down) return;
      down = false;
      cover.classList.remove('dragging');
    };
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('mouseleave', endDrag);
    /* Un glissé ne doit pas déclencher le lien de la carte */
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) { if (moved) e.preventDefault(); });
      card.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });

    /* Au chargement : centrer la première carte (Le Faire-Part) */
    var centerFirst = function () {
      var first = cards[0];
      if (first) {
        cover.scrollLeft = first.offsetLeft - (cover.clientWidth - first.offsetWidth) / 2;
      }
      updateActive();
    };
    centerFirst();
    window.addEventListener('load', centerFirst);
    setTimeout(centerFirst, 200);
  }
})();
