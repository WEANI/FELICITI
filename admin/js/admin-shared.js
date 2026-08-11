/* ==========================================================================
   FELICITI — Admin : client Supabase + garde de session partagés.
   Chargé après le SDK Supabase (CDN) sur chaque page admin protégée.
   Chaque page définit `window.ADMIN_BASE` avant ce script ('./' pour
   /admin/, '../' pour /admin/commandes/, etc.) et `window.ADMIN_NAV_ID`
   pour surligner l'entrée active de la sidebar.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var SUPABASE_URL = 'https://wrpiggqshnoykqtmuprx.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_TT-qEm5ADIWQEE0e_qO2NQ_gx3pyZ1O';
  var base = window.ADMIN_BASE || './';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* "consultation" : à regarder au quotidien. "config" : réglages ponctuels,
     séparés visuellement dans la sidebar (voir renderShell). */
  var NAV_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', href: base, group: 'consultation' },
    { id: 'analytics', label: 'Analytique', href: base + 'analytics/', group: 'consultation' },
    { id: 'commandes', label: 'Commandes', href: base + 'commandes/', group: 'consultation' },
    { id: 'projects', label: 'Projets', href: base + 'projects/', group: 'consultation' },
    { id: 'clients', label: 'Clients', href: base + 'clients/', group: 'consultation' },
    { id: 'questionnaires', label: 'Questionnaires', href: base + 'questionnaires/', group: 'consultation' },
    { id: 'paiements', label: 'Paiements', href: base + 'paiements/', group: 'consultation' },
    { id: 'whatsapp', label: 'WhatsApp', href: base + 'whatsapp/', group: 'config' },
    { id: 'parametres', label: 'Paramètres', href: base + 'parametres/', group: 'config' }
  ];

  var BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M9.5 17a2.5 2.5 0 005 0"/></svg>';

  function renderShell(activeId, email) {
    var sidebar = document.getElementById('admin-sidebar-slot');
    if (!sidebar) return;
    var nav = '';
    var currentGroup = null;
    NAV_ITEMS.forEach(function (item) {
      if (item.group !== currentGroup) {
        if (currentGroup !== null) nav += '<div class="admin-nav-sep"></div>';
        currentGroup = item.group;
      }
      var cls = item.id === activeId ? ' class="active"' : '';
      nav += '<a href="' + item.href + '"' + cls + '>' + item.label + '</a>';
    });
    sidebar.innerHTML =
      '<div class="admin-sidebar-mark">FELICIT<span>I</span></div>' +
      '<div class="admin-sidebar-sub">Admin</div>' +
      '<div class="admin-notif-wrap" id="admin-notif-wrap">' +
        '<button class="admin-notif-btn" id="admin-notif-btn" type="button" aria-label="Notifications">' + BELL_SVG + '</button>' +
      '</div>' +
      '<nav class="admin-nav">' + nav + '</nav>' +
      '<div class="admin-sidebar-foot">' +
        '<div class="admin-sidebar-email">' + (email || '') + '</div>' +
        '<button class="admin-signout" id="admin-signout-btn" type="button">Se déconnecter</button>' +
      '</div>';
    var btn = document.getElementById('admin-signout-btn');
    if (btn) btn.addEventListener('click', signOut);
    setupNotifications();
  }

  /* ---------- Notifications (cloche sidebar) ----------
     Alimentées par des triggers Postgres (voir migration notifications_system) :
     nouvelle demande de devis, nouvelle commande, questionnaire reçu, paiement
     échoué. Rien n'est écrit ici côté client, juste lu/marqué-lu + un canal
     Realtime pour la mise à jour live sans recharger la page. */
  function setupNotifications() {
    var wrap = document.getElementById('admin-notif-wrap');
    var btn = document.getElementById('admin-notif-btn');
    if (!wrap || !btn) return;
    var items = [];
    var panelOpen = false;

    function timeAgo(dateStr) {
      var mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
      if (mins < 1) return 'à l’instant';
      if (mins < 60) return 'il y a ' + mins + ' min';
      var h = Math.floor(mins / 60);
      if (h < 24) return 'il y a ' + h + 'h';
      return 'il y a ' + Math.floor(h / 24) + 'j';
    }

    function renderBadge() {
      var unread = items.filter(function (n) { return !n.lue; }).length;
      var existing = document.getElementById('admin-notif-badge');
      if (existing) existing.remove();
      if (unread > 0) {
        btn.insertAdjacentHTML('beforeend',
          '<span class="admin-notif-badge" id="admin-notif-badge">' + (unread > 9 ? '9+' : unread) + '</span>');
      }
    }

    function renderPanel() {
      var existing = document.getElementById('admin-notif-panel');
      if (existing) existing.remove();
      if (!panelOpen) return;
      var body = items.length
        ? items.map(function (n) {
            return '<a class="admin-notif-item' + (n.lue ? '' : ' unread') + '" href="' + (n.lien || (base)) + '" data-id="' + n.id + '">' +
              '<div class="admin-notif-item-title">' + n.titre + '</div>' +
              (n.message ? '<div class="admin-notif-item-msg">' + n.message + '</div>' : '') +
              '<div class="admin-notif-item-time">' + timeAgo(n.created_at) + '</div>' +
            '</a>';
          }).join('')
        : '<div class="admin-notif-empty">Aucune notification pour l’instant.</div>';
      wrap.insertAdjacentHTML('beforeend',
        '<div class="admin-notif-panel" id="admin-notif-panel">' +
          '<div class="admin-notif-panel-head"><span>Notifications</span><button type="button" id="admin-notif-markall">Tout marquer lu</button></div>' +
          body +
        '</div>');
      var markAllBtn = document.getElementById('admin-notif-markall');
      if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);
      Array.prototype.forEach.call(document.querySelectorAll('.admin-notif-item'), function (a) {
        a.addEventListener('click', function () {
          var id = a.getAttribute('data-id');
          var n = items.filter(function (x) { return x.id === id; })[0];
          if (n && !n.lue) {
            n.lue = true;
            sb.from('notifications').update({ lue: true }).eq('id', id).then(function () {});
            renderBadge();
          }
        });
      });
    }

    function loadNotifications() {
      sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
        .then(function (res) {
          items = res.data || [];
          renderBadge();
          renderPanel();
        });
    }

    function markAllRead() {
      var unreadIds = items.filter(function (n) { return !n.lue; }).map(function (n) { return n.id; });
      items.forEach(function (n) { n.lue = true; });
      renderBadge();
      renderPanel();
      if (unreadIds.length) sb.from('notifications').update({ lue: true }).in('id', unreadIds).then(function () {});
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      panelOpen = !panelOpen;
      renderPanel();
    });
    document.addEventListener('click', function (e) {
      if (panelOpen && !wrap.contains(e.target)) { panelOpen = false; renderPanel(); }
    });

    loadNotifications();

    /* Live : une nouvelle notification apparaît sans recharger la page. */
    sb.channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, function (payload) {
        items.unshift(payload.new);
        renderBadge();
        if (panelOpen) renderPanel();
      })
      .subscribe();
  }

  function signOut() {
    sb.auth.signOut().then(function () {
      window.location.replace(base + 'connexion/');
    });
  }

  /* Vérifie la session ET l'appartenance à la table admins (RPC is_admin).
     Redirige vers la connexion si l'une des deux échoue. Résout avec
     { session, email } si tout est en ordre. */
  function requireSession() {
    return sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) {
        window.location.replace(base + 'connexion/');
        return null;
      }
      return sb.rpc('is_admin').then(function (r) {
        if (r.error || r.data !== true) {
          sb.auth.signOut().then(function () {
            window.location.replace(base + 'connexion/?refuse=1');
          });
          return null;
        }
        if (window.ADMIN_NAV_ID) renderShell(window.ADMIN_NAV_ID, session.user.email);
        return { session: session, email: session.user.email };
      });
    });
  }

  window.FeliAdmin = {
    sb: sb,
    base: base,
    requireSession: requireSession,
    signOut: signOut
  };
})(window, document);
