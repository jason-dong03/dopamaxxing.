# Dopamaxxing — Dev Setup

## Running locally

You need **two terminals** running at the same time.

### Terminal 1 — Next.js dev server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000)

---

### Terminal 2 — Stripe webhook listener

Requires the [Stripe CLI](https://stripe.com/docs/stripe-cli). Install it once:

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

Then run the listener, forwarding webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will print a **webhook signing secret** that starts with `whsec_...`. Copy it and set it in your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

> You must restart `npm run dev` after updating `.env.local`.

---

## Required `.env.local` vars

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen` output
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Other scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run bot` | Run the Discord bot |

---

## Seeding card data

Seed a set (e.g. Base Set):

```
GET /api/seed?setId=base1
```

Seed the First Edition virtual set:

```
GET /api/seed?setId=base1&firstEdition=true
```

Only needs to be run once per set. Cards are upserted so re-running is safe.
