/* ==========================================================================
   FELICITI — Espace client : client Supabase + garde de session partagés.
   Chargé après le SDK Supabase (CDN) sur chaque page /espace/ protégée.
   Chaque page définit `window.ESPACE_BASE` avant ce script ('./' pour
   /espace/, '../' pour /espace/connexion/, etc.).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var SUPABASE_URL = 'https://wrpiggqshnoykqtmuprx.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_TT-qEm5ADIWQEE0e_qO2NQ_gx3pyZ1O';
  var base = window.ESPACE_BASE || './';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function signOut() {
    sb.auth.signOut().then(function () {
      window.location.replace(base + 'connexion/');
    });
  }

  /* Vérifie la session ET que ce compte est bien lié à un couple (RPC
     is_client_couple_id, SECURITY DEFINER — ne révèle rien d'autre).
     Redirige vers la connexion si l'une des deux échoue. Résout avec
     { session, coupleId, email }. */
  function requireSession() {
    return sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) {
        window.location.replace(base + 'connexion/');
        return null;
      }
      return sb.rpc('is_client_couple_id').then(function (r) {
        if (r.error || !r.data) {
          sb.auth.signOut().then(function () {
            window.location.replace(base + 'connexion/?refuse=1');
          });
          return null;
        }
        return { session: session, coupleId: r.data, email: session.user.email };
      });
    });
  }

  window.FeliClient = {
    sb: sb,
    base: base,
    requireSession: requireSession,
    signOut: signOut
  };
})(window, document);
