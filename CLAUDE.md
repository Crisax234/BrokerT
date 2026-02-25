# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrokerT is a real estate CRM SaaS platform for direct property sales management. It is built on top of a Supabase + Next.js SaaS template and extended with domain-specific lead management, unit reservations, and sales tracking. The business logic and database schema are documented in detail in `planV3.md` (in Spanish).

The repository has two frontends sharing a single Supabase backend:
- **`nextjs/`** — Web app (Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui)
- **`supabase-expo-template/`** — Mobile app (React Native, Expo SDK 54, Expo Router)
- **`supabase/`** — Database migrations and config

## Build & Dev Commands

### Web (`nextjs/`)
```bash
cd nextjs
yarn install
yarn dev          # Dev server at localhost:3000
yarn build        # Production build
yarn lint         # ESLint
npx tsc --noEmit  # Type check
```

### Mobile (`supabase-expo-template/`)
```bash
cd supabase-expo-template
yarn install
yarn start        # Expo dev server (i=iOS, a=Android, w=Web)
yarn android      # Build for Android
yarn ios          # Build for iOS
yarn lint         # ESLint
```

### Supabase
```bash
npx supabase login
npx supabase link
npx supabase config push
npx supabase migrations up --linked
```

## Architecture

### Web App Routing (`nextjs/src/app/`)
- `/` — Public landing page with features/pricing
- `/auth/*` — Login, register, 2FA, password reset, email verification
- `/app/*` — Protected routes (dashboard, storage, table, user-settings) wrapped in `GlobalProvider` and `AppLayout`
- `/api/auth/callback` — OAuth callback handler
- `/legal/[document]` — Dynamic legal document pages (markdown-based)

### Authentication & Middleware
- `src/middleware.ts` delegates to `lib/supabase/middleware.ts` to refresh Supabase sessions on every request
- Protected `/app/*` routes check user state via `GlobalContext` (`useGlobal()` hook)
- MFA is implemented via TOTP with QR code enrollment (`MFASetup.tsx`, `MFAVerification.tsx`)

### Supabase Client Layer (`nextjs/src/lib/supabase/`)
- `client.ts` — Browser-side Supabase client (SPA)
- `server.ts` — Server-side client (uses cookies)
- `serverAdminClient.ts` — Service-role client for admin operations
- `unified.ts` — `SassClient` class wrapping auth, storage, and CRUD operations. All data access goes through this wrapper.

### State Management
- `GlobalContext` (`lib/context/GlobalContext.tsx`) holds authenticated user info (email, id, registered_at)
- Page-level state uses local `useState`; no global state library

### Styling
- Tailwind CSS with CSS custom property theming (`globals.css`)
- Themes switchable via `NEXT_PUBLIC_THEME` env var: `theme-sass` (default), `theme-blue`, `theme-purple`, `theme-green`
- UI components from shadcn/ui in `src/components/ui/`

### Mobile App Routing (`supabase-expo-template/app/`)
- `(auth)/` — Auth stack: login, register, two-factor, forgot-password
- `(app)/` — Protected tab navigator: dashboard, storage, tasks, settings
- Uses `expo-router` file-based routing with React Navigation bottom tabs
- i18n via `i18next` with locale files in `locales/`

## Domain Model (from planV3.md)

The core business flow is:
1. **Lead browsing** — Sellers view anonymized leads (score, age, occupation, income) via TanStack Table
2. **Lead reservation** — Costs credits/subscription, reveals contact info, exclusive lock
3. **Appointment** — Calendar scheduling via Cal.com integration
4. **Unit reservation** — Links a specific property unit to the reserved lead
5. **Sale/Release** — Close deal or release both lead and unit

Key database patterns:
- `leads_browsable` view hides contact data unless the current user owns the reservation
- `reserve_lead()` and `reserve_unit()` are PostgreSQL functions using `FOR UPDATE NOWAIT` for exclusive locking
- `units` table uses normalized columns + `raw_data` JSONB for schema flexibility across different real estate companies
- All tables use Row-Level Security (RLS) policies
- `seller_accounts` tracks credits and subscription tier

## Environment Variables

### Web (`nextjs/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PRIVATE_SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_PRODUCTNAME=BrokerT
NEXT_PUBLIC_THEME=theme-sass
NEXT_PUBLIC_GOOGLE_TAG=
```

### Mobile (`supabase-expo-template/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Key Notes

- `lib/types.ts` is auto-generated from the Supabase schema — do not edit manually
- Package manager is **yarn** for both web and mobile
- The `planV3.md` file is the source of truth for business logic and database schema decisions (written in Spanish)
- Imports use the `@/*` path alias mapped to `src/` in the web app
