## Production deployment (Vercel)

This repo is designed for **PostgreSQL + Prisma Migrations** on Vercel.

### Required environment variables

- **Database**
  - **`DATABASE_URL`**: PostgreSQL connection string (used by Prisma)
  - **`DIRECT_URL`**: direct PostgreSQL connection string (used by Prisma `directUrl`)

- **Auth (NextAuth)**
  - **`NEXTAUTH_SECRET`**: required in production
  - **`NEXTAUTH_URL`**: required in production (the canonical site URL on Vercel)

- **Pusher (optional feature)**
  - `PUSHER_APP_ID`
  - `PUSHER_SECRET`
  - `NEXT_PUBLIC_PUSHER_KEY`
  - `NEXT_PUBLIC_PUSHER_CLUSTER`

- **Stripe (optional feature)**
  - `STRIPE_SECRET_KEY` (enables checkout routes)
  - `STRIPE_WEBHOOK_SECRET` (required for webhook verification in production)

### Deploy order on Vercel (recommended)

1) **Set environment variables** in Vercel (Production + Preview as needed).
2) **Run database migrations** against the production database:

```bash
npx prisma migrate deploy
```

3) **Deploy the application** (Vercel build + start).

### Running `prisma migrate deploy` safely

- `prisma migrate deploy` is intended for **CI/CD and production**.
- It applies SQL migrations in `prisma/migrations/` in order.
- It is safe to run repeatedly (already-applied migrations are tracked).

### Authorization note (SUPER_ADMIN bypass)

Server-side authorization helpers intentionally treat **`SUPER_ADMIN`** as a full bypass for:
- admin-only routes/actions
- coach entitlement checks
- session access checks

This is implemented explicitly in server-side guards (e.g. `src/lib/access-control.ts`).

