import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../../components/LoginForm/LoginForm';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {

  // Where to redirect after login is now handled by GuestRoute.

  return (
  <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    
    {/* Background Decorations (same as register) */}
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[60px] rounded-full" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[60px] rounded-full" />
    </div>

    {/* Back button */}
    <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50">
      <Link
        to="/"
        className="group flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 px-4 py-2 text-sm font-semibold text-foreground/80 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-slate-900/80 hover:text-foreground shadow-sm hover:shadow-md"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Back to Home</span>
      </Link>
    </div>

    <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      
      {/* Logo */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img 
            src="/assets/icons/unitedmess-icon-1024.png" 
            alt="UnitedMess Logo" 
            className="h-16 w-auto border-2 border-primary/20 shadow-lg rounded-2xl bg-card" 
          />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="login-form"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 20, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to United Mess
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border/60 py-8 px-4 shadow-lg rounded-2xl sm:px-10">
            
            <LoginForm />

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don’t have an account?{' '}
                <Link 
                  to="/register"
                  className="font-semibold text-primary hover:underline underline-offset-4"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
);
};

export default LoginPage;