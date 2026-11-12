-- Contratos mínimos de Auth/Storage para ejecutar las migraciones reales en PostgreSQL embebido.
-- No sustituye las pruebas HTTP de los servicios gestionados de Supabase.
create role anon;
create role authenticated;
create schema auth;
create schema storage;
grant usage on schema public, auth, storage to anon, authenticated;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, unique(bucket_id, name));
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
