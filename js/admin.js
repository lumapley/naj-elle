/* ══════════════════════════════════════════════
   NAJ'ELLE — Logique panneau administrateur
   ══════════════════════════════════════════════ */
'use strict';

/* ─── État global ─── */
let editingId   = null;
let pendingDeleteId = null;
let previewDataUrl  = null;

/* ─── Sidebar mobile ─── */
function toggleAdminSidebar() {
  const sidebar  = document.querySelector('.admin-sidebar');
  const overlay  = document.getElementById('admin-sidebar-overlay');
  const burger   = document.getElementById('admin-burger');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('open');
  burger?.classList.toggle('open');
}

function closeAdminSidebar() {
  document.querySelector('.admin-sidebar')?.classList.remove('open');
  document.getElementById('admin-sidebar-overlay')?.classList.remove('open');
  document.getElementById('admin-burger')?.classList.remove('open');
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await NajAuth.waitForInit();
  if (NajAuth.isLoggedIn() && NajAuth.isAdmin()) {
    showDashboard();
  } else {
    showLogin();
  }
});

/* ══════════════════════════════════════════════
   AUTHENTIFICATION
   ══════════════════════════════════════════════ */
function showLogin() {
  document.getElementById('login-screen').style.display    = 'flex';
  document.getElementById('admin-layout').style.display    = 'none';
}

function showDashboard() {
  document.getElementById('login-screen').style.display    = 'none';
  document.getElementById('admin-layout').style.display    = 'grid';
  const user = NajAuth.getCurrentUser();
  document.getElementById('sidebar-email').textContent = user?.email || '';
  navigateTo('dashboard');
}

/* Formulaire de connexion */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errorEl.classList.remove('show');
  btn.textContent = 'Connexion…';
  btn.disabled = true;

  try {
    await NajAuth.login(email, password);
    showDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  } finally {
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
});

async function logout() {
  await NajAuth.logout();
  showLogin();
}

/* ══════════════════════════════════════════════
   NAVIGATION SIDEBAR
   ══════════════════════════════════════════════ */
function navigateTo(section) {
  /* Fermer la sidebar sur mobile */
  closeAdminSidebar();

  /* Désactiver tous les liens */
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

  /* Activer la section cible */
  const link = document.querySelector(`.sidebar-link[data-section="${section}"]`);
  const sec  = document.getElementById(`section-${section}`);
  if (link) link.classList.add('active');
  if (sec)  sec.classList.add('active');

  /* Titre topbar */
  const titles = {
    dashboard: 'Tableau de bord',
    products:  'Produits',
    settings:  'Paramètres',
  };
  document.getElementById('topbar-title').textContent = titles[section] || section;

  /* Charger le contenu */
  if (section === 'dashboard') loadDashboard();
  if (section === 'products')  loadProducts();
  if (section === 'settings')  loadSettings();
}

/* ══════════════════════════════════════════════
   TABLEAU DE BORD
   ══════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const products = await NajDB.getProducts();
    const featured = products.filter(p => p.featured).length;
    const promos   = products.filter(p => p.badge === 'promo').length;
    const news     = products.filter(p => p.badge === 'new').length;

    document.getElementById('stat-total').textContent    = products.length;
    document.getElementById('stat-featured').textContent = featured;
    document.getElementById('stat-promo').textContent    = promos;
    document.getElementById('stat-new').textContent      = news;
  } catch (err) {
    console.error('loadDashboard:', err);
    /* Afficher l'erreur dans les stat cards si la table n'existe pas encore */
    ['stat-total','stat-featured','stat-promo','stat-new'].forEach(id => {
      document.getElementById(id).textContent = '!';
    });
    adminToast('Erreur BDD — avez-vous exécuté le schéma SQL dans Supabase ?', 'error');
  }
}

/* ══════════════════════════════════════════════
   GESTION DES PRODUITS
   ══════════════════════════════════════════════ */
