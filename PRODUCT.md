# UnitedMess — Product Context

## What this is

UnitedMess (https://unitedmess.uk) is an online mess management system for communal dining
communities — hostels, mess halls, and shared living communities (primarily in India; currency is ₹,
formatted en-IN). It replaces paper registers and WhatsApp groups with a real-time system for meal
logging, grocery (market) tracking, automated billing, and multi-channel payment collection.

The product's promise is **fintech-grade trust**: every rupee is auditable, every transaction has a
verifiable trail, and money figures are never ambiguous. The UI must feel as reliable and precise as
a modern banking app — calm, confident, and effortless — not flashy.

## Who uses it

### Members (primary audience)
Residents who eat at the mess. They are not financial experts; most use the app on a phone (it's a PWA).
Their recurring jobs:
- Toggle today's (and future) meal status: Day / Night / Both / Off, plus guest meals — must take
  seconds and be unambiguous about what was saved
- See at a glance: their meal count, market spend, and **payable amount** for the current billing cycle
- Pay an invoice via Razorpay (card/UPI/netbanking), manual UPI (scan QR, enter UTR reference), or cash
- Read past invoices, payment history, and refunds; download or email a PDF invoice
- Receive notifications about invoices, payment confirmations, and announcements
- Manage their profile and avatar

### Administrators (secondary audience)
Mess managers/admins who run operations, often on desktop:
- Approve or deny member registrations; manage members and roles
- Verify manual UPI payments against UTR references, record cash payments, process refunds —
  every action must communicate its audit implications clearly
- Log daily market/grocery purchases with receipts; manage the round-robin grocery duty schedule
- Configure billing rules (meal rate calculation, cooking/water/gas/platform fees, guest meal charge)
- Monitor unresolved bills and payment analytics

## What the design must preserve (non-negotiable)

- **Money legibility**: all amounts use ₹ with the sign before the symbol (`-₹232`, never `₹-232`),
  en-IN digit grouping, tabular numerals so columns of figures align
- **Status clarity**: payment/bill states (pending, verifying, paid, refunded, unresolved, overdue)
  must be instantly distinguishable via color + text, never color alone
- **Established vocabulary**: Meal, Market, Guest Meal, UTR, Payable, Billing Cycle, Duty Schedule —
  do not rename these
- **Payment channels**: Razorpay / manual UPI with QR + UTR / cash must remain first-class, equal flows
- **Density without clutter**: admins work with long tables (members, transactions) — keep data
  scannable; virtualized tables must stay performant
- **Both themes are first-class**: light and dark are already token-based (CSS variables); the design
  must not break either
- **Brand**: the blue primary palette stays, but should be elevated into a more refined, confident
  fintech palette
- **Mobile-first for members**: the critical member flows (meal toggle, pay invoice) must be excellent
  on a 390px-wide phone
- **Accessibility**: keyboard focus states, 4.5:1 contrast, color-blind-safe status semantics

## Technical context

- React 18 + Vite, Redux Toolkit, React Router 6, Tailwind CSS 3 (token-based config),
  Framer Motion for animation, Headless UI primitives, react-hot-toast
- Modular architecture: `src/modules/{auth,dashboard,meal,market,payment,members,events,notification,profile,settings,public}`
  with a shared UI kit in `src/shared/components/ui/`
- Theming via CSS variables in `src/styles/themes/light.css` / `dark.css` + `variables.css`
- Lazy-loaded routes; `react-window` virtualization for long tables; existing vitest suite must stay green
