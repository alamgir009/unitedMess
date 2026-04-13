import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { reset } from '../../store/auth.slice';
import LoginForm from '../../components/LoginForm/LoginForm';

const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isSuccess } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isSuccess || user) {
            navigate('/dashboard');
        }
        dispatch(reset());
    }, [user, isSuccess, navigate, dispatch]);

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <img src="/assets/icons/unitedmess-icon-1024.png" alt="UnitedMess Logo" className="h-20 w-auto border-2 border-foreground/50 shadow-lg shadow-foreground/10 rounded-lg" />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Or{' '}
                    <Link to="/register" className="font-medium text-primary hover:opacity-80 transition-opacity">
                        create a new account
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-card border border-border py-8 px-4 shadow-md rounded-xl sm:px-10">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
