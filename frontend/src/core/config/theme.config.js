/**
 * UnitedMess — Premium Theme Configuration
 * Design tokens for colors, typography, spacing, shadows, breakpoints, and transitions.
 * Inspired by: Resend (minimal), iOS Liquid Glass (frosted), Origin OS 6 (vibrant gradients)
 */

const theme = {
    /** ─── Colors ─── */
    colors: {
        // Primary — vibrant sky/blue inspired by Origin OS 6
        primary: {
            50: 'hsl(210, 100%, 97%)',
            100: 'hsl(210, 96%, 93%)',
            200: 'hsl(210, 90%, 84%)',
            300: 'hsl(210, 86%, 72%)',
            400: 'hsl(210, 88%, 60%)',
            500: 'hsl(210, 92%, 48%)',   // base
            600: 'hsl(214, 90%, 40%)',
            700: 'hsl(218, 88%, 32%)',
            800: 'hsl(220, 84%, 26%)',
            900: 'hsl(222, 80%, 18%)',
            950: 'hsl(224, 78%, 12%)',
        },
        // Secondary — violet/purple accent
        secondary: {
            50: 'hsl(265, 100%, 97%)',
            100: 'hsl(265, 96%, 93%)',
            200: 'hsl(266, 90%, 84%)',
            300: 'hsl(267, 86%, 72%)',
            400: 'hsl(268, 80%, 62%)',
            500: 'hsl(268, 76%, 52%)',   // base
            600: 'hsl(269, 72%, 44%)',
            700: 'hsl(270, 68%, 36%)',
            800: 'hsl(270, 64%, 28%)',
            900: 'hsl(272, 60%, 20%)',
        },
        // Accent — emerald/teal highlight
        accent: {
            50: 'hsl(160, 100%, 95%)',
            100: 'hsl(160, 90%, 88%)',
            200: 'hsl(160, 80%, 76%)',
            300: 'hsl(160, 72%, 62%)',
            400: 'hsl(160, 64%, 48%)',
            500: 'hsl(160, 60%, 38%)',   // base
            600: 'hsl(160, 58%, 30%)',
            700: 'hsl(160, 56%, 24%)',
        },
        // Status Colors
        success: 'hsl(142, 72%, 45%)',
        warning: 'hsl(38, 96%, 56%)',
        error: 'hsl(0, 82%, 58%)',
        info: 'hsl(200, 90%, 50%)',
    },

    /** ─── Typography ─── */
    typography: {
        fontFamily: {
            sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            mono: '"JetBrains Mono", "Fira Code", "Fira Mono", monospace',
            display: '"Inter", "SF Pro Display", sans-serif',
        },
        fontSize: {
            xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
            sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
            base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
            lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
            xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
            '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
            '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
            '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
            '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
            '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
            '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
            '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
            '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.06em' }],
        },
        fontWeight: {
            light: 300,
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
            black: 900,
        },
    },

    /** ─── Spacing (4pt grid) ─── */
    spacing: {
        0: '0px',
        px: '1px',
        0.5: '0.125rem',  // 2px
        1: '0.25rem',   // 4px
        1.5: '0.375rem',  // 6px
        2: '0.5rem',    // 8px
        2.5: '0.625rem',  // 10px
        3: '0.75rem',   // 12px
        3.5: '0.875rem',  // 14px
        4: '1rem',      // 16px
        5: '1.25rem',   // 20px
        6: '1.5rem',    // 24px
        7: '1.75rem',   // 28px
        8: '2rem',      // 32px
        9: '2.25rem',   // 36px
        10: '2.5rem',    // 40px
        12: '3rem',      // 48px
        14: '3.5rem',    // 56px
        16: '4rem',      // 64px
        20: '5rem',      // 80px
        24: '6rem',      // 96px
        32: '8rem',      // 128px
        40: '10rem',     // 160px
        48: '12rem',     // 192px
        64: '16rem',     // 256px
    },

    /** ─── Border Radius ─── */
    borderRadius: {
        none: '0px',
        sm: '0.25rem',   // 4px  — tiny inputs, tags
        DEFAULT: '0.5rem',    // 8px  — buttons, badges
        md: '0.75rem',   // 12px — dropdowns
        lg: '1rem',      // 16px — cards
        xl: '1.25rem',   // 20px — modals
        '2xl': '1.5rem',    // 24px — panels
        '3xl': '2rem',      // 32px — hero cards
        full: '9999px',    // pills, avatars, toggles
    },

    /** ─── Shadows ─── */
    shadows: {
        // Light mode — soft and airy
        light: {
            sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
            DEFAULT: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
            md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
            lg: '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.04)',
            xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
            '2xl': '0 25px 50px -12px rgba(0,0,0,0.12)',
            glass: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        },
        // Dark mode — deeper and more dramatic
        dark: {
            sm: '0 1px 2px 0 rgba(0,0,0,0.3)',
            DEFAULT: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.3)',
            md: '0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.25)',
            lg: '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
            xl: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)',
            '2xl': '0 25px 50px -12px rgba(0,0,0,0.7)',
            glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        },
    },

    /** ─── Breakpoints ─── */
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    },

    /** ─── Transitions ─── */
    transitions: {
        duration: {
            fast: '100ms',
            normal: '200ms',
            slow: '300ms',
            slower: '500ms',
            slowest: '700ms',
        },
        easing: {
            linear: 'linear',
            in: 'cubic-bezier(0.4, 0, 1, 1)',
            out: 'cubic-bezier(0, 0, 0.2, 1)',
            inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
    },

    /** ─── Glass Effect Tokens ─── */
    glass: {
        light: {
            background: 'rgba(255, 255, 255, 0.7)',
            border: 'rgba(255, 255, 255, 0.9)',
            blur: 'blur(20px)',
            shadow: '0 8px 32px rgba(0,0,0,0.06)',
        },
        dark: {
            background: 'rgba(15, 20, 35, 0.6)',
            border: 'rgba(255, 255, 255, 0.06)',
            blur: 'blur(24px)',
            shadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
    },

    /** ─── Gradient Presets ─── */
    gradients: {
        primary: 'linear-gradient(135deg, hsl(210,92%,48%) 0%, hsl(268,76%,52%) 100%)',
        secondary: 'linear-gradient(135deg, hsl(268,76%,52%) 0%, hsl(160,60%,38%) 100%)',
        aurora: 'linear-gradient(135deg, hsl(210,92%,48%) 0%, hsl(268,76%,52%) 50%, hsl(160,60%,38%) 100%)',
        sunset: 'linear-gradient(135deg, hsl(38,96%,56%) 0%, hsl(0,82%,58%) 100%)',
        hero: 'linear-gradient(135deg, hsl(210,100%,97%) 0%, hsl(265,100%,97%) 50%, hsl(160,100%,95%) 100%)',
        heroDark: 'linear-gradient(135deg, hsl(224,78%,12%) 0%, hsl(272,60%,20%) 50%, hsl(160,56%,24%) 100%)',
    },
};

export default theme;
