import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import {
    HiOutlineScale,
    HiOutlineClipboardDocumentCheck,
    HiOutlineExclamationTriangle,
    HiOutlineCheckBadge,
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

const Section = ({ title, Icon, children, delay = 0 }) => (
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

const TermsPage = () => {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pt-28 pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div
                    className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-30 blur-[100px]"
                    style={{ background: 'var(--blob-1)' }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[120px]"
                    style={{ background: 'var(--blob-3)' }}
                />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-[11px] font-bold uppercase tracking-widest text-primary mb-6"
                    >
                        <HiOutlineScale className="w-4 h-4" />
                        Legal Framework
                    </motion.div>

                    <motion.h1
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl mb-6"
                    >
                        Terms of{' '}
                        <span
                            className="text-transparent bg-clip-text"
                            style={{ backgroundImage: 'var(--gradient-text)' }}
                        >
                            Service
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed"
                    >
                        By using UnitedMess, you agree to these terms. We strive to provide a fair and transparent agreement for our community.
                    </motion.p>
                </div>

                {/* Content Sections */}
                <div className="grid gap-6">
                    <Section title="Acceptance of Terms" Icon={HiOutlineClipboardDocumentCheck} delay={0.1}>
                        <p>
                            By accessing or using the UnitedMess platform, you agree to be bound by these Terms of Service.
                            If you do not agree to all terms, you may not use our services.
                        </p>
                        <p>
                            UnitedMess provides a platform for shared living communities to manage meals, expenses, and
                            payments. Users are responsible for the accuracy of the data they input.
                        </p>
                    </Section>

                    <Section title="User Responsibilities" Icon={HiOutlineCheckBadge} delay={0.2}>
                        <p>As a member of a mess on our platform, you are responsible for:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Maintaining the security of your account credentials</li>
                            <li>Entering accurate and honest meal and market records</li>
                            <li>Settling financial obligations within your community in a timely manner</li>
                        </ul>
                    </Section>

                    <Section title="Platform Limitations" Icon={HiOutlineExclamationTriangle} delay={0.3}>
                        <p>
                            UnitedMess is a management tool. While we provide calculated insights, we are not responsible
                            for disputes between mess members or administrative decisions made by mess managers.
                        </p>
                        <p>
                            We reserve the right to suspend or terminate accounts that violate our community guidelines
                            or engage in fraudulent activity.
                        </p>
                    </Section>

                    <Section title="Intellectual Property" Icon={HiOutlineSparkles} delay={0.4}>
                        <p>
                            All content, designs, and code within the UnitedMess platform are the intellectual property
                            of UnitedMess. Users may not replicate or redistribute our technology without explicit permission.
                        </p>
                        <p>
                            We welcome feedback and suggestions, but please note that we may implement them without
                            compensation or obligation to the provider.
                        </p>
                    </Section>
                </div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-16 text-center text-sm text-muted-foreground"
                >
                    Last updated: May 6, 2026. For legal inquiries, please email{' '}
                    <span className="text-primary font-semibold">{['unitedmess96', 'gmail.com'].join('@')}</span>
                </motion.p>
            </div>
        </div>
    );
};

export default TermsPage;