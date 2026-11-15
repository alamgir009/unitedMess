import { useState, useCallback, useEffect } from 'react';
import {
    Utensils,
    Flame,
    Droplets,
    Fuel,
    Save,
    AlertCircle,
    TrendingUp,
    RefreshCw,
    TriangleAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import settingsService from '../../services/settings.service';
import apiClient from '@/services/api/client/apiClient';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Button, RoleBadge } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';

const CurrentBadge = ({ value, loading, prefix = '₹ ', suffix = '' }) => {
    if (loading) {
        return (
            <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
        );
    }
    return (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                Current:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-semibold tabular-nums">
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
    iconBg = 'bg-muted border-transparent',
    iconColor = 'text-muted-foreground',
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
        <div className="flex flex-col rounded-xl border border-border bg-card depth-top motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-md">
            <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-start gap-3">
                    <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border ${iconBg}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground tracking-tight leading-snug">
                            {title}
                        </h3>
                        {badge && (
                            <div className="mt-1.5 flex items-center">
                                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-sm border border-border bg-muted/80 text-muted-foreground uppercase tracking-wider leading-none select-none">
                                    {badge}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                </p>

                <CurrentBadge value={currentValue} loading={currentLoading} />

                <div className="border-t border-dashed border-border" />

                <form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1 justify-end">
                    <label className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                        New Value
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
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
                            className="w-full h-10 pl-8 pr-4 border border-border rounded-md text-sm bg-background text-foreground placeholder-muted-foreground outline-none transition-colors duration-150 focus:ring-2 focus:ring-ring focus:border-primary"
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={isLoading}
                        fullWidth
                        isLoading={isLoading}
                    >
                        {!isLoading && <Save className="w-4 h-4" />}
                        {isLoading ? 'Updating…' : buttonLabel}
                    </Button>

                    {lastUpdated && (
                        <p className="text-center text-xs text-success font-medium">
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
        toast.success(res.data?.message || "Water bill has been split!");
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdateGasBill = useCallback(async (value) => {
        const res = await settingsService.updateGasBillCharge({ gasBillCharge: value });
        toast.success(res.data?.message || "Gas bill has been split!");
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    const handleUpdatePlatformFee = useCallback(async (value) => {
        const res = await settingsService.updatePlatformFee({ platformFee: value });
        toast.success(res.data?.message || 'Platform fee updated for all members!');
        await fetchCurrentValues();
    }, [fetchCurrentValues]);

    // Overdue-penalty rate — stored in the PenaltyConfig singleton, fetched
    // from its own endpoint (it is NOT a per-user charge like the cards above).
    const [penaltyRate, setPenaltyRate] = useState(null);

    const fetchPenaltyRate = useCallback(async () => {
        try {
            const res = await settingsService.getPenaltyRate();
            setPenaltyRate(res.data?.data?.dailyRate ?? res.data?.dailyRate ?? 0);
        } catch {
            setPenaltyRate(null);
        }
    }, []);

    useEffect(() => { fetchPenaltyRate(); }, [fetchPenaltyRate]);

    const handleUpdatePenaltyRate = useCallback(async (value) => {
        const res = await settingsService.updatePenaltyRate({ dailyRate: value });
        toast.success(res.data?.message || 'Overdue penalty rate updated!');
        await fetchPenaltyRate();
    }, [fetchPenaltyRate]);

    const TONES = [
        { iconBg: 'bg-warning-bg border-warning-border', iconColor: 'text-warning-text' },
        { iconBg: 'bg-primary/10 border-primary/20', iconColor: 'text-primary' },
        { iconBg: 'bg-info-bg border-info-border', iconColor: 'text-info-text' },
        { iconBg: 'bg-refund-bg border-refund-border', iconColor: 'text-refund-text' },
        { iconBg: 'bg-success-bg border-success-border', iconColor: 'text-success-text' },
        { iconBg: 'bg-danger-bg border-danger-border', iconColor: 'text-danger-text' },
    ];

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
            tone: TONES[0],
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
            tone: TONES[1],
        },
        {
            title: 'Water Bill',
            description: 'Enter total monthly water bill. Automatically divided equally among all active members.',
            icon: Droplets,
            badge: 'Total → Shared',
            placeholder: 'e.g. 2000',
            buttonLabel: 'Split Bill',
            currentValue: currentValues?.waterBill,
            onSubmit: handleUpdateWaterBill,
            tone: TONES[2],
        },
        {
            title: 'Gas Bill',
            description: 'Enter total monthly gas bill. Divided equally and credited to every active member.',
            icon: Fuel,
            badge: 'Total → Shared',
            placeholder: 'e.g. 1500',
            buttonLabel: 'Split Bill',
            currentValue: currentValues?.gasBillCharge,
            onSubmit: handleUpdateGasBill,
            tone: TONES[3],
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
            tone: TONES[4],
        },
        {
            title: 'Overdue Penalty Rate',
            description: `Flat ₹${penaltyRate != null ? penaltyRate.toLocaleString('en-IN') : '…'} charged per overdue calendar day (IST) on unpaid bills, from the 6th of the month after the billing month. Changing this affects only newly overdue bills.`,
            icon: TriangleAlert,
            badge: 'Per Day',
            placeholder: 'e.g. 100',
            buttonLabel: 'Update Rate',
            currentValue: penaltyRate,
            currentLoading: valuesLoading,
            onSubmit: handleUpdatePenaltyRate,
            tone: TONES[5],
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="mb-1">
                            <RoleBadge isAdmin={true} />
                        </div>
                        <h1 className="text-h1 font-bold tracking-tight text-foreground">
                            System Settings
                        </h1>
                        <p className="mt-1 text-body text-muted-foreground">
                            Manage global mess charges and distribute monthly utility bills across active members.
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={fetchCurrentValues}
                            disabled={valuesLoading}
                            aria-busy={valuesLoading}
                            aria-label="Refresh current values"
                            className="h-10 shrink-0"
                        >
                            <RefreshCw
                                className={cn('w-4 h-4 flex-shrink-0', valuesLoading && 'animate-spin')}
                                aria-hidden="true"
                            />
                            <span>Refresh</span>
                        </Button>

                        <div
                            className="h-10 inline-flex items-center gap-2 px-3 sm:px-3.5 bg-warning-bg border border-warning-border rounded-btn-md depth-top min-w-0 flex-1 sm:flex-initial"
                            title="Applies instantly to all members"
                        >
                            <AlertCircle className="w-4 h-4 text-warning-text shrink-0" />
                            <span className="text-xs font-medium text-warning-text truncate sm:whitespace-normal">
                                Applies instantly to all members
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
                    {cards.map(({ title, icon: Icon, currentValue, tone }) => (
                        <div
                            key={title}
                            className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 card-base transition-all duration-150 hover:border-primary/20"
                        >
                            <div className={`shrink-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border ${tone.iconBg}`}>
                                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${tone.iconColor}`} strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p
                                    className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate"
                                    title={title}
                                >
                                    {title}
                                </p>
                                <p className="text-sm sm:text-base font-bold text-foreground tabular-nums tracking-tight mt-0.5 leading-tight">
                                    {valuesLoading
                                        ? <span className="inline-block h-4 w-12 rounded-md bg-muted animate-pulse align-middle" />
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
                            iconBg={card.tone.iconBg}
                            iconColor={card.tone.iconColor}
                        />
                    ))}
                </div>

                <div className="flex items-start gap-4 p-6 bg-warning-bg border border-warning-border rounded-xl depth-top">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-warning-bg">
                        <TriangleAlert className="w-4 h-4 text-warning-text" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-warning-text mb-1">
                            How charges work
                        </p>
                        <p className="text-xs text-warning-text leading-relaxed">
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