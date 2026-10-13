-- Schéma complet de Mémoire (à exécuter une fois dans l'éditeur SQL d'un projet Supabase neuf).
-- Remplacer l'email autorisé ci-dessous avant exécution.

-- Un seul propriétaire autorisé : toute inscription avec un autre email est refusée.
create table public.allowed_emails (email text primary key);
alter table public.allowed_emails enable row level security;
insert into public.allowed_emails values ('ton.email@example.com');

create or replace function public.enforce_allowed_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'Inscription fermée';
  end if;
  return new;
end $$;
create trigger enforce_allowed_email before insert on auth.users
  for each row execute function public.enforce_allowed_email();

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  owner uuid default auth.uid() references auth.users(id) on delete cascade,
  url text not null unique,
  source text not null default 'instagram',
  shortcode text,
  account text,
  media_type text not null default 'link',        -- video | image | carousel | link
  author text,
  author_name text,
  caption text,
  transcript text,
  thumb_path text,
  video_path text,
  duration numeric,
  taken_at timestamptz,
  saved_at timestamptz not null default now(),
  save_rank int,
  is_ai boolean not null default false,
  category text,
  title text,
  summary text,
  use_for text,
  how_to text[] not null default '{}',
  links jsonb not null default '[]',
  prompts text[] not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'pending',          -- pending | ready | error
  note text not null default '',
  favorite boolean not null default false,
  seen_count int not null default 0,
  last_seen timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index saves_owner_saved_at on public.saves (owner, saved_at desc);
alter table public.saves enable row level security;
create policy "owner reads" on public.saves for select to authenticated using (owner = (select auth.uid()));
create policy "owner inserts" on public.saves for insert to authenticated with check (owner = (select auth.uid()));
create policy "owner updates" on public.saves for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "owner deletes" on public.saves for delete to authenticated using (owner = (select auth.uid()));

-- Jeton personnel pour le raccourci iPhone
create table public.ingest_tokens (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.ingest_tokens enable row level security;
create policy "owner manages token" on public.ingest_tokens for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- Les enregistrements importés avant la création du compte sont rattachés au premier (et seul) compte autorisé.
create or replace function public.claim_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.saves set owner = new.id where owner is null;
  insert into public.ingest_tokens (owner) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger claim_on_signup after insert on auth.users
  for each row execute function public.claim_on_signup();

create or replace function public.rotate_ingest_token()
returns text language plpgsql security definer set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.ingest_tokens (owner, token) values (auth.uid(), t)
  on conflict (owner) do update set token = excluded.token, created_at = now();
  return t;
end $$;

revoke execute on function public.claim_on_signup() from public, anon, authenticated;
revoke execute on function public.enforce_allowed_email() from public, anon, authenticated;
revoke execute on function public.rotate_ingest_token() from public, anon;
grant execute on function public.rotate_ingest_token() to authenticated;

-- Stockage privé : media/<save_id>/thumb.jpg et media/<save_id>/video.mp4
insert into storage.buckets (id, name, public, file_size_limit) values ('media', 'media', false, 52428800);
create policy "owner reads media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and exists (
    select 1 from public.saves s where s.id::text = (storage.foldername(name))[1] and s.owner = (select auth.uid())));
create policy "owner writes media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and exists (
    select 1 from public.saves s where s.id::text = (storage.foldername(name))[1] and s.owner = (select auth.uid())));
create policy "owner deletes media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and exists (
    select 1 from public.saves s where s.id::text = (storage.foldername(name))[1] and s.owner = (select auth.uid())));

-- Mises à jour en direct dans l'appli
alter publication supabase_realtime add table public.saves;
