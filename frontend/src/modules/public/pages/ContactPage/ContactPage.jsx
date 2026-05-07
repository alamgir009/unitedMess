import { motion, useReducedMotion } from 'framer-motion';
import { memo, useState } from 'react';
import {
    HiOutlineEnvelope,
    HiOutlineChatBubbleLeftRight,
    HiOutlineMapPin,
    HiOutlineArrowRight,
    HiOutlineSparkles,
} from 'react-icons/hi2';
import { Button, Spinner } from '@/shared/components/ui';

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

const ContactMethod = ({ Icon, title, value, href, delay }) => (
    <Reveal delay={delay}>
        <a 
            href={href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.02] group"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition-transform group-hover:scale-105">
                <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
                <p className="text-foreground font-semibold truncate">{value}</p>
            </div>
            <HiOutlineArrowRight className="w-5 h-5 text-muted-foreground ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
        </a>
    </Reveal>
);

const ContactPage = () => {
    const shouldReduceMotion = useReducedMotion();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate fintech-grade processing
        setTimeout(() => {
            setIsSubmitting(false);
            alert("Message received! Our team will reach out within 24 business hours.");
        }, 1500);
    };

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pt-28 pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-30 blur-[100px]"
                    style={{ background: 'var(--blob-2)' }} />
                <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[120px]"
                    style={{ background: 'var(--blob-1)' }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-[11px] font-bold uppercase tracking-widest text-primary mb-6"
                    >
                        <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                        Get In Touch
                    </motion.div>
                    <motion.h1
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl mb-6"
                    >
                        How can we <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>Help?</span>
                    </motion.h1>
                    <motion.p
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed"
                    >
                        Whether you're looking for support, partnership, or just want to say hi, we're here for you.
                    </motion.p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Left: Contact Form */}
                    <Reveal delay={0.1}>
                        <div className="relative rounded-3xl border border-border bg-card/40 p-8 backdrop-blur-md">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                        <input 
                                            required
                                            type="email" 
                                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Subject</label>
                                    <select className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer">
                                        <option>General Inquiry</option>
                                        <option>Technical Support</option>
                                        <option>Billing Question</option>
                                        <option>Feature Request</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Message</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all resize-none"
                                        placeholder="How can we help you today?"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    className="w-full h-12 rounded-xl font-bold tracking-tight shadow-lg shadow-primary/20"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <Spinner size="sm" color="white" />
                                            Sending Securely...
                                        </span>
                                    ) : (
                                        "Send Message"
                                    )}
                                </Button>
                            </form>
                        </div>
                    </Reveal>

                    {/* Right: Contact Info */}
                    <div className="space-y-6">
                        <ContactMethod 
                            Icon={HiOutlineEnvelope} 
                            title="Email Support" 
                            value={['unitedmess96', 'gmail.com'].join('@')} 
                            href={`mailto:${['unitedmess96', 'gmail.com'].join('@')}`}
                            delay={0.2}
                        />
                        <ContactMethod 
                            Icon={HiOutlineChatBubbleLeftRight} 
                            title="Live Chat" 
                            value="Available Mon-Fri, 9am - 6pm" 
                            href="#"
                            delay={0.3}
                        />
                        <ContactMethod 
                            Icon={HiOutlineMapPin} 
                            title="Office Location" 
                            value="Kolkata, West Bengal, India" 
                            href="#"
                            delay={0.4}
                        />

                        {/* Extra Info Card */}
                        <Reveal delay={0.5}>
                            <div className="mt-8 rounded-2xl p-6 bg-primary/5 border border-primary/20 relative overflow-hidden group">
                                <HiOutlineSparkles className="absolute -right-2 -top-2 w-16 h-16 text-primary/10 transition-transform group-hover:scale-110" />
                                <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                                    Fintech-Grade Support
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Your inquiries are handled with the same level of care and security as your financial records. Our dedicated support team is trained to resolve your issues within 24 business hours.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
