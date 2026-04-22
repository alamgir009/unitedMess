import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { reset } from '../../store/auth.slice';
import LoginForm from '../../components/LoginForm/LoginForm';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isSuccess } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only redirect to dashboard if user exists and is approved
    if (user && user.userStatus === 'approved') {
      navigate('/dashboard');
      dispatch(reset());
    } else if (user && user.userStatus === 'pending') {
      // If user is logged in but pending, we might want to redirect to a pending page
      // or just let them see an error message. For now, let's keep them here
      // and show the status if handled by the form.
    }
  }, [user, navigate, dispatch]);

  return (
  <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    
    {/* Background Decorations (same as register) */}
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
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
            className="h-20 w-auto border-2 border-primary/20 shadow-xl rounded-2xl bg-card" 
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
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
            
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