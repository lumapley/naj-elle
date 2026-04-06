/* ══════════════════════════════════════════════
   NAJ'ELLE — Authentification (Supabase Auth)
   Requiert : window._supabase + window.ADMIN_EMAIL
              (supabase-client.js)
   ══════════════════════════════════════════════ */

'use strict';

/* Session mise en cache dès le chargement */
let _session = null;

/* Résolution de la session au démarrage */
const _initPromise = window._supabase.auth.getSession().then(({ data }) => {
  _session = data.session || null;
});

/* Maintenir la session à jour en temps réel */
window._supabase.auth.onAuthStateChange((_event, session) => {
  _session = session || null;
});

/* ══════════════════════════════════════════════
   API PUBLIQUE — NajAuth
   ══════════════════════════════════════════════ */
window.NajAuth = {

  /* Attendre la résolution de la session initiale
     Appeler await NajAuth.waitForInit() avant tout
     contrôle isLoggedIn() / isAdmin()             */
  waitForInit() {
    return _initPromise;
  },

  getAdminEmail() {
    return window.ADMIN_EMAIL || 'admin@najelle.fr';
  },

  /* ─── Connexion ─── */
  async login(email, password) {
    const { data, error } = await window._supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      /* Traduction des messages Supabase */
      if (error.message.includes('Invalid login')) {
        throw new Error('Email ou mot de passe incorrect.');
      }
      throw new Error(error.message);
    }
    _session = data.session;
    return data;
  },

  /* ─── Déconnexion ─── */
  async logout() {
    await window._supabase.auth.signOut();
    _session = null;
  },

  /* ─── Vérifications (synchrones, basées sur le cache) ─── */
  isLoggedIn() {
    return !!_session;
  },

  getCurrentUser() {
    return _session?.user || null;
  },

  isAdmin() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.email.toLowerCase() === this.getAdminEmail().toLowerCase();
  },

  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) {
      window.location.href = 'admin.html';
      return false;
    }
    return true;
  },

  /* ─── Mise à jour des identifiants (panneau Settings) ─── */
  async updateCredentials({ email, password }) {
    const updates = {};
    if (email)    updates.email    = email.trim();
    if (password) updates.password = password;

    const { error } = await window._supabase.auth.updateUser(updates);
    if (error) throw new Error(error.message);

    /* Si l'email a changé, mettre à jour la config locale */
    if (email) window.ADMIN_EMAIL = email.trim().toLowerCase();
  },
};
