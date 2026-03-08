import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

// ── Theme Hook — watches <html class="dark"> (Tailwind convention) ────────────
function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

// ── Design tokens — one object, two personalities ─────────────────────────────
function useTokens(dark) {
  return useMemo(() => ({
    pageBg:          dark ? '#050810'                              : '#f0f4f8',
    terminalBg:      dark ? 'rgba(0,0,0,0.6)'                     : 'rgba(255,255,255,0.8)',
    glowBg1:         dark ? 'rgba(0,255,180,0.04)'                 : 'rgba(0,160,120,0.06)',
    glowBg2:         dark ? 'rgba(120,0,255,0.06)'                 : 'rgba(80,0,180,0.04)',
    gridLine:        dark ? 'rgba(0,255,220,0.025)'                : 'rgba(0,140,120,0.07)',
    radialOverlay:   dark ? 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(0,80,70,0.35) 0%, transparent 70%)'
                          : 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(0,180,140,0.08) 0%, transparent 70%)',
    scanline:        dark ? 'rgba(0,255,220,0.015)'                : 'rgba(0,120,90,0.02)',

    textPrimary:     dark ? '#e2f4f0'                              : '#0d2320',
    textMuted:       dark ? 'rgba(180,220,215,0.55)'               : 'rgba(30,80,70,0.6)',
    textLabel:       dark ? 'rgba(0,255,220,0.8)'                  : 'rgba(0,110,90,0.85)',
    textLabelMid:    dark ? 'rgba(0,255,220,0.3)'                  : 'rgba(0,110,90,0.4)',
    textTerminal:    dark ? 'rgba(0,255,220,0.7)'                  : 'rgba(0,120,90,0.85)',
    textTerminalDim: dark ? 'rgba(0,255,220,0.35)'                 : 'rgba(0,120,90,0.4)',

    accent:          dark ? '#00ffdc'                              : '#00967a',
    accentGlow:      dark ? 'rgba(0,255,220,0.35)'                 : 'rgba(0,150,122,0.25)',
    accentBg:        dark ? 'rgba(0,255,220,0.06)'                 : 'rgba(0,150,122,0.08)',
    accentBorder:    dark ? 'rgba(0,255,220,0.2)'                  : 'rgba(0,150,122,0.3)',
    accentBorderHov: dark ? 'rgba(0,255,220,0.35)'                 : 'rgba(0,150,122,0.5)',
    accentBtnBorder: dark ? 'rgba(0,255,220,0.5)'                  : 'rgba(0,150,122,0.6)',
    accentBtnBg:     dark ? 'rgba(0,255,220,0.1)'                  : 'rgba(0,150,122,0.1)',
    cursor:          dark ? '#00ffdc'                              : '#00967a',

    ringColor:       dark ? 'rgba(0,255,220,0.06)'                 : 'rgba(0,140,110,0.12)',
    pulseColor:      dark ? 'rgba(0,255,220,0.3)'                  : 'rgba(0,150,120,0.3)',
    orbitDot1:       dark ? '#00ffdc'                              : '#00967a',
    orbitDot2:       dark ? '#ff6b9d'                              : '#e05580',

    textStroke:      dark ? 'rgba(0,255,220,0.7)'                  : 'rgba(0,100,80,0.7)',
    textShadow:      dark ? 'rgba(0,255,220,0.15)'                 : 'rgba(0,150,110,0.12)',

    secBorder:       dark ? 'rgba(255,255,255,0.1)'                : 'rgba(0,80,60,0.15)',
    secBg:           dark ? 'rgba(255,255,255,0.04)'               : 'rgba(0,80,60,0.04)',
    secText:         dark ? 'rgba(180,220,215,0.7)'                : 'rgba(0,80,60,0.75)',
    divider:         dark ? 'rgba(0,255,220,0.1)'                  : 'rgba(0,120,90,0.15)',
    cardShadow:      dark ? 'none'                                 : '0 4px 24px rgba(0,0,0,0.07)',
    toggleShadow:    dark ? '0 0 16px rgba(0,255,220,0.3)'         : '0 2px 12px rgba(0,0,0,0.1)',
  }), [dark]);
}

