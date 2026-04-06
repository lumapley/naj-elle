/* ══════════════════════════════════════════════
   NAJ'ELLE — JavaScript principal
   ══════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   PANIER — état global (stocké en localStorage)
   ───────────────────────────────────────────── */
const PANIER_KEY = 'najelle_panier';
const WISHLIST_KEY = 'najelle_wishlist';

function getPanier() {
  try { return JSON.parse(localStorage.getItem(PANIER_KEY)) || []; }
  catch { return []; }
}

function savePanier(items) {
  localStorage.setItem(PANIER_KEY, JSON.stringify(items));
  updatePanierUI();
  renderCartSidebar();
  if (window.location.pathname.includes('panier')) renderPanierPage();
}

function getWishlist() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
  catch { return []; }
}

function saveWishlist(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

function ajouterAuPanier(produit) {
  const items = getPanier();
  const idx = items.findIndex(i => i.id === produit.id);
  if (idx >= 0) {
    items[idx].qty += 1;
  } else {
    items.push({ ...produit, qty: 1 });
  }
  savePanier(items);
  showToast(`"${produit.nom}" ajouté au panier`);
  openCartSidebar();
}

function changerQty(id, delta) {
  let items = getPanier();
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  items[idx].qty += delta;
  if (items[idx].qty <= 0) items.splice(idx, 1);
  savePanier(items);
}

function supprimerDuPanier(id) {
  let items = getPanier().filter(i => i.id !== id);
  savePanier(items);
}

function toggleWishlist(id, btn) {
  const wl = getWishlist();
  const idx = wl.indexOf(id);
  if (idx >= 0) {
    wl.splice(idx, 1);
    btn && btn.classList.remove('active');
    showToast('Retiré des favoris');
  } else {
    wl.push(id);
    btn && btn.classList.add('active');
    showToast('Ajouté aux favoris ♥');
  }
  saveWishlist(wl);
}

function getTotalPanier() {
  return getPanier().reduce((acc, i) => acc + i.prix * i.qty, 0);
}

function getTotalQty() {
  return getPanier().reduce((acc, i) => acc + i.qty, 0);
}

/* ─────────────────────────────────────────────
   UI — Compteur panier dans la nav
   ───────────────────────────────────────────── */
function updatePanierUI() {
  const qty = getTotalQty();
  document.querySelectorAll('.panier-count').forEach(el => {
    el.textContent = qty;
    el.classList.toggle('visible', qty > 0);
  });
  document.querySelectorAll('.btn-panier-label').forEach(el => {
    el.textContent = `Panier (${qty})`;
  });
}

/* ─────────────────────────────────────────────
   CART SIDEBAR
   ───────────────────────────────────────────── */
function openCartSidebar() {
  document.getElementById('cart-overlay')?.classList.add('open');
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartSidebar() {
  const container = document.getElementById('cart-items-list');
  if (!container) return;
  const items = getPanier();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Votre panier est vide</p>
      </div>`;
  } else {
    container.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-img">
          ${item.image
            ? `<img src="${item.image}" alt="${item.nom}">`
            : `<svg width="28" height="48" viewBox="0 0 40 72" fill="none">
                <ellipse cx="20" cy="10" rx="7" ry="8" fill="#8C6E63" opacity=".4"/>
                <path d="M10 18C4 22 2 38 2 48L38 48C38 38 36 22 30 18" fill="#8C6E63" opacity=".4"/>
                <rect x="17.5" y="48" width="5" height="20" rx="2.5" fill="#8C6E63" opacity=".4"/>
              </svg>`}
        </div>
        <div>
          <p class="cart-item-cat">${item.categorie}</p>
          <p class="cart-item-name">${item.nom}</p>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changerQty('${item.id}', -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changerQty('${item.id}', 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="supprimerDuPanier('${item.id}')">Retirer</button>
        </div>
        <div class="cart-item-price">${(item.prix * item.qty).toFixed(2).replace('.', ',')} €</div>
      </div>`).join('');
  }

  const total = getTotalPanier();
  const totalEl = document.getElementById('cart-total-amount');
  if (totalEl) totalEl.textContent = total.toFixed(2).replace('.', ',') + ' €';

  const noteEl = document.getElementById('cart-shipping-note');
  if (noteEl) {
    if (total >= 60) {
      noteEl.textContent = '✓ Livraison offerte';
      noteEl.style.color = '#5A8A5A';
    } else {
      const reste = (60 - total).toFixed(2).replace('.', ',');
      noteEl.textContent = `Plus que ${reste} € pour la livraison offerte`;
      noteEl.style.color = '';
    }
  }
}

/* ─────────────────────────────────────────────
   PAGE PANIER
   ───────────────────────────────────────────── */
