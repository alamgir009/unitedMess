import { Link } from 'react-router-dom';
import { memo, useRef, useState, useEffect } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import {
    HiOutlineUsers, HiOutlineHome, HiOutlineStar, HiOutlineClock,
    HiOutlineShieldCheck, HiOutlineBolt, HiOutlineSparkles,
    HiOutlineGlobeAlt, HiOutlineHandRaised, HiOutlineChartBar,
    HiOutlineArrowRight,
} from 'react-icons/hi2';
import { RiDoubleQuotesL } from 'react-icons/ri';

const Reveal = memo(({ children, className = '', delay = 0 }) => {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => setVisible(true));
                    obs.disconnect();
                }
            },
            { threshold: 0.01, rootMargin: '-24px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`${className} ${visible ? 'reveal-visible' : 'reveal-hidden'}`}
            style={{ '--reveal-delay': `${delay}s` }}
        >
            {children}
        </div>
    );
});
Reveal.displayName = 'Reveal';

const StatCard = memo(({ value, label, Icon, delay }) => (
    <Reveal delay={delay}>
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 backdrop-blur-none md:backdrop-blur-md motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 gpu-layer shadow-sm contain-content">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-3 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-numeric">{value}</p>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">{label}</p>
        </div>
    </Reveal>
));
StatCard.displayName = 'StatCard';

const TeamCard = memo(({ name, role, bio, avatar, delay }) => {
    const [imgError, setImgError] = useState(false);
    return (
        <Reveal delay={delay}>
            <div className="group flex flex-col h-full rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 backdrop-blur-none md:backdrop-blur-md p-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 gpu-layer shadow-sm contain-content">
                <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-primary border border-slate-200/80 dark:border-slate-800/60 shadow-sm shrink-0 text-white text-2xl font-bold overflow-hidden">
                    {!imgError ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                    ) : (
                        <span>{name.charAt(0)}</span>
                    )}
                </div>
                <div className="text-center flex flex-col gap-1 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{name}</h3>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary">{role}</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-auto">{bio}</p>
                </div>
            </div>
        </Reveal>
    );
});
TeamCard.displayName = 'TeamCard';

const ValueCard = memo(({ Icon, title, desc, iconColor, delay }) => (
    <Reveal delay={delay}>
        <div className="flex gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 backdrop-blur-none md:backdrop-blur-md p-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 gpu-layer shadow-sm contain-content">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex flex-col gap-1">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">{title}</h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    </Reveal>
));
ValueCard.displayName = 'ValueCard';

const SectionHeader = memo(({ label, title, description }) => (
    <div className="flex flex-col items-center gap-1 max-w-2xl mx-auto mb-6 md:mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{label}</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {description && <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">{description}</p>}
    </div>
));
SectionHeader.displayName = 'SectionHeader';

const stats = [
    { value: '2,500+', label: 'Active Members', Icon: HiOutlineUsers, delay: 0 },
    { value: '200+', label: 'Messes Managed', Icon: HiOutlineHome, delay: 0.06 },
    { value: '98%', label: 'Satisfaction', Icon: HiOutlineStar, delay: 0.12 },
    { value: '3 yrs', label: 'In Operation', Icon: HiOutlineClock, delay: 0.18 },
];

const team = [
    { name: 'Alamgir Islam', role: 'Full-Stack Creator', bio: 'Visionary behind UnitedMess. Crafts every pixel with purpose — from backend architecture and real-time systems to UI design and accessible frontend interactions. Passionate about elegant software that solves real community problems, one mess at a time.', avatar: 'https://res.cloudinary.com/ddqeexln0/image/upload/v1776511097/unitedMess/avatars/vtj5wogehgevgb0cquhw.jpg', delay: 0 },
];

