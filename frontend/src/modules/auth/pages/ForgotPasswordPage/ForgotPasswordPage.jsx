import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPassword, reset as resetAuth } from '../../store/auth.slice';
import { Button, Input } from '@/shared/components/ui';
import { HiArrowLeft } from 'react-icons/hi2';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const dispatch = useDispatch();
    const { isLoading, isError, message } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        const result = await dispatch(forgotPassword(email));
        if (forgotPassword.fulfilled.match(result)) {
            setIsSubmitted(true);
        }
    };

    const handleBackToLogin = () => {
        dispatch(resetAuth());
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
            </div>

            {/* Back button */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50">
                <Link
                    to="/"
                    className="group flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 px-4 py-2 text-sm font-semibold text-foreground/80 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-slate-900/80 hover:text-foreground shadow-sm hover:shadow-md"
                >
                    <HiArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    <span className="hidden sm:inline">Back to Home</span>
                </Link>
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
                    {!isSubmitted ? (
                        <motion.div
                            key="forgot-password-form"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mt-8"
                        >
                            <div className="bg-card/50 backdrop-blur-xl border border-border/50 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
                                <div className="text-center mb-8">
                                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                        <KeyRound className="h-7 w-7 text-primary" />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                                        Forgot password?
                                    </h2>
                                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                        No worries, we'll send you reset instructions.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                            Email address
                                        </label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            size="lg"
                                            leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                                        />
                                    </div>

                                    {isError && message && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{message}</span>
                                        </div>
                                    )}

                                    <Button 
                                        type="submit" 
                                        size="lg"
                                        isLoading={isLoading} 
                                        className="w-full rounded-xl"
                                    >
                                        Reset Password
                                    </Button>

                                    <div className="text-center">
                                        <Link 
                                            to="/login" 
                                            onClick={handleBackToLogin}
                                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Back to login
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-message"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="mt-8"
                        >
                            <div className="bg-card/50 backdrop-blur-xl border border-border/50 py-8 px-4 shadow-2xl rounded-2xl text-center sm:px-10">
                                <div className="mb-6 relative">
                                    <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    </div>
                                </div>

                                <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-3">
                                    Check your email
                                </h2>
                                <p className="text-muted-foreground mb-8 leading-relaxed">
                                    We've sent a password reset link to <br />
                                    <span className="font-bold text-foreground">{email}</span>
                                </p>

                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Didn't receive the email? Check your spam folder or try another email address.
                                    </p>
                                    
                                    <Button 
                                        variant="secondary" 
                                        size="lg"
                                        onClick={() => setIsSubmitted(false)}
                                        className="w-full rounded-xl"
                                    >
                                        Try again
                                    </Button>

                                    <Link to="/login" onClick={handleBackToLogin} className="block mt-4">
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                                            <ArrowLeft className="h-4 w-4" />
                                            Back to login
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
