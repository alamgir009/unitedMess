import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { resetPassword, reset as resetAuth } from '../../store/auth.slice';
import { Button, Input } from '@/shared/components/ui';
import { HiArrowLeft } from 'react-icons/hi2';

const ResetPasswordPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return;
        }
        dispatch(resetPassword({ token, password }));
    };

    useEffect(() => {
        if (isSuccess && !isLoading && !isError) {
            const timer = setTimeout(() => {
                dispatch(resetAuth());
                navigate('/login');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, isLoading, isError, dispatch, navigate]);

    useEffect(() => {
        return () => {
            dispatch(resetAuth());
        };
    }, [dispatch]);

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
                    <motion.div
                        key={isSuccess ? 'success' : 'form'}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-8"
                    >
                        <div className="bg-card/50 backdrop-blur-xl border border-border/50 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
                            {isSuccess ? (
                                <div className="text-center py-6">
                                    <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
                                        Password reset successful!
                                    </h2>
                                    <p className="text-muted-foreground mb-8">
                                        Your password has been updated. Redirecting you to the login page...
                                    </p>
                                    <Link to="/login" onClick={() => dispatch(resetAuth())}>
                                        <Button size="lg" className="w-full rounded-xl">
                                            Login Now
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-8">
                                        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                            <ShieldCheck className="h-7 w-7 text-primary" />
                                        </div>
                                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                                            Reset password
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                            Choose a new, strong password for your account.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Min 10 characters"
                                                    size="lg"
                                                    leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                                                Confirm New Password
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm your password"
                                                    size="lg"
                                                    leftIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                                </button>
                                            </div>
                                            {password !== confirmPassword && confirmPassword.length > 0 && (
                                                <p className="mt-1 text-xs text-red-500">Passwords don't match</p>
                                            )}
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
                                            disabled={password !== confirmPassword || password.length < 10}
                                            className="w-full rounded-xl"
                                        >
                                            Reset Password
                                        </Button>

                                        <div className="text-center">
                                            <Link 
                                                to="/login" 
                                                onClick={() => dispatch(resetAuth())}
                                                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Back to login
                                            </Link>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