const values = [
    { Icon: HiOutlineUsers, iconColor: 'text-blue-500 dark:text-blue-400', title: 'Community First', desc: 'Every decision is made with real communities in mind. We listen, iterate, and build what actually matters.', delay: 0 },
    { Icon: HiOutlineShieldCheck, iconColor: 'text-violet-500 dark:text-violet-400', title: 'Privacy by Design', desc: 'Your data is yours. End-to-end security, minimal data collection, and full transparency in how we handle it.', delay: 0.05 },
    { Icon: HiOutlineBolt, iconColor: 'text-amber-500 dark:text-amber-400', title: 'Performance Obsessed', desc: 'Sub-100ms interactions. Every component is optimised for speed so the app feels instant on any device.', delay: 0.10 },
    { Icon: HiOutlineSparkles, iconColor: 'text-pink-500 dark:text-pink-400', title: 'Craft & Aesthetics', desc: 'We believe beautiful software creates trust. Every detail — spacing, motion, colour — is deliberate.', delay: 0.15 },
    { Icon: HiOutlineGlobeAlt, iconColor: 'text-emerald-500 dark:text-emerald-400', title: 'Accessible to All', desc: 'WCAG 2.1 AA compliant. Screen-reader friendly. Keyboard navigable. Premium UX is a right, not a privilege.', delay: 0.20 },
    { Icon: HiOutlineHandRaised, iconColor: 'text-cyan-500 dark:text-cyan-400', title: 'Open Collaboration', desc: 'Transparent roadmap, open API, and a community forum. We build alongside our users, not just for them.', delay: 0.25 },
];

const milestones = [
    {
        year: '2023',
        title: 'Dorm Room Inception',
        desc: 'Born out of frustration with spreadsheets and chaotic WhatsApp group tracking, building our first core ledger.',
        metric: '1st Mess Active',
        Icon: HiOutlineHome
    },
    {
        year: '2024',
        title: 'Community Expansion',
        desc: 'Flats and campus dorms adopted the platform, leading to custom expense splitting and meal logging features.',
        metric: '200+ Messes Managed',
        Icon: HiOutlineUsers
    },
    {
        year: '2025',
        title: 'National Growth & Scale',
        desc: 'Rolled out automatic dues collection and instant split settlements. Reached thousands of users across India.',
        metric: '₹ 12 Cr+ Tracked',
        Icon: HiOutlineChartBar
    },
    {
        year: '2026',
        title: 'Premium Glass Redesign',
        desc: 'Redesigned from the ground up for a liquid-glass fintech user interface, featuring ultra-fast sub-100ms interactions.',
        metric: '85,000+ Meals Logged',
        Icon: HiOutlineSparkles
    }
];

