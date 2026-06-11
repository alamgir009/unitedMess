# United Mess — Complete Change Log

## P1 — Architecture & Dead Code Removal
- **Dual Input architecture eliminated**: Deleted `src/shared/ui/` (entire directory — legacy duplicates, zero external imports)
- **Dead config removed**: Deleted `src/core/config/theme.config.js` (zero imports across codebase)
- **Empty directory stubs purged**: 15 shared/ + 28 modules/ dirs deleted (including entire empty `table/` module)
- **Unused test file deleted**: `test_axios.js` (CommonJS, zero imports)

## P1 — Theme Drift Mitigation
- **Cleaned `variables.css`**: Removed 21 dead HSL default lines (duplicated by `light.css`)
- **Cleaned `tailwind.config.js`**: Removed 33 redundant `spacing`/`fontWeight` blocks (exact Tailwind defaults)
- **Stripped `animations.css`**: Removed all `@keyframes` (Tailwind was winning the cascade) and all `.animate-*` utility classes; kept only `@media (prefers-reduced-motion: reduce)` rule
- **Added `overlay` color**: `tailwind.config.js` now maps `overlay` to `var(--bg-overlay)` CSS variable

## P2 — Hardcoded Color Fixes (Shared Components)
- **Button.jsx**: `bg-emerald-600` → `bg-success`, `hover:bg-emerald-700` → `hover:brightness-90`
- **ErrorBoundary.jsx**: All hardcoded Tailwind grays/reds/blues → `bg-background`/`bg-card`/`text-destructive`/`bg-primary`

## P2 — Dependency Cleanup
- **`classnames` removed from `package.json`**: Confirmed zero imports across codebase
- **`clsx` → `cn()` standardization**: 12 files migrated (Tabs, Modal, Button, Input, VirtualizedTable, Loader, Toast, Avatar, Dropdown, Badge, Card, MealPolling) — all now use `import { cn } from '@/core/utils/helpers/string.helper'`

## P3 — Functional Bug Fixes
- **SearchBar.jsx**: KBD badge wrapped in `{!searchQuery && (...)}` to prevent overlap with clear button
- **Modal.jsx**: `setTimeout(focus, 50)` → `requestAnimationFrame` + `cancelAnimationFrame` on unmount
- **Header.jsx / Navbar.jsx**: Removed Framer Motion from theme toggle — `motion.span` → plain `<span>` + CSS `transition-transform duration-200 motion-reduce:transition-none`

## P4 — Lint Error Resolution (112 errors → 0)
- Removed ~25 unused `import React from 'react'` (automatic JSX runtime)
- Removed ~15 other unused imports/vars (`useEffect`, `navigate`, `dispatch`, `ShieldOff`, `Button`, `Loader2`, etc.)
- Fixed ~16 unescaped `'`/`"` → `&apos;`/`&quot;` across auth/market/public pages
- Added ~17 missing `displayName` to anonymous components
- Fixed 4 empty `catch(e) {}` blocks in `useRazorpaySDK.js` → `console.error(e)`
- Fixed 3 `no-case-declarations` in `Dropdown.jsx` — switch cases wrapped in braces
- Replaced `process.env` in `vite.config.js` with hardcoded fallback
- Deleted unused `test_axios.js`
- Removed duplicate globals in `service-worker.js`
- Added eslint-disable for `react-refresh/only-export-components` in 3 files
- Added missing hook deps in `App.jsx` and `PaymentPage.jsx`

## P4 — Module Audit: Critical Pattern Fixes
### Error Banners (9 files → theme tokens)
`MemberPage`, `AdminUnpaidPanel`, `PaymentPage`, `MarketPage`, `MealPage`, `LoginForm`, `RegisterForm`, `ForgotPasswordPage`, `ResetPasswordPage`
- `bg-red-50 dark:bg-red-500/10 border-red-200 text-red-600 dark:text-red-400` → `bg-destructive/10 border-destructive/20 text-destructive`

### Success Banners (3 files → theme tokens)
- `bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 text-emerald-700` → `bg-success-bg border-success-border text-success-text`

### Status Badges (2 files → theme tokens)
`PaymentList` (4 statuses + 2 types), `AdminUnpaidPanel` (3 statuses)
- `bg-success-bg`, `bg-warning-bg`, `bg-danger-bg`, `bg-info-bg`