async function loadProducts(search = '', cat = '') {
  const grid = document.getElementById('admin-products-grid');
  grid.innerHTML = '<p style="grid-column:1/-1;color:var(--texte-leger);padding:20px">Chargement…</p>';

  let products = await NajDB.getProducts();

  /* Filtres */
  if (cat)    products = products.filter(p => p.categorie === cat);
  if (search) products = products.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.categorie.toLowerCase().includes(search.toLowerCase())
  );

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
          <path d="M16 3H8l-2 4h12l-2-4z"/>
        </svg>
        <p>Aucun produit trouvé</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => renderAdminCard(p)).join('');
}

function renderAdminCard(p) {
  const catLabel = { robes: 'Robes', hauts: 'Hauts', pantalons: 'Pantalons', accessoires: 'Accessoires' };
  const badgeHtml = p.badge === 'new'
    ? `<span class="admin-product-badge new">Nouveau</span>`
    : p.badge === 'promo'
    ? `<span class="admin-product-badge promo">Promo</span>`
    : '';
  const featuredDot = p.featured ? `<span class="featured-dot" title="Produit vedette"></span>` : '';
  const imgHtml = p.image_url
    ? `<img src="${p.image_url}" alt="${p.nom}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span class="no-img">Aucune photo</span>`;
  const prixBarre = p.prix_barre
    ? `<s>${p.prix_barre.toFixed(2).replace('.', ',')} €</s>` : '';

  return `
    <div class="admin-product-card" data-id="${p.id}">
      <div class="admin-product-img">
        ${imgHtml}
        ${badgeHtml}
        ${featuredDot}
      </div>
      <div class="admin-product-body">
        <p class="admin-product-cat">${catLabel[p.categorie] || p.categorie}</p>
        <p class="admin-product-name">${p.nom}</p>
        <p class="admin-product-price">
          ${p.prix.toFixed(2).replace('.', ',')} €
          ${prixBarre}
        </p>
      </div>
      <div class="admin-product-actions">
        <button class="btn-admin outline sm" onclick="openEditModal('${p.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Modifier
        </button>
        <button class="btn-admin danger sm" onclick="confirmDelete('${p.id}', '${p.nom.replace(/'/g, "\\'")}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
          Supprimer
        </button>
      </div>
    </div>`;
}

/* ─── Recherche & filtre ─── */
document.getElementById('admin-search').addEventListener('input', e => {
  const cat = document.getElementById('admin-cat-filter').value;
  loadProducts(e.target.value, cat);
});
document.getElementById('admin-cat-filter').addEventListener('change', e => {
  const search = document.getElementById('admin-search').value;
  loadProducts(search, e.target.value);
});

/* ══════════════════════════════════════════════
   MODAL PRODUIT
   ══════════════════════════════════════════════ */
function openAddModal() {
  editingId    = null;
  previewDataUrl = null;
  document.getElementById('modal-title').textContent = 'Ajouter un produit';
  document.getElementById('product-form').reset();
  document.getElementById('img-preview').classList.remove('show');
  document.getElementById('img-preview').src = '';
  document.getElementById('featured-toggle').classList.remove('on');
  document.getElementById('modal-overlay').classList.add('open');
}

async function openEditModal(id) {
  const p = await NajDB.getProduct(id);
  if (!p) return;
  editingId      = id;
  previewDataUrl = p.image_url;

  document.getElementById('modal-title').textContent = 'Modifier le produit';
  document.getElementById('field-nom').value         = p.nom;
  document.getElementById('field-categorie').value   = p.categorie;
  document.getElementById('field-prix').value        = p.prix;
  document.getElementById('field-prix-barre').value  = p.prix_barre || '';
  document.getElementById('field-badge').value       = p.badge || '';
  document.getElementById('field-description').value = p.description || '';

  const toggle = document.getElementById('featured-toggle');
  toggle.classList.toggle('on', !!p.featured);

  const preview = document.getElementById('img-preview');
  if (p.image_url) {
    preview.src = p.image_url;
    preview.classList.add('show');
  } else {
    preview.classList.remove('show');
    preview.src = '';
  }

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
  previewDataUrl = null;
}

