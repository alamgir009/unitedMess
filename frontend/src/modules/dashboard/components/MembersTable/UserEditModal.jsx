import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FiX, FiSave, FiUser, FiMail, FiPhone, FiShield, FiCalendar } from 'react-icons/fi';
import { fetchUsers } from '../../../members/store/members.slice';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client/apiClient';
import { cn } from '@/core/utils/helpers/string.helper';
import { format } from 'date-fns';

// Avatar colour palette
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

// Reusable badge – now more compact
const InfoBadge = ({ label, value, color = 'gray' }) => {
  const colorMap = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10',
    gray: 'bg-muted text-muted-foreground border-border/50',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold sm:px-3 sm:py-1.5',
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

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Dedicated handler for boolean selects (isActive) so the value stays a real boolean,
  // not the string "true" / "false" that a <select> naturally produces.
  const handleBooleanChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value === 'true' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const statusChanged = formData.userStatus !== user.userStatus;

      // 1. Trigger Approval or Denial FIRST so the backend sets defaults safely without throwing idempotency errors.
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
          // Swallow idempotent errors in case the database is out of sync with the UI state
          const msg = statusError?.response?.data?.message || '';
          if (!msg.toLowerCase().includes('already approved') && !msg.toLowerCase().includes('already denied')) {
            throw statusError;
          }
        }
      }

      // 2. Always patch LAST to enforce all other fields (name, email, role, phone, and isActive manual overrides).
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

  const avatarColor = getAvatarColor(user.name);
  const joinedDate = user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A';
  // Backend stores payment/gasBill as 'success' | 'pending' | 'failed'
  const mealPaidColor = user.payment === 'success' ? 'green' : 'red';
  const gasPaidColor  = user.gasBill === 'success'  ? 'green' : 'red';
  const statusColor =
    user.userStatus === 'approved' ? 'green' : user.userStatus === 'pending' ? 'amber' : 'red';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop with soft tint */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal container – fully responsive */}
      <div
        className={cn(
          'relative w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-border/50 shadow-2xl',
          'bg-card text-card-foreground',
          'max-h-[95vh] overflow-y-auto sm:max-h-[90vh]',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header – compact on mobile */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr text-base font-bold text-white shadow-md sm:h-10 sm:w-10 sm:text-lg',
                avatarColor
              )}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground sm:text-lg">Edit Member</h3>
              <p className="font-mono text-xs text-muted-foreground">
                {user._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:p-2"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Two‑column layout on desktop, stacks on mobile */}
        <div className="flex flex-col md:flex-row">
          {/* Left panel – read‑only info */}
          <div className="border-b border-border/50 p-4 md:w-64 md:border-b-0 md:border-r md:border-border/50 md:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Info
            </p>
            {/* Badges in a 2‑column grid on mobile, vertical on larger screens */}
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

            {/* Member Since – moved to bottom, compact */}
            <div className="mt-4 border-t border-border/50 pt-3 md:mt-5 md:pt-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Member Since
              </p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground sm:text-sm">
                <FiCalendar size={12} className="text-muted-foreground" />
                {joinedDate}
              </p>
            </div>
          </div>

          {/* Right panel – editable form */}
          <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:mb-4">
              Edit Details
            </p>
            <div className="space-y-3 sm:space-y-4">
              {/* Full name */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FiUser size={11} /> Full Name
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FiMail size={11} /> Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FiPhone size={11} /> Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FiShield size={11} /> Role
                  <span className="ml-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-normal text-orange-600 dark:text-orange-400">
                    Admin Action
                  </span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                >
                  <option value="user" className="bg-card text-foreground">Regular User</option>
                  <option value="admin" className="bg-card text-foreground">Administrator</option>
                </select>
              </div>

              {/* Approval Status & Active State */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Approval Status
                  </label>
                  <select
                    name="userStatus"
                    value={formData.userStatus}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                  >
                    <option value="approved" className="bg-card text-foreground">Approved</option>
                    <option value="pending" className="bg-card text-foreground">Pending</option>
                    <option value="denied" className="bg-card text-foreground">Denied</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Active State
                  </label>
                  <select
                    name="isActive"
                    value={formData.isActive.toString()}
                    onChange={handleBooleanChange}
                    className="w-full rounded-xl border border-border/45 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:px-4 sm:py-2.5"
                  >
                    <option value="true" className="bg-card text-foreground">Active</option>
                    <option value="false" className="bg-card text-foreground">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Conditional Denial Reason */}
              {formData.userStatus === 'denied' && (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                    Denial Reason (Required for Email)
                  </label>
                  <input
                    name="denialReason"
                    value={formData.denialReason}
                    onChange={handleChange}
                    placeholder="Brief reason for account denial..."
                    className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-foreground placeholder:text-rose-500/40 outline-none transition-all focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 sm:px-4 sm:py-2.5"
                    required
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex justify-end gap-2 border-t border-border/50 pt-3 sm:mt-6 sm:gap-3 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:px-5 sm:py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 transform-gpu hover:-translate-y-0.5 disabled:opacity-50 sm:px-6 sm:py-2.5"
              >
                <FiSave size={14} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;