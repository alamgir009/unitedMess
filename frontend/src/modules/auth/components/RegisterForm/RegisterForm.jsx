import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '@/modules/auth/store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';
import { toast } from 'react-hot-toast';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const { name, email, password, confirmPassword } = formData;
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

        if (!name || !email || !password || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        const userData = {
            name,
            email,
            password,
        };

        dispatch(register(userData));
    };

    return (
        <form className="space-y-6" onSubmit={onSubmit}>
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={onChange}
                    placeholder="Min 8 characters"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
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

            <div>
                <Button type="submit" isLoading={isLoading} className="w-full">
                    Create Account
                </Button>
            </div>
        </form>
    );
};

export default RegisterForm;
