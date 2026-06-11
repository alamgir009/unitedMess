import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import {
    HiOutlineShieldCheck,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineSparkles,
} from 'react-icons/hi2';

const Reveal = memo(({ children, delay = 0 }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
});
Reveal.displayName = 'Reveal';

const Section = ({ title, Icon, children, delay }) => (
    <Reveal delay={delay}>
        <div className="relative group rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.02] sm:p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
                {children}
            </div>
        </div>
    </Reveal>
);

const PrivacyPage = () => {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pt-28 pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-30 blur-[100px]"
                    style={{ background: 'var(--blob-1)' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[120px]"
                    style={{ background: 'var(--blob-2)' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-[11px] font-bold uppercase tracking-widest text-primary mb-6"
                    >
                        <HiOutlineShieldCheck className="w-4 h-4" />
                        Trust & Security
                    </motion.div>
                    <motion.h1
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl mb-6"
                    >
                        Privacy <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>Policy</span>
                    </motion.h1>
                    <motion.p
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed"
                    >
                        Your privacy is our priority. Learn how UnitedMess handles your information with fintech-grade security and transparency.
                    </motion.p>
                </div>

                {/* Content Sections */}
                <div className="grid gap-6">
                    <Section title="Data Collection" Icon={HiOutlineEye} delay={0.1}>
                        <p>We collect minimal data necessary to provide our services, including your name, email, and mess management records. We never sell your personal information to third parties.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Account information (Name, Email, Phone)</li>
                            <li>Mess activity logs (Meals, Markets, Expenses)</li>
                            <li>Device information for security monitoring</li>
                        </ul>
                    </Section>

                    <Section title="How We Use Data" Icon={HiOutlineDocumentText} delay={0.2}>
                        <p>Your data is used exclusively to facilitate mess management and financial tracking within your community. This includes:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Calculating accurate meal shares and expenses</li>
                            <li>Processing secure payments via integrated gateways</li>
                            <li>Sending critical notifications about your mess status</li>
                        </ul>
                    </Section>

                    <Section title="Fintech-Grade Security" Icon={HiOutlineLockClosed} delay={0.3}>
                        <p>We employ industry-standard encryption and security protocols to protect your sensitive financial and personal information.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>End-to-end encryption for sensitive data</li>
                            <li>Regular security audits and vulnerability testing</li>
                            <li>Secure authentication with JWT and refresh tokens</li>
                        </ul>
                    </Section>

                    <Section title="Transparency" Icon={HiOutlineSparkles} delay={0.4}>
                        <p>We believe in full transparency. You can request a copy of your data or ask for account deletion at any time through your profile settings.</p>
                        <p>Our Privacy Policy is updated regularly to reflect our commitment to your security and changing regulations.</p>
                    </Section>
                </div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-16 text-center text-sm text-muted-foreground"
                >
                    Last updated: May 6, 2026. For questions, contact us at <span className="text-primary font-semibold">{['unitedmess96', 'gmail.com'].join('@')}</span>
                </motion.p>
            </div>
        </div>
    );
};

export default PrivacyPage;
