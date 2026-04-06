-- ══════════════════════════════════════════════
-- NAJ'ELLE — Table profils utilisateurs
-- Coller dans SQL Editor après schema.sql
-- ══════════════════════════════════════════════

create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  prenom      text,
  avatar_url  text,
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Chaque utilisateur lit et modifie uniquement son profil
create policy "Lecture de son propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Modification de son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Création de son propre profil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger : créer automatiquement un profil vide à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, prenom)
  values (
    new.id,
    new.raw_user_meta_data->>'prenom'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
