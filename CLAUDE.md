# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Maintenance rule:** This file must be updated whenever significant codebase changes occur (new routes, components, database schema changes, new libraries, architectural decisions) so that future Claude Code instances have accurate context. When completing a task that changes the structure described here, update the relevant section before finishing.

## Project Overview

BrokerT is a real estate CRM SaaS platform for direct property sales management in Chile. It is built on top of a Supabase + Next.js SaaS template and extended with domain-specific lead management, unit reservations, investment scenario calculators, and sales tracking. The business logic and database schema are documented in detail in `planV3.md` (in Spanish).

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

**Public Routes:**
- `/` — Landing page with features/pricing
- `/auth/*` — Login, register, 2FA, password reset, email verification
- `/api/auth/callback` — OAuth callback handler
- `/legal/[document]` — Dynamic legal document pages (markdown-based)

**Protected Routes (`/app/*`):** All wrapped in `GlobalProvider` and `AppLayout`
- `/app/` — Dashboard with account status card and quick actions
- `/app/leads` — Lead browsing/exploration with TanStack Table (filters: quality tier, score min, meeting date)
- `/app/my-leads` — Calendar view of reserved leads (LeadCalendar + LeadDetailSidebar)
- `/app/stock` — Unit inventory browsing with company/project/typology filters; supports multi-unit selection and "Escenario" calculator link
- `/app/stock/[projectId]/escenario` — Investment scenario calculator for selected units
- `/app/reservations` — View and manage unit reservations (mark sold, release)
- `/app/storage` — File storage (from template)
- `/app/table` — Generic table (from template)
- `/app/user-settings` — User settings and password change

### Navigation (`AppLayout.tsx`)
Sidebar menu items: Dashboard, Leads, Mi Agenda (My Leads), Stock, Reservas, Settings. Responsive with collapsible mobile sidebar.

### Authentication & Middleware
- `src/middleware.ts` delegates to `lib/supabase/middleware.ts` to refresh Supabase sessions on every request
- Protected `/app/*` routes check user state via `GlobalContext` (`useGlobal()` hook)
- MFA is implemented via TOTP with QR code enrollment (`MFASetup.tsx`, `MFAVerification.tsx`)

### Supabase Client Layer (`nextjs/src/lib/supabase/`)
- `client.ts` — Browser-side Supabase client (SPA)
- `server.ts` — Server-side client (uses cookies)
- `serverAdminClient.ts` — Service-role client for admin operations
- `unified.ts` — `SassClient` class wrapping all data access. Methods:
  - **Auth:** `loginEmail()`, `registerEmail()`, `exchangeCodeForSession()`, `logout()`, `resendVerificationEmail()`
  - **Profile:** `getSellerProfile()`
  - **Leads:** `getLeadsBrowsable()`, `getMyReservedLeads()`, `reserveLead()`, `releaseLead()`
  - **Projects/Units:** `getProjects()`, `getUnits()`, `reserveUnit()`, `releaseUnit()`, `markUnitSold()`
  - **Reservations:** `getMyReservations()`
  - **UF Values:** `getLatestUFValue()`
  - **File storage:** `uploadFile()`, `getFiles()`, `deleteFile()`, `shareFile()`
  - **Tasks:** `getMyTodoList()`, `createTask()`, `removeTask()`, `updateAsDone()`

### CRM Components (`nextjs/src/components/crm/`)

**Badge Components:**
- `ScoreBadge.tsx` — Color-coded lead score (green ≥80, yellow ≥60, orange ≥40, red <40)
- `QualityBadge.tsx` — Quality tier badges (premium=purple, hot=red, warm=orange, cold=blue)
- `StatusBadge.tsx` — Status badges for leads and units

**Utility Components:**
- `AccountStatusCard.tsx` — User's plan reservations, credits, period end
- `ConfirmDialog.tsx` — Reusable confirmation dialog (with destructive variant)
- `FormatCurrency.ts` — `formatCLP()` and `formatUF()` helpers

**Calendar (`crm/calendar/`):**
- `LeadCalendar.tsx` — React Big Calendar with Spanish localization, color-coded by quality tier
- `CalendarEventComponent.tsx` — Individual event rendering
- `CalendarToolbar.tsx` — Calendar navigation
- `LeadDetailSidebar.tsx` — Lead detail sidebar with contact info, financials, and actions
- `LeadDetailDialog.tsx` — Modal version of lead details
- `UnscheduledLeadsSidebar.tsx` — Lists unscheduled leads (partially implemented)

### Calculations (`nextjs/src/lib/calculations/`)
- `escenario.ts` — Investment scenario engine. Core functions: `pmtExcel()`, `monthlyMortgage()`, `creditPct()`, `piePesos()`, `totalPie()`, `abonoTotal()`, `paymentPlanOption1/2()`, `cashFlow()`, `wealthProjection()`, `mortgageScenarios()`. Main export: `computeEscenario()`.

### Types
- `lib/types.ts` — Auto-generated from Supabase schema (do not edit manually)
- `lib/crm-types.ts` — `RPCResult` type for RPC responses (success, error, credits_used, lead, unit, reservation_id, etc.)

### State Management
- `GlobalContext` (`lib/context/GlobalContext.tsx`) holds authenticated user info (email, id, credits, plan reservations, lifetime stats). Auto-loads seller profile on mount.
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

Key database tables:
- `seller_profiles` — User/seller information
- `leads` — Leads with status tracking and exclusive reservations
- `leads_browsable` VIEW — Hides contact data unless current user owns the reservation
- `projects` — Real estate projects
- `units` — Property units with pricing (normalized columns + `raw_data` JSONB)
- `reservations` — Unit reservations linking leads and sellers
- `appointments` — Meeting scheduling
- `subscriptions` & `seller_accounts` — Billing, credits, and subscription tier
- `real_estate_companies` — Company metadata

Key database functions:
- `reserve_lead()` and `reserve_unit()` — PostgreSQL functions using `FOR UPDATE NOWAIT` for exclusive locking
- `release_lead()` and `release_unit()` — Reverse reservations
- `mark_unit_sold()` — Marks unit as sold and lead as converted

All tables use Row-Level Security (RLS) policies.

## Key Dependencies (beyond template)

- `@tanstack/react-table` ^8.21.3 — Advanced table with filtering/sorting
- `react-big-calendar` ^1.19.4 — Calendar component for lead scheduling

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
- All data access goes through the `SassClient` wrapper — no direct Supabase calls in components
- Business logic uses Spanish naming; technical/utility code uses English
- Currency values are in UF (Chilean housing unit) and CLP (Chilean pesos)

## Features Not Yet Implemented

- Payment processing integration (Stripe references exist in schema)
- Cal.com calendar integration (fields present in schema)
- CSV/Excel import for bulk data
- Transaction logging and audit trail
- Notifications/email system
