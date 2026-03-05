import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Minimalist 404 icon with a red accent dot
const Premium404Icon = () => (
    <svg viewBox="0 0 200 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
            <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* "404" text – thin, elegant, with gradient */}
        <text
            x="100"
            y="55"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="80"
            fontWeight="300"
            fill="url(#textGrad)"
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        >
            404
        </text>
        {/* Red accent dot – pulses gently */}
        <circle cx="100" cy="25" r="5" fill="#ef4444" filter="url(#glow)">
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        </circle>
    </svg>
);

const NotFoundPage = () => {
    return (
        <div
            className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4"
            style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
        >
            {/* Animated blobs background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
                <div
                    className="absolute top-[5%] left-[10%] w-[450px] h-[450px] rounded-full animate-blob opacity-70"
                    style={{ background: 'var(--blob-1)', filter: 'blur(90px)', willChange: 'transform' }}
                />
                <div
                    className="absolute bottom-[15%] right-[5%] w-[550px] h-[550px] rounded-full animate-blob animation-delay-2000 opacity-60"
                    style={{ background: 'var(--blob-2)', filter: 'blur(110px)', willChange: 'transform' }}
                />
                <div
                    className="absolute top-[40%] left-[35%] w-[600px] h-[600px] rounded-full animate-blob animation-delay-4000 opacity-40"
                    style={{ background: 'var(--blob-3)', filter: 'blur(130px)', willChange: 'transform' }}
                />
                {/* Dot grid overlay */}
                <div
                    className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />
            </div>

            {/* Main glass panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative z-10 w-full max-w-xl"
            >
                <div
                    className="relative rounded-3xl p-10 md:p-14 flex flex-col items-center text-center overflow-hidden"
                    style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-2xl)',
                    }}
                >
                    {/* Inner glass shine */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1/3 rounded-t-3xl pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)' }}
                        aria-hidden="true"
                    />

                    {/* Premium 404 Icon */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative w-36 h-36 mb-6"
                        aria-hidden="true"
                    >
                        <div
                            className="w-full h-full rounded-2xl flex items-center justify-center"
                            style={{ color: 'hsl(var(--primary))' }}
                        >
                            <Premium404Icon />
                        </div>
                        {/* Glow behind icon */}
                        <div
                            className="absolute inset-0 rounded-2xl blur-2xl opacity-30"
                            style={{ background: 'var(--gradient-primary)' }}
                            aria-hidden="true"
                        />
                    </motion.div>

                    {/* 404 Text */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        <p
                            className="text-xs font-bold uppercase tracking-[0.3em] mb-3 opacity-60"
                            style={{ color: '#ef4444' }}
                        >
                            Error 404
                        </p>
                        <h1
                            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none mb-4 text-transparent bg-clip-text"
                            style={{ backgroundImage: 'var(--gradient-text)' }}
                        >
                            404
                        </h1>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                            Looks like you&apos;ve wandered into
                            <br />uncharted territory.
                        </h2>
                        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed font-light">
                            The page you&apos;re looking for could not be found – it may have been moved, deleted, or never existed.
                        </p>
                    </motion.div>

                    {/* Navigation Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                        className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto"
                    >
                        <Link to="/" className="flex-1 sm:flex-none">
                            <motion.button
                                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(239,68,68,0.3)' }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </motion.button>
                        </Link>
                        <motion.button
                            onClick={() => window.history.back()}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-foreground border border-border bg-muted/50 backdrop-blur-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Go Back
                        </motion.button>
                    </motion.div>

                    {/* Helpful Links */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="mt-8 pt-6 border-t w-full"
                        style={{ borderColor: 'var(--divider)' }}
                    >
                        <p className="text-xs text-muted-foreground mb-3">Maybe you were looking for…</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { label: 'Login', href: '/login' },
                                { label: 'Register', href: '/register' },
                            ].map((link) => (
                                <Link
                                    key={link.href}
                                    to={link.href}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default NotFoundPage;