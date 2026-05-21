import { Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

const BUTTON_STYLES = `
  :root {
    --btn-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    --brand-cobalt:   210 100% 56%;
    --brand-indigo:   248  90% 62%;
    --brand-emerald:  158  72% 42%;
    --brand-rose:     350  88% 58%;
    --brand-amber:     38  96% 52%;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

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
    border-radius: 10px;
    transition:
      transform 100ms cubic-bezier(.22,.68,0,1.2),
      box-shadow 150ms ease,
      opacity 150ms ease;
    -webkit-font-smoothing: antialiased;
  }
  .fk-btn:active:not(:disabled) { transform: scale(0.97); }
  .fk-btn:disabled { cursor: not-allowed; opacity: 0.45; }

  .fk-btn:focus-visible {
    outline: 2px solid hsl(var(--brand-cobalt) / 0.7);
    outline-offset: 2px;
  }

  .fk-btn .fk-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
  }
  .fk-btn .fk-spinner { animation: spin 0.75s linear infinite; flex-shrink: 0; }

  /* ── Primary ── */
  .fk-btn--primary {
    background: linear-gradient(135deg, hsl(var(--brand-cobalt)) 0%, hsl(var(--brand-indigo)) 100%);
    color: #fff;
    box-shadow: 0 2px 8px hsl(var(--brand-cobalt) / 0.25), 0 1px 2px rgba(0,0,0,0.12);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .fk-btn--primary:hover:not(:disabled) {
    box-shadow: 0 4px 16px hsl(var(--brand-cobalt) / 0.35), 0 1px 3px rgba(0,0,0,0.15);
  }

  /* ── Secondary ── */
  .fk-btn--secondary {
    background: hsl(220 18% 14%);
    color: hsl(220 20% 88%);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .fk-btn--secondary:hover:not(:disabled) {
    background: hsl(220 18% 17%);
    color: #fff;
  }

  /* ── Outline ── */
  .fk-btn--outline {
    background: rgba(255,255,255,0.04);
    color: hsl(var(--brand-cobalt));
    border: 1px solid hsl(var(--brand-cobalt) / 0.35);
  }
  .fk-btn--outline:hover:not(:disabled) {
    background: hsl(var(--brand-cobalt) / 0.08);
    border-color: hsl(var(--brand-cobalt) / 0.6);
  }

  /* ── Ghost ── */
  .fk-btn--ghost {
    background: transparent;
    color: hsl(220 20% 70%);
    border: 1px solid transparent;
    box-shadow: none;
  }
  .fk-btn--ghost:hover:not(:disabled) {
    background: rgba(255,255,255,0.06);
    color: #fff;
  }

  /* ── Danger ── */
  .fk-btn--danger {
    background: linear-gradient(135deg, hsl(var(--brand-rose)) 0%, hsl(350 88% 45%) 100%);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 2px 8px hsl(var(--brand-rose) / 0.25), 0 1px 2px rgba(0,0,0,0.12);
  }
  .fk-btn--danger:hover:not(:disabled) {
    box-shadow: 0 4px 16px hsl(var(--brand-rose) / 0.35), 0 1px 3px rgba(0,0,0,0.15);
  }

  /* ── Success ── */
  .fk-btn--success {
    background: linear-gradient(135deg, hsl(var(--brand-emerald)) 0%, hsl(158 72% 30%) 100%);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 2px 8px hsl(var(--brand-emerald) / 0.2), 0 1px 2px rgba(0,0,0,0.12);
  }
  .fk-btn--success:hover:not(:disabled) {
    box-shadow: 0 4px 16px hsl(var(--brand-emerald) / 0.3), 0 1px 3px rgba(0,0,0,0.15);
  }

  /* ── Sizes ── */
  .fk-btn--sm  { height: 32px; padding: 0 14px; font-size: 12px; border-radius: 8px;  }
  .fk-btn--md  { height: 40px; padding: 0 18px; font-size: 14px; border-radius: 10px; }
  .fk-btn--lg  { height: 48px; padding: 0 28px; font-size: 15px; border-radius: 12px; }
  .fk-btn--xl  { height: 56px; padding: 0 36px; font-size: 16px; border-radius: 14px; }

  .fk-btn--icon-sm  { width: 32px; height: 32px; padding: 0; border-radius: 8px;  }
  .fk-btn--icon-md  { width: 40px; height: 40px; padding: 0; border-radius: 10px; }
  .fk-btn--icon-lg  { width: 48px; height: 48px; padding: 0; border-radius: 12px; }

  .fk-btn--full { width: 100%; }
`;

if (typeof document !== 'undefined' && !document.getElementById('fk-btn-styles')) {
  const tag = document.createElement('style');
  tag.id = 'fk-btn-styles';
  tag.textContent = BUTTON_STYLES;
  document.head.appendChild(tag);
}

const Button = ({
  children,
  variant   = 'primary',
  size      = 'md',
  isLoading = false,
  iconOnly  = false,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const classes = [
    'fk-btn',
    `fk-btn--${variant}`,
    iconOnly ? `fk-btn--icon-${size}` : `fk-btn--${size}`,
    fullWidth ? 'fk-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
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
