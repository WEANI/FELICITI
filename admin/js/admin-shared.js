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

  var NAV_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', href: base },
    { id: 'commandes', label: 'Commandes', href: base + 'commandes/' }
    /* Questionnaires / Clients / Paiements / WhatsApp / Paramètres arrivent
       dans une phase suivante — voir README admin. */
  ];

  function renderShell(activeId, email) {
    var sidebar = document.getElementById('admin-sidebar-slot');
    if (!sidebar) return;
    var nav = NAV_ITEMS.map(function (item) {
      var cls = item.id === activeId ? ' class="active"' : '';
      return '<a href="' + item.href + '"' + cls + '>' + item.label + '</a>';
    }).join('');
    sidebar.innerHTML =
      '<div class="admin-sidebar-mark">FELICIT<span>I</span></div>' +
      '<div class="admin-sidebar-sub">Admin</div>' +
      '<nav class="admin-nav">' + nav + '</nav>' +
      '<div class="admin-sidebar-foot">' +
        '<div class="admin-sidebar-email">' + (email || '') + '</div>' +
        '<button class="admin-signout" id="admin-signout-btn" type="button">Se déconnecter</button>' +
      '</div>';
    var btn = document.getElementById('admin-signout-btn');
    if (btn) btn.addEventListener('click', signOut);
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