### Mass Hardcoded Color Fixes (799 tokens → 17 remaining)
| File | Before | After | Savings |
|------|--------|-------|---------|
| MessBillInvoice.jsx | 350 | intentional/structural only | ~345 |
| AdminUnpaidPanel.jsx | 248 | intentional/structural only | ~243 |
| HomePage.jsx | 118 | intentional/structural only | ~112 |
| MonthlyInvoiceModal.jsx | 83 | intentional/structural only | ~82 |

Key patterns replaced:
- `bg-gray-*`/`bg-slate-*` → `bg-card`/`bg-muted`/`bg-background`/`bg-input`
- `text-gray-*`/`text-slate-*` → `text-foreground`/`text-muted-foreground`
- `border-gray-*`/`border-slate-*` → `border-border`/`border-input`
- `bg-emerald-*` → `bg-success-bg`, `text-amber-*` → `text-warning-text`, `bg-rose-*` → `bg-danger-bg`
- `focus:ring-*-500` → `focus:ring-ring`
- Color-specific shadows → `shadow-md`/`shadow-lg`
- `bg-indigo-*` → `bg-primary/*`, `text-indigo-*` → `text-primary`
- `bg-black/*` overlays → `bg-overlay`
- `from-black/60` → `from-overlay`
- Avatar gradients: `from-indigo-500 to-violet-500` → `from-primary to-secondary-400`

## P5 — Minor Code Quality Fixes
### displayName (26 files, +47 displayNames)
All shared UI, layout, route, app, and provider components now have proper `displayName`.

### Empty catch blocks (6 → all now log errors)
- `main.jsx` (SW update), `AdminUnpaidPanel.jsx` (clipboard), `usePushManager.js` (2), `useWebPush.js` (2)

### Commented-out code removed
- `NotFoundPage.jsx`: ~22 lines of dead `ThemeToggle` component deleted

## Test Infrastructure
- **Installed**: Vitest + @testing-library/react + @testing-library/jest-dom + happy-dom
- **Configured**: `vite.config.js` (test block), `package.json` (`test`/`test:watch` scripts)
- **Created**: `tests/unit/setup.js`, `tests/unit/components.test.jsx`
- **Written**: 49 component tests across 7 components (Button, Badge, Card, Avatar, Spinner, Input, StatPill)

## Phase 5 — Surface-Level UI Redesign
### Bugs Squashed
- **StatPill**: Invalid `w-4.5 h-4.5` → `w-4 h-4` (was rendering zero-width icons)
- **VirtualizedTable**: `overflow-hidden` → `overflow-x-auto` (mobile columns clipped)

### Remaining Hardcoded Colors → Theme Tokens
- `MemberSelect.jsx`: `bg-white dark:bg-slate-900` → `bg-card`
- `Loader.jsx` (FullPageLoader): `bg-white/60 dark:bg-slate-900/60` → `bg-card/60`
- `backdrop-blur-md` → `backdrop-blur-sm` on MemberSelect

### Focus Accessibility (+14 elements fixed)
Added `focus-visible:ring-2 focus-visible:ring-ring` to:
- Input clear button, Toast dismiss button, SearchBar (input + clear + filters toggle + clear filters)
- Pagination (prev + page numbers + next + select), PasswordInput toggle
- Dropdown trigger wrapper

### Touch Targets (~25 elements, WCAG 44px minimum)
- Header dropdown items: `py-1.5` → `py-2.5 min-h-[44px]`
- Navbar: `touch-target` on theme toggle + hamburger; `py-2` → `py-2.5` on CTA buttons; `min-h-[44px]` on mobile nav links
- Sidebar: `min-h-[44px]` on all nav links + logout; `truncate` on link text
- Toast dismiss: `p-1` → `p-2.5`
- Dropdown menu items: `min-h-[44px]`
- Footer social links: `touch-target`
- Badge clickable: `hover:opacity-80` → `hover:bg-muted` (project-wide hover pattern)

### Transition Consistency
- 22 `transition-all` → `transition-colors` (Navbar header scroll bg, Header theme toggle, CTA buttons)
- Added `duration-150` to Input clear, Toast dismiss, PasswordInput toggle
- Badge clickable: opacity fade replaced with `hover:bg-muted` + `transition-colors duration-150`

### Spacing Tokenization
- Navbar: `py-[10px]` → `py-2.5`
- Pagination: `min-w-[32px]` → `min-w-8`

### Shadow Tier Established
- Header dropdown: `shadow-lg` → `shadow-xl`
- Ensures higher z-index elements get heavier shadows

### Keyboard Accessibility
- Dropdown trigger: added `tabIndex={0}`, `role="button"`, `focus-visible` ring