// ── CSS keyframes (injected once) ─────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap');

  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes flicker {
    0%, 95%, 100% { opacity: 1; }
    96%  { opacity: 0.4; }
    97%  { opacity: 1; }
    98%  { opacity: 0.2; }
    99%  { opacity: 0.9; }
  }
  @keyframes noise {
    0%,100% { clip-path:inset(40% 0 61% 0); transform:translate(-4px, 2px); }
    20%     { clip-path:inset(92% 0 1% 0);  transform:translate(4px,-1px); }
    40%     { clip-path:inset(43% 0 1% 0);  transform:translate(-2px,3px); }
    60%     { clip-path:inset(25% 0 58% 0); transform:translate(3px,-2px); }
    80%     { clip-path:inset(54% 0 7% 0);  transform:translate(-1px,4px); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(140px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
  }
  @keyframes orbit2 {
    from { transform: rotate(180deg) translateX(100px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(100px) rotate(-540deg); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.6; }
    70%  { transform: scale(1.15); opacity: 0; }
    100% { transform: scale(0.85); opacity: 0; }
  }
  @keyframes float-up {
    0%   { transform: translateY(0px) translateX(0px); opacity: 0.6; }
    50%  { opacity: 1; }
    100% { transform: translateY(-80px) translateX(var(--drift)); opacity: 0; }
  }
  @keyframes blink-cursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .glitch-text { animation: flicker 8s infinite; }
  .glitch-text::before,
  .glitch-text::after {
    content: '404';
    position: absolute;
    top: 0; left: 0; right: 0;
  }
  .glitch-text::before {
    color: #0ff;
    animation: noise 0.3s infinite linear alternate-reverse;
    opacity: 0;
  }
  .glitch-text::after {
    color: #f0f;
    animation: noise 0.3s 0.1s infinite linear alternate-reverse;
    opacity: 0;
  }
  .glitch-active::before,
  .glitch-active::after { opacity: 0.7; }
  .nf-scanline   { animation: scanline 4s linear infinite; }
  .nf-orbit-1    { animation: orbit 8s linear infinite; }
  .nf-orbit-2    { animation: orbit2 12s linear infinite; }
  .nf-cursor     { animation: blink-cursor 1s step-end infinite; }
`;

// ── Sub-components ────────────────────────────────────────────────────────────
const GlitchNumber = ({ tokens: t }) => {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`glitch-text${glitch ? ' glitch-active' : ''} relative select-none`}
      style={{
        fontFamily: "'Bebas Neue', 'Anton', sans-serif",
        fontSize: 'clamp(140px, 22vw, 260px)',
        lineHeight: 0.85,
        letterSpacing: '-0.04em',
        color: 'transparent',
        WebkitTextStroke: `2px ${t.textStroke}`,
        textShadow: `0 0 80px ${t.textShadow}`,
        transition: 'text-shadow 0.4s, -webkit-text-stroke-color 0.4s',
      }}
    >404</div>
  );
};

const Particles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 5 + (i / 18) * 90,
      delay: (i * 0.37) % 5,
      duration: 3 + (i * 0.23) % 4,
      drift: ((i % 7) - 3) * 20,
      size: 2 + (i % 3),
    })), []
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, bottom: '10%',
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: `hsl(${170 + p.id * 5}, 80%, 55%)`,
          '--drift': `${p.drift}px`,
          animation: `float-up ${p.duration}s ${p.delay}s ease-out infinite`,
          willChange: 'transform, opacity',
          opacity: 0.7,
        }} />
      ))}
    </div>
  );
};

const OrbitalRings = ({ tokens: t }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
    {[200, 300, 400].map((size, i) => (
      <div key={i} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: `1px solid ${t.ringColor}`, transition: 'border-color 0.4s' }} />
    ))}
    {[0, 0.8, 1.6].map((delay, i) => (
      <div key={`p${i}`} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: `1px solid ${t.pulseColor}`, animation: `pulse-ring 3s ${delay}s ease-out infinite`, transition: 'border-color 0.4s' }} />
    ))}
    <div className="nf-orbit-1" style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: t.orbitDot1, boxShadow: `0 0 12px ${t.orbitDot1}`, transition: 'background 0.4s, box-shadow 0.4s' }} />
    <div className="nf-orbit-2" style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: t.orbitDot2, boxShadow: `0 0 8px ${t.orbitDot2}` }} />
  </div>
);

const TerminalLine = ({ text, delay = 0, tokens: t }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const tid = setTimeout(() => {
      const iid = setInterval(() => {
        if (i <= text.length) { setDisplayed(text.slice(0, i)); i++; }
        else { setDone(true); clearInterval(iid); }
      }, 28);
      return () => clearInterval(iid);
    }, delay);
    return () => clearTimeout(tid);
  }, [text, delay]);

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: t.textTerminal, letterSpacing: '0.02em', lineHeight: 1.9, transition: 'color 0.4s' }}>
      <span style={{ color: t.textTerminalDim }}>{'> '}</span>
      {displayed}
      {!done && <span className="nf-cursor" style={{ color: t.cursor }}>█</span>}
    </div>
  );
};

// const ThemeToggle = ({ dark, tokens: t }) => (
//   <motion.button
//     onClick={() => document.documentElement.classList.toggle('dark')}
//     whileHover={{ scale: 1.1, rotate: 15 }}
//     whileTap={{ scale: 0.9 }}
//     title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
//     style={{
//       position: 'fixed', top: 20, right: 20, zIndex: 200,
//       width: 44, height: 44, borderRadius: '50%',
//       border: `1px solid ${t.accentBorder}`,
//       background: t.accentBg,
//       backdropFilter: 'blur(12px)',
//       cursor: 'pointer',
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//       fontSize: 20,
//       boxShadow: t.toggleShadow,
//       transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
//     }}
//   >
//     {dark ? '☀️' : '🌙'}
//   </motion.button>
// );

// ── Page ──────────────────────────────────────────────────────────────────────
const NotFoundPage = () => {
  const dark = useIsDark();
  const t = useTokens(dark);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        minHeight: '100vh', background: t.pageBg, color: t.textPrimary,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        transition: 'background 0.4s ease, color 0.4s ease',
      }}>
        {/* <ThemeToggle dark={dark} tokens={t} /> */}

        {/* Scanline */}
        <div className="nf-scanline" style={{ position: 'fixed', inset: 0, background: `linear-gradient(transparent 50%, ${t.scanline} 50%)`, backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 50 }} />

        {/* Bg layers */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: t.radialOverlay, transition: 'background 0.4s' }} />
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${t.glowBg1} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${t.glowBg2} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${t.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

        <Particles />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 700, textAlign: 'center' }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 100, padding: '5px 16px', marginBottom: 32, transition: 'all 0.4s' }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, boxShadow: `0 0 8px ${t.accent}`, transition: 'all 0.4s' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: t.textLabel, letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'color 0.4s' }}>
              System Error · Route Not Found
            </span>
          </motion.div>

          {/* Hero */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <OrbitalRings tokens={t} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', zIndex: 2 }}
            >
              <GlitchNumber tokens={t} />
            </motion.div>
          </div>

          {/* Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ background: t.terminalBg, border: `1px solid ${t.accentBorder}`, borderRadius: 12, padding: '16px 20px', marginBottom: 40, textAlign: 'left', backdropFilter: 'blur(12px)', boxShadow: t.cardShadow, transition: 'all 0.4s' }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <TerminalLine text="GET /requested-route HTTP/1.1" delay={400} tokens={t} />
            <TerminalLine text="STATUS: 404 — Page not found" delay={1200} tokens={t} />
            <TerminalLine text="The void consumed this route. Redirecting..." delay={2000} tokens={t} />
          </motion.div>

          {/* Heading */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 style={{ fontFamily: "'Bebas Neue', 'Anton', sans-serif", fontSize: 'clamp(28px, 5vw, 46px)', letterSpacing: '0.08em', color: t.textPrimary, margin: '0 0 12px', textTransform: 'uppercase', transition: 'color 0.4s' }}>
              Lost in the void
            </h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: t.textMuted, lineHeight: 1.8, maxWidth: 420, margin: '0 auto 40px', transition: 'color 0.4s' }}>
              This page drifted into deep space — moved,<br />deleted, or never existed in this universe.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}
          >
            <Link to="/" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 0 32px ${t.accentGlow}` }}
                whileTap={{ scale: 0.97 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, border: `1px solid ${t.accentBtnBorder}`, background: t.accentBtnBg, color: t.accent, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em', backdropFilter: 'blur(8px)', transition: 'all 0.3s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return Home
              </motion.button>
            </Link>
            <motion.button
              onClick={() => window.history.back()}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, border: `1px solid ${t.secBorder}`, background: t.secBg, color: t.secText, fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em', backdropFilter: 'blur(8px)', transition: 'all 0.3s' }}
            >
              ← Go Back
            </motion.button>
          </motion.div>

          {/* Footer links */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.85 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: t.divider, transition: 'background 0.4s' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: t.textLabelMid, letterSpacing: '0.15em', transition: 'color 0.4s' }}>KNOWN COORDINATES</span>
              <div style={{ flex: 1, height: 1, background: t.divider, transition: 'background 0.4s' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[{ label: '⟶ Login', href: '/login' }, { label: '⟶ Register', href: '/register' }].map(link => (
                <Link
                  key={link.href} to={link.href}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: t.textLabelMid, textDecoration: 'none', padding: '7px 16px', border: `1px solid ${t.divider}`, borderRadius: 8, letterSpacing: '0.05em', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = t.accent; e.currentTarget.style.borderColor = t.accentBorderHov; e.currentTarget.style.background = t.accentBg; }}
                  onMouseLeave={e => { e.currentTarget.style.color = t.textLabelMid; e.currentTarget.style.borderColor = t.divider; e.currentTarget.style.background = 'transparent'; }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
};

export default NotFoundPage;