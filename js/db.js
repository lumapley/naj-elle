/* ══════════════════════════════════════════════
   NAJ'ELLE — Couche de données (Supabase)
   Requiert : window._supabase (supabase-client.js)
   ══════════════════════════════════════════════ */

'use strict';

/* ─── Rendu HTML d'une carte produit ─── */
function _renderCard(p, opts = {}) {
  const { showActions = true } = opts;
  const badgeHtml = p.badge === 'new'
    ? `<span class="produit-badge new">Nouveau</span>`
    : p.badge === 'promo'
    ? `<span class="produit-badge promo">Promo</span>`
    : '';

  const prixBarreHtml = p.prix_barre
    ? `<span class="prix-barre">${Number(p.prix_barre).toFixed(2).replace('.', ',')} €</span>`
    : '';

  const imgHtml = p.image_url
    ? `<img src="${p.image_url}" alt="${p.nom}" loading="lazy">`
    : `<div class="produit-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:linear-gradient(160deg,var(--rose-pale),#EDD5C8);">
        <svg width="40" height="72" viewBox="0 0 40 72" fill="none">
          <ellipse cx="20" cy="10" rx="7" ry="8" fill="#8C6E63" opacity=".3"/>
          <path d="M10 18C4 22 2 38 2 48L38 48C38 38 36 22 30 18" fill="#8C6E63" opacity=".3"/>
          <rect x="17.5" y="48" width="5" height="20" rx="2.5" fill="#8C6E63" opacity=".3"/>
        </svg>
        <span style="font-family:'Cormorant Garamond',serif;font-size:.9rem;font-style:italic;opacity:.4;color:var(--texte-leger);">Photo produit</span>
      </div>`;

  const actionsHtml = showActions ? `
    <div class="produit-actions">
      <button class="btn-add" onclick="NajDB._addToCartById('${p.id}')">Ajouter</button>
      <button class="btn-wish" data-id="${p.id}"
              onclick="toggleWishlist('${p.id}', this)"
              aria-label="Favoris">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A2A24" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>
    </div>` : '';

  return `
    <div class="produit-card"
         data-produit
         data-id="${p.id}"
         data-nom="${p.nom}"
         data-cat="${p.categorie}"
         data-prix="${p.prix}"
         data-new="${p.badge === 'new' ? 1 : 0}">
      <div class="produit-img-wrap">
        ${imgHtml}
        ${badgeHtml}
        ${actionsHtml}
      </div>
      <div class="produit-info">
        <p class="produit-cat">${_catLabel(p.categorie)}</p>
        <h3 class="produit-name">${p.nom}</h3>
        <div class="produit-prix">
          <span class="prix-actuel">${Number(p.prix).toFixed(2).replace('.', ',')} €</span>
          ${prixBarreHtml}
        </div>
      </div>
    </div>`;
}

function _catLabel(cat) {
  const map = { robes: 'Robes', hauts: 'Hauts', pantalons: 'Pantalons', accessoires: 'Accessoires' };
  return map[cat] || cat;
}

/* ══════════════════════════════════════════════
   API PUBLIQUE — NajDB (Supabase)
   ══════════════════════════════════════════════ */
window.NajDB = {

  /* ─── Lecture ─── */
  async getProducts(filters = {}) {
    let query = window._supabase.from('products').select('*');

    if (filters.categorie) query = query.eq('categorie', filters.categorie);
    if (filters.featured)  query = query.eq('featured', true);

    const { data, error } = await query;
    if (error) throw error;

    let list = data || [];

    if (filters.sort === 'prix-asc')  list = [...list].sort((a, b) => a.prix - b.prix);
    if (filters.sort === 'prix-desc') list = [...list].sort((a, b) => b.prix - a.prix);
    if (filters.sort === 'nouveaute') list = [...list].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at));

    return list;
  },

  async getProduct(id) {
    const { data, error } = await window._supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  /* ─── Écriture (admin) ─── */
  async createProduct(data) {
    const { data: created, error } = await window._supabase
      .from('products')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return created;
  },

  async updateProduct(id, data) {
    const { data: updated, error } = await window._supabase
      .from('products')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  async deleteProduct(id) {
    /* Supprimer l'image associée si elle est dans notre bucket */
    const product = await this.getProduct(id);
    if (product?.image_url && product.image_url.includes('product-images')) {
      const path = product.image_url.split('/product-images/')[1];
      if (path) await window._supabase.storage.from('product-images').remove([path]);
    }

    const { error } = await window._supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /* ─── Upload image → bucket Supabase Storage ─── */
  async uploadImage(file) {
    const ext      = file.name.split('.').pop().toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await window._supabase.storage
      .from('product-images')
      .upload(filename, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = window._supabase.storage
      .from('product-images')
      .getPublicUrl(filename);

    return data.publicUrl;
  },

  /* ─── Rendu ─── */
  renderCard: _renderCard,

  async renderGrid(containerId, filters = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p style="color:var(--texte-leger);text-align:center;padding:40px;grid-column:1/-1">Chargement…</p>';
    try {
      const products = await this.getProducts(filters);
      if (!products.length) {
        container.innerHTML = '<p style="color:var(--texte-leger);text-align:center;padding:40px;grid-column:1/-1">Aucun produit pour le moment.</p>';
        return;
      }
      container.innerHTML = products.map(p => _renderCard(p)).join('');
      if (window.initAddButtons) initAddButtons();
      if (window.initWishlist)   initWishlist();
      if (window.initReveal)     initReveal();
    } catch (e) {
      console.error('NajDB.renderGrid:', e);
      container.innerHTML = '<p style="color:var(--rose-profond);text-align:center;padding:40px;grid-column:1/-1">Erreur de chargement.</p>';
    }
  },

  async _addToCartById(id) {
    const p = await this.getProduct(id);
    if (p) ajouterAuPanier({
      id: p.id,
      nom: p.nom,
      categorie: _catLabel(p.categorie),
      prix: p.prix,
      image: p.image_url
    });
  }
};
