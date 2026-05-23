This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
cd frontend
npm run dev
# or
npm run dev:mock
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

`npm run dev:mock` enables `NEXT_PUBLIC_AUTH_MOCK_ENABLED=true` and uses a fixed mock Supabase user for frontend screens that need authentication. The code rejects this flag in production-like environments, and it must not be set in staging or production.

For real Supabase Auth integration, set these frontend variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

The backend also requires `SUPABASE_JWT_SECRET` so it can verify `Authorization: Bearer <JWT>` from the frontend API client.

Item image uploads use the public Supabase Storage bucket `item-images`. Apply
`docs/migrations/20260523_create_item_images_storage_bucket.sql` to Supabase
staging/production before testing real `/sell` uploads.

Frontend authentication can be switched locally with `.env.local`:

```bash
# Real Supabase Auth
NEXT_PUBLIC_AUTH_MOCK_ENABLED=false

# Mock Auth for local UI work only
NEXT_PUBLIC_AUTH_MOCK_ENABLED=true
```

Protected frontend routes such as `/mypage`, `/sell`, `/transactions`, and `/inbox` are guarded by Next.js Proxy. Unauthenticated users are redirected to `/login?next=...`; `/signup` uses the same Supabase password auth flow and blocks non-`@ecs.osaka-u.ac.jp` email addresses before calling Supabase.

To verify the real signup flow:

```bash
# 1. Apply the Supabase Auth -> public.users sync trigger.
# Use the Supabase SQL editor or a direct DB connection.
docs/migrations/20260521_enforce_osaka_auth.sql

# 2. Start the backend with real JWT verification.
cd backend
npm run dev

# 3. Start the frontend with NEXT_PUBLIC_AUTH_MOCK_ENABLED=false.
cd ../frontend
npm run dev
```

Then open `http://localhost:3000/signup`, register with an `@ecs.osaka-u.ac.jp`
address, open the confirmation email, and confirm that `/auth/callback`
redirects into the app. After login, `/mypage` should render the synced
`public.users` profile.

For local user-flow verification without real Supabase Auth/Storage, use Mock Auth with a local database:

```bash
# 1. Start the backend with local mock token acceptance.
cd backend
npm run dev:mock

# 2. In another terminal, start the frontend with mock auth.
cd ../frontend
npm run dev:mock
```

Mock Auth is guarded in code and works only in local development. The backend creates/updates the fixed mock user automatically when a mock-authenticated request reaches a protected API.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
