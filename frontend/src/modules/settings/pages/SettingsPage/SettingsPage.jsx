import React, { useState, useCallback, useEffect } from 'react';
import {
    Utensils,
    Flame,
    Droplets,
    Fuel,
    Save,
    AlertCircle,
    TrendingUp,
    Shield,
    RefreshCw,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import settingsService from '../../services/settings.service';
import apiClient from '@/services/api/client/apiClient';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';

/* ─────────────────────────────────────────────────────────────
   CURRENT VALUE BADGE
───────────────────────────────────────────────────────────── */
const CurrentBadge = ({ value, loading, prefix = '₹ ', suffix = '' }) => {
    if (loading) {
        return (
            <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
        );
    }
    return (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Current:
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold tabular-nums">
                {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : '—'}{suffix}
            </span>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   SETTING CARD
───────────────────────────────────────────────────────────── */
const COLORS = {
    orange: {
        iconBg:   'bg-orange-50 dark:bg-orange-900/20',
        iconText: 'text-orange-500 dark:text-orange-400',
        ring:     'focus:ring-orange-500/30 focus:border-orange-400',
        btn:      'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20',
        badge:    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40',
        glow:     'hover:shadow-orange-500/10',
        topBar:   'from-orange-500 to-amber-400',
    },
    red: {
        iconBg:   'bg-red-50 dark:bg-red-900/20',
        iconText: 'text-red-500 dark:text-red-400',
        ring:     'focus:ring-red-500/30 focus:border-red-400',
        btn:      'from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-500/20',
        badge:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
        glow:     'hover:shadow-red-500/10',
        topBar:   'from-red-500 to-rose-400',
    },
    blue: {
        iconBg:   'bg-blue-50 dark:bg-blue-900/20',
        iconText: 'text-blue-500 dark:text-blue-400',
        ring:     'focus:ring-blue-500/30 focus:border-blue-400',
        btn:      'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/20',
        badge:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
        glow:     'hover:shadow-blue-500/10',
        topBar:   'from-blue-500 to-indigo-500',
    },
    emerald: {
        iconBg:   'bg-emerald-50 dark:bg-emerald-900/20',
        iconText: 'text-emerald-500 dark:text-emerald-400',
        ring:     'focus:ring-emerald-500/30 focus:border-emerald-400',
        btn:      'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20',
        badge:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
        glow:     'hover:shadow-emerald-500/10',
        topBar:   'from-emerald-500 to-teal-500',
    },
};

const SettingCard = ({
    title,
    description,
    icon: Icon,
    accentColor,
    badge,
    placeholder,
    buttonLabel = 'Update',
    currentValue,
    currentLoading,
    onSubmit,
}) => {
    const [value, setValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const c = COLORS[accentColor] || COLORS.blue;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const num = parseFloat(value);
        if (value.trim() === '' || isNaN(num) || num < 0) {
            toast.error('Please enter a valid non-negative number.');
            return;
        }
        setIsLoading(true);
        try {
            await onSubmit(num);
            setLastUpdated(new Date().toLocaleTimeString());
            setValue('');
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Update failed';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`group relative overflow-hidden flex flex-col rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl ${c.glow} transition-all duration-500`}>
            {/* Accent top bar */}
            <div className={`h-[3px] w-full bg-gradient-to-r ${c.topBar} shrink-0`} />

            <div className="p-5 flex flex-col flex-1 gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                            <Icon className={`w-5 h-5 ${c.iconText}`} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[13.5px] font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                                {title}
                            </h3>
                            {badge && (
                                <span className={`mt-1 inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${c.badge}`}>
                                    {badge}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {description}
                </p>

                {/* Current Value */}
                <CurrentBadge value={currentValue} loading={currentLoading} />

                {/* Divider */}
                <div className="border-t border-dashed border-gray-100 dark:border-slate-800" />

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 flex-1 justify-end">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        New Value
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-gray-500 pointer-events-none">
                            ₹
                        </span>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            className={`w-full pl-8 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-all duration-200 focus:ring-2 ${c.ring} focus:bg-white dark:focus:bg-slate-900`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r ${c.btn} shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Updating…
                            </>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                {buttonLabel}
                            </>
                        )}
                    </button>

                    {lastUpdated && (
                        <p className="text-center text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Updated at {lastUpdated}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const SettingsPage = () => {
    const [currentValues, setCurrentValues] = useState(null);
    const [valuesLoading, setValuesLoading] = useState(true);

    // Fetch current values from the logged-in admin's own profile
    // (all charge fields are identical across users since updateMany sets them globally)
    const fetchCurrentValues = useCallback(async () => {
        setValuesLoading(true);
        try {
            const res = await apiClient.get('/users/me');
            const user = res.data?.data ?? res.data;
            setCurrentValues({
                chargePerGuestMeal: user?.chargePerGuestMeal ?? 0,
                cookingCharge: user?.cookingCharge ?? 0,
                waterBill: user?.waterBill ?? 0,
                gasBillCharge: user?.gasBillCharge ?? 0,
                platformFee: user?.platformFee ?? 0,
            });
        } catch {
            toast.error('Failed to load current charge values');
        } finally {
            setValuesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentValues();
    }, [fetchCurrentValues]);

    // Handlers — after update, refresh current values
    const handleUpdateGuestMeal = useCallback(async (value) => {
        const res = await settingsService.updateGuestMealCharge({ chargePerGuestMeal: value });
        toast.success(res.data?.message || 'Guest meal charge updated!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdateCookingCharge = useCallback(async (value) => {
        const res = await settingsService.updateCookingCharge({ cookingCharge: value });
        toast.success(res.data?.message || 'Cooking charge updated!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdateWaterBill = useCallback(async (value) => {
        const res = await settingsService.updateWaterBill({ waterBill: value });
        toast.success(res.data?.message || 'Water bill distributed!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdateGasBill = useCallback(async (value) => {
        const res = await settingsService.updateGasBillCharge({ gasBillCharge: value });
        toast.success(res.data?.message || 'Gas bill distributed!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdatePlatformFee = useCallback(async (value) => {
        const res = await settingsService.updatePlatformFee({ platformFee: value });
        toast.success(res.data?.message || 'Platform fee updated for all members!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const cards = [
        {
            title: 'Guest Meal Charge',
            description: 'Fixed charge applied per guest meal across all members. Affects every future guest meal log.',
            icon: Utensils,
            accentColor: 'orange',
            badge: 'Per Meal',
            placeholder: 'e.g. 60',
            buttonLabel: 'Update Charge',
            currentValue: currentValues?.chargePerGuestMeal,
            onSubmit: handleUpdateGuestMeal,
        },
        {
            title: 'Cooking Charge',
            description: 'Monthly fixed cooking cost charged per member regardless of meal count.',
            icon: Flame,
            accentColor: 'red',
            badge: 'Per Member',
            placeholder: 'e.g. 400',
            buttonLabel: 'Update Charge',
            currentValue: currentValues?.cookingCharge,
            onSubmit: handleUpdateCookingCharge,
        },
        {
            title: 'Water Bill',
            description: 'Enter total monthly water bill. Automatically divided equally among all active members.',
            icon: Droplets,
            accentColor: 'blue',
            badge: 'Total → Shared',
            placeholder: 'e.g. 2000',
            buttonLabel: 'Distribute Bill',
            currentValue: currentValues?.waterBill,
            onSubmit: handleUpdateWaterBill,
        },
        {
            title: 'Gas Bill',
            description: 'Enter total monthly gas bill. Divided equally and credited to every active member.',
            icon: Fuel,
            accentColor: 'emerald',
            badge: 'Total → Shared',
            placeholder: 'e.g. 1500',
            buttonLabel: 'Distribute Bill',
            currentValue: currentValues?.gasBillCharge,
            onSubmit: handleUpdateGasBill,
        },
        {
            title: 'Platform Fee',
            description: 'Fixed platform service fee charged per member automatically applied to all pending invoices.',
            icon: TrendingUp,
            accentColor: 'blue',
            badge: 'Per Member',
            placeholder: 'e.g. 50',
            buttonLabel: 'Update Fee',
            currentValue: currentValues?.platformFee,
            onSubmit: handleUpdatePlatformFee,
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-7">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">
                                Admin Panel
                            </span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                            System Settings
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Manage global mess charges and distribute monthly utility bills across active members.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Refresh current values */}
                        <button
                            onClick={fetchCurrentValues}
                            disabled={valuesLoading}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${valuesLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                Applies instantly to all members
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Summary strip ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map(({ title, icon: Icon, accentColor, currentValue }) => {
                        const c = COLORS[accentColor];
                        return (
                            <div
                                key={title}
                                className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm"
                            >
                                <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${c.iconBg}`}>
                                    <Icon className={`w-4 h-4 ${c.iconText}`} strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10.5px] font-bold text-gray-500 dark:text-gray-400 truncate">{title}</p>
                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">
                                        {valuesLoading
                                            ? <span className="inline-block h-4 w-12 rounded bg-gray-200 dark:bg-slate-700 animate-pulse align-middle" />
                                            : `₹ ${typeof currentValue === 'number' ? currentValue.toLocaleString('en-IN') : '—'}`
                                        }
                                    </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0 ml-auto" />
                            </div>
                        );
                    })}
                </div>

                {/* ── Setting Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {cards.map((card) => (
                        <SettingCard
                            key={card.title}
                            {...card}
                            currentLoading={valuesLoading}
                        />
                    ))}
                </div>

                {/* ── Info Banner ── */}
                <div className="flex items-start gap-4 p-5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-0.5">
                            How charges work
                        </p>
                        <p className="text-[12px] text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
                            <strong>Water</strong> &amp; <strong>Gas</strong> charges accept a <em>total monthly amount</em> — the system divides it equally among all <strong>active</strong> members and stores the per-member share.
                            <strong> Guest Meal</strong> and <strong>Cooking</strong> are fixed rates stored directly per member. 
                            All updates take effect instantly across the entire platform.
                        </p>
                    </div>
                </div>

            </div>
        </MainLayout>
    );
};

export default SettingsPage;