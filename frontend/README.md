# UnitedMess Frontend — Theme Guide

A premium base theme built with **Tailwind CSS**, **CSS custom properties**, and **framer-motion** animations. Inspired by Resend (minimal), iOS Liquid Glass (frosted glass), and Origin OS 6 (vibrant gradients).

---

## Quick Start

The theme automatically reads the user's system preference on first load and persists the choice to `localStorage`. You can toggle the theme using the `useTheme` hook.

```jsx
import { useTheme } from '@/app/providers/ThemeProvider';

const MyComponent = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  return <button onClick={toggleTheme}>{isDark ? 'Light' : 'Dark'} Mode</button>;
};
```

---

## Design Tokens

All tokens are defined in two places:

| File | Purpose |
|------|---------|
| `src/core/config/theme.config.js` | JavaScript token values (reference/documentation) |
| `src/styles/variables.css` | Base CSS custom properties |
| `src/styles/themes/light.css` | Light mode overrides |
| `src/styles/themes/dark.css` | Dark mode overrides |

### Color System

Colors use the HSL system via Tailwind's `hsl(var(...))` pattern.

| Token | Usage |
|-------|-------|
| `--primary` | Main brand color (blue) |
| `--secondary` | Violet/purple accent |
| `--accent` | Emerald/teal highlights |
| `--background` / `--foreground` | Page background and text |
| `--card` / `--card-foreground` | Card surfaces |
| `--muted` / `--muted-foreground` | Subtle backgrounds/text |
| `--destructive` | Error/danger actions |
| `--border`, `--input`, `--ring` | Form and focus ring colors |

### Glass Effect Variables

| Variable | Usage |
|----------|-------|
| `--glass-bg` | Glass background (mode-aware) |
| `--glass-border` | Glass border (mode-aware) |
| `--glass-shadow` | Combined shadow |
| `--glass-blur` | `blur(20px)` |
| `--glass-blur-heavy` | `blur(32px)` |

### Gradient Variables

| Variable | Description |
|----------|-------------|
| `--gradient-primary` | Blue → Violet gradient |
| `--gradient-aurora` | Tri-color aurora |
| `--gradient-text` | For gradient text effects |
| `--gradient-hero` | Hero section background |

---

## CSS Utilities

Defined in `src/styles/global.css`:

| Class | What it does |
|-------|-------------|
| `.glass` | Full glass morphism (backdrop-filter + border) |
| `.glass-heavy` | Stronger blur glass |
| `.card-base` | Solid card surface |
| `.card-glass` | Glass card |
| `.card-elevated` | Elevated card with strong shadow |
| `.text-gradient` | `--gradient-text` applied as text color |
| `.text-gradient-aurora` | Aurora gradient text |
| `.gpu` | Forces GPU layer (`will-change: transform`) |
| `.touch-target` | Ensures 44×44px minimum touch area |
| `.no-scrollbar` | Hides scrollbar while keeping scroll |

---

## UI Components

All components live in `src/shared/components/ui/` and can be imported from the barrel:

```jsx
import { Button, Card, Input, Badge, Avatar, Loader, Modal, Tabs, Dropdown, ToastContainer, useToast } from '@/shared/components/ui';
```

### Button

```jsx
<Button variant="primary" size="md" loading={false}>Click Me</Button>
// Variants: primary | secondary | outline | ghost | glass | danger
// Sizes:    xs | sm | md | lg | xl
```

### Card

```jsx
<Card variant="glass" padding="lg" hover>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>…</CardContent>
</Card>
// Variants: default | glass | elevated | flat | bordered
```

### Input

```jsx
<Input label="Email" type="email" error="Required" leftIcon={<MailIcon />} />
// Variants: default | filled | glass
```

### Modal

```jsx
const [open, setOpen] = useState(false);
<Modal isOpen={open} onClose={() => setOpen(false)} title="Hello" size="md">
  Content here
</Modal>
// Sizes: sm | md | lg | xl | 2xl | full
```

### Toast

```jsx
const { toasts, removeToast, toast } = useToast();

// In your JSX:
<ToastContainer toasts={toasts} onRemove={removeToast} position="bottom-right" />

// To trigger:
toast.success('Saved!', 'Your changes were saved successfully.');
toast.error('Error', 'Something went wrong.');
// Also: toast.warning(), toast.info()
```

### Tabs

```jsx
<Tabs variant="glass" tabs={[
  { label: 'Tab 1', content: <div>Content 1</div> },
  { label: 'Tab 2', content: <div>Content 2</div> },
]} />
// Variants: underline | pill | glass
```

---

## Adding New Themed Components

1. Create `src/shared/components/ui/MyComponent/MyComponent.jsx`
2. Use `hsl(var(--primary))`, `@apply text-foreground`, `var(--glass-bg)`, etc. for all colors
3. Use `var(--transition-normal)` or Tailwind `transition-colors` for transitions
4. Add an `index.js` barrel: `export { default } from './MyComponent.jsx';`
5. Export from `src/shared/components/ui/index.js`

### Example skeleton:

```jsx
import { clsx } from 'clsx';

const MyComponent = ({ variant = 'default', className = '', children }) => {
  return (
    <div className={clsx(
      'rounded-xl border border-border bg-card text-card-foreground',
      'transition-all duration-200',
      className,
    )}>
      {children}
    </div>
  );
};

export default MyComponent;
```

---

## Animations

All keyframes are in `src/styles/animations.css`. Utility classes include:

| Class | Animation |
|-------|-----------|
| `.animate-blob` | Liquid blob motion (8s loop) |
| `.animate-float` | Gentle floating (4s loop) |
| `.animate-fade-in-up` | Fade + slide up |
| `.animate-shimmer` | Loading shimmer |
| `.animate-pulse-glow` | Glow pulse |
| `.animation-delay-{n}` | Delay: 150, 300, 500, 700, 1000, 2000, 3000, 4000ms |

---

## Performance Tips

- All blob animations use `will-change: transform` — don't add more than 3 per page
- Use `<img loading="lazy" />` for below-fold images
- Use `font-display: swap` — already configured in `global.css`
- The glass `.backdrop-filter` gracefully degrades: solid `--surface-raised` fallback is applied via `@supports not`