function renderPanierPage() {
  const container = document.getElementById('panier-items');
  if (!container) return;
  const items = getPanier();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="panier-empty-msg">
        Votre panier est vide.
        <br>
        <a href="boutique.html" class="btn-primary">Découvrir la boutique</a>
      </div>`;
    updateSummary(0);
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="panier-item" data-id="${item.id}">
      <div class="panier-item-img">
        ${item.image
          ? `<img src="${item.image}" alt="${item.nom}">`
          : `<svg width="36" height="60" viewBox="0 0 40 72" fill="none">
              <ellipse cx="20" cy="10" rx="7" ry="8" fill="#8C6E63" opacity=".4"/>
              <path d="M10 18C4 22 2 38 2 48L38 48C38 38 36 22 30 18" fill="#8C6E63" opacity=".4"/>
              <rect x="17.5" y="48" width="5" height="20" rx="2.5" fill="#8C6E63" opacity=".4"/>
            </svg>`}
      </div>
      <div class="panier-item-info">
        <p class="panier-item-cat">${item.categorie}</p>
        <p class="panier-item-name">${item.nom}</p>
        <div class="panier-item-controls">
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changerQtyPage('${item.id}', -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changerQtyPage('${item.id}', 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="supprimerPage('${item.id}')">Supprimer</button>
        </div>
      </div>
      <div class="panier-item-price">${(item.prix * item.qty).toFixed(2).replace('.', ',')} €</div>
    </div>`).join('');

  updateSummary(getTotalPanier());
}

function changerQtyPage(id, delta) {
  changerQty(id, delta);
  renderPanierPage();
}

function supprimerPage(id) {
  supprimerDuPanier(id);
  renderPanierPage();
}

function updateSummary(total) {
  const livraison = total >= 60 || total === 0 ? 0 : 4.99;
  const totalFinal = total + livraison;

  const sousTotal = document.getElementById('summary-sous-total');
  const livraisonEl = document.getElementById('summary-livraison');
  const totalEl = document.getElementById('summary-total');

  if (sousTotal) sousTotal.textContent = total.toFixed(2).replace('.', ',') + ' €';
  if (livraisonEl) {
    if (total === 0) {
      livraisonEl.textContent = '—';
      livraisonEl.parentElement.classList.remove('free');
    } else if (livraison === 0) {
      livraisonEl.textContent = 'Offerte';
      livraisonEl.parentElement.classList.add('free');
    } else {
      livraisonEl.textContent = livraison.toFixed(2).replace('.', ',') + ' €';
      livraisonEl.parentElement.classList.remove('free');
    }
  }
  if (totalEl) totalEl.textContent = totalFinal.toFixed(2).replace('.', ',') + ' €';
}

/* Code promo */
const PROMO_CODES = {
  'NAJELLE10': 0.10,
  'BIENVENUE': 0.15,
  'SPRING25':  0.25,
};
let promoApplied = null;

function appliquerPromo() {
  const input = document.getElementById('promo-input');
  const msg   = document.getElementById('promo-msg');
  if (!input || !msg) return;
  const code = input.value.trim().toUpperCase();
  if (PROMO_CODES[code]) {
    promoApplied = PROMO_CODES[code];
    const pct = Math.round(promoApplied * 100);
    msg.textContent = `Code appliqué — ${pct}% de réduction !`;
    msg.className = 'promo-msg ok';
    updateSummaryWithPromo();
  } else {
    promoApplied = null;
    msg.textContent = 'Code invalide.';
    msg.className = 'promo-msg';
  }
}

function updateSummaryWithPromo() {
  const total = getTotalPanier();
  const reduction = promoApplied ? total * promoApplied : 0;
  updateSummary(total - reduction);
}

/* ─────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ─────────────────────────────────────────────
   ANIMATIONS REVEAL (IntersectionObserver)
   ───────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────
   NAV — scroll + burger
   ───────────────────────────────────────────── */
function initNav() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Burger
  const burger = document.getElementById('nav-burger');
  const drawer = document.getElementById('nav-drawer');
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      drawer.classList.toggle('open');
      document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
    });
    drawer.addEventListener('click', e => {
      if (e.target === drawer) {
        burger.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Lien actif
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer-panel a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

/* ─────────────────────────────────────────────
   CART SIDEBAR — init
   ───────────────────────────────────────────── */
function initCartSidebar() {
  const overlay  = document.getElementById('cart-overlay');
  const closeBtn = document.getElementById('cart-close');

  overlay?.addEventListener('click', closeCartSidebar);
  closeBtn?.addEventListener('click', closeCartSidebar);

  document.querySelectorAll('.btn-panier').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openCartSidebar();
    });
  });
}

/* ─────────────────────────────────────────────
   NEWSLETTER
   ───────────────────────────────────────────── */
function initNewsletter() {
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input   = form.querySelector('.newsletter-input');
      const success = form.parentElement.querySelector('.newsletter-success');
      if (!input || !input.value.includes('@')) {
        showToast('Veuillez entrer une adresse email valide.');
        return;
      }
      form.style.display = 'none';
      if (success) success.style.display = 'block';
      showToast('Inscription réussie !');
    });
    // Transformer le button en submit
    const btn = form.querySelector('.newsletter-btn');
    if (btn) btn.type = 'submit';
  });
}

/* ─────────────────────────────────────────────
   BOUTIQUE — filtres & tri
   ───────────────────────────────────────────── */
