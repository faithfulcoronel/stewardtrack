# Flowspace Starter

A Next.js 15 starter that pairs a polished marketing page with Supabase-powered authentication and an admin dashboard. It uses the `@supabase/ssr` helpers to keep sessions in sync between server components, server actions, and browser interactions.

## Features

- Modern landing page with feature and pricing sections suitable for SaaS products
- Email/password login form backed by Supabase server actions and secure cookies
- Protected admin route that redirects unauthenticated visitors and surfaces session data
- Reusable Supabase helpers for browser and server environments

## Prerequisites

- Node.js 20+
- A Supabase project with email/password authentication enabled

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find both values in the **Settings > API** section of your Supabase dashboard.

## Development

Install dependencies and start the dev server:

```
npm install
npm run dev
```

Visit `http://localhost:3000` to explore the landing experience. Use the **Sign in** button to access the login flow. Successful authentication redirects to `/admin`.

## Extending the admin area

- Add new server components under `src/app/admin` to expose metrics or management tools
- Use the `createSupabaseServerClient()` helper for protected data fetching
- Update Supabase Row Level Security (RLS) policies to suit your app's access rules

## Deployment

When you're ready, push to a Git provider and deploy with platforms like Vercel. Remember to configure the same environment variables in your hosting dashboard.
