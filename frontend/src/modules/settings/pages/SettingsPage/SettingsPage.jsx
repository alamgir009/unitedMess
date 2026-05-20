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
} from 'lucide-react';
import toast from 'react-hot-toast';
import settingsService from '../../services/settings.service';
import apiClient from '@/services/api/client/apiClient';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Spinner } from '@/shared/components/ui';

const CurrentBadge = ({ value, loading, prefix = '₹ ', suffix = '' }) => {
    if (loading) {
        return (
            <div className="h-5 w-20 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
        );
    }
    return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Current:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : '—'}{suffix}
            </span>
        </div>
    );
};

const SettingCard = ({
    title,
    description,
    icon: Icon,
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
        <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-start gap-3">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                            {title}
                        </h3>
                        {badge && (
                            <span className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                {badge}
                            </span>
                        )}
                    </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                </p>

                <CurrentBadge value={currentValue} loading={currentLoading} />

                <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

                <form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1 justify-end">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        New Value
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
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
                            className="w-full h-9 pl-8 pr-4 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="h-9 px-4 rounded-md text-sm font-medium transition-colors duration-150 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Spinner size="sm" color="current" />
                                Updating…
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {buttonLabel}
                            </>
                        )}
                    </button>

                    {lastUpdated && (
                        <p className="text-center text-xs text-green-600 dark:text-green-400 font-medium">
                            Updated at {lastUpdated}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

const SettingsPage = () => {
    const [currentValues, setCurrentValues] = useState(null);
    const [valuesLoading, setValuesLoading] = useState(true);

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
            badge: 'Per Member',
            placeholder: 'e.g. 50',
            buttonLabel: 'Update Fee',
            currentValue: currentValues?.platformFee,
            onSubmit: handleUpdatePlatformFee,
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Admin Panel
                            </span>
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            System Settings
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Manage global mess charges and distribute monthly utility bills across active members.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={fetchCurrentValues}
                            disabled={valuesLoading}
                            aria-label="Refresh current values"
                            className="h-9 px-4 rounded-md text-sm font-medium transition-colors duration-150 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${valuesLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-md">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                Applies instantly to all members
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {cards.map(({ title, icon: Icon, currentValue }, index) => (
                        <div
                            key={title}
                            className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm
                ${cards.length % 2 !== 0 && index === cards.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}
                        >
                            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                    {valuesLoading
                                        ? <span className="inline-block h-4 w-12 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse align-middle" />
                                        : `₹ ${typeof currentValue === 'number' ? currentValue.toLocaleString('en-IN') : '—'}`
                                    }
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {cards.map((card) => (
                        <SettingCard
                            key={card.title}
                            {...card}
                            currentLoading={valuesLoading}
                        />
                    ))}
                </div>

                <div className="flex items-start gap-4 p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                            How charges work
                        </p>
                        <p className="text-xs text-blue-700/80 dark:text-blue-400/80 leading-relaxed">
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