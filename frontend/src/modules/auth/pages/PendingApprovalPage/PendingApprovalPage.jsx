import { motion } from 'framer-motion';
import { Clock, ShieldAlert, LogOut, RefreshCcw } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/auth.slice';
import Button from '@/shared/ui/Button/Button';

const PendingApprovalPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/login');
    };

    const handleRefresh = () => {
        window.location.reload();
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

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-card/50 backdrop-blur-xl border border-border/50 py-10 px-6 shadow-2xl rounded-3xl text-center sm:px-10"
                >
                    <div className="mb-6 relative">
                        <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                            <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-3">
                        Approval Pending
                    </h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        Thank you for verifying your email! Your account is currently under review by our administrators. 
                        <br /><br />
                        You will be able to access the dashboard once your application is approved. This typically takes 24-48 hours.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={handleRefresh}
                            className="w-full rounded-xl h-12 flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Check Status Again
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            onClick={handleLogout}
                            className="w-full rounded-xl h-12 flex items-center justify-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </Button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-border/50">
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>United Mess Security Team</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
