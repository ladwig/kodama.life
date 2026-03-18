-- ============================================================
-- Kodama Ticket App – Supabase Schema Setup
-- Run this in your Supabase project → SQL Editor → New Query
-- ============================================================

-- ── 1. subscribers ────────────────────────────────────────────
create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text,
  created_at timestamptz default now()
);

-- ── 2. orders ─────────────────────────────────────────────────
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_payment_id text unique not null,
  buyer_email       text not null,
  buyer_name        text not null,
  buyer_phone       text,
  quantity          int not null,
  price_per_ticket  int not null,   -- in Cent (z.B. 2500 = 25,00 €)
  total_price       int not null,   -- in Cent
  status            text default 'pending',  -- 'pending' | 'paid' | 'refunded'
  event_date        date,
  token             text,           -- buyer JWT (for reference)
  created_at        timestamptz default now()
);

-- ── 3. tickets ────────────────────────────────────────────────
create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  ticket_code text unique not null,
  holder_name text not null,
  created_at  timestamptz default now()
);

-- ── 4. Enable RLS ─────────────────────────────────────────────
alter table subscribers enable row level security;
alter table orders      enable row level security;
alter table tickets     enable row level security;

-- ── 5. Grant full access to service_role ──────────────────────
-- The service_role key (used server-side) bypasses RLS,
-- but we also need explicit GRANT at the schema level.
grant all on table subscribers to service_role;
grant all on table orders      to service_role;
grant all on table tickets     to service_role;

-- Sequences / defaults
grant usage, select on all sequences in schema public to service_role;

-- Block all anon / authenticated direct access (no public policies)
-- No insert/select policies for anon → zero public access

-- ── 6. Useful indexes ─────────────────────────────────────────
create index if not exists idx_orders_buyer_email       on orders(buyer_email);
create index if not exists idx_orders_stripe_payment_id on orders(stripe_payment_id);
create index if not exists idx_orders_status            on orders(status);
create index if not exists idx_tickets_order_id         on tickets(order_id);
create index if not exists idx_tickets_ticket_code      on tickets(ticket_code);
create index if not exists idx_subscribers_email        on subscribers(email);
