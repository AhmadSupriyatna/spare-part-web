# Spare Part Web

Frontend SPA for the spare part management system. React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, React Router.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at the API
npm run dev
```

## Stack notes

- **Auth**: token-based via Sanctum. Login stores the bearer token in a Zustand store (persisted to `localStorage`); `src/lib/api-client.ts` attaches it to every request and clears the session on a 401.
- **Data fetching**: TanStack Query for server state; Zustand only for local/session state (auth).
- **UI**: shadcn/ui components live in `src/components/ui`; add more with `npx shadcn@latest add <component>`.
- **Routing**: `src/routes/ProtectedRoute.tsx` gates authenticated routes; unauthenticated users are redirected to `/login`.

## Structure

```
src/
  features/    feature-scoped API calls, schemas, and pages (auth, dashboard, ...)
  layouts/     shared page shells (AppLayout)
  routes/      routing guards
  stores/      Zustand stores
  lib/         shared utilities (api client, cn helper)
  types/       shared TypeScript types
```
