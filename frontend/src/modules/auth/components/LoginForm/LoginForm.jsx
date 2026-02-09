import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '@/modules/auth/store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';
import { toast } from 'react-hot-toast';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const { email, password } = formData;
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.auth);

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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                    placeholder="********"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                        Remember me
                    </label>
                </div>

                <div className="text-sm">
                    <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                        Forgot your password?
                    </a>
                </div>
            </div>

            <div>
                <Button type="submit" isLoading={isLoading} className="w-full">
                    Sign in
                </Button>
            </div>
        </form>
    );
};

export default LoginForm;
