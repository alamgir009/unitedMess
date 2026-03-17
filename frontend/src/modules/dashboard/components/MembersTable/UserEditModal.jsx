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
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
    red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
  const mealPaidColor = user.paymentStatus === 'paid' ? 'green' : 'red';
  const gasPaidColor = user.gasBillStatus === 'paid' ? 'green' : 'red';
  const statusColor =
    user.userStatus === 'approved' ? 'green' : user.userStatus === 'pending' ? 'amber' : 'red';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop with liquid glass */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md dark:bg-slate-950/60" />

      {/* Modal container – fully responsive, no scroll on mobile */}
      <div
        className={cn(
          'relative w-full max-w-3xl rounded-2xl sm:rounded-3xl border shadow-2xl',
          'bg-white/70 backdrop-blur-md dark:bg-slate-900/70',
          'border-white/30 dark:border-slate-700/50',
          'max-h-[95vh] overflow-y-auto sm:max-h-[90vh]', // overflow only if needed, but content now fits
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header – compact on mobile */}
        <div className="flex items-center justify-between border-b border-white/30 px-4 py-3 dark:border-slate-700/50 sm:px-6 sm:py-4">
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Edit Member</h3>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {user._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/30 hover:text-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-slate-300 sm:p-2"
          >
            <FiX size={18} sm:size={20} />
          </button>
        </div>

        {/* Two‑column layout on desktop, stacks on mobile */}
        <div className="flex flex-col md:flex-row">
          {/* Left panel – read‑only info */}
          <div className="border-b border-white/30 p-4 dark:border-slate-700/50 md:w-64 md:border-b-0 md:border-r md:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                value={user.paymentStatus === 'paid' ? '✓ Paid' : '✕ Unpaid'}
                color={mealPaidColor}
              />
              <InfoBadge
                label="Gas Bill"
                value={user.gasBillStatus === 'paid' ? '✓ Paid' : '✕ Unpaid'}
                color={gasPaidColor}
              />
            </div>

            {/* Member Since – moved to bottom, compact */}
            <div className="mt-4 border-t border-white/30 pt-3 dark:border-slate-700/50 md:mt-5 md:pt-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Member Since
              </p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 sm:text-sm">
                <FiCalendar size={12} className="text-slate-400" />
                {joinedDate}
              </p>
            </div>
          </div>

          {/* Right panel – editable form */}
          <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:mb-4">
              Edit Details
            </p>
            <div className="space-y-3 sm:space-y-4">
              {/* Full name */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  <FiUser size={11} /> Full Name
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <FiMail size={11} /> Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <FiPhone size={11} /> Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  <FiShield size={11} /> Role
                  <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-normal text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    Admin Action
                  </span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-orange-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Approval Status & Active State */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Approval Status
                  </label>
                  <select
                    name="userStatus"
                    value={formData.userStatus}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-orange-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Active State
                  </label>
                  <select
                    name="isActive"
                    value={formData.isActive.toString()}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/30 bg-white/50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-orange-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white sm:px-4 sm:py-2.5"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
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
                    className="w-full rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-rose-500/50 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-white sm:px-4 sm:py-2.5"
                    required
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex justify-end gap-2 border-t border-white/30 pt-3 dark:border-slate-700/50 sm:mt-6 sm:gap-3 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/30 dark:text-slate-300 dark:hover:bg-slate-800/60 sm:px-5 sm:py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 sm:px-6 sm:py-2.5"
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