import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { User, Mail, Phone } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { updateProfile } from '@/modules/auth/store/auth.slice';
import toast from 'react-hot-toast';

/* ── Field wrapper ── */
const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`space-y-1.5 sm:space-y-2 ${className}`}>
        <label className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {Icon && <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            {label}
        </label>
        {children}
    </div>
);

const inputBase =
    'w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-md focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all duration-200 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 shadow-inner';

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
        <Field label="Full Name" icon={User}>
          <input
            name="name"
            type="text"
            className={inputBase}
            placeholder="Enter your full name"
            onChange={handleChange}
            value={name}
            required
          />
        </Field>

        <Field label="Email Address" icon={Mail}>
          <input
            name="email"
            type="email"
            className={inputBase}
            placeholder="Enter your Email"
            onChange={handleChange}
            value={email}
            required
          />
        </Field>

        <Field label="Phone Number" icon={Phone}>
          <input
            name="phone"
            type="text"
            className={inputBase}
            placeholder="Enter your phone number"
            onChange={handleChange}
            value={phone}
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-white/10 dark:border-white/5">
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
          variant="success"
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
