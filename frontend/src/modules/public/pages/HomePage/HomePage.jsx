import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useState, useEffect, useRef, memo } from 'react';

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────
const ACCENT = '#2563eb';
const ACCENT2 = '#7c3aed';

// ─────────────────────────────────────────────────────────────
// Motion presets
// ─────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
};

const InView = memo(({ children, delay = 0, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp}
      initial={shouldReduceMotion ? 'show' : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      custom={delay}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────
// Animated counter
// ─────────────────────────────────────────────────────────────
const Counter = memo(({ to, prefix = '', suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) { setVal(to); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 45);
      const t = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(t); }
        else setVal(start);
      }, 16);
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, shouldReduceMotion]);

  return <span ref={ref}>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>;
});

// ─────────────────────────────────────────────────────────────
// Pill badge
// ─────────────────────────────────────────────────────────────
const Pill = memo(({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm sm:px-4">
    {children}
  </span>
));

// ─────────────────────────────────────────────────────────────
// Live dot
// ─────────────────────────────────────────────────────────────
const LiveDot = memo(() => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
  </span>
));

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const stats = [
  { value: 12500, label: 'Active members', prefix: '', suffix: '+' },
  { value: 840, label: 'Messes managed', prefix: '', suffix: '+' },
  { value: 98, label: 'Satisfaction score', prefix: '', suffix: '%' },
  { value: 320, label: 'Cities covered', prefix: '', suffix: '+' },
];

const features = [
  {
    tone: 'blue',
    badge: 'Analytics',
    title: 'Live intelligence dashboard',
    description:
      'Real-time tracking of expenses, meal counts, contribution flow, and balance trends — presented in a finance-grade visual layer built for instant decisions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7v-5" />
      </svg>
    ),
  },
  {
    tone: 'violet',
    badge: 'Security',
    title: 'Enterprise-grade access control',
    description:
      "Granular role-based permissions for admins, managers, and members — with audit trails and secure authentication flows you'd expect from a top-tier fintech product.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    tone: 'emerald',
    badge: 'Operations',
    title: 'Fast member operations',
    description:
      'Manage meals, deposits, statuses, and announcements from one clean dashboard. The information hierarchy stays uncluttered even when data gets dense.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 20a6 6 0 0 1 12 0" />
      </svg>
    ),
  },
  {
    tone: 'amber',
    badge: 'Transparency',
    title: 'Fairness-first billing engine',
    description:
      'Accurate, auditable cost allocation with clean settlement summaries. Every ₹ is traceable — building the trust that keeps communities together longer.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    tone: 'rose',
    badge: 'Notifications',
    title: 'Smart alert system',
    description:
      'Push and in-app notifications for balance changes, meal updates, deposit confirmations, and announcements. Nothing slips through the cracks.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
      </svg>
    ),
  },
  {
    tone: 'sky',
    badge: 'Cross-device',
    title: 'Fully responsive experience',
    description:
      'Pixel-perfect layouts across mobile, tablet, and desktop with adaptive UI patterns. Dark and light mode both feel premium — not like an afterthought.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <rect x="5" y="2" width="14" height="20" rx="2" /><path strokeLinecap="round" d="M12 18h.01" />
      </svg>
    ),
  },
];