function initFiltres() {
  const tabs    = document.querySelectorAll('.filter-tab');
  const grid    = document.getElementById('produits-grid');
  const sortSel = document.getElementById('sort-select');
  if (!tabs.length || !grid) return;

  function filtrerEtTrier() {
    const activeTab = document.querySelector('.filter-tab.active');
    const cat       = activeTab ? activeTab.dataset.cat : 'all';
    const sort      = sortSel ? sortSel.value : 'default';
    const cards     = Array.from(grid.querySelectorAll('.produit-card'));

    // Filtre
    cards.forEach(card => {
      const cardCat = card.dataset.cat || 'all';
      card.style.display = (cat === 'all' || cardCat === cat) ? '' : 'none';
    });

    // Tri
    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
      const pA = parseFloat(a.dataset.prix) || 0;
      const pB = parseFloat(b.dataset.prix) || 0;
      if (sort === 'prix-asc')  return pA - pB;
      if (sort === 'prix-desc') return pB - pA;
      if (sort === 'nouveaute') return (b.dataset.new || 0) - (a.dataset.new || 0);
      return 0;
    });
    visible.forEach(card => grid.appendChild(card));
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filtrerEtTrier();
    });
  });

  sortSel?.addEventListener('change', filtrerEtTrier);
}

/* ─────────────────────────────────────────────
   WISHLIST — initialiser les boutons
   ───────────────────────────────────────────── */
function initWishlist() {
  const wl = getWishlist();
  document.querySelectorAll('.btn-wish').forEach(btn => {
    const id = btn.dataset.id;
    if (id && wl.includes(id)) btn.classList.add('active');
    btn.addEventListener('click', () => toggleWishlist(id, btn));
  });
}

/* ─────────────────────────────────────────────
   BOUTONS "Ajouter au panier" sur les cards
   ───────────────────────────────────────────── */
function initAddButtons() {
  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('[data-produit]');
      if (!card) return;
      ajouterAuPanier({
        id:        card.dataset.id,
        nom:       card.dataset.nom,
        categorie: card.dataset.cat || '',
        prix:      parseFloat(card.dataset.prix) || 0,
        image:     card.dataset.image || null,
      });
    });
  });
}

/* ─────────────────────────────────────────────
   USER NAV — bouton compte dans la barre
   ───────────────────────────────────────────── */
function updateUserNav() {
  const user   = window.NajUser?.getCurrentUser();
  const label  = document.getElementById('user-nav-label');
  const initial = document.getElementById('user-dropdown-initial');
  const prenomEl = document.getElementById('user-dropdown-prenom');
  const emailEl  = document.getElementById('user-dropdown-email');
  const drawerLink = document.getElementById('drawer-user-link');

  if (user) {
    const prenom = window.NajUser.getPrenom();
    if (label)     label.textContent = prenom;
    if (initial)   initial.textContent = prenom[0]?.toUpperCase() || '?';
    if (prenomEl)  prenomEl.textContent = prenom;
    if (emailEl)   emailEl.textContent  = user.email;
    if (drawerLink) { drawerLink.href = 'compte.html'; drawerLink.textContent = 'Mon compte'; }
    /* Lien admin si c'est l'administratrice */
    const isAdmin = user.email.toLowerCase() === (window.ADMIN_EMAIL || '').toLowerCase();
    document.getElementById('user-dropdown-admin')?.style.setProperty('display', isAdmin ? 'block' : 'none');
  } else {
    if (label)     label.textContent = 'Connexion';
    if (initial)   initial.textContent = '?';
    if (prenomEl)  prenomEl.textContent = '';
    if (emailEl)   emailEl.textContent  = '';
    if (drawerLink) { drawerLink.href = 'connexion.html'; drawerLink.textContent = 'Se connecter'; }
  }
}

function toggleUserMenu() {
  if (!window.NajUser?.isLoggedIn()) {
    location.href = 'connexion.html';
    return;
  }
  const dd = document.getElementById('user-dropdown');
  if (!dd) return;
  dd.classList.toggle('open');
  if (dd.classList.contains('open')) {
    const close = e => {
      if (!document.getElementById('nav-user-wrap')?.contains(e.target)) {
        dd.classList.remove('open');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

async function handleUserLogout() {
  document.getElementById('user-dropdown')?.classList.remove('open');
  await window.NajUser?.logout();
  updateUserNav();
  showToast('Vous avez été déconnectée.');
}

/* ─────────────────────────────────────────────
   INIT GLOBAL
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initReveal();
  initCartSidebar();
  initNewsletter();
  initFiltres();
  initWishlist();
  initAddButtons();
  updatePanierUI();
  renderCartSidebar();

  /* Initialiser l'état utilisateur dans la nav */
  if (window.NajUser) {
    await NajUser.waitForInit();
    updateUserNav();
  }

  // Page panier
  if (window.location.pathname.includes('panier')) {
    renderPanierPage();
    document.getElementById('promo-btn')?.addEventListener('click', appliquerPromo);
    document.getElementById('promo-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') appliquerPromo();
    });
  }
});
