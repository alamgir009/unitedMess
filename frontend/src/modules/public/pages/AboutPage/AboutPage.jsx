import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { memo } from 'react';
import {
    HiOutlineUsers, HiOutlineHome, HiOutlineStar, HiOutlineClock,
    HiOutlineShieldCheck, HiOutlineBolt, HiOutlineSparkles,
    HiOutlineGlobeAlt, HiOutlineHandRaised, HiOutlineChartBar,
    HiOutlineArrowRight, HiOutlineCheckBadge,
} from 'react-icons/hi2';
import { RiDoubleQuotesL } from 'react-icons/ri';

// ─── Reveal with reduced-motion support ───
const Reveal = memo(({ children, className = '', delay = 0 }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
});

// ─── Stat card ───
const StatCard = memo(({ value, label, Icon, delay }) => (
    <Reveal delay={delay} className="flex-1 min-w-[130px]">
        <div className="relative rounded-xl border border-border bg-card/60 p-5 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl sm:p-6">
            <div className="flex justify-center mb-2.5 sm:mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 sm:h-12 sm:w-12 sm:rounded-xl">
                    <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                </div>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest sm:text-xs">{label}</p>
        </div>
    </Reveal>
));

// ─── Team card ───
const TeamCard = memo(({ name, role, bio, initials, gradient, delay }) => (
    <Reveal delay={delay}>
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-2xl">
            <div className="h-24 w-full flex items-center justify-center sm:h-32" style={{ background: gradient }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/30 backdrop-blur-sm text-white font-black text-xl shadow-lg sm:h-20 sm:w-20 sm:text-2xl">
                    {initials}
                </div>
            </div>
            <div className="relative p-5 sm:p-6">
                <h3 className="font-bold text-foreground text-base sm:text-lg">{name}</h3>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mt-0.5 mb-2.5 sm:mb-3 sm:text-xs">{role}</p>
                <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">{bio}</p>
            </div>
        </div>
    </Reveal>
));

// ─── Value card ───
const ValueCard = memo(({ Icon, title, desc, iconColor, delay }) => (
    <Reveal delay={delay}>
        <div className="flex gap-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md transition-colors duration-200 hover:border-primary/30 hover:bg-primary/[0.03] sm:gap-4 sm:rounded-2xl sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-transform duration-200 group-hover:scale-105 sm:h-12 sm:w-12 sm:rounded-xl">
                <Icon className={`h-4 w-4 ${iconColor} sm:h-5 sm:w-5`} />
            </div>
            <div className="min-w-0">
                <h4 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">{desc}</p>
            </div>
        </div>
    </Reveal>
));

const stats = [
    { value: '2,500+', label: 'Active Members', Icon: HiOutlineUsers, delay: 0 },
    { value: '200+', label: 'Messes Managed', Icon: HiOutlineHome, delay: 0.07 },
    { value: '98%', label: 'Satisfaction', Icon: HiOutlineStar, delay: 0.14 },
    { value: '3 yrs', label: 'In Operation', Icon: HiOutlineClock, delay: 0.21 },
];

const team = [
    { name: 'Alamgir Islam', role: 'Founder & Lead Engineer', bio: 'Visionary behind UnitedMess. Passionate about elegant software that solves real community problems, one mess at a time.', initials: 'AI', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', delay: 0 },
    { name: 'Hafizur Rahaman', role: 'UX & Design Lead', bio: 'Crafts every pixel with purpose. Obsessed with accessibility, motion design, and turning complex workflows into delightful interactions.', initials: 'HR', gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)', delay: 0.08 },
    { name: 'Alamgir Islam', role: 'Backend Architect', bio: 'Builds the engine under the hood. Expert in distributed systems, real-time data, and making things scale without breaking a sweat.', initials: 'AI', gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', delay: 0.16 },
];

const values = [
    { Icon: HiOutlineUsers, iconColor: 'text-blue-500', title: 'Community First', desc: 'Every decision is made with real communities in mind. We listen, iterate, and build what actually matters.', delay: 0 },
    { Icon: HiOutlineShieldCheck, iconColor: 'text-violet-500', title: 'Privacy by Design', desc: 'Your data is yours. End-to-end security, minimal data collection, and full transparency in how we handle it.', delay: 0.07 },
    { Icon: HiOutlineBolt, iconColor: 'text-amber-500', title: 'Performance Obsessed', desc: 'Sub-100ms interactions. Every component is optimised for speed so the app feels instant on any device.', delay: 0.14 },
    { Icon: HiOutlineSparkles, iconColor: 'text-pink-500', title: 'Craft & Aesthetics', desc: 'We believe beautiful software creates trust. Every detail — spacing, motion, colour — is deliberate.', delay: 0.21 },
    { Icon: HiOutlineGlobeAlt, iconColor: 'text-emerald-500', title: 'Accessible to All', desc: 'WCAG 2.1 AA compliant. Screen-reader friendly. Keyboard navigable. Premium UX is a right, not a privilege.', delay: 0.28 },
    { Icon: HiOutlineHandRaised, iconColor: 'text-cyan-500', title: 'Open Collaboration', desc: 'Transparent roadmap, open API, and a community forum. We build alongside our users, not just for them.', delay: 0.35 },
];

const metrics = [
    { label: 'Total Expenses Tracked', value: '₹ 12 Cr+', Icon: HiOutlineChartBar, color: 'text-primary' },
    { label: 'Meals Logged', value: '85,000+', Icon: HiOutlineStar, color: 'text-violet-500 dark:text-violet-400' },
    { label: 'Dues Collected On-time', value: '94%', Icon: HiOutlineCheckBadge, color: 'text-emerald-500' },
];

const AboutPage = () => {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">

            {/* ── Static ambient backdrop (no animated blobs/particles) ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div className="absolute -top-40 -left-32 w-[400px] h-[400px] rounded-full opacity-30 sm:w-[580px] sm:h-[580px] sm:opacity-50"
                    style={{ background: 'var(--blob-1)', filter: 'blur(80px)' }} />
                <div className="absolute top-[40%] -right-32 w-[440px] h-[440px] rounded-full opacity-20 sm:-right-48 sm:w-[640px] sm:h-[640px] sm:opacity-40"
                    style={{ background: 'var(--blob-2)', filter: 'blur(100px)' }} />
                <div className="absolute -bottom-32 left-[20%] w-[480px] h-[480px] rounded-full opacity-15 sm:-bottom-48 sm:w-[700px] sm:h-[700px] sm:opacity-30"
                    style={{ background: 'var(--blob-3)', filter: 'blur(120px)' }} />
            </div>

            {/* ── HERO ── */}
            <section className="relative z-10 pt-28 pb-16 px-4 text-center sm:pt-36 sm:pb-24 sm:px-6">
                <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs"
                    >
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-primary" />
                        Our Story
                    </motion.div>

                    <motion.h1
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
                    >
                        <span className="text-foreground">Built for</span>{' '}
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>
                            Real People
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-base text-muted-foreground max-w-2xl leading-relaxed sm:text-lg"
                    >
                        UnitedMess was born in a university dorm room out of frustration with spreadsheets and WhatsApp chaos.
                        Today we serve thousands of communities across India with a platform built on empathy, craft, and code.
                    </motion.p>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="relative z-10 pb-16 px-4 sm:pb-24 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-wrap gap-3 justify-center sm:gap-4">
                        {stats.map((s) => <StatCard key={s.label} {...s} />)}
                    </div>
                </div>
            </section>

            {/* ── MISSION ── */}
            <section className="relative z-10 py-14 px-4 sm:py-20 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8 items-center md:gap-10">
                        <Reveal>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-widest mb-4 sm:text-xs sm:mb-5">
                                <HiOutlineHome className="w-3.5 h-3.5" />
                                Our Mission
                            </span>
                            <h2 className="text-2xl font-black tracking-tighter text-foreground mb-4 leading-tight sm:text-3xl md:text-4xl sm:mb-5">
                                Simplifying lives,<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>
                                    one mess at a time.
                                </span>
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3 sm:text-base sm:mb-4">
                                Managing a shared living space is inherently complex — tracking expenses, planning meals, collecting dues,
                                and keeping everyone in sync. We believe technology should make this invisible, not add to the friction.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
                                Our mission is to give every community — from a 5-person apartment to a 500-resident dormitory — the same
                                tools that enterprise teams use, wrapped in an experience that feels effortless and beautiful.
                            </p>
                        </Reveal>

                        {/* Metrics panel */}
                        <Reveal delay={0.15}>
                            <div
                                className="relative rounded-2xl overflow-hidden border border-border sm:rounded-3xl"
                                style={{ background: 'var(--gradient-hero)', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)' }}
                            >
                                <div className="absolute inset-0 opacity-20 dark:opacity-30"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                                <div className="relative p-6 flex flex-col gap-1 sm:p-10 sm:gap-2">
                                    {metrics.map(({ label, value, Icon, color }) => (
                                        <div
                                            key={label}
                                            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 gap-4 sm:py-4"
                                        >
                                            <div className="flex items-center gap-2.5 sm:gap-3">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-card/60 border border-border shrink-0 sm:h-8 sm:w-8 sm:rounded-lg">
                                                    <Icon className={`h-3.5 w-3.5 ${color} sm:h-4 sm:w-4`} />
                                                </div>
                                                <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
                                            </div>
                                            <span className={`text-base font-black tabular-nums shrink-0 sm:text-xl ${color}`}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── VALUES ── */}
            <section className="relative z-10 py-14 px-4 sm:py-20 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <Reveal className="text-center mb-10 sm:mb-14">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-widest mb-3 sm:text-xs sm:mb-4">
                            <HiOutlineCheckBadge className="w-3.5 h-3.5" />
                            What We Stand For
                        </span>
                        <h2 className="text-2xl font-black tracking-tighter text-foreground sm:text-3xl md:text-5xl">
                            Principles that guide us
                        </h2>
                    </Reveal>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {values.map((v) => <ValueCard key={v.title} {...v} />)}
                    </div>
                </div>
            </section>

            {/* ── TEAM ── */}
            <section className="relative z-10 py-14 px-4 sm:py-20 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <Reveal className="text-center mb-10 sm:mb-14">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-widest mb-3 sm:text-xs sm:mb-4">
                            <HiOutlineUsers className="w-3.5 h-3.5" />
                            The Team
                        </span>
                        <h2 className="text-2xl font-black tracking-tighter text-foreground sm:text-3xl md:text-5xl">
                            People behind the product
                        </h2>
                        <p className="text-muted-foreground text-base mt-3 max-w-xl mx-auto sm:text-lg sm:mt-4">
                            A small, focused team that ships fast and cares deeply.
                        </p>
                    </Reveal>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {team.map((t) => <TeamCard key={t.role} {...t} />)}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIAL QUOTE ── */}
            <section className="relative z-10 py-12 px-4 sm:py-16 sm:px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <Reveal>
                        <RiDoubleQuotesL className="w-8 h-8 text-primary/40 mx-auto mb-3 sm:w-10 sm:h-10 sm:mb-4" />
                        <blockquote className="text-lg font-semibold text-foreground leading-relaxed italic mb-5 sm:text-xl md:text-2xl sm:mb-6">
                            "UnitedMess transformed how we manage our dorm. The glass UI is stunning — I show it to friends just to show off."
                        </blockquote>
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold sm:w-10 sm:h-10"
                                style={{ background: 'var(--gradient-primary)' }}>A</div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-foreground">Aryan Saha</p>
                                <p className="text-[11px] text-muted-foreground sm:text-xs">Hall Manager, IIT Delhi</p>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative z-10 py-16 px-4 sm:py-24 sm:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <Reveal>
                        <div
                            className="relative rounded-2xl p-8 md:p-16 border border-border overflow-hidden sm:rounded-3xl sm:p-12"
                            style={{ background: 'var(--gradient-hero)', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.35)' }}
                        >
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-white/10 dark:bg-white/5 blur-3xl rounded-t-2xl pointer-events-none sm:rounded-t-3xl" />
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black tracking-tighter mb-3 sm:text-3xl md:text-4xl sm:mb-4">
                                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                                        Ready to join us?
                                    </span>
                                </h2>
                                <p className="text-muted-foreground text-base mb-6 sm:text-lg sm:mb-8">
                                    Start managing your mess better today — free forever for small communities.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link to="/register">
                                        <span
                                            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:h-auto sm:px-8 sm:py-3.5"
                                            style={{ background: 'var(--gradient-primary)' }}
                                        >
                                            Create Free Account
                                            <HiOutlineArrowRight className="w-4 h-4" />
                                        </span>
                                    </Link>
                                    <Link to="/food-gallery">
                                        <span className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-foreground border border-border bg-card/70 backdrop-blur-xl transition-colors hover:bg-card sm:h-auto sm:px-8 sm:py-3.5">
                                            Browse Food Gallery
                                            <HiOutlineArrowRight className="w-4 h-4" />
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

        </div>
    );
};

export default AboutPage;