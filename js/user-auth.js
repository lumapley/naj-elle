/* ══════════════════════════════════════════════
   NAJ'ELLE — Authentification utilisateurs
   Requiert : window._supabase (supabase-client.js)
   ══════════════════════════════════════════════ */

'use strict';

let _userSession = null;

const _userInitPromise = window._supabase.auth.getSession().then(({ data }) => {
  _userSession = data.session || null;
});

window._supabase.auth.onAuthStateChange((_event, session) => {
  _userSession = session || null;
  if (window.updateUserNav) updateUserNav();
});

window.NajUser = {

  waitForInit() { return _userInitPromise; },

  isLoggedIn() { return !!_userSession; },

  getCurrentUser() { return _userSession?.user || null; },

  getPrenom() {
    const user = this.getCurrentUser();
    if (!user) return '';
    return (
      user.user_metadata?.prenom ||
      user.user_metadata?.full_name?.split(' ')[0] ||
      user.email.split('@')[0]
    );
  },

  /* ─── Connexion email/password ─── */
  async login(email, password) {
    const { data, error } = await window._supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login')) throw new Error('Email ou mot de passe incorrect.');
      throw new Error(error.message);
    }
    _userSession = data.session;
    return data;
  },

  /* ─── Inscription email/password ─── */
  async signup(email, password, prenom) {
    const { data, error } = await window._supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { prenom: prenom?.trim() || '' },
      },
    });
    if (error) throw new Error(error.message);
    _userSession = data.session;
    return data;
  },

  /* ─── OAuth Google ─── */
  async loginWithGoogle() {
    const { error } = await window._supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/compte.html`,
      },
    });
    if (error) throw new Error(error.message);
  },

  /* ─── Déconnexion ─── */
  async logout() {
    await window._supabase.auth.signOut();
    _userSession = null;
  },

  /* ─── Mise à jour du profil ─── */
  async updateProfile({ prenom }) {
    const { error } = await window._supabase.auth.updateUser({
      data: { prenom },
    });
    if (error) throw new Error(error.message);
  },
};
