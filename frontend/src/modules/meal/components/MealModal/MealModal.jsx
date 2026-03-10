import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';

const MealModal = ({ isOpen, onClose, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop ── */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
                    />

                    {/* ── Dialog Wrapper ── */}
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.94, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 20 }}
                            transition={{ type: 'spring', duration: 0.4, bounce: 0.22 }}
                            className="w-full max-w-lg pointer-events-auto relative overflow-hidden rounded-3xl"
                            style={{
                                boxShadow:
                                    '0 0 0 1px rgba(255,255,255,0.12), 0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08)',
                            }}
                        >
                            {/* Glass shell */}
                            <div
                                className="absolute inset-0 rounded-3xl"
                                style={{
                                    background: 'var(--glass-bg, linear-gradient(135deg, rgba(15,20,40,0.88) 0%, rgba(20,28,52,0.82) 100%))',
                                    backdropFilter: 'blur(28px)',
                                    WebkitBackdropFilter: 'blur(28px)',
                                }}
                            />

                            {/* Ambient top glow */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                            {/* Gradient accent border */}
                            <div
                                className="absolute inset-0 rounded-3xl pointer-events-none"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.0) 100%)',
                                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    maskComposite: 'exclude',
                                    WebkitMaskComposite: 'destination-out',
                                    padding: '1px',
                                }}
                            />

                            {/* ── Header ── */}
                            <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                                {/* Accent bar */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-1 h-6 rounded-full flex-shrink-0"
                                        style={{ background: 'linear-gradient(180deg, hsl(210,92%,60%) 0%, hsl(268,76%,60%) 100%)' }}
                                    />
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
                                </div>

                                {/* <button
                                    onClick={onClose}
                                    className="group p-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                                    aria-label="Close"
                                >
                                    <HiOutlineXMark className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </button> */}
                                <Button type= 'danger' iconOnly onClick={onClose}>
                                    <HiOutlineXMark className="w-4 h-4 text-white group-hover:text-foreground transition-colors" />
                                </Button>
                            </div>

                            {/* ── Body ── */}
                            <div className="relative z-10 px-6 py-5 max-h-[82vh] overflow-y-auto">
                                {/* Subtle inner glow */}
                                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/6 rounded-full blur-3xl pointer-events-none -z-10" />
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MealModal;
