# Forking this app for another event

One fork = one event = one deploy. There is no multi-tenancy: the event lives in
`lib/event.js` and the env vars, so a second client gets a second repo and a
second Vercel project.

Order matters only within a phase. Phase 1 (accounts) and Phase 2 (code) can run
in parallel — code doesn't need the keys until you want to test a purchase.

---

## Phase 0 — decide first

- [ ] Domain (e.g. `theirevent.com`) — everything else keys off it
- [ ] Payment provider: Stripe (as-is) or SumUp (see "Swapping to SumUp" below)
- [ ] Language of the buyer-facing copy — checkout errors are still German in
      places, the rest is English
- [ ] Who owns the accounts: your agency or the client? Cleanest for a handover
      is client-owned Stripe/Resend, you-owned Vercel

## Phase 1 — accounts and setup

### 1. Supabase
- [ ] New project (EU region for German events)
- [ ] SQL Editor → run `supabase/schema.sql`
- [ ] Settings → API → copy `SUPABASE_URL` and the **service_role** key
      (`SUPABASE_SERVICE_ROLE_KEY` — server-side only, never in a client bundle)

### 2. Resend
- [ ] Add the domain, set the DNS records (SPF/DKIM), wait for verification
- [ ] From address, e.g. `tickets@theirevent.com` → `RESEND_FROM_ADDRESS`
- [ ] Create the ticket template → `RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID`.
      It **must** use exactly these variables:
      - `firstName`
      - `magicLink` — logs the buyer into their ticket page
      - `pdfLink` — downloads the PDF
      - `tickets[]` with `code`, `holderName`, `qrUrl`
- [ ] One audience segment for buyers → `RESEND_SEGMENT_TICKET_HOLDERS_ID`
- [ ] API key → `RESEND_API_KEY`

### 3. Payments (Stripe)
- [ ] Account, or a new one under the client's org
- [ ] Test keys first: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Webhook endpoint → `https://<domain>/api/webhooks/stripe`, event
      `payment_intent.succeeded` only → `STRIPE_WEBHOOK_SECRET`
- [ ] Check the actual fee rate on the contract and put it in `EVENT.fee` —
      the buyer pays it, so a wrong number quietly eats margin

### 4. Telegram (per-sale notifications — optional)
- [ ] @BotFather → new bot → `TELEGRAM_BOT_TOKEN`
- [ ] Add it to the group, then `getUpdates` for the chat id → `TELEGRAM_CHAT_ID`
- [ ] `NOTIFY_EMAIL` gets a warning mail if Telegram ever fails

### 5. Vercel
- [ ] Import the fork, add the domain
- [ ] All env vars from the table below
- [ ] Storage → Edge Config store → connect to the project. Every key is
      optional and falls back to `lib/event.js`, so you only set what you want
      to change without a deploy:
      | key | effect |
      |---|---|
      | `min_ticket_price` | floor price in € |
      | `price_max` | sliding scale up to here in €5 steps; equal to the min → one fixed price |
      | `group_deal` | `"4,3"` = 4 tickets for the price of 3; `false` → off |
      | `sold_out` | `true` closes checkout |
      | `password_protection_enabled` | `true` puts the site behind `SITE_PASSWORD` (default off) |
      | `telegram_notifications` | per-sale Telegram message (default on) |
      | `email_notifications` | per-sale mail to `NOTIFY_EMAIL` (default off) |
      | `chef_password` | overrides `CHEF_PASSWORD` |

### Env vars (all of them)

