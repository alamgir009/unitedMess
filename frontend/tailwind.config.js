/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: 'hsl(210, 100%, 97%)',
          100: 'hsl(210, 96%,  93%)',
          200: 'hsl(210, 90%,  84%)',
          300: 'hsl(210, 86%,  72%)',
          400: 'hsl(210, 88%,  60%)',
          500: 'hsl(210, 92%,  48%)',
          600: 'hsl(214, 90%,  40%)',
          700: 'hsl(218, 88%,  32%)',
          800: 'hsl(220, 84%,  26%)',
          900: 'hsl(222, 80%,  18%)',
          950: 'hsl(224, 78%,  12%)',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          400: 'hsl(268, 80%, 62%)',
          500: 'hsl(268, 76%, 52%)',
          600: 'hsl(269, 72%, 44%)',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          400: 'hsl(160, 64%, 48%)',
          500: 'hsl(160, 60%, 38%)',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          text: "var(--success-text)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
          text: "var(--warning-text)",
          border: "var(--warning-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
          text: "var(--danger-text)",
          border: "var(--danger-border)",
        },
        error: {
          DEFAULT: "var(--error)",
          bg: "var(--error-bg)",
          text: "var(--error-text)",
          border: "var(--error-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
          text: "var(--info-text)",
          border: "var(--info-border)",
        },
        profit: {
          DEFAULT: "var(--profit)",
          bg: "var(--profit-bg)",
          text: "var(--profit-text)",
        },
        loss: {
          DEFAULT: "var(--loss)",
          bg: "var(--loss-bg)",
          text: "var(--loss-text)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          bg: "var(--neutral-bg)",
          text: "var(--neutral-text)",
        },
        overlay: "var(--bg-overlay)",
        'bg-base': "var(--bg-base)",
        'bg-surface': "var(--bg-surface)",
        'bg-raised': "var(--bg-raised)",
        'text-primary': "var(--text-primary)",
        'text-muted': "var(--text-muted)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          active: "var(--brand-active)",
        },
        'btn-label': {
          primary: 'var(--btn-primary-label)',
          secondary: 'var(--btn-secondary-label)',
          ghost: 'var(--btn-ghost-label)',
          destructive: 'var(--btn-destructive-label)',
          warning: 'var(--btn-warning-label)',
          success: 'var(--btn-success-label)',
          icon: 'var(--btn-icon-label)',
          loading: 'var(--btn-loading-label)',
          premium: 'var(--btn-premium-label)',
          inverse: 'var(--btn-inverse-label)',
          glass: 'var(--btn-glass-label)',
          neutral: 'var(--btn-neutral-label)',
          elevated: 'var(--btn-elevated-label)',
          'brand-subtle': 'var(--btn-brand-subtle-label)',
        },
        'btn-border': {
          primary: 'var(--btn-primary-border)',
          secondary: 'var(--btn-secondary-border)',
          ghost: 'transparent',
          destructive: 'var(--btn-destructive-border)',
          warning: 'var(--btn-warning-border)',
          success: 'var(--btn-success-border)',
          icon: 'var(--btn-icon-border)',
          loading: 'var(--btn-loading-border)',
          premium: 'var(--btn-premium-border)',
          inverse: 'var(--btn-inverse-border)',
          glass: 'var(--btn-glass-border)',
          neutral: 'var(--btn-neutral-border)',
          elevated: 'var(--btn-elevated-border)',
          'brand-subtle': 'var(--btn-brand-subtle-border)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--btn-primary-from), var(--btn-primary-to))',
        'gradient-secondary': 'linear-gradient(135deg, var(--btn-secondary-from), var(--btn-secondary-to))',
        'gradient-destructive': 'linear-gradient(135deg, var(--btn-destructive-from), var(--btn-destructive-to))',
        'gradient-warning': 'linear-gradient(135deg, var(--btn-warning-from), var(--btn-warning-to))',
        'gradient-success': 'linear-gradient(135deg, var(--btn-success-from), var(--btn-success-to))',
        'gradient-icon': 'linear-gradient(135deg, var(--btn-icon-from), var(--btn-icon-to))',
        'gradient-loading': 'linear-gradient(135deg, var(--btn-loading-from), var(--btn-loading-to))',
        'gradient-premium': 'linear-gradient(135deg, var(--btn-premium-from), var(--btn-premium-via), var(--btn-premium-to))',
        'gradient-inverse': 'linear-gradient(135deg, var(--btn-inverse-from), var(--btn-inverse-to))',
        'gradient-glass': 'linear-gradient(135deg, var(--btn-glass-from), var(--btn-glass-to))',
        'gradient-neutral': 'linear-gradient(135deg, var(--btn-neutral-from), var(--btn-neutral-to))',
        'gradient-link': 'linear-gradient(135deg, var(--btn-link-from), var(--btn-link-to))',
        'gradient-elevated': 'linear-gradient(135deg, var(--btn-elevated-from), var(--btn-elevated-to))',
        'gradient-brand-subtle': 'linear-gradient(135deg, var(--btn-brand-subtle-from), var(--btn-brand-subtle-to))',
        'gradient-ghost-border': 'linear-gradient(135deg, var(--btn-ghost-border-from), var(--btn-ghost-border-to))',
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        '2xl': "var(--radius-xl)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xs: "var(--radius-xs)",
        full: "var(--radius-full)",
        'btn-sm': 'var(--btn-radius-sm)',
        'btn-md': 'var(--btn-radius-md)',
        'btn-lg': 'var(--btn-radius-lg)',
        'btn-xl': 'var(--btn-radius-xl)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
        label: ['0.8125rem', { lineHeight: '1.25rem' }],
        body: ['clamp(0.875rem, 0.5vw + 0.75rem, 1rem)', { lineHeight: '1.5' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.625rem' }],
        h4: ['1.125rem', { lineHeight: '1.5rem' }],
        h3: ['clamp(1rem, 1.5vw + 0.5rem, 1.375rem)', { lineHeight: '1.3', fontWeight: '600' }],
        h2: ['clamp(1.125rem, 2vw + 0.625rem, 1.875rem)', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        h1: ['clamp(1.375rem, 2.5vw + 0.875rem, 2.5rem)', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
        display: ['clamp(1.75rem, 3vw + 1.125rem, 3.25rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
      },

      zIndex: {
        base: '0',
        raised: '10',
        dropdown: '100',
        sticky: '200',
        overlay: '300',
        modal: '400',
        toast: '500',
        tooltip: '600',
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "toast-progress": {
          "from": { width: "100%" },
          "to": { width: "0%" },
        },
        "fade-in": {
          "from": { opacity: "0" },
          "to": { opacity: "1" },
        },
        "fade-in-up": {
          "from": { opacity: "0", transform: "translateY(8px)" },
          "to": { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          "from": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "to": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "toast-in": {
          "from": { opacity: "0", transform: "translateX(100%) scale(0.95)" },
          "to": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s ease infinite",
        "toast-progress": "toast-progress linear forwards",
        "fade-in": "fade-in 0.18s ease-out both",
        "fade-in-up": "fade-in-up 0.25s ease-out both",
        "modal-in": "modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "toast-in": "toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const variants = [
        'primary', 'secondary', 'destructive', 'warning', 'success',
        'icon', 'loading', 'premium', 'inverse', 'glass',
        'neutral', 'elevated', 'brand-subtle',
      ];

      const btnBase = {};
      const btnHover = {};
      const btnActive = {};
      const btnGhost = {};
      const btnGlass = {};
      const btnLink = {};
      const btnLinkHover = {};

      variants.forEach(v => {
        const className = `.btn-${v}`;
        btnBase[className] = {
          backgroundImage: `linear-gradient(135deg, var(--btn-${v}-from)${v === 'premium' ? ', var(--btn-' + v + '-via)' : ''}, var(--btn-${v}-to))`,
          color: `var(--btn-${v}-label)`,
          borderColor: `var(--btn-${v}-border, transparent)`,
        };
        btnHover[`${className}:hover`] = {
          backgroundImage: `linear-gradient(315deg, var(--btn-${v}-from)${v === 'premium' ? ', var(--btn-' + v + '-via)' : ''}, var(--btn-${v}-to))`,
          filter: 'brightness(0.95)',
        };
        btnActive[`${className}:active`] = {
          backgroundImage: `linear-gradient(135deg, var(--btn-${v}-from)${v === 'premium' ? ', var(--btn-' + v + '-via)' : ''}, var(--btn-${v}-to))`,
          filter: 'brightness(0.88)',
        };
      });

      btnGhost['.btn-ghost'] = {
        background: 'transparent',
        color: 'var(--btn-ghost-label)',
        border: '1px solid transparent',
        borderImage: 'linear-gradient(135deg, var(--btn-ghost-border-from), var(--btn-ghost-border-to)) 1',
      };
      btnHover['.btn-ghost:hover'] = {
        background: 'var(--btn-ghost-hover-fill)',
        borderImage: 'linear-gradient(315deg, var(--btn-ghost-border-from), var(--btn-ghost-border-to)) 1',
      };
      btnActive['.btn-ghost:active'] = {
        background: 'var(--btn-ghost-active-fill)',
      };

      btnGlass['.btn-glass'] = {
        backgroundImage: 'linear-gradient(135deg, var(--btn-glass-from), var(--btn-glass-to))',
        color: 'var(--btn-glass-label)',
        borderColor: 'var(--btn-glass-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      };
      btnHover['.btn-glass:hover'] = {
        filter: 'brightness(var(--btn-glass-hover-brightness))',
      };
      btnActive['.btn-glass:active'] = {
        filter: 'brightness(var(--btn-glass-active-brightness))',
      };

      btnLink['.btn-link'] = {
        background: 'linear-gradient(135deg, var(--btn-link-from), var(--btn-link-to))',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        border: 'none',
      };
      btnLinkHover['.btn-link:hover'] = {
        textDecoration: 'underline',
        textDecorationColor: 'var(--btn-link-to)',
        filter: 'saturate(1.05)',
      };

      addUtilities({
        ...btnBase,
        ...btnGhost,
        ...btnGlass,
        ...btnLink,
      }, ['responsive']);

      addUtilities({
        ...btnHover,
        ...btnLinkHover,
      }, ['responsive', 'hover']);

      addUtilities({
        ...btnActive,
      }, ['responsive', 'active']);
    },
  ],
}
