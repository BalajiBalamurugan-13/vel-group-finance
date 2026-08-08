# VEL Finance — Group Finance Frontend

> React + TypeScript + Vite frontend for the VEL Finance Group Finance application.

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |

### Installation

```bash
# From the project root
cd frontend

# Install all dependencies
npm install
```

### Environment Setup

```bash
# Copy the environment template
cp .env.example .env

# Edit VITE_API_BASE_URL to match your local backend
# Default: http://localhost:8000/api/v1
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

### Other Commands

```bash
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Language |
| Vite | 5 | Build tool |
| Tailwind CSS | **v4** | Styling (CSS-first config) |
| React Router DOM | 6 | Client-side routing |
| TanStack Query | 5 | Server state management |
| TanStack Table | 8 | Data tables |
| React Hook Form | 7 | Form management |
| Zod | 3 | Schema validation |
| Framer Motion | 11 | Animations |
| Lucide React | Latest | Icons |
| Recharts | 2 | Charts |
| Day.js | 1 | Date handling |
| Axios | 1 | HTTP client |
| @fontsource/inter | 5 | Self-hosted Inter font |
| clsx + tailwind-merge | Latest | Conditional class utilities |

---

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── app/                    # App root (App.tsx, providers.tsx)
│   ├── assets/                 # Static assets
│   ├── components/
│   │   ├── ui/                 # Design system primitives (Button, Input, Card…)
│   │   ├── common/             # Shared page-level components (PageContainer…)
│   │   └── layout/             # Layout components (Sidebar, Header, BottomNav…)
│   ├── config/                 # Environment and API configuration
│   ├── constants/              # Design tokens (TS), routes, breakpoints, app constants
│   ├── features/               # Feature modules (EMPTY — not yet implemented)
│   │   ├── dashboard/
│   │   ├── groups/
│   │   ├── members/
│   │   ├── collections/
│   │   ├── reports/
│   │   └── settings/
│   ├── hooks/                  # Shared React hooks
│   ├── layouts/                # AppLayout, DesktopLayout, MobileLayout
│   ├── lib/                    # Library configurations (axios, dayjs, queryClient)
│   ├── pages/                  # Route page components (placeholder only)
│   ├── routes/                 # Router configuration
│   ├── services/               # (Reserved for shared API services)
│   ├── styles/                 # globals.css, tokens.css (design tokens)
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Utility functions (format, storage, validation)
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts           # Vite environment type declarations
├── .env.example                # Environment variable template
├── .gitignore
├── eslint.config.js            # ESLint v9 flat config
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## Architecture Overview

### Adaptive Responsive Design

This application does **not** use simple CSS responsiveness.  
It uses **Adaptive Responsive Design** — structural layout differences per device:

| Breakpoint | Layout | Optimized For |
|-----------|--------|--------------|
| ≥ 1024px (Desktop/Laptop) | Sidebar + Header + Scrollable Content | Office staff (data entry) |
| < 1024px (Mobile/Tablet) | Sticky Header + Scrollable Content + Bottom Nav | Field collectors |

The `AppLayout` component selects the layout via `useBreakpoint()`.

### Design Token System

All visual values are defined in two synchronized places:

| File | Usage |
|------|-------|
| `src/styles/tokens.css` | CSS custom properties → consumed by `@theme` block in globals.css |
| `src/constants/tokens.ts` | TypeScript constants → used in Framer Motion, calculations |

**No component hardcodes any color, spacing, or radius value.**

### Tailwind CSS v4

This project uses **Tailwind CSS v4** (CSS-first configuration):

- **No `tailwind.config.ts`** — configuration is in `src/styles/globals.css` via `@theme {}`
- Import: `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- Vite integration: `@tailwindcss/vite` plugin

### State Management

| State Type | Tool |
|-----------|------|
| Server state (API data) | TanStack Query |
| Client state (UI preferences) | React Context (when needed) |
| Local component state | useState |
| Persisted UI state | useLocalStorage hook |

### Feature Folder Structure

Each future feature module follows this structure:

```
src/features/<feature>/
├── components/     # Feature-specific components
├── hooks/          # Feature-specific hooks
├── services/       # API service functions
├── types/          # Feature-specific types
└── utils/          # Feature-specific utilities
```

---

## Code Standards

- **TypeScript strict mode** — no `any` types
- **ESLint v9 flat config** — enforces consistent-type-imports, no-console
- **Path aliases** — `@/` maps to `src/`
- **No hardcoded business values** — all financial values come from the backend
- **No financial calculations on the frontend** — per `10_DEVELOPMENT_RULES.md`

---

## Environment Variables

| Variable | Required | Description |
|---------|---------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | FastAPI backend base URL |
| `VITE_APP_NAME` | No | Application name (has default) |
| `VITE_APP_VERSION` | No | Application version (has default) |

---

## Current Status

| Area | Status |
|------|--------|
| Frontend Foundation | ✅ Complete |
| Design Token System | ✅ Complete |
| Layout System (Desktop + Mobile) | ✅ Complete |
| Routing | ✅ Complete |
| Shared Components | ✅ Complete |
| Axios Infrastructure | ✅ Complete |
| TanStack Query Config | ✅ Complete |
| Dashboard | ⏳ Not Started |
| Groups | ⏳ Not Started |
| Members | ⏳ Not Started |
| Collections | ⏳ Not Started |
| Reports | ⏳ Not Started |

---

## Documentation

Refer to the project documentation in `../docs/`:

| Document | Read Before |
|---------|------------|
| `12_AI_CONTEXT.md` | Every feature |
| `10_DEVELOPMENT_RULES.md` | Every feature |
| `09_DESIGN_SYSTEM.md` | Any UI work |
| `08_UI_UX_GUIDELINES.md` | Any UX design |
| `07_API_SPECIFICATION.md` | Any API integration |
