import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    HiOutlineUsers, HiOutlineHome, HiOutlineStar, HiOutlineClock,
    HiOutlineShieldCheck, HiOutlineBolt, HiOutlineSparkles,
    HiOutlineGlobeAlt, HiOutlineHandRaised, HiOutlineChartBar,
    HiOutlineArrowRight, HiOutlineCheckBadge, HiOutlineCurrencyRupee,
    HiOutlineCodeBracket, HiOutlineHeart,
} from 'react-icons/hi2';
import { RiDoubleQuotesL, RiFlaskLine } from 'react-icons/ri';
import { GiIndianPalace } from 'react-icons/gi';

// ─── Floating particles background ───
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/10"
                initial={{ x: Math.random() * 100 + '%', y: Math.random() * 100 + '%', scale: 0 }}
                animate={{
                    x: [null, Math.random() * 100 + '%', Math.random() * 100 + '%'],
                    y: [null, Math.random() * 100 + '%', Math.random() * 100 + '%'],
                    scale: [0, 1, 0],
                    opacity: [0, 0.5, 0],
                }}
                transition={{
                    duration: 10 + Math.random() * 20,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: 'linear',
                }}
            />
        ))}
    </div>
);

// ─── Reveal with improved easing ───
const Reveal = ({ children, className = '', delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

// ─── Stat card – premium glass with animated counter ───
const StatCard = ({ value, label, Icon, delay }) => {
    // Simple number animation – you can replace with a proper counter if desired
    return (
        <Reveal delay={delay} className="flex-1 min-w-[140px]">
            <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className="relative rounded-2xl p-6 text-center border border-border bg-card/60 backdrop-blur-xl overflow-hidden group"
                style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)' }}
            >
                {/* Animated gradient glow */}
                <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                        background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.2), transparent 70%)',
                    }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative z-10">
                    <div className="flex justify-center mb-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icon className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-foreground tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">{label}</p>
                </div>
                {/* Shine line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </motion.div>
        </Reveal>
    );
};

// ─── Team card – premium with animated gradient border ───
const TeamCard = ({ name, role, bio, initials, gradient, delay }) => (
    <Reveal delay={delay}>
        <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            className="relative rounded-2xl border border-border bg-card overflow-hidden group"
            style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)' }}
        >
            <div className="h-32 w-full flex items-center justify-center" style={{ background: gradient }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm text-white font-black text-2xl shadow-xl">
                    {initials}
                </div>
            </div>
            <div className="p-6 relative">
                <h3 className="font-bold text-foreground text-lg">{name}</h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mt-0.5 mb-3">{role}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.1), transparent 70%)' }} />
            </div>
        </motion.div>
    </Reveal>
);

// ─── Value card – refined with icon animation ───
const ValueCard = ({ Icon, title, desc, iconColor, delay }) => (
    <Reveal delay={delay}>
        <motion.div
            whileHover={{ y: -2, x: 2 }}
            className="flex gap-4 p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
        >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
                <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
        </motion.div>
    </Reveal>
);

const stats = [
    { value: '2,500+', label: 'Active Members', Icon: HiOutlineUsers, delay: 0 },
    { value: '200+', label: 'Messes Managed', Icon: HiOutlineHome, delay: 0.07 },
    { value: '98%', label: 'Satisfaction', Icon: HiOutlineStar, delay: 0.14 },
    { value: '3 yrs', label: 'In Operation', Icon: HiOutlineClock, delay: 0.21 },
];

const team = [
    { name: 'Alamgir Islam', role: 'Founder & Lead Engineer', bio: 'Visionary behind UnitedMess. Passionate about elegant software that solves real community problems, one mess at a time.', initials: 'AI', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', delay: 0 },
    { name: 'Hafizur Rahaman', role: 'UX & Design Lead', bio: 'Crafts every pixel with purpose. Obsessed with accessibility, motion design, and turning complex workflows into delightful interactions.', initials: 'HR', gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)', delay: 0.08 },
    { name: 'Nayan Islam', role: 'Backend Architect', bio: 'Builds the engine under the hood. Expert in distributed systems, real-time data, and making things scale without breaking a sweat.', initials: 'NI', gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', delay: 0.16 },
];

const values = [
    { Icon: HiOutlineUsers, iconColor: 'text-blue-500', title: 'Community First', desc: 'Every decision is made with real communities in mind. We listen, iterate, and build what actually matters.', delay: 0 },
    { Icon: HiOutlineShieldCheck, iconColor: 'text-violet-500', title: 'Privacy by Design', desc: 'Your data is yours. End-to-end security, minimal data collection, and full transparency in how we handle it.', delay: 0.07 },
    { Icon: HiOutlineBolt, iconColor: 'text-amber-500', title: 'Performance Obsessed', desc: 'Sub-100ms interactions. Every component is optimised for speed so the app feels instant on any device.', delay: 0.14 },
    { Icon: HiOutlineSparkles, iconColor: 'text-pink-500', title: 'Craft & Aesthetics', desc: 'We believe beautiful software creates trust. Every detail — spacing, motion, colour — is deliberate.', delay: 0.21 },
    { Icon: HiOutlineGlobeAlt, iconColor: 'text-emerald-500', title: 'Accessible to All', desc: 'WCAG 2.1 AA compliant. Screen-reader friendly. Keyboard navigable. Premium UX is a right, not a privilege.', delay: 0.28 },
    { Icon: HiOutlineHandRaised, iconColor: 'text-cyan-500', title: 'Open Collaboration', desc: 'Transparent roadmap, open API, and a community forum. We build alongside our users, not just for them.', delay: 0.35 },
];

// Updated metrics with Indian Rupee symbol
const metrics = [
    { label: 'Total Expenses Tracked', value: '₹ 12 Cr+', Icon: HiOutlineChartBar, color: 'text-primary' },
    { label: 'Meals Logged', value: '85,000+', Icon: HiOutlineStar, color: 'text-violet-500 dark:text-violet-400' },
    { label: 'Dues Collected On-time', value: '94%', Icon: HiOutlineCheckBadge, color: 'text-emerald-500' },
];

const AboutPage = () => (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">

        {/* ── Ambient blobs & floating particles ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
            <div className="absolute -top-40 -left-32 w-[580px] h-[580px] rounded-full opacity-50 animate-blob"
                style={{ background: 'var(--blob-1)', filter: 'blur(80px)' }} />
            <div className="absolute top-[40%] -right-48 w-[640px] h-[640px] rounded-full opacity-40 animate-blob animation-delay-2000"
                style={{ background: 'var(--blob-2)', filter: 'blur(100px)' }} />
            <div className="absolute -bottom-48 left-[20%] w-[700px] h-[700px] rounded-full opacity-30 animate-blob animation-delay-4000"
                style={{ background: 'var(--blob-3)', filter: 'blur(120px)' }} />
            <FloatingParticles />
        </div>

        {/* ── HERO ── */}
        <section className="relative z-10 pt-36 pb-24 px-4 sm:px-6 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                    <HiOutlineSparkles className="w-3.5 h-3.5 text-primary" />
                    Our Story
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter"
                >
                    <span className="text-foreground">Built for</span>{' '}
                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>
                        Real People
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                    className="text-lg text-muted-foreground max-w-2xl leading-relaxed"
                >
                    UnitedMess was born in a university dorm room out of frustration with spreadsheets and WhatsApp chaos.
                    Today we serve thousands of communities across India with a platform built on empathy, craft, and code.
                </motion.p>
            </div>
        </section>

        {/* ── STATS ── */}
        <section className="relative z-10 pb-24 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-wrap gap-4 justify-center">
                    {stats.map((s) => <StatCard key={s.label} {...s} />)}
                </div>
            </div>
        </section>

        {/* ── MISSION ── */}
        <section className="relative z-10 py-20 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    <Reveal>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-5">
                            <HiOutlineHome className="w-3.5 h-3.5" />
                            Our Mission
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground mb-5 leading-tight">
                            Simplifying lives,<br />
                            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>
                                one mess at a time.
                            </span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Managing a shared living space is inherently complex — tracking expenses, planning meals, collecting dues,
                            and keeping everyone in sync. We believe technology should make this invisible, not add to the friction.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Our mission is to give every community — from a 5-person apartment to a 500-resident dormitory — the same
                            tools that enterprise teams use, wrapped in an experience that feels effortless and beautiful.
                        </p>
                    </Reveal>

                    {/* Metrics panel – premium glass with ₹ icons */}
                    <Reveal delay={0.15}>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            className="relative rounded-3xl overflow-hidden border border-border"
                            style={{ background: 'var(--gradient-hero)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}
                        >
                            <div className="absolute inset-0 opacity-30"
                                style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                            <div className="relative p-10 flex flex-col gap-2">
                                {metrics.map(({ label, value, Icon, color }) => (
                                    <motion.div
                                        key={label}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-card/60 border border-border flex items-center justify-center shrink-0">
                                                <Icon className={`w-4 h-4 ${color}`} />
                                            </div>
                                            <span className="text-sm text-muted-foreground">{label}</span>
                                        </div>
                                        <span className={`text-xl font-black tabular-nums shrink-0 ${color}`}>{value}</span>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        </motion.div>
                    </Reveal>
                </div>
            </div>
        </section>

        {/* ── VALUES ── */}
        <section className="relative z-10 py-20 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal className="text-center mb-14">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-border text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-4">
                        <HiOutlineCheckBadge className="w-3.5 h-3.5" />
                        What We Stand For
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
                        Principles that guide us
                    </h2>
                </Reveal>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {values.map((v) => <ValueCard key={v.title} {...v} />)}
                </div>
            </div>
        </section>

        {/* ── TEAM ── */}
        <section className="relative z-10 py-20 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal className="text-center mb-14">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
                        <HiOutlineUsers className="w-3.5 h-3.5" />
                        The Team
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
                        People behind the product
                    </h2>
                    <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
                        A small, focused team that ships fast and cares deeply.
                    </p>
                </Reveal>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team.map((t) => <TeamCard key={t.name} {...t} />)}
                </div>
            </div>
        </section>

        {/* ── TESTIMONIAL QUOTE ── */}
        <section className="relative z-10 py-16 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
                <Reveal>
                    <RiDoubleQuotesL className="w-10 h-10 text-primary/40 mx-auto mb-4" />
                    <blockquote className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed italic mb-6">
                        "UnitedMess transformed how we manage our dorm. The glass UI is stunning — I show it to friends just to show off."
                    </blockquote>
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: 'var(--gradient-primary)' }}>A</div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">Aryan Saha</p>
                            <p className="text-xs text-muted-foreground">Hall Manager, IIT Delhi</p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>

        {/* ── CTA with premium shine ── */}
        <section className="relative z-10 py-24 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
                <Reveal>
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="relative rounded-3xl p-12 md:p-16 border border-border overflow-hidden"
                        style={{ background: 'var(--gradient-hero)', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.4)' }}
                    >
                        <div className="absolute top-0 inset-x-0 h-1/2 bg-white/20 dark:bg-white/10 blur-3xl rounded-t-3xl pointer-events-none" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                                    Ready to join us?
                                </span>
                            </h2>
                            <p className="text-muted-foreground text-lg mb-8">
                                Start managing your mess better today — free forever for small communities.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link to="/register">
                                    <motion.button
                                        whileHover={{ y: -2, boxShadow: '0 10px 30px -5px hsl(var(--primary)/0.5)' }}
                                        whileTap={{ scale: 0.97 }}
                                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg"
                                        style={{ background: 'var(--gradient-primary)' }}
                                    >
                                        Create Free Account
                                        <HiOutlineArrowRight className="w-4 h-4" />
                                    </motion.button>
                                </Link>
                                <Link to="/food-gallery">
                                    <motion.button
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-card/70 backdrop-blur-xl hover:bg-card transition-colors shadow-sm"
                                    >
                                        Browse Food Gallery
                                        <HiOutlineArrowRight className="w-4 h-4" />
                                    </motion.button>
                                </Link>
                            </div>
                        </div>
                        {/* Shine overlay */}
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                width: '100%',
                                height: '100%',
                            }}
                        />
                    </motion.div>
                </Reveal>
            </div>
        </section>

    </div>
);

export default AboutPage;