import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { User, Mail, Phone } from 'lucide-react';
import { Button, Input, Field } from '@/shared/components/ui';
import { updateProfile } from '@/modules/auth/store/auth.slice';
import toast from 'react-hot-toast';

export const EditForm = ({ handleClose, initialData }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.auth);

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
        <form className="w-full space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
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
            </div>

            <div className="flex gap-2.5 pt-3 shrink-0">
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleClose}
                    className="w-full sm:w-auto"
                    disabled={isLoading}
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full sm:flex-[2]"
                    isLoading={isLoading}
                >
                    Save Changes
                </Button>
            </div>
        </form>
    )
}
