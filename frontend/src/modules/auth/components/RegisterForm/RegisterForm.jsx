import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '@/modules/auth/store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';
import { toast } from 'react-hot-toast';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const { name, email, phone, password, confirmPassword } = formData;
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

        if (!name || !email || !phone || !password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        dispatch(register({ name, email, phone, password }));
    };

    return (
        <form className="space-y-6" onSubmit={onSubmit}>
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                    Full Name
                </label>
                <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={onChange}
                    placeholder="John Doe"
                />
            </div>

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
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                    Phone number
                </label>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={onChange}
                    placeholder="+91-9874563210"
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={onChange}
                    placeholder="Min 8 characters"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                    Confirm Password
                </label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={onChange}
                    placeholder="Confirm password"
                />
            </div>

            {/* Inline backend error message */}
            {isError && message && (
                <div
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                    role="alert"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mt-0.5 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>{message}</span>
                </div>
            )}

            <div>
                <Button type="submit" isLoading={isLoading} className="w-full">
                    Create Account
                </Button>
            </div>
        </form>
    );
};

export default RegisterForm;
