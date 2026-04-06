/* ══════════════════════════════════════════════
   NAJ'ELLE — Client Supabase
   Changer SUPABASE_URL / SUPABASE_KEY si vous
   changez de projet Supabase.
   La clé anon est publique par conception : la
   sécurité est garantie par le Row Level Security.
   ══════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://snuyddjztfquhiiromjx.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudXlkZGp6dGZxdWhpaXJvbWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTAyNTksImV4cCI6MjA5MTA4NjI1OX0.nFg-cwI37xKvz383apTjNec-PMdbwHJlPJyAa4EbzW8';

/* Email de l'administratrice — doit correspondre
   au compte créé dans Supabase Auth > Users.     */
window.ADMIN_EMAIL  = 'contact@naj-elle.com';

window._supabase    = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