const toneMap = {
  blue:   { bg: 'from-blue-500/15 to-blue-500/5', text: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', border: 'group-hover:border-blue-500/40' },
  violet: { bg: 'from-violet-500/15 to-violet-500/5', text: 'text-violet-500', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', border: 'group-hover:border-violet-500/40' },
  emerald:{ bg: 'from-emerald-500/15 to-emerald-500/5', text: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', border: 'group-hover:border-emerald-500/40' },
  amber:  { bg: 'from-amber-500/15 to-amber-500/5', text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'group-hover:border-amber-500/40' },
  rose:   { bg: 'from-rose-500/15 to-rose-500/5', text: 'text-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', border: 'group-hover:border-rose-500/40' },
  sky:    { bg: 'from-sky-500/15 to-sky-500/5', text: 'text-sky-500', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', border: 'group-hover:border-sky-500/40' },
};

const steps = [
  {
    num: '01',
    title: 'Create your mess in minutes',
    description: 'Set up members, meal rules, billing cycles, contribution thresholds, and roles — with a guided setup wizard that feels effortless.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: '02',
    title: 'Run daily operations smoothly',
    description: 'Mark meals, log expenses, accept deposits, and push announcements from one refined dashboard. Every action takes under 3 taps.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: '03',
    title: 'Settle and scale with confidence',
    description: 'Monitor balances, food cost patterns, and settlement summaries in real time — with export-ready reports for full accountability.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  },
];

const testimonials = [
  {
    quote: 'The interface feels premium and trustworthy — like a banking dashboard, not a utility app. That visual credibility is exactly why our members actually use it.',
    name: 'Avijit Roy',
    role: '.NET Developer, Accenture',
    avatar: 'AR',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    quote: 'We moved away from spreadsheet chaos in one afternoon. The flow is clean, responsive, and extremely easy to explain to new members every semester.',
    name: 'Hafizur Rahaman',
    role: 'UI/UX Designer, TCS',
    avatar: 'HR',
    color: 'from-violet-500 to-purple-600',
  },
  {
    quote: 'The analytics are sharp and the dark mode is excellent. Settlement used to take 3 hours — now it takes 10 minutes with full audit clarity.',
    name: 'Nayan Islam',
    role: 'Mess Secretary, United Mess',
    avatar: 'NI',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    quote: 'Every member in our hostel trusts the numbers now. The transparency engine removed every dispute we used to have about billing.',
    name: 'Iptikar Ahamed',
    role: 'DevOps Engineer, Tiger Analytics',
    avatar: 'IA',
    color: 'from-rose-500 to-pink-600',
  },
  {
    quote: 'Switching was the best decision we made. The onboarding took 15 minutes and the whole mess was migrated without a single complaint.',
    name: 'Sahabaj Ahammed',
    role: 'QA Engineer, Weavers Solution',
    avatar: 'SA',
    color: 'from-amber-500 to-orange-600',
  },
  {
    quote: 'The notification system alone saved us — no more chasing members for deposits. The automated reminders work perfectly.',
    name: 'Sk Sajahan',
    role: 'SAP-MM, TCS',
    avatar: 'SS',
    color: 'from-sky-500 to-cyan-600',
  },
];

const comparisonRows = [
  ['Monthly expense tracking', true, false, false],
  ['Role-based access control', true, false, false],
  ['Real-time analytics', true, false, false],
  ['Automated settlement', true, true, false],
  ['Mobile-first design', true, false, false],
  ['Dark mode support', true, false, false],
  ['Audit trail', true, false, false],
  ['Multi-mess management', true, false, false],
];

const trustLogos = [
  { label: 'ISO 27001', sub: 'Certified' },
  { label: 'AES-256', sub: 'Encryption' },
  { label: '99.9%', sub: 'Uptime SLA' },
  { label: 'GDPR', sub: 'Compliant' },
  { label: 'SOC 2', sub: 'Type II' },
];

const faqItems = [
  { q: 'How do I get started?', a: 'Create a free account, set up your mess with member details and meal rules, and you\'re live in under 15 minutes. No credit card required.' },
  { q: 'How does billing work?', a: 'United Mess calculates each member\'s share based on actual meal consumption and proportional expense allocation. Every calculation is fully auditable.' },
  { q: 'Can I manage multiple messes?', a: 'Yes. You can administer multiple messes from a single account with independent data, members, and billing cycles for each.' },
  { q: 'Is my data secure?', a: 'All data is encrypted at rest and in transit with AES-256. We follow ISO 27001 security standards and maintain 99.9% uptime.' },
  { q: 'What devices are supported?', a: 'United Mess is fully responsive and optimised for mobile, tablet, and desktop. PWA support allows installation on any device.' },
  { q: 'Can I export data?', a: 'Yes — monthly summaries, settlement reports, and expense breakdowns are exportable as PDF and CSV at any time.' },
];

// ─────────────────────────────────────────────────────────────
// FAQ Item
// ─────────────────────────────────────────────────────────────
const FAQItem = memo(({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden transition-colors duration-200 hover:border-border"
      onClick={() => setOpen((v) => !v)}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5">
        <span className="text-sm font-semibold text-foreground pr-4">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-2 shrink-0 text-muted-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="border-t border-border/50 px-5 py-4 text-sm leading-7 text-muted-foreground sm:px-6 sm:py-5">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// FeatureCard
// ─────────────────────────────────────────────────────────────
const FeatureCard = memo(({ item, index }) => {
  const t = toneMap[item.tone];
  return (
    <InView delay={0.05 * index}>
      <div className={`group h-full rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7 ${t.border}`}>
        <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${t.bg} p-3 sm:mb-5 sm:rounded-2xl`}>
          <span className={t.text}>{item.icon}</span>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${t.badge}`}>
          {item.badge}
        </span>
        <h3 className="mt-3 text-[15px] font-bold tracking-tight text-foreground sm:text-base">{item.title}</h3>
        <p className="mt-2 text-sm leading-[1.75] text-muted-foreground sm:mt-3 sm:leading-7">{item.description}</p>
      </div>
    </InView>
  );
});

// ─────────────────────────────────────────────────────────────
// HeroCard — floating dashboard preview
// ─────────────────────────────────────────────────────────────
const HeroCard = memo(() => (
  <div className="relative">
    <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-transparent to-violet-500/20 blur-3xl sm:-inset-6 sm:rounded-[3rem]" />
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:rounded-[2.25rem] sm:shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)] dark:sm:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80 sm:h-3 sm:w-3" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80 sm:h-3 sm:w-3" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 sm:h-3 sm:w-3" />
        </div>
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="text-[10px] font-semibold text-emerald-500 sm:text-[11px]">Live</span>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
        {/* Top photo + summary row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">
          <div className="overflow-hidden rounded-xl sm:col-span-3 sm:rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80"
              alt="Mess dining"
              className="h-40 w-full object-cover sm:h-44"
              loading="eager"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:gap-3">
            <div className="flex-1 rounded-xl border border-border/60 bg-background/70 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]">Monthly total</p>
              <p className="mt-1 text-xl font-black tracking-tight text-foreground sm:mt-2 sm:text-2xl">₹18,420</p>
              <div className="mt-1 flex items-center gap-1 sm:mt-2">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 sm:text-[10px]">↑ 12.4%</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-border/60 bg-background/70 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]">Meal rate</p>
              <p className="mt-1 text-xl font-black tracking-tight text-foreground sm:mt-2 sm:text-2xl">94%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted sm:mt-2">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Mini chart bars */}
        <div className="rounded-xl border border-border/60 bg-background/60 p-3 sm:rounded-2xl sm:p-4">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">Weekly expense trend</span>
            <span className="text-[10px] font-semibold text-foreground sm:text-[11px]">Apr 2025</span>
          </div>
          <div className="flex h-14 items-end gap-1.5 sm:h-16 sm:gap-2">
            {[55, 72, 48, 88, 65, 91, 78].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={`flex-1 rounded-t-md ${i === 5 ? 'bg-gradient-to-t from-blue-600 to-violet-500' : 'bg-muted/80'}`}
                style={{ willChange: 'height' }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-medium text-muted-foreground">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>

        {/* Settlement row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Avg. meal cost', value: '₹84.30' },
            { label: 'Members', value: '34' },
            { label: 'Pending', value: '6 dues' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-background/60 p-2.5 text-center sm:rounded-xl sm:p-3">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[9px]">{label}</p>
              <p className="mt-1 text-xs font-bold text-foreground sm:text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>

    {/* Floating notification cards */}
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="absolute -right-2 top-16 hidden xl:block"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="w-48 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur-xl sm:w-52 sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
            <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-foreground">Deposit confirmed</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Rahul deposited <span className="font-semibold text-foreground">₹2,500</span></p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">2 min ago</p>
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.9 }}
      className="absolute -left-2 bottom-20 hidden xl:block"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="w-48 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur-xl sm:w-52 sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500">
            <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4l3 3" /><circle cx="8" cy="8" r="6" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-foreground">Settlement ready</span>
        </div>
        <p className="text-[11px] text-muted-foreground">March report available</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">Just now</p>
      </div>
    </motion.div>
  </div>
));

// ─────────────────────────────────────────────────────────────
// Scrolling ticker
// ─────────────────────────────────────────────────────────────
const Ticker = memo(() => {
  const items = [
    '₹ Transparent billing',
    '⊕ Role-based access',
    '⊕ Real-time analytics',
    '⊕ Mobile-first design',
    '⊕ Dark & light mode',
    '⊕ Audit trail',
    '⊕ Export-ready reports',
    '⊕ 99.9% uptime',
  ];
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-border/50 bg-card/40 py-2.5 backdrop-blur-sm sm:py-3">
      <motion.div
        className="flex gap-8 whitespace-nowrap sm:gap-10"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">{item}</span>
        ))}
      </motion.div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// HomePage
// ─────────────────────────────────────────────────────────────
const HomePage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20">

      {/* ── Ambient backdrop ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-[24rem] w-[24rem] rounded-full bg-blue-600/12 blur-[100px] dark:bg-blue-500/10 sm:h-[36rem] sm:w-[36rem] sm:blur-[120px]" />
        <div className="absolute right-[-8rem] top-16 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[100px] dark:bg-violet-500/10 sm:right-[-12rem] sm:h-[42rem] sm:w-[42rem] sm:blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-emerald-500/8 blur-[100px] dark:bg-emerald-500/8 sm:bottom-[-16rem] sm:h-[38rem] sm:w-[38rem] sm:blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative mx-auto grid min-h-[85vh] max-w-7xl items-center gap-8 px-4 pb-16 pt-20 sm:min-h-screen sm:px-6 sm:pb-24 sm:pt-24 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pt-28 xl:gap-16">

        <div>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 flex flex-wrap items-center gap-2 sm:mb-7 sm:gap-3"
          >
            <Pill>
              <LiveDot />
              Built for modern India
            </Pill>
            <Pill>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4l3 2" /><circle cx="8" cy="8" r="6" />
              </svg>
              Trusted by 12,500+ members
            </Pill>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl text-[clamp(2.2rem,5.5vw,5rem)] font-black leading-[1.06] tracking-[-0.03em] text-foreground"
          >
            Mess operations,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #06b6d4 100%)' }}
            >
              reimagined.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-5 max-w-xl text-base leading-[1.75] text-muted-foreground sm:mt-7 sm:text-[1.05rem] sm:leading-[1.85]"
          >
            United Mess brings a finance-grade experience to meal tracking, contributions, member management,
            and expense control. The clarity of a top fintech product — built for India's communities.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center"
          >
            <Link
              to="/register"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-auto sm:px-7 sm:py-4"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              Start free — no card needed
              <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/60 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-auto sm:px-7 sm:py-4"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v18h-6M10 17l5-5-5-5M14 12H3" />
              </svg>
              Sign in to portal
            </Link>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8 grid grid-cols-2 gap-2 sm:mt-12 sm:gap-3"
          >
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card/60 px-3 py-3 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-4">
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground sm:text-[1.6rem]">
                  <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:mt-1 sm:text-[11px]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <HeroCard />
      </section>

      {/* ── Scrolling ticker ── */}
      <Ticker />

      {/* ═══════════════════════════ TRUST BAND ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-card/50 px-5 py-6 backdrop-blur-sm sm:rounded-[2rem] sm:px-6 sm:py-8">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground sm:mb-6 sm:text-[11px]">Security & compliance</p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10">
            {trustLogos.map(({ label, sub }) => (
              <div key={label} className="text-center">
                <div className="text-base font-black tracking-tight text-foreground sm:text-lg">{label}</div>
                <div className="text-[10px] font-medium text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView className="mx-auto max-w-2xl text-center">
          <Pill>Core capabilities</Pill>
          <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
            Every detail designed to feel premium.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
            A refined operating layer for mess leaders who want modern design, accurate data architecture,
            and zero visual clutter — all in one coherent product.
          </p>
        </InView>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {features.map((item, i) => <FeatureCard key={item.title} item={item} index={i} />)}
        </div>
      </section>

      {/* ═══════════════════════════ SHOWCASE IMAGE BAND ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <InView>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80', label: 'Transparent dining' },
              { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80', label: 'Balanced nutrition' },
              { src: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=900&q=80', label: 'Community meals' },
            ].map(({ src, label }) => (
              <div key={label} className="group relative overflow-hidden rounded-2xl sm:rounded-3xl">
                <img src={src} alt={label} className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-72" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                <span className="absolute bottom-4 left-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 sm:bottom-5 sm:left-5 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView className="mx-auto max-w-2xl text-center mb-10 sm:mb-16">
          <Pill>Simple workflow</Pill>
          <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
            From setup to settlement in minutes.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
            Three steps that remove every bottleneck in traditional mess management.
          </p>
        </InView>

        {/* Tabbed steps */}
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div className="space-y-3 sm:space-y-4">
            {steps.map((step, idx) => (
              <motion.button
                key={step.num}
                onClick={() => setActiveTab(idx)}
                whileHover={shouldReduceMotion ? {} : { x: 4 }}
                className={`w-full rounded-xl border p-4 text-left transition-all duration-200 sm:rounded-2xl sm:p-6 ${
                  activeTab === idx
                    ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                    : 'border-border/60 bg-card/50 hover:border-border hover:bg-card/70'
                }`}
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white transition-all duration-200 sm:h-12 sm:w-12 sm:rounded-2xl ${
                      activeTab === idx
                        ? 'shadow-lg shadow-blue-500/30'
                        : 'opacity-60'
                    }`}
                    style={{ background: activeTab === idx ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : undefined, backgroundColor: activeTab === idx ? undefined : 'var(--muted)' }}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground sm:text-base">{step.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground sm:mt-1.5 sm:text-sm sm:leading-7">{step.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-xl backdrop-blur-sm sm:rounded-3xl sm:shadow-2xl"
              style={{ willChange: 'transform, opacity' }}
            >
              <img
                src={steps[activeTab].image}
                alt={steps[activeTab].title}
                className="h-56 w-full object-cover sm:h-72 sm:h-96"
                loading="lazy"
              />
              <div className="p-4 sm:p-6">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold text-white sm:text-xs"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                >
                  Step {steps[activeTab].num}
                </span>
                <h3 className="mt-2 text-base font-bold text-foreground sm:mt-3 sm:text-lg">{steps[activeTab].title}</h3>
                <p className="mt-1.5 text-xs leading-6 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-7">{steps[activeTab].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ═══════════════════════════ COMPARISON TABLE ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView className="mx-auto max-w-2xl text-center mb-10 sm:mb-14">
          <Pill>Why United Mess</Pill>
          <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
            The clearest choice for serious messes.
          </h2>
        </InView>
        <InView>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm sm:rounded-3xl">
            <div className="min-w-[540px]">
              <div className="grid grid-cols-4 border-b border-border/50 bg-muted/30 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:px-6 sm:py-4 sm:text-xs">
                <span>Feature</span>
                <span className="text-center text-blue-600 dark:text-blue-400">United Mess</span>
                <span className="text-center">WhatsApp groups</span>
                <span className="text-center">Spreadsheets</span>
              </div>
              {comparisonRows.map(([feature, um, wa, ss]) => (
                <div key={feature} className="grid grid-cols-4 border-b border-border/40 px-4 py-3 text-xs last:border-0 sm:px-6 sm:py-4 sm:text-sm">
                  <span className="font-medium text-foreground">{feature}</span>
                  <span className="flex justify-center">
                    {um ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-red-500 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="flex justify-center">
                    {wa ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-red-500 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="flex justify-center">
                    {ss ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 sm:h-6 sm:w-6">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 text-red-500 sm:h-3 sm:w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </InView>
      </section>

      {/* ═══════════════════════════ TESTIMONIALS ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView className="mx-auto max-w-2xl text-center mb-10 sm:mb-14">
          <Pill>Testimonials</Pill>
          <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
            Trusted by real communities across India.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
            From IITs to regional colleges — messes that switched never looked back.
          </p>
        </InView>

        <div className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
          {testimonials.map((item, i) => (
            <InView key={item.name} delay={0.05 * i} className="mb-4 break-inside-avoid sm:mb-5">
              <blockquote className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm sm:rounded-3xl sm:p-7">
                <div className="mb-4 flex gap-1 text-amber-400 sm:mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 sm:h-3.5 sm:w-3.5">
                      <path d="M8 1.5l1.94 3.93 4.33.63-3.14 3.06.74 4.32L8 11.18l-3.87 2.04.74-4.32L1.73 5.56l4.33-.63L8 1.5z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs leading-[1.85] text-muted-foreground sm:text-sm sm:leading-[1.9]">"{item.quote}"</p>
                <div className="mt-5 flex items-center gap-3 sm:mt-6">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-[11px] font-bold text-white sm:h-10 sm:w-10 sm:text-xs`}>
                    {item.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground sm:text-sm">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </blockquote>
            </InView>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════ MOBILE APP PREVIEW ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-blue-600/10 via-card/70 to-violet-600/10 p-6 backdrop-blur-sm sm:rounded-[3rem] sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.15),transparent_50%)]" />
            <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
              <div>
                <Pill>Cross-platform</Pill>
                <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
                  Your mess, in your pocket.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
                  Fully responsive PWA — installs on iOS and Android from the browser. No app store required.
                  Every workflow is optimised for thumb-reach on mobile screens.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
                  {[
                    { label: 'Instant install', desc: 'No app store needed' },
                    { label: 'Offline-ready', desc: 'Works without network' },
                    { label: 'Push alerts', desc: 'Real-time notifications' },
                    { label: 'Biometric auth', desc: 'Face ID / fingerprint' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="rounded-xl border border-border/60 bg-background/60 p-3 sm:rounded-2xl sm:p-4">
                      <p className="text-xs font-bold text-foreground sm:text-sm">{label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative w-52 sm:w-64">
                  <div className="overflow-hidden rounded-[2rem] border-[3px] border-border/60 bg-card shadow-2xl sm:rounded-[2.5rem] sm:border-4">
                    <img
                      src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80"
                      alt="Mobile app preview"
                      className="h-[400px] w-full object-cover sm:h-[480px]"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-6 rounded-xl border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-xl sm:-bottom-4 sm:-right-8 sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[11px] font-bold text-foreground sm:text-xs">₹84.30 / meal</p>
                    <p className="text-[9px] text-muted-foreground sm:text-[10px]">Today's cost</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* ═══════════════════════════ FAQ ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
          <InView>
            <Pill>FAQ</Pill>
            <h2 className="mt-4 text-[clamp(1.6rem,4vw,3rem)] font-black tracking-tight text-foreground sm:mt-5">
              Everything you need to know.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
              Still have questions? Reach out to the team — we respond within 2 hours.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-600 sm:mt-6"
            >
              Contact support
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </InView>
          <InView delay={0.1} className="space-y-2.5 sm:space-y-3">
            {faqItems.map((item) => <FAQItem key={item.q} {...item} />)}
          </InView>
        </div>
      </section>

      {/* ═══════════════════════════ CTA ═══════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <InView>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 p-8 text-center backdrop-blur-sm sm:rounded-[3rem] sm:p-16 lg:p-20"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.10) 50%, rgba(6,182,212,0.08))' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.2),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.16),transparent_50%)]" />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden"
              aria-hidden
            >
              <span
                className="text-[8rem] font-black tracking-tighter opacity-[0.04] dark:opacity-[0.06] sm:text-[14rem]"
                style={{ lineHeight: 1 }}
              >
                ₹
              </span>
            </div>
            <div className="relative z-10">
              <Pill>Ready to launch</Pill>
              <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(1.8rem,5vw,4rem)] font-black leading-[1.08] tracking-[-0.03em] text-foreground sm:mt-6 sm:leading-[1.06]">
                Give your mess the product it deserves.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:mt-5 sm:text-base sm:leading-8">
                Join 12,500+ members across India who trust United Mess for transparent, effortless,
                finance-grade mess operations. Free forever for small messes.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-auto sm:px-8 sm:py-4 sm:text-base"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                >
                  Create your mess — it's free
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  to="/about"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  See how it works
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-muted-foreground sm:mt-6 sm:text-xs">No credit card · Free for messes up to 15 members · Setup in 10 minutes</p>
            </div>
          </div>
        </InView>
      </section>

    </div>
  );
};

export default HomePage;