| var | where from |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` | Resend |
| `RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID` | Resend template |
| `RESEND_SEGMENT_TICKET_HOLDERS_ID` | Resend audience |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `NEXT_PUBLIC_BASE_URL` | `https://<domain>` — wrong value breaks every ticket link |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `SITE_PASSWORD` | pre-launch gate; comma-separated for several |
| `CHEF_PASSWORD` | staff portal |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NOTIFY_EMAIL` | optional |
| `MIN_TICKET_PRICE`, `MAIL_WEBHOOK_URL` | fallbacks, normally unset |

## Phase 2 — code

Roughly top-down by effort. Steps 1–3 are an afternoon; step 4 is the real work.

1. **`lib/event.js`** — name, date, `ticketPrefix`, `minPrice`, `maxPrice`,
   `groupDeal`, currency, `fee`. These are the defaults; Edge Config overrides
   price and group deal at runtime.
2. **`app/layout.js`** — `metadataBase`, title, description, OG/Twitter image.
   Still says `kodama.life` and `sidequest`.
3. **`app/icon.jpg`** (favicon, Next file convention) and `public/<name>-logo.*`
   — referenced by `app/page.js` and `app/login/page.js`.
4. **`app/page.js`** — the landing page. Currently logo + ticket button on a
   flat background; build out from there.

7. **`app/api/tickets/download/route.js`** — PDF filename
   (`sidequest-tickets.pdf`) and the layout, if the ticket should look theirs.
8. **German strings** — `app/api/checkout/create-intent/route.js` validation
   messages and `app/api/newsletter/subscribe/route.js`. Translate or leave.
9. **`app/chef/page.js`** — drop the legacy `'KOD-'` prefix check; the current
    prefix comes from `EVENT.ticketPrefix`. Same for the `SQ-XXXX` placeholder
    in `DirectionsClient`.
10. **`app/components/`** — `MiniMonsters`, `FireImg`, `IllustratedButtons`,
    `lib/sounds.js` are sidequest's visual identity. Delete or replace.

This branch has already deleted the sidequest-only parts: newsletters (pages,
API, Resend segment, `subscribers` table), `/directions`, `/partners`, the FAQ
(`lib/faq.js`), the illustrated landing page (`HomeClient.js`) and its
decorative assets. `git show af64cd2:app/HomeClient.js` brings the old page
back if a client wants that structure.

Leave alone: `lib/jwt.js`, `proxy.ts`, `app/chef/*` (portal + scanner),
`app/api/chef/*`, `app/api/guestlist/*`, magic links, PDF generation,
`lib/supabase.js`. That's the reusable machine.

## Phase 3 — verify before handover

- [ ] `npm run build` clean, `node scripts/check-event.mjs` passes
- [ ] `grep -ri "sidequest\|kodama" app lib public` returns nothing
- [ ] Test purchase with Stripe test card `4242 4242 4242 4242`:
      order row created, tickets minted, confirmation mail arrives, magic link
      logs in, PDF downloads, QR scans
- [ ] Scanner checks a ticket in, and a second scan shows already-checked-in
- [ ] Chef stats: net revenue matches gross minus the real fee
- [ ] Magic link with `uses: 3` sells exactly 3 tickets, then refuses
- [ ] Guestlist link admits its `max_tickets` and no more
- [ ] `price_max` equal to the min shows one price; higher shows the €5 steps
- [ ] `group_deal: "4,3"` bills 3 of 4 tickets; `false` hides the row, and the
      API rejects a forced `group_deal` in the request body
- [ ] `telegram_notifications` / `email_notifications` both fire once
- [ ] `password_protection_enabled: false` in Edge Config actually opens the site
- [ ] Switch Stripe to live keys, re-point the webhook, re-test once for real

## Swapping to SumUp

Hosted checkout instead of inline Elements. Four changes:

1. `lib/stripe.js` → `lib/sumup.js`: create checkout with
   `hosted_checkout: { enabled: true }`, redirect to `hosted_checkout_url`.
2. No metadata field — insert the order as `status: 'pending'` first and use its
   uuid as `checkout_reference`; the webhook flips it to paid and mints tickets.
3. Webhook: subscribe via `return_url` at creation; verify the HMAC-SHA256
   `x-payload-signature`, then re-`GET /checkouts/{id}` and require
   `status === 'PAID'` — the payload is not the source of truth.
4. Amounts are major units (`30.50`), not cents, and the fee rate differs —
   both live in `lib/event.js`.

Also: rename `orders.stripe_payment_id` → `payment_id`, drop the three
`@stripe/*` deps, delete the Elements code in `TicketsClient` and
`MagicTicketClient`, and key `confirmation/status` on the order id.
Cards + Apple/Google Pay only — no Klarna, SEPA or Sofort. Checkouts expire
after 30 minutes.