const AboutPage = () => {
    return (
        <div className="relative w-full bg-background text-foreground overflow-x-hidden flex flex-col items-center">

            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div className="absolute -top-40 -left-32 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full opacity-20 dark:opacity-10 blur-[80px] bg-[var(--blob-1)]" />
                <div className="absolute top-[35%] -right-32 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full opacity-15 dark:opacity-5 blur-[100px] bg-[var(--blob-2)]" />
            </div>

            {/* ── HERO ── */}
            <section className="relative z-10 w-full max-w-[1280px] pt-12 md:pt-16 pb-8 md:pb-10 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
                    <Reveal className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 backdrop-blur-none md:backdrop-blur-md text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm shrink-0">
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-primary" />
                        Our Story
                    </Reveal>
                    <Reveal delay={0.06}>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                            <span className="text-slate-900 dark:text-slate-100">Built for</span>{' '}
                            <span className="text-gradient">Real People</span>
                        </h1>
                    </Reveal>
                    <Reveal delay={0.12}>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                            UnitedMess was born in a university dorm room out of frustration with spreadsheets and WhatsApp chaos.
                            Today we serve thousands of communities across India with a platform built on empathy, craft, and code.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* ── TEAM ── */}
            <section className="relative z-10 w-full max-w-[1280px] py-8 md:py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200/40 dark:border-slate-800/20 content-visibility-auto">
                <SectionHeader label="The Builder" title="The person behind the product" description="One person with a vision — shipping fast, valuing clean design, and caring deeply." />
                <div className="flex justify-center max-w-md mx-auto">
                    {team.map((t) => <TeamCard key={t.name} {...t} />)}
                </div>
            </section>

            {/* ── MISSION & VALUES ── */}
            <section className="relative z-10 w-full bg-slate-50/50 dark:bg-slate-900/10 border-y border-slate-200/40 dark:border-slate-800/20 py-8 md:py-10 content-visibility-auto">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8">

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-5 flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                                Our Mission
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                Simplifying lives,<br className="hidden md:block" /> one mess at a time.
                            </h2>
                        </div>
                        <div className="md:col-span-7 flex flex-col gap-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                            <p>
                                Managing a shared living space is inherently complex — tracking expenses, planning meals, collecting dues,
                                and keeping everyone in sync. We believe technology should make this invisible, not add to the friction.
                            </p>
                            <p>
                                Our mission is to give every community — from a 5-person apartment to a 500-resident dormitory — the same
                                tools that enterprise teams use, wrapped in an experience that feels effortless and beautiful.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 md:gap-8 border-t border-slate-200/60 dark:border-slate-800/40 pt-6 md:pt-8">
                        <div className="text-center flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Core Foundations
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                Principles that guide us
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {values.map((v) => <ValueCard key={v.title} {...v} />)}
                        </div>
                    </div>

                </div>
            </section>

            {/* ── NUMBERS (STATS) ── */}
            <section className="relative z-10 w-full max-w-[1280px] py-8 md:py-12 px-4 sm:px-6 lg:px-8 content-visibility-auto">
                <SectionHeader label="Our Scale" title="Growing day by day" description="Thousands of community members rely on UnitedMess every single day for expense tracking and dining logs." />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {stats.map((s) => <StatCard key={s.label} {...s} />)}
                </div>
            </section>

            {/* ── MILESTONES (TIMELINE) ── */}
            <section className="relative z-10 w-full bg-slate-50/50 dark:bg-slate-900/10 border-y border-slate-200/40 dark:border-slate-800/20 py-8 md:py-10 content-visibility-auto">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader label="Journey Timeline" title="Key Milestones" description="From a dorm-room draft to a platform processing lakhs of transactions securely." />
                    <div className="relative max-w-4xl mx-auto">
                        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 -translate-x-1/2" aria-hidden="true" />
                        <div className="flex flex-col gap-6">
                            {milestones.map((m, index) => {
                                const isEven = index % 2 === 0;
                                return (
                                    <div key={m.year} className="relative grid grid-cols-1 md:grid-cols-2 md:gap-8 items-center">
                                        <div className="absolute left-4 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 z-10">
                                            <m.Icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className={`pl-10 md:pl-0 ${isEven ? 'md:pr-12 md:text-right md:col-start-1' : 'md:pl-12 md:col-start-2'}`}>
                                            <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 gpu-layer contain-content">
                                                <span className="text-xs font-bold text-primary tracking-wider uppercase">{m.year}</span>
                                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{m.title}</h3>
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{m.desc}</p>
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
                                                    {m.metric}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIAL QUOTE ── */}
            <section className="relative z-10 w-full max-w-[1280px] py-8 md:py-12 px-4 sm:px-6 lg:px-8 content-visibility-auto">
                <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
                    <Reveal>
                        <RiDoubleQuotesL className="w-8 h-8 text-primary/40 mx-auto mb-2 shrink-0" />
                        <blockquote className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-relaxed italic mb-3 max-w-2xl">
                            &quot;UnitedMess transformed how we manage our dorm. The glass UI is stunning — I show it to friends just to show off.&quot;
                        </blockquote>
                        <div className="inline-flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-[var(--gradient-primary)] shadow-sm shrink-0">
                                A
                            </div>
                            <div className="text-left leading-tight">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Asif Ekbal</p>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Java Developer, TCS</p>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative z-10 w-full max-w-[1280px] py-8 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-slate-200/40 dark:border-slate-800/20 content-visibility-auto">
                <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
                    <Reveal className="w-full">
                        <div className="relative rounded-3xl p-5 md:p-8 border border-slate-200/60 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/50 backdrop-blur-none md:backdrop-blur-md overflow-hidden shadow-sm flex flex-col items-center">
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-white/10 dark:bg-white/5 blur-2xl rounded-t-3xl pointer-events-none" aria-hidden="true" />
                            <div className="relative z-10 flex flex-col items-center max-w-xl">
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                                    <span className="text-gradient">
                                        Ready to join us?
                                    </span>
                                </h2>
                                <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                                    Start managing your mess better today — free forever for small communities.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
                                    <Button asChild variant="primary" className="rounded-[10px] w-full sm:w-auto motion-safe:hover:scale-[1.02] transform-gpu motion-safe:transition-all">
                                        <Link to="/register">
                                            Create Free Account
                                            <HiOutlineArrowRight className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                    <Button asChild variant="glass" className="w-full sm:w-auto motion-safe:hover:scale-[1.02] transform-gpu motion-safe:transition-all">
                                        <Link to="/food-gallery">
                                            Browse Food Gallery
                                            <HiOutlineArrowRight className="w-4 h-4" />
                                        </Link>
                                    </Button>
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
