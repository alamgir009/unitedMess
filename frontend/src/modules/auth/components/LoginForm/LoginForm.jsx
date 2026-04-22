import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { login } from '@/modules/auth/store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const { email, password } = formData;
    const dispatch = useDispatch();
    const { isLoading, isError, message } = useSelector((state) => state.auth);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        dispatch(login({ email, password }));
    };

    return (
        <form className="space-y-6" onSubmit={onSubmit}>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                    Email address
                </label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={onChange}
                    placeholder="you@example.com"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                    Password
                </label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={onChange}
                    placeholder="••••••••"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-primary focus:ring-primary border-border rounded accent-primary"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                        Remember me
                    </label>
                </div>

                <div className="text-sm">
                    <Link to="/forgot-password" title="Forgot password" id="forgot-password-link" className="font-medium text-primary hover:opacity-80 transition-opacity">
                        Forgot your password?
                    </Link>
                </div>
            </div>

            {/* Inline backend error message */}
            {isError && message && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{message}</span>
                </div>
            )}

            <div>
                <Button type="submit" isLoading={isLoading} className="w-full">
                    Sign in
                </Button>
            </div>
        </form>
    );
};

export default LoginForm;

