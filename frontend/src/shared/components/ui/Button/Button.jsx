import { Loader2 } from 'lucide-react';

const STYLE_ID = 'fk-btn-styles';

const BUTTON_STYLES = `
  :root {
    --brand-cobalt:   210 100% 56%;
    --brand-indigo:   248  90% 62%;
    --brand-emerald:  158  72% 42%;
    --brand-rose:     350  88% 58%;
    --brand-amber:     38  96% 52%;
  }

  @keyframes fk-spin { to { transform: rotate(360deg); } }

  .fk-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    cursor: pointer;
    user-select: none;
    letter-spacing: 0.01em;
    font-weight: 500;
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    border-radius: 12px;
    transition: transform 100ms ease, box-shadow 150ms ease, opacity 150ms ease;
  }
  .fk-btn:active:not(:disabled) { transform: scale(0.97); }
  .fk-btn:disabled { cursor: not-allowed; opacity: 0.45; }
  .fk-btn:focus-visible { outline: 2px solid hsl(var(--brand-cobalt) / 0.7); outline-offset: 2px; }

  .fk-btn .fk-content {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
  }
  .fk-btn .fk-spinner { animation: fk-spin 0.75s linear infinite; flex-shrink: 0; }

  .fk-btn--primary {
    background: linear-gradient(135deg, hsl(var(--brand-cobalt)) 0%, hsl(var(--brand-indigo)) 100%);
    color: #fff;
    box-shadow: 0 2px 8px hsl(var(--brand-cobalt) / 0.25);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .fk-btn--primary:hover:not(:disabled) { box-shadow: 0 4px 16px hsl(var(--brand-cobalt) / 0.35); }

  .fk-btn--secondary {
    background: hsl(220 18% 14%);
    color: hsl(220 20% 88%);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .fk-btn--secondary:hover:not(:disabled) { background: hsl(220 18% 17%); color: #fff; }

  .fk-btn--outline {
    background: transparent;
    color: hsl(var(--brand-cobalt));
    border: 1px solid hsl(var(--brand-cobalt) / 0.4);
  }
  .fk-btn--outline:hover:not(:disabled) { background: hsl(var(--brand-cobalt) / 0.08); }

  .fk-btn--ghost {
    background: transparent;
    color: hsl(220 20% 70%);
    border: 1px solid transparent;
    box-shadow: none;
  }
  .fk-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: #fff; }

  .fk-btn--danger {
    background: linear-gradient(135deg, hsl(var(--brand-rose)) 0%, hsl(350 88% 45%) 100%);
    color: #fff;
    box-shadow: 0 2px 8px hsl(var(--brand-rose) / 0.25);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .fk-btn--danger:hover:not(:disabled) { box-shadow: 0 4px 16px hsl(var(--brand-rose) / 0.35); }

  .fk-btn--success {
    background: linear-gradient(135deg, hsl(var(--brand-emerald)) 0%, hsl(158 72% 30%) 100%);
    color: #fff;
    box-shadow: 0 2px 8px hsl(var(--brand-emerald) / 0.20);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .fk-btn--success:hover:not(:disabled) { box-shadow: 0 4px 16px hsl(var(--brand-emerald) / 0.30); }

  .fk-btn--amber {
    background: linear-gradient(135deg, hsl(var(--brand-amber)) 0%, hsl(38 96% 40%) 100%);
    color: #fff;
    box-shadow: 0 2px 8px hsl(var(--brand-amber) / 0.25);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .fk-btn--amber:hover:not(:disabled) { box-shadow: 0 4px 16px hsl(var(--brand-amber) / 0.35); }

  .fk-btn--sm  { height: 32px; padding: 0 14px; font-size: 12px; border-radius: 8px;  }
  .fk-btn--md  { height: 42px; padding: 0 20px; font-size: 14px; border-radius: 12px; }
  .fk-btn--lg  { height: 52px; padding: 0 32px; font-size: 15px; border-radius: 14px; }
  .fk-btn--xl  { height: 60px; padding: 0 40px; font-size: 16px; border-radius: 16px; }

  .fk-btn--icon-sm  { width: 32px; height: 32px; padding: 0; border-radius: 8px;  }
  .fk-btn--icon-md  { width: 42px; height: 42px; padding: 0; border-radius: 12px; }
  .fk-btn--icon-lg  { width: 52px; height: 52px; padding: 0; border-radius: 14px; }

  .fk-btn--full { width: 100%; }
`;

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = BUTTON_STYLES;
  document.head.appendChild(tag);
}

const VARIANTS = new Set(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'amber']);

const Button = ({
  children,
  variant = 'primary',
  type,
  size = 'md',
  isLoading = false,
  iconOnly = false,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const resolvedVariant = (type && VARIANTS.has(type)) ? type : variant;
  const handleClick = (e) => {
    if (!disabled && !isLoading) onClick?.(e);
  };

  const classes = [
    'fk-btn',
    `fk-btn--${resolvedVariant}`,
    iconOnly ? `fk-btn--icon-${size}` : `fk-btn--${size}`,
    fullWidth ? 'fk-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type && !VARIANTS.has(type) ? type : undefined}
      className={classes}
      disabled={disabled || isLoading}
      onClick={handleClick}
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
