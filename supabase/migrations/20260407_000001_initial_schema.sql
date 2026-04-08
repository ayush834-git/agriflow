create extension if not exists "pgcrypto";

create type public.user_role as enum ('FARMER', 'FPO', 'SUPPLIER', 'RETAILER');
create type public.listing_status as enum ('DRAFT', 'ACTIVE', 'MATCHED', 'SOLD', 'CANCELLED');
create type public.inventory_status as enum ('ACTIVE', 'IN_TRANSIT', 'SOLD', 'EXPIRED');
create type public.match_status as enum ('OPEN', 'CONTACTED', 'ACCEPTED', 'COMPLETED', 'CANCELLED');
create type public.notification_channel as enum ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH');
create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED', 'READ');
create type public.risk_level as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  role public.user_role not null,
  full_name text not null,
  phone text unique,
  email text unique,
  preferred_language text not null default 'te',
  district text,
  state text,
  organization_name text,
  districts_served text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farmer_crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  crop_slug text not null,
  crop_name text not null,
  district text,
  alert_threshold numeric(12,2) not null default 0,
  preferred_quantity_kg numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, crop_slug, district)
);

create table if not exists public.mandi_prices (
  id uuid primary key default gen_random_uuid(),
  source_record_id text,
  crop_slug text not null,
  crop_name text not null,
  mandi_name text not null,
  district text not null,
  state text not null,
  market_date date not null,
  min_price numeric(12,2),
  max_price numeric(12,2),
  modal_price numeric(12,2) not null,
  arrivals_tonnes numeric(12,2),
  variety text not null default '',
  grade text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create table if not exists public.price_gaps (
  id uuid primary key default gen_random_uuid(),
  crop_slug text not null,
  crop_name text not null,
  source_district text not null,
  source_state text not null,
  source_modal_price numeric(12,2) not null,
  target_district text not null,
  target_state text not null,
  target_modal_price numeric(12,2) not null,
  price_gap numeric(12,2) not null,
  demand_strength numeric(8,2) not null default 1,
  transport_feasibility numeric(8,2) not null default 1,
  opportunity_score numeric(12,2) not null,
  distance_km numeric(12,2),
  data_window_started_at timestamptz,
  data_window_ended_at timestamptz,
  explanation jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_user_id uuid not null references public.users(id) on delete cascade,
  crop_slug text not null,
  crop_name text not null,
  quantity_kg numeric(12,2) not null,
  asking_price_per_kg numeric(12,2),
  quality_grade text,
  district text not null,
  state text not null,
  available_from date,
  available_until date,
  status public.listing_status not null default 'DRAFT',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  crop_slug text not null,
  crop_name text not null,
  quantity_kg numeric(12,2) not null,
  storage_location_name text,
  district text not null,
  state text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  storage_type text,
  deadline_date date not null,
  temperature_celsius numeric(6,2),
  humidity_percent numeric(6,2),
  spoilage_score numeric(5,2),
  spoilage_level public.risk_level not null default 'LOW',
  status public.inventory_status not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movement_recommendations (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  target_district text not null,
  target_state text not null,
  generated_by text not null default 'gemini-2.0-flash',
  transport_distance_km numeric(12,2),
  transport_cost_inr numeric(12,2),
  net_profit_per_kg_inr numeric(12,2),
  total_net_profit_inr numeric(12,2),
  confidence numeric(5,2),
  urgency public.risk_level not null default 'LOW',
  reasoning text,
  signals jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  inventory_id uuid references public.inventory(id) on delete set null,
  farmer_user_id uuid references public.users(id) on delete set null,
  counterparty_user_id uuid references public.users(id) on delete set null,
  crop_slug text not null,
  crop_name text not null,
  quantity_kg numeric(12,2),
  offered_price_per_kg numeric(12,2),
  match_score numeric(5,2),
  status public.match_status not null default 'OPEN',
  conversation_channel public.notification_channel,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel public.notification_channel not null,
  kind text not null,
  title text,
  message text not null,
  language text not null default 'te',
  payload jsonb not null default '{}'::jsonb,
  delivery_status public.notification_status not null default 'PENDING',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  user_id uuid references public.users(id) on delete set null,
  language text not null default 'te',
  state text not null default 'IDLE',
  last_intent text,
  context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  session_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_price_gaps_window
  on public.price_gaps (
    crop_slug,
    source_district,
    target_district,
    coalesce(data_window_ended_at, fetched_at)
  );

create index if not exists idx_farmer_crops_user_id on public.farmer_crops (user_id);
create index if not exists idx_mandi_prices_crop_district_date on public.mandi_prices (crop_slug, district, market_date desc);
create index if not exists idx_mandi_prices_fetched_at on public.mandi_prices (fetched_at desc);
create index if not exists idx_price_gaps_crop_score on public.price_gaps (crop_slug, opportunity_score desc);
create index if not exists idx_listings_farmer_status on public.listings (farmer_user_id, status);
create index if not exists idx_inventory_owner_status on public.inventory (owner_user_id, status, deadline_date);
create index if not exists idx_movement_recommendations_inventory on public.movement_recommendations (inventory_id, created_at desc);
create index if not exists idx_matches_farmer_status on public.matches (farmer_user_id, status);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);

drop index if exists public.idx_mandi_prices_identity;
create unique index if not exists idx_mandi_prices_identity
  on public.mandi_prices (
    crop_slug,
    mandi_name,
    district,
    state,
    market_date,
    variety,
    grade
  );

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_farmer_crops_updated_at on public.farmer_crops;
create trigger trg_farmer_crops_updated_at
before update on public.farmer_crops
for each row execute function public.set_updated_at();

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_updated_at on public.inventory;
create trigger trg_inventory_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists trg_movement_recommendations_updated_at on public.movement_recommendations;
create trigger trg_movement_recommendations_updated_at
before update on public.movement_recommendations
for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_sessions_updated_at on public.whatsapp_sessions;
create trigger trg_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row execute function public.set_updated_at();
