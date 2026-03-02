# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wildcat V2 App is a DeFi protocol UI for managing private credit facilities (markets). It serves two user roles: **borrowers** (create/manage credit markets) and **lenders** (deposit into/withdraw from markets). Built with Next.js 14 App Router, TypeScript, and Web3 libraries.

## Commands

- `yarn dev` — start dev server (port 3000, redirects `/` to `/lender`)
- `yarn build` — build for production (runs `prisma generate` first)
- `yarn lint` — run ESLint; `yarn lint:errors` for errors only (no warnings)
- `yarn test` — run Jest tests
- `npx jest path/to/file.test.ts` — run a single test file
- `npx prisma generate` — regenerate Prisma client after schema changes
- `npx prisma db push` — push schema changes to database
- `yarn storybook` — start Storybook on port 6006

## Architecture

### Routing & Pages (`src/app/`)

Uses Next.js App Router with `[locale]` dynamic segment (currently English only). Two main sections:
- `/borrower/*` — borrower dashboard, market creation, lender list management, profiles, policies
- `/lender/*` — lender dashboard, market views, profiles

Routes are defined in `src/routes.ts`. The root `/` permanently redirects to `/lender`.

### API Routes (`src/app/api/`)

REST endpoints backed by **Prisma + PostgreSQL** (Supabase):
- `/api/auth/login` — JWT authentication
- `/api/mla/*` — Master Loan Agreement creation, signing, HTML/PDF rendering
- `/api/profiles/*` — borrower profile CRUD
- `/api/sla/*` — service level agreement signatures
- `/api/invite/*` — borrower invitation management
- `/api/borrower-names`, `/api/tokens-list` — public data

### State Management

Three systems coexist:
- **Redux Toolkit** (`src/store/`) — UI state: sidebar, form states, notifications, routing. Persisted via redux-persist.
- **React Query** (`@tanstack/react-query`) — async server data fetching and caching
- **Zustand** — lightweight local component state

### Web3 Integration

- **Wagmi v2** — wallet connection, contract reads/writes, hooks
- **Ethers v5** — signing, provider utilities (via `src/hooks/useEthersSigner.ts`)
- **@wildcatfi/wildcat-sdk** — domain-specific protocol interactions
- **Safe Apps SDK** — Gnosis Safe multisig integration (app runs inside Safe iframe)
- Network config: Sepolia (testnet) or Mainnet, controlled by `NEXT_PUBLIC_TARGET_NETWORK`

### Database (`prisma/schema.prisma`)

PostgreSQL via Supabase. Key models: `Borrower`, `MasterLoanAgreement`, `MlaTemplate`, `MlaSignature`, `BorrowerInvitation`, service agreement signatures. Composite keys use `(chainId, address/market)`.

### Key Directories

- `src/components/` — reusable React components, with MUI-extended components in `@extended/`
- `src/hooks/` — custom React hooks (network, signers, market data, polling, Safe SDK)
- `src/lib/` — server-side utilities (Prisma DB helpers, MLA templates, Puppeteer PDF generation, signature verification, Wagmi config)
- `src/utils/` — client-side utilities (formatters, constants, token addresses, validators, comparators)
- `src/providers/` — React context providers (Wagmi, Safe, etc.)
- `src/theme/` — MUI v5 theme with custom palette (blueRibbon, dullRed, butteredRum, santasGrey)
- `src/graphql/` — GraphQL/subgraph query definitions
- `src/locales/` — i18n translation JSON files

## Code Conventions

- **No semicolons** — enforced by ESLint + Prettier (`"semi": false`)
- **Import order** — enforced: builtin → external → internal, with `react` first, alphabetized, newlines between groups
- **Path aliases** — use `@/*` which maps to `./src/*`
- **JSX** — only in `.tsx` files
- **SVGs** — imported as React components via `@svgr/webpack`; use `?url` suffix for URL imports
- **Styling** — MUI `sx` prop for component styles; emotion for styled components
- **Forms** — React Hook Form + Zod for validation
- **No default exports** preference — `import/prefer-default-export` is off (except page components which Next.js requires as default)

## Middleware

`src/middleware.ts` blocks mobile user agents with a static HTML response. All non-API/static routes pass through i18n routing.

## Environment Variables

Key variables needed: `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_TARGET_NETWORK` (Sepolia/Mainnet), `NEXT_RPC_URL`, `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `DIRECT_URL` (Prisma), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
