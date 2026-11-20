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

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                email: initialData.email || "",
                phone: initialData.phone || ""
            });
        }
    }, [initialData]);

    const { name, email, phone } = formData;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error('Name and Email are required.');
            return;
        }

        const resultAction = await dispatch(updateProfile({ name, email, phone }));
        if (updateProfile.fulfilled.match(resultAction)) {
            handleClose();
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev, [name]: value
        }));
    }

    return (
        <form id={id} className="grid w-full gap-4 sm:gap-5" onSubmit={handleSubmit}>
            <Field label="Full Name">
                <Input
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    onChange={handleChange}
                    value={name}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                />
            </Field>

            <Field label="Email Address">
                <Input
                    name="email"
                    type="email"
                    placeholder="Enter your Email"
                    onChange={handleChange}
                    value={email}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                />
            </Field>

            <Field label="Phone Number">
                <Input
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    onChange={handleChange}
                    value={phone}
                    leftIcon={<Phone className="w-4 h-4" />}
                />
            </Field>
        </form>
    )
}
