import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ─── Animated Section Wrapper ───
const Section = ({ children, className = '', delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

// ─── Feature Card ───
const FeatureCard = ({ icon, title, description, color = 'primary', delay = 0 }) => {
    const colorMap = {
        primary: { bg: 'from-blue-500/20 to-indigo-500/10', icon: 'text-blue-500 dark:text-blue-400', glow: 'group-hover:bg-blue-500/15' },
        secondary: { bg: 'from-violet-500/20 to-purple-500/10', icon: 'text-violet-500 dark:text-violet-400', glow: 'group-hover:bg-violet-500/15' },
        accent: { bg: 'from-emerald-500/20 to-teal-500/10', icon: 'text-emerald-500 dark:text-emerald-400', glow: 'group-hover:bg-emerald-500/15' },
        warning: { bg: 'from-amber-500/20 to-orange-500/10', icon: 'text-amber-500 dark:text-amber-400', glow: 'group-hover:bg-amber-500/15' },
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
            className="group relative"
        >
            <div className={`
                relative h-full overflow-hidden rounded-2xl p-[1px]
                bg-gradient-to-br ${c.bg}
                transition-all duration-500
            `}>
                <div className="relative h-full bg-card dark:bg-card/80 backdrop-blur-sm rounded-2xl p-7 flex flex-col gap-5 shadow-md hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1 border border-border dark:border-white/8">
                    {/* Glow Orb */}
                    <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-transparent transition-all duration-500 blur-2xl ${c.glow}`} aria-hidden="true" />

                    {/* Icon */}
                    <div className={`p-3 rounded-xl bg-muted w-fit border border-border`}>
                        <span className={`block w-6 h-6 ${c.icon}`}>{icon}</span>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-foreground tracking-tight mb-2">{title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const features = [
    {
        color: 'primary',
        icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        title: 'Intuitive Analytics',
        description: 'Monitor mess expenses and consumption patterns with real-time precision through beautifully crafted visual dashboards.',
    },
    {
        color: 'secondary',
        icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
        title: 'Secure Access',
        description: 'Enterprise-grade authentication ensures your data stays completely private. Role-based access with seamless onboarding.',
    },
    {
        color: 'accent',
        icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        ),
        title: 'Fluid Experience',
        description: 'Navigate through an interface that feels alive. GPU-accelerated transitions and glass-morphism effects throughout.',
    },
    {
        color: 'warning',
        icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        title: 'Member Management',
        description: 'Effortlessly track and manage all mess members, roles, and contributions. Fair distribution made simple.',
    },
];

const testimonials = [
    {
        quote: "UnitedMess completely transformed how we manage our dormitory. The glass UI is absolutely stunning — I show it to friends just to show off.",
        name: 'Sk Sajahan',
        role: 'Hall Manager, BUET',
    },
    {
        quote: "Finally, a mess management tool that actually looks good. The dark mode alone is worth switching from our old spreadsheets.",
        name: 'Avijit',
        role: 'Student, DU',
    },
    {
        quote: "The analytics dashboard helped us identify waste patterns we never noticed before. Expenses down 18% in the first month.",
        name: 'Nayan Islam',
        role: 'Mess Secretary',
    },
];

const HomePage = () => {
    return (
        <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden selection:bg-primary/20">

            {/* ─── Ambient Background Blobs ─── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div
                    className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full animate-blob opacity-60"
                    style={{ background: 'var(--blob-1)', filter: 'blur(80px)', willChange: 'transform' }}
                />
                <div
                    className="absolute top-[30%] -right-48 w-[700px] h-[700px] rounded-full animate-blob animation-delay-2000 opacity-50"
                    style={{ background: 'var(--blob-2)', filter: 'blur(100px)', willChange: 'transform' }}
                />
                <div
                    className="absolute -bottom-64 left-[25%] w-[800px] h-[800px] rounded-full animate-blob animation-delay-4000 opacity-40"
                    style={{ background: 'var(--blob-3)', filter: 'blur(120px)', willChange: 'transform' }}
                />
                {/* Subtle dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}
                />
            </div>

            {/* ─── HERO ─── */}
            <section className="relative z-10 flex flex-col items-center justify-center text-center pt-40 pb-24 px-4 sm:px-6 min-h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col items-center gap-6 max-w-4xl"
                >
                    {/* Tag badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm shadow-sm text-xs font-semibold text-muted-foreground uppercase tracking-widest"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                        Now serving 200+ messes across India
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05]">
                        <span className="text-foreground">Elevate Your</span>
                        <br />
                        <span
                            className="text-transparent bg-clip-text"
                            style={{ backgroundImage: 'var(--gradient-text)' }}
                        >
                            Mess Management
                        </span>
                    </h1>

                    {/* Sub headline */}
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed font-light">
                        A seamlessly integrated platform designed with cutting-edge aesthetics.
                        Managing your household or dormitory has never been this elegant and effortless.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <Link to="/register">
                            <motion.button
                                whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(59,130,246,0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{ background: 'var(--gradient-primary)' }}
                            >
                                Get Started Free
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </motion.button>
                        </Link>
                        <Link to="/login">
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-card/70 backdrop-blur-sm hover:bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                            >
                                Sign In to Portal
                            </motion.button>
                        </Link>
                    </div>

                    {/* Social proof numbers */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-8 pt-8 text-center"
                    >
                        {[
                            { value: '2,500+', label: 'Active Members' },
                            { value: '200+', label: 'Messes Managed' },
                            { value: '98%', label: 'Satisfaction Rate' },
                        ].map((stat) => (
                            <div key={stat.label} className="flex flex-col gap-0.5">
                                <span className="text-2xl font-black text-foreground tabular-nums">{stat.value}</span>
                                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            {/* ─── FEATURES ─── */}
            <section id="features" className="relative z-10 py-24 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <Section className="text-center mb-14">
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-4 border border-primary/20">
                            Features
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
                            Everything you need,
                            <br />
                            <span
                                className="text-transparent bg-clip-text"
                                style={{ backgroundImage: 'var(--gradient-text)' }}
                            >
                                nothing you don&apos;t.
                            </span>
                        </h2>
                        <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
                            A curated set of powerful tools crafted for modern mess management.
                        </p>
                    </Section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {features.map((feature, i) => (
                            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="relative z-10 py-24 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <Section className="text-center mb-14">
                        <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-semibold uppercase tracking-widest mb-4 border border-border">
                            Testimonials
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
                            Loved by mess managers
                        </h2>
                        <p className="text-muted-foreground text-lg mt-4">Real stories from real communities.</p>
                    </Section>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {testimonials.map((t, i) => (
                            <Section key={t.name} delay={i * 0.12}>
                                <div className="h-full p-7 rounded-2xl border border-border bg-card shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                    {/* Stars */}
                                    <div className="flex gap-0.5 mb-4" aria-label="5 out of 5 stars">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <svg key={j} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <blockquote className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                                        &ldquo;{t.quote}&rdquo;
                                    </blockquote>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                            style={{ background: 'var(--gradient-primary)' }}
                                            aria-hidden="true"
                                        >
                                            {t.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                            <p className="text-xs text-muted-foreground">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA SECTION ─── */}
            <section className="relative z-10 py-24 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <Section>
                        <div
                            className="relative rounded-3xl p-12 md:p-16 overflow-hidden border border-border"
                            style={{ background: 'var(--gradient-hero)' }}
                        >
                            {/* Glass inner shine */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 dark:bg-white/5 rounded-t-3xl blur-xl pointer-events-none" aria-hidden="true" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
                                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                                        Ready to get started?
                                    </span>
                                </h2>
                                <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                                    Join thousands of mess managers who have already upgraded their workflow.
                                    Free forever for small communities.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <Link to="/register">
                                        <motion.button
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            style={{ background: 'var(--gradient-primary)' }}
                                        >
                                            Create Free Account
                                        </motion.button>
                                    </Link>
                                    <Link to="/about">
                                        <motion.button
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-card/70 backdrop-blur-sm hover:bg-card transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            Learn More
                                        </motion.button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>
            </section>

        </div>
    );
};

export default HomePage;
