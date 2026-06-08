import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle } from 'lucide-react';
import { login } from '@/modules/auth/store/auth.slice';
import { Button, Input } from '@/shared/components/ui';
import PasswordInput from '@/shared/components/ui/PasswordInput/PasswordInput';
import { toast } from 'react-hot-toast';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const { email, password, rememberMe } = formData;
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

        dispatch(login({ email, password, rememberMe }));
    };

    return (
        <form className="space-y-6" onSubmit={onSubmit}>
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
                    onChange={onChange}
                    placeholder="you@example.com"
                    size="lg"
                    leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                </label>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={onChange}
                    placeholder="Enter your password"
                    size="lg"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={onChange}
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
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            <div>
                <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
                    Sign in
                </Button>
            </div>
        </form>
    );
};

export default LoginForm;

