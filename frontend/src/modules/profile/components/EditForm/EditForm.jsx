import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { User, Mail, Phone } from 'lucide-react';
import { Input, Field } from '@/shared/components/ui';
import { updateProfile } from '@/modules/auth/store/auth.slice';
import toast from 'react-hot-toast';

export const EditForm = ({ id, handleClose, initialData }) => {
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: ""
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                email: initialData.email || "",
                phone: initialData.phone || ""
            });
            setErrors({});
        }
    }, [initialData]);

    const { name, email, phone } = formData;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!name.trim()) nextErrors.name = 'Full name is required.';
        if (!email.trim()) nextErrors.email = 'Email address is required.';
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            toast.error('Name and Email are required.');
            return;
        }

        const resultAction = await dispatch(updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() }));
        if (updateProfile.fulfilled.match(resultAction)) {
            handleClose();
        } else if (resultAction.payload) {
            setErrors((prev) => ({ ...prev, api: resultAction.payload }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev, [name]: value
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined, api: undefined }));
        }
    };

    return (
        <form id={id} className="grid w-full gap-4 sm:gap-5" onSubmit={handleSubmit} noValidate>
            {errors.api && (
                <div role="alert" className="p-3 text-xs rounded-[var(--radius-md)] bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)]">
                    {errors.api}
                </div>
            )}
            <Field label="Full Name" error={errors.name}>
                <Input
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    onChange={handleChange}
                    value={name}
                    leftIcon={<User className="w-4 h-4" />}
                    error={errors.name}
                    required
                />
            </Field>

            <Field label="Email Address" error={errors.email}>
                <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your Email"
                    onChange={handleChange}
                    value={email}
                    leftIcon={<Mail className="w-4 h-4" />}
                    error={errors.email}
                    required
                />
            </Field>

            <Field label="Phone Number">
                <Input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number"
                    onChange={handleChange}
                    value={phone}
                    leftIcon={<Phone className="w-4 h-4" />}
                />
            </Field>
        </form>
    );
};
