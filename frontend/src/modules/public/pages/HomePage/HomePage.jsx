import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, memo, useMemo } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import Calendar from './Calendar';

/* ── CSS-only scroll reveal (zero JS per frame after first intersection) ── */
const InView = memo(function InView({ children, delay = 0, className = '' }) {
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
      { threshold: 0.01, rootMargin: '-40px' }
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
InView.displayName = 'InView';

/* ── Counter with IntersectionObserver + setInterval ── */
const Counter = memo(({ to, prefix = '', suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const reducedRef = useRef(null);

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedRef.current) { setVal(to); return; }
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
  }, [to]);

  return <span ref={ref}>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>;
});
Counter.displayName = 'Counter';

const Pill = memo(({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-caption font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:px-4 motion-safe:transition-colors motion-safe:duration-150">
    {children}
  </span>
));
Pill.displayName = 'Pill';

const LiveDot = memo(() => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-success/80" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
  </span>
));
LiveDot.displayName = 'LiveDot';

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
    description: 'Real-time tracking of expenses, meal counts, contribution flow, and balance trends — presented in a finance-grade visual layer built for instant decisions.',
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
    description: "Granular role-based permissions for admins, managers, and members — with audit trails and secure authentication flows you'd expect from a top-tier fintech product.",
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
    description: 'Manage meals, deposits, statuses, and announcements from one clean dashboard. The information hierarchy stays uncluttered even when data gets dense.',
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
    description: 'Accurate, auditable cost allocation with clean settlement summaries. Every ₹ is traceable — building the trust that keeps communities together longer.',
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
    description: 'Push and in-app notifications for balance changes, meal updates, deposit confirmations, and announcements. Nothing slips through the cracks.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 018 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
      </svg>
    ),
  },
  {
    tone: 'sky',
    badge: 'Cross-device',
    title: 'Fully responsive experience',
    description: 'Pixel-perfect layouts across mobile, tablet, and desktop with adaptive UI patterns. Dark and light mode both feel premium — not like an afterthought.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <rect x="5" y="2" width="14" height="20" rx="2" /><path strokeLinecap="round" d="M12 18h.01" />
      </svg>
    ),
  },
];

const toneMap = {
  blue:   { bg: 'from-primary/10 to-primary/5', text: 'text-primary', badge: 'bg-primary/10 text-primary', border: 'hover:border-primary/40' },
  violet: { bg: 'from-primary/10 to-primary/5', text: 'text-primary', badge: 'bg-primary/10 text-primary', border: 'hover:border-primary/40' },
  emerald:{ bg: 'from-success/10 to-success/5', text: 'text-success-text', badge: 'bg-success-bg text-success-text', border: 'hover:border-success/40' },
  amber:  { bg: 'from-warning/10 to-warning/5', text: 'text-warning-text', badge: 'bg-warning-bg text-warning-text', border: 'hover:border-warning/40' },
  rose:   { bg: 'from-danger/10 to-danger/5', text: 'text-danger-text', badge: 'bg-danger-bg text-danger-text', border: 'hover:border-destructive/40' },
  sky:    { bg: 'from-info/10 to-info/5', text: 'text-info-text', badge: 'bg-info-bg text-info-text', border: 'hover:border-info/40' },
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
    gradient: 'from-primary to-secondary',
  },
  {
    quote: 'We moved away from spreadsheet chaos in one afternoon. The flow is clean, responsive, and extremely easy to explain to new members every semester.',
    name: 'Hafizur Rahaman',
    role: 'UI/UX Designer, TCS',
    avatar: 'HR',
    gradient: 'from-primary to-secondary',
  },
  {
    quote: 'The analytics are sharp and the dark mode is excellent. Settlement used to take 3 hours — now it takes 10 minutes with full audit clarity.',
    name: 'Nayan Islam',
    role: 'Mess Secretary, United Mess',
    avatar: 'NI',
    gradient: 'from-accent to-accent/80',
  },
  {
    quote: 'Every member in our hostel trusts the numbers now. The transparency engine removed every dispute we used to have about billing.',
    name: 'Iptikar Ahamed',
    role: 'DevOps Engineer, Tiger Analytics',
    avatar: 'IA',
    gradient: 'from-destructive to-destructive/80',
  },
  {
    quote: 'Switching was the best decision we made. The onboarding took 15 minutes and the whole mess was migrated without a single complaint.',
    name: 'Sahabaj Ahammed',
    role: 'QA Engineer, Weavers Solution',
    avatar: 'SA',
    gradient: 'from-warning to-warning/80',
  },
  {
    quote: 'The notification system alone saved us — no more chasing members for deposits. The automated reminders work perfectly.',
    name: 'Sk Sajahan',
    role: 'SAP-MM, TCS',
    avatar: 'SS',
    gradient: 'from-info to-info/80',
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

const CheckIcon = memo(() => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
  </svg>
));
CheckIcon.displayName = 'CheckIcon';

