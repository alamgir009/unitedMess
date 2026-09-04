import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FiCalendar, FiAlertTriangle } from 'react-icons/fi';
import { fetchUsers } from '../../../members/store/members.slice';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client/apiClient';
import { cn } from '@/core/utils/helpers/string.helper';
import { format } from 'date-fns';
import { Modal, Button } from '@/shared/components/ui';

const isPreviousMonthBillingWindow = () => {
  const day = new Date().getUTCDate();
  return day <= 10;
};

const getBillingInfo = () => {
  const now = new Date();
  const day = now.getUTCDate();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  if (day <= 10) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return {
      isExemptWindow: true,
      message: `Member will be EXEMPT from ${monthNames[prevMonth - 1]} ${prevYear} billing (activated after billing period started)`,
      detail: 'This member will NOT be charged for the previous month.'
    };
  }

  return {
    isExemptWindow: false,
    message: 'Member will be billed for the current month starting from today.',
    detail: null
  };
};

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

const getAvatarColor = (name = '') => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || AVATAR_COLORS[0];
};

const inputClasses = 'w-full h-11 rounded-xl surface-elevated border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground caret-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:ring-2 focus:ring-ring/30 focus:border-ring';

const InfoBadge = ({ label, value, color = 'gray' }) => {
  const colorMap = {
    green: 'bg-success-bg text-success-text border-success-border',
    red: 'bg-danger-bg text-danger-text border-danger-border',
    blue: 'bg-primary/10 text-primary border-primary/20',
    amber: 'bg-warning-bg text-warning-text border-warning-border',
    gray: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
          colorMap[color]
        )}
      >
        {value}
      </span>
    </div>
  );
};

const UserEditModal = ({ isOpen, onClose, user }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    userStatus: 'pending',
    isActive: true,
    denialReason: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        userStatus: user.userStatus || 'pending',
        isActive: user.isActive ?? true,
        denialReason: '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBooleanChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value === 'true' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const statusChanged = formData.userStatus !== user.userStatus;

      if (statusChanged) {
        try {
          if (formData.userStatus === 'approved') {
            await apiClient.post(`users/${user._id}/approve`);
          } else if (formData.userStatus === 'denied') {
            await apiClient.post(`users/${user._id}/deny`, {
              reason: formData.denialReason || 'Admin Action',
            });
          }
        } catch (statusError) {
          const msg = statusError?.response?.data?.message || '';
          if (!msg.toLowerCase().includes('already approved') && !msg.toLowerCase().includes('already denied')) {
            throw statusError;
          }
        }
      }

      await apiClient.patch(`users/${user._id}`, formData);

      toast.success('User updated successfully');
      dispatch(fetchUsers({ page: 1, limit: 100 }));
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const avatarColor = getAvatarColor(user.name);
  const joinedDate = user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A';
  const mealPaidColor = user.payment === 'success' ? 'green' : 'red';
  const gasPaidColor  = user.gasBill === 'success'  ? 'green' : 'red';
  const statusColor =
    user.userStatus === 'approved' ? 'green' : user.userStatus === 'pending' ? 'amber' : 'red';

  const footer = (
    <div className="flex gap-2.5 w-full">
      <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" className="flex-[2]" type="submit" disabled={isLoading} isLoading={isLoading}>
        Save Changes
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Member"
      accentColor="blue"
      size="xl"
      mobileSheet
      isLoading={isLoading}
      footer={footer}
    >
      <div className="flex flex-col md:flex-row">
        <div className="border-b border-border p-4 md:w-64 md:border-b-0 md:border-r md:border-border md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr text-lg font-bold text-white shadow-md',
                avatarColor
              )}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {user._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Account Info
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1 md:gap-3">
            <InfoBadge label="Approval Status" value={user.userStatus || 'pending'} color={statusColor} />
            <InfoBadge
              label="Active State"
              value={user.isActive ? 'Active' : 'Inactive'}
              color={user.isActive ? 'green' : 'gray'}
            />
            <InfoBadge
              label="Meal Bill"
              value={user.payment === 'success' ? '✓ Paid' : '✕ Unpaid'}
              color={mealPaidColor}
            />
            <InfoBadge
              label="Gas Bill"
              value={user.gasBill === 'success' ? '✓ Paid' : '✕ Unpaid'}
              color={gasPaidColor}
            />
          </div>

          <div className="mt-4 border-t border-border pt-3 md:mt-5 md:pt-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Member Since
            </p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground sm:text-sm">
              <FiCalendar size={12} className="text-muted-foreground" />
              {joinedDate}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:mb-4">
            Edit Details
          </p>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="user" className="bg-card text-foreground">Regular User</option>
                <option value="admin" className="bg-card text-foreground">Administrator</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Approval Status</label>
                <select
                  name="userStatus"
                  value={formData.userStatus}
                  onChange={handleChange}
                  className={inputClasses}
                >
                  <option value="approved" className="bg-card text-foreground">Approved</option>
                  <option value="pending" className="bg-card text-foreground">Pending</option>
                  <option value="denied" className="bg-card text-foreground">Denied</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active State</label>
                <select
                  name="isActive"
                  value={formData.isActive.toString()}
                  onChange={handleBooleanChange}
                  className={inputClasses}
                >
                  <option value="true" className="bg-card text-foreground">Active</option>
                  <option value="false" className="bg-card text-foreground">Inactive</option>
                </select>
              </div>
            </div>

            {formData.isActive && !user.isActive && isPreviousMonthBillingWindow() && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-warning-bg border border-warning-border">
                <FiAlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-warning">
                    Billing Exemption Notice
                  </p>
                  <p className="text-[11px] text-warning mt-0.5">
                    {getBillingInfo().message}
                  </p>
                  <p className="text-[10px] text-warning/70 mt-0.5">
                    {getBillingInfo().detail}
                  </p>
                </div>
              </div>
            )}

            {formData.userStatus === 'denied' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-destructive">
                  Denial Reason (Required for Email)
                </label>
                <input
                  name="denialReason"
                  value={formData.denialReason}
                  onChange={handleChange}
                  placeholder="Brief reason for account denial..."
                  className={`${inputClasses} border-destructive/30 bg-destructive/5 placeholder:text-destructive/40 focus:border-destructive/50 focus:ring-destructive/20`}
                  required
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserEditModal;
