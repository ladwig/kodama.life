-- ============================================================
-- Ticket app – Supabase schema
-- Run in your Supabase project → SQL Editor → New Query.
-- Idempotent: safe to re-run.
-- ============================================================

-- ── orders (one payment) ─────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  stripe_payment_id text unique not null, -- processor's payment/checkout id
  buyer_email      text not null,
  buyer_name       text not null,
  buyer_phone      text,
  quantity         int not null,
  price_per_ticket int not null,          -- cents
  total_price      int not null,          -- cents, incl. passed-on fees
  status           text default 'pending',-- 'pending' | 'paid' | 'refunded'
  payment_method   text,                  -- 'stripe_card', 'cash', ...
  source           text,                  -- 'online' | 'magic_link' | 'guestlist' | 'door'
  -- NOT unique: a link with several uses produces several orders.
  magic_link_jti   text,
  created_at       timestamptz default now()
);

-- ── tickets (one per person) ─────────────────────────────────
create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  ticket_code   text unique not null,
  holder_name   text not null,
  checked_in    boolean default false,
  checked_in_at timestamptz,
  created_at    timestamptz default now()
);

-- Swapping payment provider? Rename the column to payment_id and update the
-- 7 code references (grep stripe_payment_id) — it holds whatever the
-- processor calls its payment/checkout id.

-- ── magic_links (pay-per-link invites) ───────────────────────
create table if not exists magic_links (
  jti        text primary key,
  label      text,
  price      numeric not null,   -- euros, the floor for this link
  uses       int not null default 1,
  token      text not null,      -- signed JWT handed out in the URL
  revoked    boolean default false,
  created_at timestamptz default now()
);

-- ── guestlists (free / comped invites) ───────────────────────
create table if not exists guestlists (
  jti         text primary key,
  label       text,
  max_tickets int not null default 1,
  token       text not null,
  revoked     boolean default false,
  created_at  timestamptz default now()
);

-- ── RLS: server-side service_role only, zero public access ───
alter table orders      enable row level security;
alter table tickets     enable row level security;
alter table magic_links enable row level security;
alter table guestlists  enable row level security;

grant all on table orders, tickets, magic_links, guestlists to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ── indexes ──────────────────────────────────────────────────
create index if not exists idx_orders_buyer_email    on orders(buyer_email);
create index if not exists idx_orders_payment_id     on orders(stripe_payment_id);
create index if not exists idx_orders_status         on orders(status);
create index if not exists idx_orders_magic_link_jti on orders(magic_link_jti);
create index if not exists idx_tickets_order_id      on tickets(order_id);
create index if not exists idx_tickets_ticket_code   on tickets(ticket_code);
