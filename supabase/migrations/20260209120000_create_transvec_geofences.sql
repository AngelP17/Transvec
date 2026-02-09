create extension if not exists "pgcrypto";

create table if not exists public.transvec_geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'AUTO-GEOFENCE',
  zone_type text not null default 'AUTHORIZED_ROUTE',
  geojson jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists transvec_geofences_zone_type_idx
  on public.transvec_geofences (zone_type);

create index if not exists transvec_geofences_geojson_gin
  on public.transvec_geofences using gin (geojson);