const CrossIcon = memo(() => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
  </svg>
));
CrossIcon.displayName = 'CrossIcon';

const FAQItem = memo(({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl card-base motion-safe:transition-colors motion-safe:duration-200 hover:border-border overflow-hidden lg:backdrop-blur-sm"
      onClick={() => setOpen((v) => !v)}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5">
        <span className="text-sm font-semibold text-foreground pr-4">{q}</span>
        <span
          className={`ml-2 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 ${open ? 'rotate-45' : 'rotate-0'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </span>
      </div>
      <div className={`faq-collapse ${open ? 'open' : ''}`}>
        <div>
          <div className="border-t border-border/50 px-5 py-4 text-sm leading-7 text-muted-foreground sm:px-6 sm:py-5">{a}</div>
        </div>
      </div>
    </div>
  );
});
FAQItem.displayName = 'FAQItem';

const FeatureCard = memo(({ item, index }) => {
  const t = toneMap[item.tone];
  return (
    <InView delay={0.05 * index}>
      <div className={`group h-full card-base p-4 motion-safe:transition-[transform,opacity] motion-safe:duration-300 lg:backdrop-blur-sm motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100 active:scale-[0.98] transform-gpu sm:rounded-2xl sm:p-5 ${t.border}`}>
        <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${t.bg} p-3 sm:rounded-xl`}>
          <span className={t.text}>{item.icon}</span>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-caption font-bold uppercase tracking-widest ${t.badge}`}>
          {item.badge}
        </span>
        <h3 className="mt-2 text-body-lg font-bold tracking-tight text-foreground">{item.title}</h3>
        <p className="mt-1.5 text-body leading-[1.75] text-muted-foreground sm:leading-7">{item.description}</p>
      </div>
    </InView>
  );
});
FeatureCard.displayName = 'FeatureCard';

const HeroCard = memo(() => {
  const todayIndex = useMemo(() => {
    const day = new Date().getDay();
    const map = [6, 0, 1, 2, 3, 4, 5];
    return map[day];
  }, []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-3xl sm:-inset-6 sm:rounded-[3rem]" />
      <div
        className={`relative overflow-hidden card-elevated depth-lg lg:backdrop-blur-2xl sm:rounded-[2.25rem] ${mounted ? 'animate-hero-card' : 'opacity-0'}`}
        style={{ animationDelay: '0.15s' }}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/80 sm:h-3 sm:w-3" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/80 sm:h-3 sm:w-3" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/80 sm:h-3 sm:w-3" />
          </div>
          <div className="flex items-center gap-1.5">
            <LiveDot />
            <span className="text-caption font-semibold text-success-text">Live</span>
          </div>
        </div>

        <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">
            <div className="overflow-hidden rounded-xl sm:col-span-3 sm:rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80"
                alt="Mess dining"
                width={800}
                height={320}
                className="h-40 w-full object-cover sm:h-44"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2 sm:gap-3">
              <div className="flex-1 rounded-xl glass p-3 sm:rounded-2xl sm:p-4">
                <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground">Monthly total</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-2xl">₹18,420</p>
                <div className="mt-1 flex items-center gap-1 sm:mt-2">
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption font-bold text-success-text">↑ 12.4%</span>
                </div>
              </div>
              <div className="flex-1 rounded-xl glass p-3 sm:rounded-2xl sm:p-4">
                <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground">Meal rate</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-2xl">94%</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted sm:mt-2">
                  <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-primary to-secondary" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl glass p-3 sm:rounded-2xl sm:p-4">
            <div className="mb-2 flex items-center justify-between sm:mb-3">
              <span className="text-caption font-semibold text-muted-foreground">Weekly expense trend</span>
              <span className="text-caption font-semibold text-foreground">Apr 2025</span>
            </div>
            <div className="flex h-16 items-end gap-1.5 sm:gap-2">
              {[55, 72, 48, 88, 65, 91, 78].map((h, i) => (
                <div key={i} className="flex-1 h-full rounded-t-md bg-muted/80 overflow-hidden">
                  <div
                    className={`h-full w-full rounded-t-md origin-bottom ${mounted ? 'bar-grow loaded' : 'bar-grow'}`}
                    style={{ '--bar-h': h / 100, transitionDelay: `${0.3 + i * 0.05}s` }}
                  >
                    <div className={`h-full w-full rounded-t-md ${i === todayIndex ? 'bg-gradient-to-t from-blue-600 to-violet-500' : 'bg-muted-foreground/20'}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-caption font-medium text-muted-foreground">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className={`relative ${i === todayIndex ? 'text-foreground font-bold' : ''}`}>
                  {d}
                  {i === todayIndex && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Avg. meal cost', value: '₹84.30' },
              { label: 'Members', value: '34' },
              { label: 'Pending', value: '6 dues' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg glass p-2.5 text-center sm:rounded-xl sm:p-3">
                <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 text-xs font-bold text-foreground sm:text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`absolute -right-2 top-16 hidden xl:block ${mounted ? 'animate-fade-in-right' : 'opacity-0'}`} style={{ animationDelay: '0.7s' }}>
        <div className="w-48 card-elevated depth-lg rounded-2xl p-3 lg:backdrop-blur-xl sm:w-52 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-success to-success/80">
              <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 8l4 4 8-8" />
              </svg>
            </div>
            <span className="text-label font-semibold text-foreground">Deposit confirmed</span>
          </div>
          <p className="text-caption text-muted-foreground">Rahul deposited <span className="font-semibold text-foreground">₹2,500</span></p>
          <p className="mt-1 text-caption text-muted-foreground/60">2 min ago</p>
        </div>
      </div>

      <div className={`absolute -left-2 bottom-20 hidden xl:block ${mounted ? 'animate-fade-in-left' : 'opacity-0'}`} style={{ animationDelay: '0.9s' }}>
        <div className="w-48 card-elevated depth-lg rounded-2xl p-3 lg:backdrop-blur-xl sm:w-52 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
              <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4l3 3" /><circle cx="8" cy="8" r="6" />
              </svg>
            </div>
            <span className="text-label font-semibold text-foreground">Settlement ready</span>
          </div>
          <p className="text-caption text-muted-foreground">March report available</p>
          <p className="mt-1 text-caption text-muted-foreground/60">Just now</p>
        </div>
      </div>
    </div>
  );
});
HeroCard.displayName = 'HeroCard';

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
    <div className="overflow-hidden border-y border-border/50 bg-card/40 py-2.5 sm:py-3">
      <div className="flex gap-8 whitespace-nowrap sm:gap-10 ticker-animate gpu-layer">
        {doubled.map((item, i) => (
          <span key={i} className="text-caption font-semibold uppercase tracking-[0.2em] text-muted-foreground">{item}</span>
        ))}
      </div>
    </div>
  );
});
Ticker.displayName = 'Ticker';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-[100px] dark:bg-primary/10 sm:h-[36rem] sm:w-[36rem] sm:blur-[120px]" />
        <div className="absolute right-[-8rem] top-16 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-[100px] dark:bg-secondary/10 sm:right-[-12rem] sm:h-[42rem] sm:w-[42rem] sm:blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-[100px] dark:bg-accent/10 sm:bottom-[-16rem] sm:h-[38rem] sm:w-[38rem] sm:blur-[120px]" />
      </div>

      <section className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pb-8 pt-20 sm:gap-8 sm:px-6 sm:pb-12 sm:pt-24 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-16 lg:pt-24 xl:gap-10">

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 animate-fade-up" style={{ animationDelay: '0s' }}>
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
          </div>

          <h1 className="max-w-2xl text-display leading-[1.06] animate-fade-up" style={{ animationDelay: '0.08s' }}>
            Mess operations,
            <br />
            <span className="text-gradient">
              reimagined.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-body-lg leading-[1.75] text-muted-foreground sm:mt-5 animate-fade-up" style={{ animationDelay: '0.16s' }}>
            United Mess brings a finance-grade experience to meal tracking, contributions, member management,
            and expense control. The clarity of a top fintech product — built for India&apos;s communities.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center animate-fade-up" style={{ animationDelay: '0.24s' }}>
            <Button variant="primary" size="lg" asChild>
              <Link to="/register">
                Start free — no card needed
                <svg className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link to="/login">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v18h-6M10 17l5-5-5-5M14 12H3" />
                </svg>
                Sign in to portal
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 animate-fade-up" style={{ animationDelay: '0.35s' }}>
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl card-base px-3 py-3 sm:rounded-2xl sm:px-4 sm:py-4 contain-content">
                <div className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.6rem]">
                  <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="mt-0.5 text-caption font-medium text-muted-foreground sm:mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <HeroCard />
      </section>

      <Ticker />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 content-visibility-auto">
        <div className="rounded-xl glass px-5 py-4 sm:rounded-[2rem] sm:px-6 sm:py-6">
          <p className="mb-4 text-center text-caption font-bold uppercase tracking-[0.28em] text-muted-foreground sm:mb-6">Security & compliance</p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10">
            {trustLogos.map(({ label, sub }) => (
              <div key={label} className="text-center">
                <div className="text-body-lg font-bold tracking-tight text-foreground">{label}</div>
                <div className="text-caption font-medium text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView className="mx-auto max-w-2xl text-center">
          <Pill>Core capabilities</Pill>
          <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
            Every detail designed to feel premium.
          </h2>
          <p className="mt-2 text-body leading-7 text-muted-foreground sm:leading-8">
            A refined operating layer for mess leaders who want modern design, accurate data architecture,
            and zero visual clutter — all in one coherent product.
          </p>
        </InView>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {features.map((item, i) => <FeatureCard key={item.title} item={item} index={i} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-10 lg:px-8 lg:pb-14 content-visibility-auto">
        <InView>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80', label: 'Transparent dining' },
              { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80', label: 'Balanced nutrition' },
              { src: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=900&q=80', label: 'Community meals' },
            ].map(({ src, label }) => (
              <div key={label} className="group relative overflow-hidden rounded-xl sm:rounded-2xl contain-content">
                <img src={src} alt={label} width={900} height={400} className="h-56 w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105 sm:h-72" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-overlay via-transparent" />
                <span className="absolute bottom-4 left-4 rounded-lg bg-foreground/10 px-3 py-1.5 text-label font-semibold text-white lg:backdrop-blur-md border border-foreground/20 sm:bottom-5 sm:left-5 sm:rounded-xl sm:px-4 sm:py-2">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </InView>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView className="mx-auto max-w-2xl text-center mb-6 sm:mb-10">
          <Pill>Simple workflow</Pill>
          <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
            From setup to settlement in minutes.
          </h2>
          <p className="mt-2 text-body leading-7 text-muted-foreground sm:leading-8">
            Three steps that remove every bottleneck in traditional mess management.
          </p>
        </InView>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-8">
          <div className="space-y-2 sm:space-y-3">
            {steps.map((step, idx) => (
              <button
                key={step.num}
                onClick={() => setActiveTab(idx)}
                className={`w-full rounded-xl border p-3 text-left motion-safe:transition-all motion-safe:duration-200 sm:rounded-2xl sm:p-4 motion-safe:hover:translate-x-1 active:translate-x-0 ${
                  activeTab === idx
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/60 glass hover:border-border'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white motion-safe:transition-all motion-safe:duration-200 sm:h-10 sm:w-10 sm:rounded-xl ${
                      activeTab === idx
                        ? 'bg-gradient-primary shadow-md'
                        : 'bg-muted opacity-60'
                    }`}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    <p className="mt-0.5 text-xs leading-6 text-muted-foreground sm:text-body sm:leading-7">{step.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div
            key={activeTab}
            className="overflow-hidden card-elevated depth-lg rounded-xl sm:rounded-2xl animate-fade-up"
            style={{ animationDuration: '0.3s' }}
          >
            <img
              src={steps[activeTab].image}
              alt={steps[activeTab].title}
              width={800}
              height={400}
              className="h-56 w-full object-cover sm:h-72"
              loading="lazy"
              decoding="async"
            />
            <div className="p-3 sm:p-4">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-bold text-white bg-gradient-primary">
                Step {steps[activeTab].num}
              </span>
              <h3 className="mt-1.5 text-body-lg font-bold text-foreground">{steps[activeTab].title}</h3>
              <p className="mt-1 text-body leading-6 text-muted-foreground sm:leading-7">{steps[activeTab].description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView className="mx-auto max-w-2xl text-center mb-6 sm:mb-10">
          <Pill>Why United Mess</Pill>
          <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
            The clearest choice for serious messes.
          </h2>
        </InView>
        <InView>
          <div className="overflow-x-auto rounded-xl card-base sm:rounded-2xl">
            <div className="min-w-[540px]">
              <div className="grid grid-cols-4 border-b border-border/50 bg-muted/30 px-4 py-3 text-caption font-bold uppercase tracking-widest text-muted-foreground sm:px-6 sm:py-4">
                <span>Feature</span>
                <span className="text-center text-primary">United Mess</span>
                <span className="text-center">WhatsApp groups</span>
                <span className="text-center">Spreadsheets</span>
              </div>
              {comparisonRows.map(([feature, um, wa, ss]) => (
                <div key={feature} className="grid grid-cols-4 border-b border-border/40 px-4 py-2.5 text-body last:border-0 sm:px-6 sm:py-3">
                  <span className="font-medium text-foreground">{feature}</span>
                  <span className="flex justify-center">
                    {um ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg sm:h-6 sm:w-6">
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 sm:h-6 sm:w-6">
                        <CrossIcon />
                      </span>
                    )}
                  </span>
                  <span className="flex justify-center">
                    {wa ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg sm:h-6 sm:w-6">
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 sm:h-6 sm:w-6">
                        <CrossIcon />
                      </span>
                    )}
                  </span>
                  <span className="flex justify-center">
                    {ss ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg sm:h-6 sm:w-6">
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 sm:h-6 sm:w-6">
                        <CrossIcon />
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </InView>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
          <InView>
            <Pill>Meal Calendar</Pill>
            <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
              Plan meals, track participation.
            </h2>
            <p className="mt-2 text-body leading-7 text-muted-foreground sm:leading-8">
              Interactive calendar view lets you schedule meals, mark attendance, and see monthly patterns
              at a glance. Every member stays informed about menu changes and meal counts.
            </p>
            <div className="mt-4 sm:mt-5">
              <Button variant="ghost" asChild>
                <Link to="/register">
                  Try it free
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              </Button>
            </div>
          </InView>
          <InView delay={0.1}>
            <div className="rounded-xl card-base p-4 sm:rounded-2xl sm:p-5">
              <Calendar />
            </div>
          </InView>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView className="mx-auto max-w-2xl text-center mb-6 sm:mb-10">
          <Pill>Testimonials</Pill>
          <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
            Trusted by real communities across India.
          </h2>
          <p className="mt-2 text-body leading-7 text-muted-foreground sm:leading-8">
            From IITs to regional colleges — messes that switched never looked back.
          </p>
        </InView>

        <div className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
          {testimonials.map((item, i) => (
            <InView key={item.name} delay={0.05 * i} className="mb-3 break-inside-avoid sm:mb-4">
              <blockquote className="rounded-xl card-base p-5 sm:rounded-2xl sm:p-7 contain-content">
                <div className="mb-3 flex gap-1 text-warning-text">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 sm:h-3.5 sm:w-3.5">
                      <path d="M8 1.5l1.94 3.93 4.33.63-3.14 3.06.74 4.32L8 11.18l-3.87 2.04.74-4.32L1.73 5.56l4.33-.63L8 1.5z" />
                    </svg>
                  ))}
                </div>
                <p className="text-body leading-[1.85] text-muted-foreground sm:leading-[1.9]">&quot;{item.quote}&quot;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-caption font-bold text-white sm:h-10 sm:w-10`}>
                    {item.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-label font-semibold text-foreground">{item.name}</p>
                    <p className="text-caption text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </blockquote>
            </InView>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView>
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-card/70 to-secondary/[0.08] p-5 sm:rounded-[2rem] sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.15),transparent_50%)]" />
            <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
              <div>
                <Pill>Cross-platform</Pill>
                <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
                  Your mess, in your pocket.
                </h2>
                <p className="mt-2 max-w-lg text-body leading-7 text-muted-foreground sm:leading-8">
                  Fully responsive PWA — installs on iOS and Android from the browser. No app store required.
                  Every workflow is optimised for thumb-reach on mobile screens.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
                  {[
                    { label: 'Instant install', desc: 'No app store needed' },
                    { label: 'Offline-ready', desc: 'Works without network' },
                    { label: 'Push alerts', desc: 'Real-time notifications' },
                    { label: 'Biometric auth', desc: 'Face ID / fingerprint' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="rounded-xl glass p-2.5 sm:rounded-xl sm:p-3 contain-content">
                      <p className="text-label font-bold text-foreground">{label}</p>
                      <p className="text-caption text-muted-foreground">{desc}</p>
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
                      width={600}
                      height={800}
                      className="h-[400px] w-full object-cover sm:h-[480px]"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-6 card-elevated depth-lg rounded-xl px-3 py-2 sm:-bottom-4 sm:-right-8 sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-caption font-bold text-foreground">₹84.30 / meal</p>
                    <p className="text-caption text-muted-foreground">Today&apos;s cost</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
          <InView>
            <Pill>FAQ</Pill>
            <h2 className="mt-3 text-h1 font-bold tracking-tight text-foreground">
              Everything you need to know.
            </h2>
            <p className="mt-2 text-body leading-7 text-muted-foreground sm:leading-8">
              Still have questions? Reach out to the team — we respond within 2 hours.
            </p>
            <div className="mt-4 sm:mt-5">
              <Button variant="ghost" asChild>
                <Link to="/contact">
                  Contact support
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              </Button>
            </div>
          </InView>
          <InView delay={0.1} className="space-y-2">
            {faqItems.map((item) => <FAQItem key={item.q} {...item} />)}
          </InView>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 content-visibility-auto">
        <InView>
          <div className="relative overflow-hidden rounded-xl border border-border/60 p-6 text-center bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent sm:rounded-[2rem] sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.2),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.16),transparent_50%)]" />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden"
              aria-hidden
            >
              <span className="text-[8rem] font-bold tracking-tighter opacity-[0.04] dark:opacity-[0.06] sm:text-[14rem] leading-none">
                ₹
              </span>
            </div>
            <div className="relative z-10">
              <Pill>Ready to launch</Pill>
              <h2 className="mx-auto mt-4 max-w-3xl text-display leading-[1.08] tracking-[-0.03em] text-foreground sm:leading-[1.06]">
                Give your mess the product it deserves.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-body leading-7 text-muted-foreground sm:mt-4 sm:leading-8">
                Join 12,500+ members across India who trust United Mess for transparent, effortless,
                finance-grade mess operations. Free forever for small messes.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
                <Button variant="primary" size="lg" asChild>
                  <Link to="/register">
                    Create your mess — it&apos;s free
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/about">
                    See how it works
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-caption text-muted-foreground sm:mt-5">No credit card · Free for messes up to 15 members · Setup in 10 minutes</p>
            </div>
          </div>
        </InView>
      </section>

    </div>
  );
};

export default HomePage;
