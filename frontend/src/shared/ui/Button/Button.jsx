import { Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

// ─── CSS injected once ────────────────────────────────────────────────────────
const BUTTON_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  :root {
    --btn-font: 'DM Sans', sans-serif;

    /* Brand palette */
    --brand-cobalt:   210 100% 56%;
    --brand-indigo:   248  90% 62%;
    --brand-emerald:  158  72% 42%;
    --brand-rose:     350  88% 58%;
    --brand-amber:     38  96% 52%;

    /* Glass tokens */
    --glass-light:    rgba(255,255,255,0.18);
    --glass-edge:     rgba(255,255,255,0.55);
    --glass-inner:    rgba(255,255,255,0.06);
    --glass-shadow:   rgba(0,0,0,0.22);

    /* Liquid shimmer animation */
    --shimmer-duration: 2.4s;
  }

  /* ── Shimmer travel ───────────────────────────────────────────────────────── */
  @keyframes btn-shimmer {
    0%   { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
    30%  { opacity: 1; }
    70%  { opacity: 1; }
    100% { transform: translateX(220%)  skewX(-20deg); opacity: 0; }
  }

  /* ── Pulse glow on press ──────────────────────────────────────────────────── */
  @keyframes btn-press-glow {
    0%   { box-shadow: var(--btn-glow-0); }
    50%  { box-shadow: var(--btn-glow-peak); }
    100% { box-shadow: var(--btn-glow-0); }
  }

  /* ── Loader spin ──────────────────────────────────────────────────────────── */
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Liquid ripple on click ───────────────────────────────────────────────── */
  @keyframes btn-ripple {
    0%   { transform: scale(0); opacity: 0.45; }
    100% { transform: scale(4); opacity: 0;    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BASE
  ═══════════════════════════════════════════════════════════════════════════ */
  .fk-btn {
    font-family: var(--btn-font);
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: none;
    outline: none;
    cursor: pointer;
    user-select: none;
    letter-spacing: 0.01em;
    font-weight: 500;
    border-radius: 12px;
    transition:
      transform 120ms cubic-bezier(.22,.68,0,1.2),
      box-shadow 240ms ease,
      opacity 200ms ease,
      filter 200ms ease;
    -webkit-font-smoothing: antialiased;
  }
  .fk-btn:active:not(:disabled) {
    transform: scale(0.965);
  }
  .fk-btn:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    filter: saturate(0.5);
  }

  /* ── Focus ring ───────────────────────────────────────────────────────────── */
  .fk-btn:focus-visible {
    outline: 2px solid hsl(var(--brand-cobalt) / 0.7);
    outline-offset: 3px;
  }

  /* ── Top-edge highlight (glass rim) ──────────────────────────────────────── */
  .fk-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 12%; right: 12%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--glass-edge) 35%,
      rgba(255,255,255,0.9) 50%,
      var(--glass-edge) 65%,
      transparent
    );
    border-radius: 50%;
    pointer-events: none;
    z-index: 3;
  }

  /* ── Bottom-edge depth shadow ─────────────────────────────────────────────── */
  .fk-btn::after {
    content: '';
    position: absolute;
    bottom: 0; left: 20%; right: 20%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0,0,0,0.25) 50%,
      transparent
    );
    border-radius: 50%;
    pointer-events: none;
    z-index: 3;
  }

  /* ── Shimmer layer ────────────────────────────────────────────────────────── */
  .fk-btn .fk-shimmer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    overflow: hidden;
    border-radius: inherit;
  }
  .fk-btn .fk-shimmer::after {
    content: '';
    position: absolute;
    top: -50%; bottom: -50%;
    width: 35%;
    left: 0;
    background: linear-gradient(
      105deg,
      transparent,
      rgba(255,255,255,0.08) 40%,
      rgba(255,255,255,0.28) 50%,
      rgba(255,255,255,0.08) 60%,
      transparent
    );
    animation: btn-shimmer var(--shimmer-duration) ease-in-out infinite;
    animation-delay: 0.6s;
  }

  /* ── Ripple container ─────────────────────────────────────────────────────── */
  .fk-btn .fk-ripple-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
    z-index: 1;
  }
  .fk-btn .fk-ripple {
    position: absolute;
    width: 80px; height: 80px;
    border-radius: 50%;
    transform: scale(0);
    background: rgba(255,255,255,0.28);
    animation: btn-ripple 520ms ease-out forwards;
    margin-left: -40px; margin-top: -40px;
  }

  /* ── Content ──────────────────────────────────────────────────────────────── */
  .fk-btn .fk-content {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1;
  }
  .fk-btn .fk-spinner {
    animation: spin 0.75s linear infinite;
    flex-shrink: 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     VARIANTS
  ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Primary – cobalt → indigo liquid glass ───────────────────────────────── */
  .fk-btn--primary {
    background: linear-gradient(
      135deg,
      hsl(var(--brand-cobalt)) 0%,
      hsl(var(--brand-indigo)) 100%
    );
    color: #fff;
    --btn-glow-0:    0 4px 24px hsl(var(--brand-cobalt) / 0.35),
                     0 1px  4px rgba(0,0,0,0.20),
                     inset 0 1px 0 rgba(255,255,255,0.22);
    --btn-glow-peak: 0 8px 40px hsl(var(--brand-cobalt) / 0.55),
                     0 2px  8px rgba(0,0,0,0.25),
                     inset 0 1px 0 rgba(255,255,255,0.28);
    box-shadow: var(--btn-glow-0);
    border: 1px solid rgba(255,255,255,0.18);
  }
  .fk-btn--primary:hover:not(:disabled) {
    box-shadow: var(--btn-glow-peak);
    background: linear-gradient(
      135deg,
      hsl(210 100% 60%) 0%,
      hsl(248 90% 66%) 100%
    );
  }

  /* Glass inner surface overlay */
  .fk-btn--primary .fk-glass-overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      160deg,
      rgba(255,255,255,0.22) 0%,
      rgba(255,255,255,0.04) 55%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 2;
  }

  /* ── Secondary – frosted slate ────────────────────────────────────────────── */
  .fk-btn--secondary {
    background:
      linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%),
      hsl(220 18% 14%);
    color: hsl(220 20% 88%);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow:
      0 4px 16px rgba(0,0,0,0.28),
      inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .fk-btn--secondary:hover:not(:disabled) {
    background:
      linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 100%),
      hsl(220 18% 17%);
    box-shadow:
      0 6px 24px rgba(0,0,0,0.35),
      inset 0 1px 0 rgba(255,255,255,0.16);
    color: #fff;
  }
  .fk-btn--secondary .fk-glass-overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      145deg,
      rgba(255,255,255,0.10) 0%,
      transparent 60%
    );
    pointer-events: none;
    z-index: 2;
  }

  /* ── Outline – thin glass border ─────────────────────────────────────────── */
  .fk-btn--outline {
    background: rgba(255,255,255,0.04);
    color: hsl(var(--brand-cobalt));
    border: 1px solid hsl(var(--brand-cobalt) / 0.4);
    box-shadow:
      0 0 0 0 hsl(var(--brand-cobalt) / 0),
      inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .fk-btn--outline:hover:not(:disabled) {
    background: hsl(var(--brand-cobalt) / 0.08);
    border-color: hsl(var(--brand-cobalt) / 0.7);
    box-shadow:
      0 0 0 4px hsl(var(--brand-cobalt) / 0.12),
      inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .fk-btn--outline .fk-glass-overlay {
    display: none;
  }

  /* ── Ghost ────────────────────────────────────────────────────────────────── */
  .fk-btn--ghost {
    background: transparent;
    color: hsl(220 20% 70%);
    border: 1px solid transparent;
    box-shadow: none;
  }
  .fk-btn--ghost:hover:not(:disabled) {
    background: rgba(255,255,255,0.06);
    color: #fff;
    border-color: rgba(255,255,255,0.08);
  }
  .fk-btn--ghost .fk-glass-overlay,
  .fk-btn--ghost .fk-shimmer { display: none; }

  /* ── Danger – rose gradient ───────────────────────────────────────────────── */
  .fk-btn--danger {
    background: linear-gradient(
      135deg,
      hsl(var(--brand-rose)) 0%,
      hsl(350 88% 45%) 100%
    );
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow:
      0 4px 24px hsl(var(--brand-rose) / 0.35),
      inset 0 1px 0 rgba(255,255,255,0.20);
  }
  .fk-btn--danger:hover:not(:disabled) {
    box-shadow:
      0 8px 36px hsl(var(--brand-rose) / 0.50),
      inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .fk-btn--danger .fk-glass-overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      160deg,
      rgba(255,255,255,0.20) 0%,
      transparent 55%
    );
    pointer-events: none;
    z-index: 2;
  }

  /* ── Success – emerald ────────────────────────────────────────────────────── */
  .fk-btn--success {
    background: linear-gradient(
      135deg,
      hsl(var(--brand-emerald)) 0%,
      hsl(158 72% 30%) 100%
    );
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow:
      0 4px 24px hsl(var(--brand-emerald) / 0.30),
      inset 0 1px 0 rgba(255,255,255,0.20);
  }
  .fk-btn--success:hover:not(:disabled) {
    box-shadow:
      0 8px 36px hsl(var(--brand-emerald) / 0.45),
      inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .fk-btn--success .fk-glass-overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      160deg,
      rgba(255,255,255,0.20) 0%,
      transparent 55%
    );
    pointer-events: none;
    z-index: 2;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SIZES
  ═══════════════════════════════════════════════════════════════════════════ */
  .fk-btn--sm  { height: 32px; padding: 0 14px; font-size: 12px; border-radius: 8px;  }
  .fk-btn--md  { height: 42px; padding: 0 20px; font-size: 14px; border-radius: 12px; }
  .fk-btn--lg  { height: 52px; padding: 0 32px; font-size: 15px; border-radius: 14px; letter-spacing: 0.02em; }
  .fk-btn--xl  { height: 60px; padding: 0 40px; font-size: 16px; border-radius: 16px; letter-spacing: 0.025em; }

  .fk-btn--icon-sm  { width: 32px; height: 32px; padding: 0; border-radius: 8px;  }
  .fk-btn--icon-md  { width: 42px; height: 42px; padding: 0; border-radius: 12px; }
  .fk-btn--icon-lg  { width: 52px; height: 52px; padding: 0; border-radius: 14px; }

  /* full-width */
  .fk-btn--full { width: 100%; }
`;

// ─── Style injection (once) ───────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('fk-btn-styles')) {
  const tag = document.createElement('style');
  tag.id = 'fk-btn-styles';
  tag.textContent = BUTTON_STYLES;
  document.head.appendChild(tag);
}

// ─── Ripple helper ────────────────────────────────────────────────────────────
const spawnRipple = (e) => {
  const btn = e.currentTarget;
  const container = btn.querySelector('.fk-ripple-container');
  if (!container) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'fk-ripple';
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top  = `${e.clientY - rect.top}px`;
  container.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
};

// ─── Component ────────────────────────────────────────────────────────────────
const Button = ({
  children,
  variant    = 'primary',
  size       = 'md',
  isLoading  = false,
  iconOnly   = false,
  fullWidth  = false,
  className  = '',
  disabled,
  onClick,
  ...props
}) => {
  const handleClick = (e) => {
    if (!disabled && !isLoading) {
      spawnRipple(e);
      onClick?.(e);
    }
  };

  const classes = [
    'fk-btn',
    `fk-btn--${variant}`,
    iconOnly ? `fk-btn--icon-${size}` : `fk-btn--${size}`,
    fullWidth ? 'fk-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  // Variants that get the glass overlay + shimmer
  const hasGlass   = ['primary', 'secondary', 'danger', 'success'].includes(variant);
  const hasShimmer = ['primary', 'danger', 'success'].includes(variant);

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {/* Glass surface overlay */}
      {hasGlass   && <span className="fk-glass-overlay" aria-hidden="true" />}

      {/* Liquid shimmer sweep */}
      {hasShimmer && <span className="fk-shimmer"       aria-hidden="true" />}

      {/* Ripple click layer */}
      <span className="fk-ripple-container" aria-hidden="true" />

      {/* Label */}
      <span className="fk-content">
        {isLoading
          ? <Loader2 className="fk-spinner" size={size === 'sm' ? 13 : size === 'lg' || size === 'xl' ? 18 : 15} />
          : null
        }
        {children}
      </span>
    </button>
  );
};

export default Button;