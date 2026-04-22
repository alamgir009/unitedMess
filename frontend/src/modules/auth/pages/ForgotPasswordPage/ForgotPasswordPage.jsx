import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { forgotPassword, reset as resetAuth } from '../../store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';

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

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <img 
                            src="/assets/icons/unitedmess-icon-1024.png" 
                            alt="UnitedMess Logo" 
                            className="h-16 w-auto border-2 border-primary/20 shadow-xl rounded-2xl bg-card mb-4" 
                        />
                    </motion.div>
                </div>

                <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                        <motion.div
                            key="forgot-password-form"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="bg-card/50 backdrop-blur-xl border border-border/50 py-10 px-6 shadow-2xl rounded-3xl sm:px-10"
                        >
                            <div className="text-center mb-8">
                                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                    <KeyRound className="h-7 w-7 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">
                                    Forgot password?
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                    No worries, we'll send you reset instructions.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="pl-10 h-12"
                                        />
                                    </div>
                                </div>

                                {isError && message && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{message}</span>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    isLoading={isLoading} 
                                    className="w-full h-12 rounded-xl text-lg font-semibold"
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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-message"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-card/50 backdrop-blur-xl border border-border/50 py-10 px-6 shadow-2xl rounded-3xl text-center sm:px-10"
                        >
                            <div className="mb-6 relative">
                                <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-foreground mb-3">
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
                                    onClick={() => setIsSubmitted(false)}
                                    className="w-full rounded-xl h-12"
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
