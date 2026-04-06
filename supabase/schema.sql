-- ══════════════════════════════════════════════
-- NAJ'ELLE — Schéma Supabase
-- À coller dans l'éditeur SQL de votre projet
-- ══════════════════════════════════════════════

-- ─── Table produits ───────────────────────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null,
  categorie    text not null check (categorie in ('robes','hauts','pantalons','accessoires')),
  prix         numeric(10,2) not null check (prix >= 0),
  prix_barre   numeric(10,2) check (prix_barre >= 0),
  badge        text check (badge in ('','new','promo')),
  description  text,
  image_url    text,
  featured     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ─── Row Level Security ───────────────────────
alter table public.products enable row level security;

-- Lecture publique (site vitrine)
create policy "Lecture publique des produits"
  on public.products for select
  using (true);

-- Écriture réservée aux admins authentifiés
-- (l'email admin est vérifié côté client ET côté RLS)
create policy "Écriture admin uniquement"
  on public.products for all
  using  (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── Bucket images ────────────────────────────
-- À créer manuellement dans Storage > New bucket :
--   Nom    : product-images
--   Public : true (accès public en lecture)

-- Politique lecture publique bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Images publiques en lecture"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Upload admin uniquement"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "Suppression admin uniquement"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

-- ─── Données de départ (optionnel) ────────────
insert into public.products (nom, categorie, prix, prix_barre, badge, description, featured) values
  ('Robe Fleurie Ivoire',    'robes',       39.90, 59.90, 'new',   'Une robe légère aux imprimés floraux délicats. Coupe fluide, tissu 100% viscose douce.', true),
  ('Blouse Romantique Rosé', 'hauts',       29.90, null,  '',      'Blouse satinée aux tons rosés, col V élégant.', true),
  ('Pantalon Large Camel',   'pantalons',   34.90, 49.90, 'promo', 'Pantalon large taille haute en camel. Coupe élégante, confort toute la journée.', true),
  ('Combinaison Satin Nude', 'robes',       44.90, null,  'new',   'Combinaison élégante en satin nude. Bretelles fines ajustables.', true),
  ('Top Broderie Anglaise',  'hauts',       24.90, null,  'new',   'Top en broderie anglaise blanche. Manches courtes bouffantes.', false),
  ('Jupe Midi Plissée',      'robes',       32.90, null,  '',      'Jupe midi plissée en mousseline. Ceinture élastique.', false),
  ('Sac Tressé Naturel',     'accessoires', 27.90, 39.90, 'promo', 'Sac tressé en raphia naturel. Fermeture magnétique.', false),
  ('Cardigan Crème Oversize','hauts',       38.90, null,  '',      'Cardigan oversize en maille douce crème. Poches latérales.', false),
  ('Foulard Soie Fleuri',    'accessoires', 19.90, null,  'new',   'Foulard carré en soie aux motifs floraux pastel.', false)
on conflict do nothing;
