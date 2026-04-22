import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { reset, resendVerification, clearRegisteredEmail } from '../../store/auth.slice';
import RegisterForm from '../../components/RegisterForm/RegisterForm';
import Button from '@/shared/ui/Button/Button';

const RegisterPage = () => {
    const dispatch = useDispatch();
    const { isSuccess, registeredEmail, isLoading } = useSelector((state) => state.auth);
    
    // Countdown state for resend button (60 seconds)
    const [countdown, setCountdown] = useState(0);

    // Initialize countdown if it's already running in session storage (to persist across reloads)
    useEffect(() => {
        const savedTime = sessionStorage.getItem('resendCooldown');
        if (savedTime) {
            const remaining = Math.max(0, Math.ceil((parseInt(savedTime) - Date.now()) / 1000));
            if (remaining > 0) setCountdown(remaining);
        }
    }, []);

    // Countdown logic
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    const next = prev - 1;
                    if (next <= 0) {
                        sessionStorage.removeItem('resendCooldown');
                        return 0;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    // Handle resend verification
    const handleResend = async () => {
        if (countdown > 0 || !registeredEmail) return;
        
        await dispatch(resendVerification(registeredEmail));
        
        // Start 60s cooldown
        const cooldownTime = 60;
        setCountdown(cooldownTime);
        sessionStorage.setItem('resendCooldown', (Date.now() + cooldownTime * 1000).toString());
    };

    // Clean up success state when leaving the page or clicking "Login"
    const handleBackToLogin = () => {
        dispatch(clearRegisteredEmail());
        dispatch(reset());
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <img 
                            src="/assets/icons/unitedmess-icon-1024.png" 
                            alt="UnitedMess Logo" 
                            className="h-20 w-auto border-2 border-primary/20 shadow-xl rounded-2xl bg-card" 
                        />
                    </motion.div>
                </div>

                <AnimatePresence mode="wait">
                    {!isSuccess || !registeredEmail ? (
                        <motion.div
                            key="register-form"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mt-8"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                                    Create account
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Join United Mess for seamless dining management
                                </p>
                            </div>

                            <div className="bg-card/50 backdrop-blur-xl border border-border/50 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
                                <RegisterForm />
                                
                                <div className="mt-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Already have an account?{' '}
                                        <Link 
                                            to="/login" 
                                            onClick={handleBackToLogin}
                                            className="font-semibold text-primary hover:underline underline-offset-4"
                                        >
                                            Sign in
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-landing"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
                        >
                            <div className="bg-card border-2 border-primary/10 py-10 px-6 shadow-2xl rounded-3xl text-center overflow-hidden relative group">
                                {/* Success Gradient Overlay */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                                
                                <div className="mb-6 relative">
                                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                                        <Mail className="h-10 w-10 text-primary" />
                                    </div>
                                    {/* <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3, type: "spring" }}
                                        className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-lg"
                                    >
                                        <CheckCircle2 className="h-8 w-8 text-green-500 fill-green-500/10" />
                                    </motion.div> */}
                                </div>

                                <h2 className="text-2xl font-bold text-foreground mb-3">
                                    Check your inbox!
                                </h2>
                                
                                <p className="text-muted-foreground mb-6 leading-relaxed">
                                    We've sent a verification link to <br />
                                    <span className="font-bold text-foreground bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 mt-1 inline-block">
                                        {registeredEmail}
                                    </span>
                                </p>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-start gap-3 text-left bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <div className="mt-1">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">1</div>
                                        </div>
                                        <p className="text-sm text-foreground/80 lowercase">
                                            Verify your email address via the link.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3 text-left bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <div className="mt-1">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">2</div>
                                        </div>
                                        <p className="text-sm text-foreground/80 lowercase">
                                            Wait for admin to review & approve your account.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Link to="/login" onClick={handleBackToLogin} className="block">
                                        <Button className="w-full h-12 rounded-xl text-lg font-semibold group flex items-center justify-center gap-2">
                                            Continue to Login
                                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>

                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Didn't receive the email?
                                        </p>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleResend}
                                            disabled={countdown > 0 || isLoading}
                                            className="w-full rounded-lg h-11 flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            {countdown > 0 ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 animate-spin opacity-50" />
                                                    Resend in {countdown}s
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4" />
                                                    Resend verification
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Check spam folder if email is missing</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default RegisterPage;