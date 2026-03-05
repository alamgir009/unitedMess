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
            },
            borderRadius: {
                lg: "var(--radius)",
                xl: "calc(var(--radius) + 4px)",
                '2xl': 'calc(var(--radius) + 8px)',
                '3xl': 'calc(var(--radius) + 16px)',
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            zIndex: {
                dropdown: '100',
                sticky: '200',
                modal: '300',
                toast: '400',
                tooltip: '500',
            },
            keyframes: {
                blob: {
                    "0%": { transform: "translate(0px, 0px) scale(1)" },
                    "25%": { transform: "translate(25px, -40px) scale(1.08)" },
                    "50%": { transform: "translate(-20px, 20px) scale(0.94)" },
                    "75%": { transform: "translate(15px, 30px) scale(1.04)" },
                    "100%": { transform: "translate(0px, 0px) scale(1)" },
                },
                shimmer: {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" },
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
                    "from": { opacity: "0", transform: "translateY(16px)" },
                    "to": { opacity: "1", transform: "translateY(0)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-8px)" },
                },
            },
            animation: {
                blob: "blob 8s ease-in-out infinite",
                shimmer: "shimmer 1.8s infinite",
                "toast-progress": "toast-progress linear forwards",
                "fade-in": "fade-in 0.3s ease-out both",
                "fade-in-up": "fade-in-up 0.4s ease-out both",
                float: "float 4s ease-in-out infinite",
            },
        },
    },
    plugins: [],
}