/* Fermer en cliquant l'overlay */
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

/* ─── Upload image ─── */
const uploadZone = document.getElementById('img-upload-zone');
const fileInput  = document.getElementById('img-file-input');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleImageFile(file);
});

async function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    adminToast('Fichier non valide — choisissez une image.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    adminToast('Image trop lourde (max 5 Mo).', 'error');
    return;
  }
  previewDataUrl = await NajDB.uploadImage(file);
  const preview  = document.getElementById('img-preview');
  preview.src    = previewDataUrl;
  preview.classList.add('show');
}

/* ─── Toggle featured ─── */
document.getElementById('featured-toggle').addEventListener('click', function() {
  this.classList.toggle('on');
});

/* ─── Soumission formulaire ─── */
document.getElementById('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.textContent = 'Enregistrement…';
  saveBtn.disabled = true;

  try {
    const data = {
      nom:         document.getElementById('field-nom').value.trim(),
      categorie:   document.getElementById('field-categorie').value,
      prix:        parseFloat(document.getElementById('field-prix').value),
      prix_barre:  parseFloat(document.getElementById('field-prix-barre').value) || null,
      badge:       document.getElementById('field-badge').value,
      description: document.getElementById('field-description').value.trim(),
      featured:    document.getElementById('featured-toggle').classList.contains('on'),
      image_url:   previewDataUrl || null,
    };

    if (!data.nom || !data.categorie || isNaN(data.prix)) {
      adminToast('Remplissez les champs obligatoires.', 'error');
      return;
    }

    if (editingId) {
      await NajDB.updateProduct(editingId, data);
      adminToast('Produit mis à jour !', 'success');
    } else {
      await NajDB.createProduct(data);
      adminToast('Produit ajouté !', 'success');
    }

    closeModal();
    loadProducts();
    loadDashboard();
  } catch (err) {
    adminToast(err.message, 'error');
  } finally {
    saveBtn.textContent = 'Enregistrer';
    saveBtn.disabled = false;
  }
});

/* ══════════════════════════════════════════════
   SUPPRESSION
   ══════════════════════════════════════════════ */
function confirmDelete(id, nom) {
  pendingDeleteId = id;
  document.getElementById('confirm-product-name').textContent = nom;
  document.getElementById('confirm-overlay').classList.add('open');
}

function cancelDelete() {
  pendingDeleteId = null;
  document.getElementById('confirm-overlay').classList.remove('open');
}

async function executeDelete() {
  if (!pendingDeleteId) return;
  try {
    await NajDB.deleteProduct(pendingDeleteId);
    adminToast('Produit supprimé.', 'success');
    loadProducts();
    loadDashboard();
  } catch (err) {
    adminToast(err.message, 'error');
  } finally {
    cancelDelete();
  }
}

/* ══════════════════════════════════════════════
   PARAMÈTRES
   ══════════════════════════════════════════════ */
function loadSettings() {
  document.getElementById('settings-admin-email').value = NajAuth.getAdminEmail();
}

document.getElementById('settings-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('settings-admin-email').value.trim();
  const password = document.getElementById('settings-admin-pass').value;
  const confirm  = document.getElementById('settings-admin-pass-confirm').value;

  if (password && password !== confirm) {
    adminToast('Les mots de passe ne correspondent pas.', 'error');
    return;
  }
  if (!email.includes('@')) {
    adminToast('Email invalide.', 'error');
    return;
  }

  await NajAuth.updateCredentials({ email, password: password || undefined });
  document.getElementById('settings-admin-pass').value         = '';
  document.getElementById('settings-admin-pass-confirm').value = '';
  adminToast('Paramètres enregistrés !', 'success');
  document.getElementById('sidebar-email').textContent = email;
});

/* ══════════════════════════════════════════════
   TOAST ADMIN
   ══════════════════════════════════════════════ */
let toastTimer = null;
function adminToast(msg, type = '') {
  let t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.className   = `admin-toast${type ? ' ' + type : ''}`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
