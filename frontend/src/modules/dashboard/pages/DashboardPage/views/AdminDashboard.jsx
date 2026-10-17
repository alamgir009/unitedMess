import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAdminDashboardStats, fetchUserDashboardStats } from '../../../store/dashboard.slice';
import { fetchUsers, searchUsers } from '../../../../members/store/members.slice';
import { fetchPollStatus, voteMealPoll } from '@/modules/meal/store/meal.slice';
import { fetchMarketSchedule, reset as resetMarket } from '@/modules/market/store/market.slice';
import marketService from '@/modules/market/services/market.service';
import MembersTable from '../../../components/MembersTable/MembersTable';
import SendNotificationModal from '@/modules/notification/components/SendNotificationModal/SendNotificationModal';
import Button from '@/shared/components/ui/Button/Button';
import { buildMealRateFormula } from '@/core/utils/helpers/billing.helper';
import {
    resolveBillStatus,
    isSettledBill,
    isRefundDueBill,
    isRefundedBill,
} from '@shared/utils/paymentStatus';
import { cn } from '@/core/utils/helpers/string.helper';
import { format } from 'date-fns';
import {
    Users,
    ShoppingBag,
    Coffee,
    TrendingUp,
    Wallet,
    Utensils,
    UtensilsCrossed,
    CalendarDays,
    Command,
    Send,
    RefreshCw,
    CircleAlert,
    Ban,
    Clock,
    Droplet,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ArrowRight,
} from 'lucide-react';
import { FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────
   Design system — Cloud-console style
   One panel chrome, one type scale, one pill recipe, one accent.
   ───────────────────────────────────────────────────────────── */
const PANEL_CLS = 'min-w-0 rounded-xl border border-border/60 bg-card shadow-sm animate-fade-in';

/* Secondary copy uses --text-secondary (7.29:1 on card in both themes).
   Brand text tier uses --brand-hover (#1D4ED8 light / #60A5FA dark):
   6.70:1 light, 5.89:1 dark on card — ≥5.22 over primary tints.
   (raw --primary fails 4.5:1 as small text in dark: 4.44) */
const TSUB = 'text-[color:var(--text-secondary)]';
const TBRAND = 'text-[color:var(--brand-hover)]';

/* Semantic families — *-bg tint + *-text label (verified ≥4.5:1 both themes).
   Chips use the bare family (no border); pills add the family border. */
const FAMILY = {
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    danger: 'bg-danger-bg text-danger-text',
    info: 'bg-info-bg text-info-text',
    refund: 'bg-refund-bg text-refund-text', /* 8.2:1 L / 8.69:1 D */
};
const PILL_SUCCESS = cn(FAMILY.success, 'border border-success-border');
const PILL_WARN = cn(FAMILY.warning, 'border border-warning-border');
const PILL_DANGER = cn(FAMILY.danger, 'border border-danger-border');
const PILL_REFUND = cn(FAMILY.refund, 'border border-refund-border');
const PILL_NEUTRAL = cn('bg-muted/40 border border-border/40', TSUB);

/* Icon chips: 28px, token family recipes (≥4.5:1 icon-vs-chip in both
   themes — raw Tailwind palette failed: amber 2.84, violet 4.29 dark) */
const TONES = {
    blue: FAMILY.info,
    emerald: FAMILY.success,
    amber: FAMILY.warning,
    violet: FAMILY.refund,
};

const Chip = ({ icon: Icon, tone = 'violet', size = 28 }) => (
    <span
        aria-hidden="true"
        className={cn(
            'shrink-0 flex items-center justify-center rounded-lg',
            size === 28 ? 'w-7 h-7' : 'w-8 h-8',
            TONES[tone] ?? TONES.violet,
        )}
    >
        <Icon size={size === 28 ? 14 : 16} strokeWidth={2} />
    </span>
);

/* Shared card header: icon chip · title/sub · right meta, one baseline */
const CardHead = ({ icon, iconTone, title, sub, right }) => (
    <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
            <Chip icon={icon} tone={iconTone} />
            <div className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">{title}</h3>
                <p className={cn('text-[10px] truncate mt-0.5', TSUB)}>{sub}</p>
            </div>
        </div>
        {right}
    </header>
);

const ErrorPanel = ({ message, onRetry, minHeight }) => (
    <div
        className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex flex-col items-center justify-center text-center gap-2"
        style={{ minHeight }}
        role="alert"
    >
        <FiAlertCircle size={16} className="text-destructive" aria-hidden="true" />
        <p className="text-xs font-medium text-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Constants (mirrors MealPolling enum: day | night | both | off)
   ───────────────────────────────────────────────────────────── */
const VOTE_OPTIONS = [
    { id: 'both', label: 'Both', description: 'Full-day meals' },
    { id: 'day', label: 'Day', description: 'Lunch only' },
    { id: 'night', label: 'Night', description: 'Dinner only' },
    { id: 'off', label: 'Off', description: 'No meals today' },
];
const VOTE_BASE_TOTALS = { total: 0, both: 0, day: 0, night: 0, off: 0 };

/* Quick links to existing routes only */
const VIEW_LINKS = [
    { to: '/markets', icon: ShoppingBag, title: 'Market Schedule & Purchases', sub: 'Month chart, entries and history' },
    { to: '/events?view=markets', icon: CalendarDays, title: 'Duty Calendar', sub: 'Pick your market dates in Events' },
];

/* Guide content — only features that exist in this codebase */
const GUIDE_ITEMS = [
    {
        id: 'vote',
        title: 'Dining Vote',
        body: "Choose Both, Day, Night or Off for today on the Meals page. Your preference stands until you change it, and today's meal entry is created automatically from your vote.",
        to: '/meals',
        linkLabel: 'Open Meals',
    },
    {
        id: 'payments',
        title: 'Payments',
        body: 'Check Total Due on this dashboard and tap Pay now to settle meal and gas bills. The Payments page supports UPI payments and shows invoices, refunds and payment history.',
        to: '/payments',
        linkLabel: 'Open Payments',
    },
    {
        id: 'markets',
        title: 'Markets',
        body: 'Log your daily market purchases and track spending on the Markets page. The entries you add feed into your bill for the current period.',
        to: '/markets',
        linkLabel: 'Open Markets',
    },
    {
        id: 'schedules',
        title: 'Market Schedules',
        body: "Pick up to 3 market duty dates for the month in the Events calendar's Markets tab, and see who is on duty in the Market Schedule on the Markets page.",
        to: '/events?view=markets',
        linkLabel: 'Open Duty Calendar',
    },
    {
        id: 'notifications',
        title: 'Notifications',
        body: 'Find updates and alerts behind the bell in the header. The Notifications page lists everything and lets you manage push and email preferences.',
        to: '/notifications',
        linkLabel: 'Open Notifications',
    },
];

/* Action items: /unresolved-bills route or in-page #members-matrix anchor */
const ACTION_LINKS = { matrix: '#members-matrix', unresolved: '/unresolved-bills' };
const ACTION_PILLS = [
    { key: 'pending', pill: PILL_WARN, link: ACTION_LINKS.matrix, icon: Clock, label: 'pending approval', hint: 'Review and approve' },
    { key: 'inactive', pill: PILL_WARN, link: ACTION_LINKS.matrix, icon: Ban, label: 'inactive members', hint: 'View inactive members' },
    { key: 'denied', pill: PILL_DANGER, link: ACTION_LINKS.matrix, icon: CircleAlert, label: 'denied members', hint: 'Review denied requests' },
    { key: 'unpaidMeal', pill: PILL_DANGER, link: ACTION_LINKS.unresolved, icon: Utensils, label: 'unpaid meal bills', hint: 'Open unresolved bills' },
    { key: 'unpaidGas', pill: PILL_DANGER, link: ACTION_LINKS.unresolved, icon: Droplet, label: 'unpaid gas bills', hint: 'Open unresolved bills' },
];

/* 44px focus ring recipe reused by every interactive row */
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/* ═════════════════════════════════════════════════════════════
   KPI row — mirrors the Members page StatPill recipes
   (MemberPage grid-cols-2 lg:grid-cols-4, rounded-lg chips)
   ═════════════════════════════════════════════════════════════ */
const KPI_TONES = {
    brand: 'bg-primary/10 text-primary border border-primary/10',
    danger: PILL_DANGER,
    success: PILL_SUCCESS,
    warning: PILL_WARN,
};

const KpiCard = memo(function KpiCard({ label, value, sub, icon: Icon, tone }) {
    return (
        <div
            className={cn(
                'min-w-0 h-full rounded-lg border border-border bg-card shadow-sm',
                'min-h-[72px] sm:min-h-[80px] px-3.5 py-3 sm:px-4 sm:py-3.5',
                'flex items-start justify-between gap-2.5 animate-fade-in-up'
            )}
        >
            <div className="min-w-0 flex-1">
                <p className={cn('text-xs font-semibold uppercase tracking-wider truncate', TSUB)}>{label}</p>
                <p
                    className="mt-1 text-lg sm:text-xl font-bold tabular-nums text-foreground leading-none truncate"
                    title={String(value)}
                >
                    {value}
                </p>
                <p className={cn('text-[10px] mt-1 leading-none truncate', TSUB)}>{sub ?? ''}</p>
            </div>
            <span
                aria-hidden="true"
                className={cn(
                    'shrink-0 flex items-center justify-center rounded-lg p-2',
                    KPI_TONES[tone] ?? KPI_TONES.brand
                )}
            >
                <Icon size={18} strokeWidth={2} />
            </span>
        </div>
    );
});
KpiCard.displayName = 'KpiCard';

/* ═════════════════════════════════════════════════════════════
   Total Due — inline rebuild of PayableWidget logic (same rules,
   cloud-console chrome). Refund / outstanding / cleared / error.
   ═════════════════════════════════════════════════════════════ */
const BillRow = memo(function BillRow({ name, amount, paid, refund, refundNote, dotCls }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/25 px-2.5 py-2">
            <span className="flex items-center gap-2 min-w-0">
                <span aria-hidden="true" className={cn('shrink-0 w-2 h-2 rounded-full', dotCls)} />
                <span className="text-[11px] font-semibold text-foreground">{name}</span>
                {refundNote && <span className={cn('text-[10px] truncate', TSUB)}>{refundNote}</span>}
            </span>
            <span className={cn(
                'shrink-0 text-xs font-bold tabular-nums',
                refund ? 'text-refund-text' : paid ? 'text-success-text' : 'text-foreground',
            )}>
                {amount}
            </span>
        </div>
    );
});

const TotalDueCard = memo(function TotalDueCard({
    mealPayable, gasBillPayable, mealPaymentStatus, gasBillStatus,
    isLoading, isLoaded, isMealError, isGasError, periodLabel, onPay,
}) {
    /* Verbatim rules from PayableWidget.jsx */
    const mealPaid = isSettledBill(mealPaymentStatus) || isRefundDueBill(mealPaymentStatus) ||
        (isLoaded && !isMealError && Number(mealPayable) === 0);
    const gasPaid = isSettledBill(gasBillStatus) || isRefundDueBill(gasBillStatus) ||
        (isLoaded && !isGasError && Number(gasBillPayable) === 0);
    const mealRefund = isRefundDueBill(mealPaymentStatus) || isRefundedBill(mealPaymentStatus);
    const gasRefund = isRefundDueBill(gasBillStatus) || isRefundedBill(gasBillStatus);
    const hasPendingRefund = isRefundDueBill(mealPaymentStatus) || isRefundDueBill(gasBillStatus);
    const hasSettledRefund = isRefundedBill(mealPaymentStatus) || isRefundedBill(gasBillStatus);

    const safeMeal = Number(mealPayable) || 0;
    const safeGas = Number(gasBillPayable) || 0;
    const totalOutstanding = (!mealPaid ? safeMeal : 0) + (!gasPaid ? safeGas : 0);
    const totalRefund = Math.abs((mealRefund ? safeMeal : 0) + (gasRefund ? safeGas : 0));
    const hasRefund = mealRefund || gasRefund;
    const hasOutstanding = totalOutstanding > 0;
    const allCleared = !hasPendingRefund && !hasOutstanding && mealPaid && gasPaid;
    const isReady = isLoaded && !isMealError && !isGasError;

    const heroLabel = hasRefund ? 'Total Refund' : hasOutstanding ? 'Total Due' : 'This Period';
    const heroAmount = isLoading
        ? null
        : hasRefund
            ? `₹${totalRefund.toLocaleString('en-IN')}`
            : hasOutstanding
                ? `₹${totalOutstanding.toLocaleString('en-IN')}`
                : '₹0';
    const heroCls = hasRefund
        ? 'text-refund-text'
        : hasOutstanding
            ? 'text-foreground'
            : 'text-success-text';

    return (
        <section
            aria-labelledby="total-due-heading"
            className={cn(PANEL_CLS, 'flex flex-col overflow-hidden h-full')}
        >
            <div className="p-4 flex-1">
                <CardHead
                    icon={Wallet}
                    iconTone="blue"
                    title="Total Due"
                    sub="Your meal and gas balance"
                />

                {isReady && (
                    <>
                        <div className="mt-3 flex items-center justify-between gap-2">
                            <p className={cn('text-[10px] font-bold uppercase tracking-wider', TSUB)}>{heroLabel}</p>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums', PILL_NEUTRAL)}>
                                {periodLabel}
                            </span>
                        </div>

                        <div className="mt-1.5 flex items-end gap-2">
                            {isLoading ? (
                                <span className="inline-block h-9 w-28 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
                            ) : (
                                <>
                                    <p className={cn('text-[28px] font-bold tabular-nums tracking-tight leading-none', heroCls)}>
                                        {heroAmount}
                                    </p>
                                    {hasOutstanding && (
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', PILL_WARN)}>
                                            Due
                                        </span>
                                    )}
                                    {hasSettledRefund && !hasOutstanding && (
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', PILL_REFUND)}>
                                            Refunded
                                        </span>
                                    )}
                                    {!hasRefund && !hasOutstanding && (
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', PILL_SUCCESS)}>
                                            All clear
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="mt-3 grid gap-1.5">
                            <BillRow
                                name="Meal"
                                amount={mealRefund && safeMeal < 0
                                    ? `₹${Math.abs(safeMeal).toLocaleString('en-IN')}`
                                    : mealPaid ? 'Settled' : `₹${safeMeal.toLocaleString('en-IN')}`}
                                paid={mealPaid}
                                refund={mealRefund && safeMeal < 0}
                                refundNote={mealRefund ? (isRefundedBill(mealPaymentStatus) ? 'Refunded' : 'Refund pending') : null}
                                dotCls={mealRefund
                                    ? 'bg-refund-text'
                                    : mealPaid ? 'bg-success-text' : 'bg-warning-text'}
                            />
                            <BillRow
                                name="Gas"
                                amount={gasRefund && safeGas < 0
                                    ? `₹${Math.abs(safeGas).toLocaleString('en-IN')}`
                                    : gasPaid ? 'Settled' : `₹${safeGas.toLocaleString('en-IN')}`}
                                paid={gasPaid}
                                refund={gasRefund && safeGas < 0}
                                refundNote={gasRefund ? (isRefundedBill(gasBillStatus) ? 'Refunded' : 'Refund pending') : null}
                                dotCls={gasRefund
                                    ? 'bg-refund-text'
                                    : gasPaid ? 'bg-success-text' : 'bg-warning-text'}
                            />
                        </div>
                    </>
                )}

                {isLoading && !isLoaded && (
                    <div className="mt-3" aria-hidden="true">
                        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                        <div className="mt-2 h-9 w-28 rounded-lg bg-muted animate-pulse" />
                        <div className="mt-3 h-9 rounded-lg bg-muted/60 animate-pulse" />
                        <div className="mt-1.5 h-9 rounded-lg bg-muted/60 animate-pulse" />
                    </div>
                )}

                {(isMealError || isGasError) && isLoaded && (
                    <div className="mt-3 grid gap-1.5" role="alert">
                        {isMealError && (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-danger-border bg-danger-bg px-2.5 py-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-danger-text">
                                    <FiAlertCircle size={12} aria-hidden="true" />
                                    Meal failed to load
                                </span>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="text-[11px] font-bold text-danger-text underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        {isGasError && (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-danger-border bg-danger-bg px-2.5 py-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-danger-text">
                                    <FiAlertCircle size={12} aria-hidden="true" />
                                    Gas failed to load
                                </span>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="text-[11px] font-bold text-danger-text underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isReady && (
                <div className="mt-auto border-t border-border/40 bg-muted/25">
                    {hasPendingRefund && (
                        <button
                            type="button"
                            onClick={onPay}
                            className={cn('w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-refund-text hover:bg-refund-bg transition-colors duration-150', FOCUS)}
                        >
                            View refund details
                            <ArrowRight size={14} aria-hidden="true" />
                        </button>
                    )}
                    {allCleared && (
                        <div className="px-4 py-3 flex items-center gap-1.5 text-xs font-bold text-success-text">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            All bills cleared for this period
                        </div>
                    )}
                    {!hasPendingRefund && hasOutstanding && (
                        <button
                            type="button"
                            onClick={onPay}
                            className={cn('w-full px-4 py-3 flex items-center justify-between text-xs font-bold', TBRAND, 'hover:bg-muted/50 transition-colors duration-150', FOCUS)}
                        >
                            Pay now
                            <ArrowRight size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
        </section>
    );
});

/* ═════════════════════════════════════════════════════════════
   Admin Dashboard
   ═════════════════════════════════════════════════════════════ */
const AdminDashboard = memo(function AdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showNotificationModal, setShowNotificationModal] = useState(false);

    const adminStats = useSelector((state) => state.dashboard.adminStats);
    const marketGrandTotal = useSelector((state) => state.dashboard.marketGrandTotal);
    const mealGrandTotal = useSelector((state) => state.dashboard.mealGrandTotal);
    const mealCharge = useSelector((state) => state.dashboard.mealCharge);
    const isDashboardLoading = useSelector((state) => state.dashboard.isLoading);
    const isDashboardError = useSelector((state) => state.dashboard.isError);

    const users = useSelector((state) => state.members.users);
    const isMembersLoading = useSelector((state) => state.members.isLoading);

    /* ── Admin's own member data (same endpoints the user dashboard uses) ── */
    const {
        userMealPayable,
        userGasBillPayable,
        userStatsLoaded,
        lastFetchedAt,
        isMealPayableError,
        isGasBillPayableError,
    } = useSelector((state) => state.dashboard);
    const { user } = useSelector((state) => state.auth);
    const userPayablesLoading = isDashboardLoading && !userStatsLoaded;

    /* ── Dining vote data ── */
    const pollStatus = useSelector((state) => state.meal.pollStatus);

    /* ── Market schedule data ── */
    const schedule = useSelector((state) => state.market.schedule);
    const isScheduleLoading = useSelector((state) => state.market.isScheduleLoading);

    useEffect(() => {
        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        const isFresh = userStatsLoaded && lastFetchedAt && (Date.now() - lastFetchedAt < 60000);
        if (!isFresh) {
            dispatch(fetchUserDashboardStats());
        }
    }, [dispatch, userStatsLoaded, lastFetchedAt]);

    /* ════════════════════════════════════════════════════════
       Dining Vote
       ════════════════════════════════════════════════════════ */
    const dateStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const [isPollLoading, setIsPollLoading] = useState(true);
    const [pollError, setPollError] = useState(false);

    const loadPoll = useCallback(() => {
        setPollError(false);
        setIsPollLoading(true);
        dispatch(fetchPollStatus(dateStr))
            .unwrap()
            .catch(() => setPollError(true))
            .finally(() => setIsPollLoading(false));
    }, [dispatch, dateStr]);

    useEffect(() => {
        loadPoll();
    }, [loadPoll]);

    const votes = useMemo(() => pollStatus?.votes ?? [], [pollStatus]);
    const stats = useMemo(() => pollStatus?.stats ?? {}, [pollStatus]);

    const voteDateLabel = useMemo(() => format(new Date(), 'EEEE, MMMM do'), []);

    const myVote = useMemo(() => {
        const uid = user?._id || user?.id || null;
        if (!uid) return null;
        for (let i = 0; i < votes.length; i++) {
            const voterId = votes[i].user?._id || votes[i].user?.id || null;
            if (voterId && voterId === uid) return votes[i].type;
        }
        return null;
    }, [user, votes]);

    const myIsManualOverride = useMemo(() => {
        const uid = user?._id || user?.id || null;
        if (!uid) return false;
        for (let i = 0; i < votes.length; i++) {
            const voterId = votes[i].user?._id || votes[i].user?.id || null;
            if (voterId && voterId === uid) return !!votes[i].isManualOverride;
        }
        return false;
    }, [user, votes]);

    const totals = useMemo(() => {
        const t = { ...VOTE_BASE_TOTALS };
        for (const { id } of VOTE_OPTIONS) {
            const fromStats = Number(stats?.[id]);
            const counted = votes.reduce((n, v) => n + (v.type === id ? 1 : 0), 0);
            const count = Number.isFinite(fromStats) && fromStats >= 0 ? fromStats : counted;
            t[id] = count;
            t.total += count;
        }
        return t;
    }, [stats, votes]);

    const [pendingSel, setPendingSel] = useState(null);
    const effectiveSel = pendingSel ?? myVote;
    const [isVoting, setIsVoting] = useState(false);
    const isVotingRef = useRef(false);

    useEffect(() => {
        if (pendingSel && myVote === pendingSel) setPendingSel(null);
    }, [pendingSel, myVote]);

    const handleVote = useCallback(async () => {
        const type = pendingSel;
        if (!type || isVotingRef.current) return;
        isVotingRef.current = true;
        setIsVoting(true);
        try {
            await dispatch(voteMealPoll({ type, date: dateStr })).unwrap();
            const label = VOTE_OPTIONS.find((o) => o.id === type)?.label ?? type;
            toast.success(`Voted · ${label}`);
        } catch (err) {
            toast.error(
                typeof err === 'string' ? err : err?.message ?? 'Failed to vote. Try again.'
            );
        } finally {
            isVotingRef.current = false;
            setIsVoting(false);
        }
    }, [dispatch, dateStr, pendingSel]);

    const currentLabel = useMemo(() => {
        if (!myVote) return 'Not set';
        return VOTE_OPTIONS.find((o) => o.id === myVote)?.label ?? myVote;
    }, [myVote]);

    const hasUnsavedChange = !!pendingSel && pendingSel !== myVote;
    const canSubmit = hasUnsavedChange && !isVoting && !isPollLoading;
    const voteBusy = isVoting || isPollLoading;

    /* ════════════════════════════════════════════════════════
       Market Schedule
       ════════════════════════════════════════════════════════ */
    const { year, month, monthLabel, istHour } = useMemo(() => {
        const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        return {
            year: istNow.getFullYear(),
            month: istNow.getMonth() + 1,
            monthLabel: format(istNow, 'MMMM yyyy'),
            istHour: istNow.getHours(),
        };
    }, []);

    const greetLabel = useMemo(() => {
        if (istHour < 5) return 'Good night';
        if (istHour < 12) return 'Good morning';
        if (istHour < 17) return 'Good afternoon';
        if (istHour < 21) return 'Good evening';
        return 'Good night';
    }, [istHour]);

    const periodLabel = useMemo(() => format(new Date(), 'MMM yyyy'), []);

    const [schedError, setSchedError] = useState(false);
    const [schedAttempted, setSchedAttempted] = useState(false);

    const loadSchedule = useCallback(() => {
        setSchedError(false);
        dispatch(fetchMarketSchedule({ year, month }))
            .unwrap()
            .catch(() => {
                setSchedError(true);
                dispatch(resetMarket());
            })
            .finally(() => setSchedAttempted(true));
    }, [dispatch, year, month]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const [monthMarkets, setMonthMarkets] = useState([]);
    useEffect(() => {
        let cancelled = false;
        const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
        marketService
            .getMarkets({ startDate, endDate, limit: 'all' })
            .then((res) => {
                if (cancelled) return;
                const payload = res?.data ?? res;
                setMonthMarkets(Array.isArray(payload?.markets) ? payload.markets : []);
            })
            .catch(() => {
                if (!cancelled) setMonthMarkets([]);
            });
        return () => {
            cancelled = true;
        };
    }, [year, month]);

    const dayList = useMemo(() => {
        if (!Array.isArray(schedule)) return [];
        return schedule.map((day) => ({
            key: day._id || String(day.date),
            date: new Date(day.date),
            user: day.user ?? null,
        }));
    }, [schedule]);

    const todayStr = useMemo(() => new Date().toDateString(), []);
    const todayTime = useMemo(() => new Date(todayStr).getTime(), [todayStr]);

    const defaultDayKey = useMemo(() => {
        const todayEntry = dayList.find((x) => x.date.toDateString() === todayStr);
        if (todayEntry) return todayEntry.key;
        const upcoming = dayList.find((x) => x.date.getTime() >= todayTime);
        return (upcoming || dayList[0])?.key ?? null;
    }, [dayList, todayStr, todayTime]);

    const [selectedDayKey, setSelectedDayKey] = useState(null);
    const activeDayKey =
        selectedDayKey != null && dayList.some((x) => x.key === selectedDayKey)
            ? selectedDayKey
            : defaultDayKey;

    const selectedDay = useMemo(
        () => dayList.find((x) => x.key === activeDayKey) ?? null,
        [dayList, activeDayKey]
    );

    const isMyDuty = useMemo(() => {
        if (!selectedDay?.user) return false;
        const uid = user?._id || user?.id || null;
        const dutyId = selectedDay.user._id || selectedDay.user.id || null;
        return !!uid && uid === dutyId;
    }, [selectedDay, user]);

    /* Duty is completed when a market entry exists for that date.
       Admin: match entry's populated user against the duty member. */
    const isDutyCompleted = useMemo(() => {
        if (!selectedDay?.user || monthMarkets.length === 0) return false;
        const dayKey = selectedDay.date.toISOString().slice(0, 10);
        const dutyId = selectedDay.user._id || selectedDay.user.id || null;
        if (!dutyId) return false;
        const isAdminRole = user?.role === 'admin';
        const uid = user?._id || user?.id || null;
        if (!isAdminRole && (!uid || String(dutyId) !== String(uid))) return false;
        return monthMarkets.some((m) => {
            if (!m?.date || new Date(m.date).toISOString().slice(0, 10) !== dayKey) {
                return false;
            }
            if (!isAdminRole) return true;
            const mUser = typeof m.user === 'object' ? (m.user?._id || m.user?.id) : m.user;
            return !!mUser && String(mUser) === String(dutyId);
        });
    }, [monthMarkets, selectedDay, user]);

    const showSchedSkeleton =
        dayList.length === 0 && (isScheduleLoading || !schedAttempted);
    const showSchedError = schedError && dayList.length === 0;
    const showSchedEmpty =
        schedAttempted && !isScheduleLoading && !schedError && dayList.length === 0;

    /* ════════════════════════════════════════════════════════
       How to Use accordion
       ════════════════════════════════════════════════════════ */
    const [openGuide, setOpenGuide] = useState('vote');
    const toggleGuide = useCallback((id) => {
        setOpenGuide((prev) => (prev === id ? null : id));
    }, []);

    const handleSearch = useCallback(
        (query) => {
            if (query.trim()) {
                dispatch(searchUsers({ search: query }));
            } else {
                dispatch(fetchUsers({ page: 1, limit: 100 }));
            }
        },
        [dispatch]
    );

    const handleRefresh = useCallback(() => {
        if (isDashboardLoading || isMembersLoading) return;

        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
        dispatch(fetchUserDashboardStats());
        loadPoll();
        loadSchedule();
    }, [dispatch, isDashboardLoading, isMembersLoading, loadPoll, loadSchedule]);

    const handleRetryAdminStats = useCallback(() => {
        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    /* ── Alert counts from visible user list ────────────────────────── */
    const {
        pendingCount,
        deniedCount,
        inactiveCount,
        unpaidMealCount,
        unpaidGasCount,
        activeCount,
    } = useMemo(() => {
        let pending = 0;
        let denied = 0;
        let inactive = 0;
        let unpaidMeal = 0;
        let unpaidGas = 0;
        let active = 0;
        for (const u of users) {
            const status = u.userStatus;
            if (status === 'pending') {
                pending++;
            } else if (status === 'denied') {
                denied++;
            } else if (!u.isActive) {
                inactive++;
            }
            if (u.isActive) {
                active++;
                const s = resolveBillStatus({ status: u.payment, payableAmount: u.paybleAmountforMeal });
                if (s === 'pending' || s === 'failed') unpaidMeal++;
                const g = resolveBillStatus({ status: u.gasBill, payableAmount: u.gasBillCharge });
                if (g === 'pending' || g === 'failed') unpaidGas++;
            }
        }
        return {
            pendingCount: pending,
            deniedCount: denied,
            inactiveCount: inactive,
            unpaidMealCount: unpaidMeal,
            unpaidGasCount: unpaidGas,
            activeCount: active,
        };
    }, [users]);

    const alertCounts = useMemo(() => ({
        pending: pendingCount,
        inactive: inactiveCount,
        denied: deniedCount,
        unpaidMeal: unpaidMealCount,
        unpaidGas: unpaidGasCount,
    }), [pendingCount, inactiveCount, deniedCount, unpaidMealCount, unpaidGasCount]);

    const totalAlerts = useMemo(
        () => alertCounts.pending + alertCounts.inactive + alertCounts.denied + alertCounts.unpaidMeal + alertCounts.unpaidGas,
        [alertCounts]
    );

    const hasAlerts = totalAlerts > 0;
    const allSettled = !hasAlerts && users.length > 0;

    /* ── KPI data ───────────────────────────────────────────── */
    const kpiData = useMemo(() => [
        {
            label: 'Active Members',
            value: adminStats?.activeUsers ?? activeCount ?? 0,
            sub: `${users.length} total listed`,
            icon: Users,
            tone: 'brand',
        },
        {
            label: 'Market Expenses',
            value: `₹${(marketGrandTotal?.grandTotal ?? 0).toLocaleString('en-IN')}`,
            sub: `All markets · current period`,
            icon: ShoppingBag,
            tone: 'danger',
        },
        {
            label: 'Total Meals',
            value: mealGrandTotal?.overallMeal ?? 0,
            sub: (mealGrandTotal?.overallGuestMeal ?? 0) > 0
                ? `${(mealGrandTotal?.overallMeal ?? 0) - (mealGrandTotal?.overallGuestMeal ?? 0)} regular + ${mealGrandTotal?.overallGuestMeal} guest`
                : 'Regular meals only',
            icon: Coffee,
            tone: 'success',
        },
        {
            label: 'Meal Rate',
            value: `₹${Number(mealCharge?.mealCharge ?? 0).toFixed(2)}`,
            sub: buildMealRateFormula(mealCharge),
            icon: TrendingUp,
            tone: 'warning',
        },
    ], [adminStats, marketGrandTotal, mealGrandTotal, mealCharge, users.length, activeCount]);

    const isBusy = isDashboardLoading || isMembersLoading;

    return (
        <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-12">

            {/* ── Header ──────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-[1100px]:col-span-12">
                <div className="flex items-center gap-3 min-w-0">
                    <Chip icon={Command} tone="blue" size={32} />
                    <div className="min-w-0">
                        <h2 className="text-h3 text-foreground tracking-tight">Command Center</h2>
                        <p className={cn('text-xs mt-0.5 truncate', TSUB)}>
                            Global admin overview and system controls
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowNotificationModal(true)}
                    >
                        <Send size={13} />
                        Send Notification
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isBusy}
                        aria-busy={isBusy}
                    >
                        <RefreshCw
                            size={13}
                            className={isBusy ? 'animate-spin' : ''}
                            aria-hidden="true"
                        />
                        Refresh
                    </Button>
                </div>
            </header>

            {/* live region: available action items + refresh outcome */}
            <p className="sr-only min-[1100px]:col-span-12" role="status" aria-live="polite">
                {isBusy
                    ? 'Refreshing command center'
                    : hasAlerts
                        ? `${totalAlerts} action item${totalAlerts === 1 ? '' : 's'} need attention`
                        : allSettled
                            ? 'All action items clear'
                            : ''}
            </p>

            {/* ── Admin stats error ───────────────────────────────── */}
            {isDashboardError && !isDashboardLoading && (
                <div
                    role="alert"
                    className="min-[1100px]:col-span-12 rounded-xl border border-danger-border bg-danger-bg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                    <div className="flex items-start gap-2.5">
                        <FiAlertCircle size={15} className="text-danger-text shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs font-medium text-foreground py-1">
                            Couldn&apos;t load admin stats.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRetryAdminStats} className="shrink-0">
                        Retry
                    </Button>
                </div>
            )}

            {/* ── KPI row ─────────────────────────────────────────── */}
            <div
                aria-busy={isDashboardLoading}
                className={cn(
                    'min-[1100px]:col-span-12 transition-opacity duration-200',
                    isDashboardLoading ? 'opacity-60 pointer-events-none' : ''
                )}
            >
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    {kpiData.map((kpi) => (
                        <KpiCard key={kpi.label} {...kpi} />
                    ))}
                </div>
            </div>

            {/* ── Action Items (below KPI row, only when any count > 0) ── */}
            {hasAlerts && (
                <section
                    aria-labelledby="action-items-heading"
                    className={cn(PANEL_CLS, 'min-[1100px]:col-span-12 p-4')}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className={cn('shrink-0 rounded-full p-1.5', PILL_WARN)} aria-hidden="true">
                                <CircleAlert size={12} />
                            </span>
                            <h3
                                id="action-items-heading"
                                className="text-xs font-bold uppercase tracking-wider text-foreground"
                            >
                                Action Items
                            </h3>
                        </div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums', PILL_NEUTRAL)}>
                            {totalAlerts} total
                        </span>
                    </div>

                    <ul className="mt-3 grid grid-cols-1 min-[640px]:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2 list-none p-0 m-0">
                        {ACTION_PILLS.map(({ key, pill, link, icon: Icon, label, hint }) => {
                            const count = alertCounts[key];
                            if (!count) return null;
                            const isExternal = !link.startsWith('#');
                            const inner = (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className={cn('shrink-0 flex items-center justify-center w-7 h-7 rounded-lg', pill)}
                                    >
                                        <Icon size={14} strokeWidth={2.5} />
                                    </span>
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground truncate leading-none">
                                            {count} · {label}
                                        </span>
                                        <span className={cn('block text-[10px] mt-1 leading-none truncate', TSUB)}>
                                            {hint}
                                        </span>
                                    </span>
                                    <ArrowRight size={14} aria-hidden="true" className={cn('shrink-0 self-center', TSUB)} />
                                </>
                            );
                            const rowCls = cn(
                                'w-full flex items-center gap-2.5 px-2.5 h-[52px] rounded-lg',
                                'border border-border/60 bg-muted/25 hover:bg-muted/50',
                                'transition-colors duration-150',
                                FOCUS
                            );
                            return (
                                <li key={key} className="p-0 m-0">
                                    {isExternal ? (
                                        <Link to={link} aria-label={`${count} ${label} — ${hint}`} className={rowCls}>
                                            {inner}
                                        </Link>
                                    ) : (
                                        <a href={link} aria-label={`${count} ${label} — ${hint}`} className={rowCls}>
                                            {inner}
                                        </a>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* ── All settled (calm zero state) ───────────────────── */}
            {allSettled && (
                <div
                    className={cn(PANEL_CLS, 'min-[1100px]:col-span-12 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3')}
                >
                    <div className="flex items-start gap-2.5">
                        <span className={cn('shrink-0 rounded-full p-1.5', PILL_SUCCESS)} aria-hidden="true">
                            <CheckCircle2 size={12} strokeWidth={2.5} />
                        </span>
                        <div className="min-w-0 py-0.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">All Systems Settled</h4>
                            <p className={cn('text-[11px] mt-0.5', TSUB)}>
                                No pending approvals or unpaid dues for the {activeCount} active members.
                            </p>
                        </div>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', PILL_SUCCESS)}>
                        Clear
                    </span>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
               MY MESS — the admin's own member view
               ══════════════════════════════════════════════════════ */}
            <section
                aria-labelledby="my-mess-heading"
                className="min-[1100px]:col-span-12"
            >
                <div className="pb-1">
                    <h2 id="my-mess-heading" className="text-h3 text-foreground tracking-tight">
                        My Mess
                    </h2>
                    <p className={cn('text-xs mt-0.5', TSUB)}>
                        {greetLabel}{user?.name ? `, ${user.name}` : ''} — your dues, vote and duty month at a glance.
                    </p>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-12">

                    {/* ── Total Due ── */}
                    <div className="min-w-0 min-[768px]:col-span-1 min-[1280px]:col-span-4">
                        <TotalDueCard
                            mealPayable={userMealPayable?.payableAmount}
                            gasBillPayable={userGasBillPayable?.payableAmount}
                            mealPaymentStatus={userMealPayable?.paymentStatus ?? null}
                            gasBillStatus={userGasBillPayable?.status ?? null}
                            isLoading={userPayablesLoading}
                            isLoaded={userStatsLoaded}
                            isMealError={isMealPayableError}
                            isGasError={isGasBillPayableError}
                            periodLabel={periodLabel}
                            onPay={() => navigate('/payments')}
                        />
                    </div>

                    {/* ── Dining Vote ── */}
                    <section
                        aria-labelledby="dining-vote-heading"
                        className={cn(PANEL_CLS, 'flex flex-col min-[768px]:col-span-1 min-[1280px]:col-span-4 p-4')}
                        style={{ animationDelay: '0.05s' }}
                    >
                        <CardHead
                            icon={UtensilsCrossed}
                            iconTone="amber"
                            title="Dining Vote"
                            sub={`Applies to ${voteDateLabel}`}
                            right={
                                myVote ? (
                                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', PILL_SUCCESS)}>
                                        {myIsManualOverride ? 'Manual' : 'Recorded'}
                                    </span>
                                ) : (
                                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', PILL_NEUTRAL)}>
                                        Pending
                                    </span>
                                )
                            }
                        />

                        {isPollLoading && !pollStatus && (
                            <div className="mt-3" aria-hidden="true">
                                <div className="grid gap-1.5 animate-pulse">
                                    {[0, 1, 2, 3].map((n) => (
                                        <div key={n} className="h-10 rounded-lg border border-border/40 bg-muted/30" />
                                    ))}
                                </div>
                                <div className="mt-3 h-10 rounded-lg bg-muted/40 animate-pulse" />
                            </div>
                        )}
                        <span className="sr-only" role="status">
                            {isPollLoading && !pollStatus ? 'Loading dining vote' : ''}
                        </span>

                        {pollError && !pollStatus && (
                            <ErrorPanel message="Couldn't load the dining vote." onRetry={loadPoll} minHeight={180} />
                        )}
                        {pollError && pollStatus && (
                            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-danger-text" role="alert">
                                <FiAlertCircle size={12} aria-hidden="true" />
                                Couldn&apos;t refresh — showing the last saved vote.
                                <button
                                    type="button"
                                    onClick={loadPoll}
                                    className="underline underline-offset-2 font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Retry
                                </button>
                            </p>
                        )}

                        {!pollError && (pollStatus || !isPollLoading) && (
                            <>
                                <div
                                    className="mt-3 grid gap-1.5"
                                    role="group"
                                    aria-label="Dining options"
                                >
                                    {VOTE_OPTIONS.map((option) => {
                                        const isActive = effectiveSel === option.id;
                                        const count = totals[option.id];
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setPendingSel(option.id)}
                                                disabled={voteBusy}
                                                aria-pressed={isActive}
                                                aria-label={`Select ${option.label}`}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 min-h-[44px] rounded-lg border px-3 py-2 text-left',
                                                    'transition-colors duration-150',
                                                    FOCUS,
                                                    isActive
                                                        ? 'border-primary/70 bg-primary/5'
                                                        : 'border-border/50 hover:bg-muted/50',
                                                    voteBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                                )}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-150',
                                                        isActive ? 'border-primary bg-primary' : 'border-border'
                                                    )}
                                                >
                                                    {isActive && <span className="block w-1.5 h-1.5 rounded-full bg-card" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-xs font-semibold text-foreground leading-none">
                                                        {option.label}
                                                    </span>
                                                    <span className={cn('block text-[10px] mt-1 leading-none truncate', TSUB)}>
                                                        {option.description}
                                                    </span>
                                                </span>
                                                <span className={cn('shrink-0 text-[10px] font-semibold tabular-nums whitespace-nowrap', TSUB)}>
                                                    {count} {count === 1 ? 'vote' : 'votes'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto pt-3">
                                    {votes.length === 0 && !isPollLoading && !pollError && (
                                        <p className={cn('mb-2 text-[11px]', TSUB)}>
                                            No selections yet — be the first to vote.
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <span className={cn('truncate', TSUB)}>
                                            Current:{' '}
                                            <span className="font-semibold text-foreground">{currentLabel}</span>
                                        </span>
                                        {hasUnsavedChange && (
                                            <span className={cn('shrink-0 font-semibold', TBRAND)}>Unsaved change</span>
                                        )}
                                    </div>

                                    <Button
                                        fullWidth
                                        variant="primary"
                                        size="sm"
                                        onClick={handleVote}
                                        disabled={!canSubmit}
                                        isLoading={isVoting}
                                        className="mt-2"
                                    >
                                        {myVote ? 'Update vote' : 'Submit vote'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </section>

                    {/* ── Market Schedule ── */}
                    <section
                        aria-labelledby="market-schedule-heading"
                        className={cn(PANEL_CLS, 'flex flex-col min-[768px]:col-span-1 min-[1280px]:col-span-4 p-4')}
                        style={{ animationDelay: '0.1s' }}
                    >
                        <CardHead
                            icon={CalendarDays}
                            iconTone="emerald"
                            title="Market Schedule"
                            sub={monthLabel}
                            right={
                                dayList.length > 0 ? (
                                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider tabular-nums', PILL_SUCCESS)}>
                                        {dayList.length} days
                                    </span>
                                ) : null
                            }
                        />

                        {showSchedSkeleton && (
                            <div className="mt-3 animate-pulse" aria-hidden="true">
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                                        <div key={n} className="h-14 rounded-lg bg-muted/40 border border-border/40" />
                                    ))}
                                </div>
                                <div className="mt-3 h-[60px] rounded-lg bg-muted/30 border border-border/40" />
                            </div>
                        )}
                        <span className="sr-only" role="status">
                            {showSchedSkeleton ? 'Loading market schedule' : ''}
                        </span>

                        {showSchedError && (
                            <ErrorPanel message="Couldn't load the market schedule." onRetry={loadSchedule} minHeight={150} />
                        )}
                        {schedError && dayList.length > 0 && (
                            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-danger-text" role="alert">
                                <FiAlertCircle size={12} aria-hidden="true" />
                                Couldn&apos;t refresh — showing the last saved schedule.
                                <button
                                    type="button"
                                    onClick={loadSchedule}
                                    className="underline underline-offset-2 font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Retry
                                </button>
                            </p>
                        )}

                        {showSchedEmpty && (
                            <div
                                className="mt-3 rounded-lg border border-border/50 bg-muted/25 p-4 flex flex-col items-center justify-center text-center gap-2"
                                style={{ minHeight: 150 }}
                            >
                                <CalendarDays size={18} className={TBRAND} aria-hidden="true" />
                                <p className="text-xs font-medium text-foreground">
                                    No duties scheduled for {monthLabel}.
                                </p>
                                <Button asChild variant="outline" size="sm">
                                    <Link to="/events?view=markets">Pick your dates</Link>
                                </Button>
                            </div>
                        )}

                        {!showSchedSkeleton && !showSchedError && !showSchedEmpty && (
                            <>
                                <div
                                    className="mt-3 rounded-lg border border-border/40 bg-muted/25 p-2 grid grid-cols-4 min-[480px]:grid-cols-7 gap-1"
                                    role="group"
                                    aria-label={`Duty days in ${monthLabel}`}
                                >
                                    {dayList.map((day) => {
                                        const isSelected = day.key === activeDayKey;
                                        const isToday = day.date.toDateString() === todayStr;
                                        return (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => setSelectedDayKey(day.key)}
                                                aria-pressed={isSelected}
                                                aria-label={format(day.date, 'EEEE, MMMM d')}
                                                className={cn(
                                                    'min-h-[50px] px-1 py-1 rounded-md border text-center transition-colors duration-150 motion-reduce:transition-none',
                                                    FOCUS,
                                                    isSelected
                                                        ? 'bg-primary/10 border-primary/60'
                                                        : 'bg-card border-border/50 hover:bg-muted/50'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'block text-[9px] uppercase tracking-wider leading-none',
                                                        isSelected ? (TBRAND) : isToday ? 'text-success-text' : TSUB
                                                    )}
                                                >
                                                    {format(day.date, 'EEE')}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'block text-xs font-bold tabular-nums leading-none mt-1',
                                                        isSelected ? (TBRAND) : 'text-foreground'
                                                    )}
                                                >
                                                    {format(day.date, 'd')}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'block w-1 h-1 rounded-full mx-auto mt-1',
                                                        isToday ? 'bg-success-text' : 'bg-transparent'
                                                    )}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto pt-3 border-t border-border/40">
                                    {selectedDay?.user ? (
                                        <div className="flex items-center gap-2.5 min-h-[52px]">
                                            <span
                                                aria-hidden="true"
                                                className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-muted/60 border border-border/40 flex items-center justify-center text-[11px] font-bold text-foreground"
                                            >
                                                {selectedDay.user.image ? (
                                                    <img
                                                        src={selectedDay.user.image}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    (selectedDay.user.name?.charAt(0) ?? '?').toUpperCase()
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                    {selectedDay.user.name}
                                                </p>
                                                <p className={cn('text-[10px] mt-0.5', TSUB)}>
                                                    {format(selectedDay.date, 'EEEE, MMM d, yyyy')}
                                                </p>
                                            </div>
                                            {isDutyCompleted && (
                                                <span className={cn('shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', PILL_SUCCESS)}>
                                                    <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" aria-hidden="true" />
                                                    Completed
                                                </span>
                                            )}
                                            {isMyDuty && !isDutyCompleted && (
                                                <span className={cn('shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', PILL_SUCCESS)}>
                                                    On duty
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center min-h-[52px]">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-foreground truncate">No member assigned</p>
                                                <p className={cn('text-[10px] mt-0.5', TSUB)}>
                                                    {selectedDay
                                                        ? format(selectedDay.date, 'EEEE, MMM d, yyyy')
                                                        : monthLabel}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* ── Quick Links + How to Use (merged) ── */}
                    <section
                        aria-label="Quick links and guide"
                        className={cn(PANEL_CLS, 'min-[768px]:col-span-2 min-[1280px]:col-span-12 p-4')}
                        style={{ animationDelay: '0.15s' }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Quick links */}
                            <div className="md:pr-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                                    Quick Links
                                </p>
                                <nav aria-label="Market schedule links" className="mt-2 grid gap-1.5">
                                    {VIEW_LINKS.map((link) => {
                                        const Icon = link.icon;
                                        return (
                                            <Link
                                                key={link.to}
                                                to={link.to}
                                                className={cn(
                                                    'group flex items-center gap-2.5 min-h-[44px] rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 transition-colors duration-150 hover:bg-muted/50',
                                                    FOCUS
                                                )}
                                            >
                                                <Chip icon={Icon} tone="blue" size={28} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-xs font-semibold text-foreground truncate leading-none">
                                                        {link.title}
                                                    </span>
                                                    <span className={cn('block text-[10px] mt-1 leading-none truncate', TSUB)}>
                                                        {link.sub}
                                                    </span>
                                                </span>
                                                <ChevronRight
                                                    size={14}
                                                    aria-hidden="true"
                                                    className={cn('shrink-0', TSUB)}
                                                />
                                            </Link>
                                        );
                                    })}
                                </nav>
                                <Button asChild variant="outline" size="sm" fullWidth className="mt-1.5">
                                    <Link to="/markets">
                                        View all markets
                                        <ArrowRight size={13} aria-hidden="true" />
                                    </Link>
                                </Button>
                            </div>

                            {/* How to Use */}
                            <div className="md:border-l md:border-border/40 md:pl-5 mt-4 md:mt-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                                    How to Use
                                </p>
                                <div className="mt-2 grid gap-1">
                                    {GUIDE_ITEMS.map((item) => {
                                        const isOpen = openGuide === item.id;
                                        return (
                                            <div key={item.id} className="rounded-lg border border-border/50 bg-muted/25">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGuide(item.id)}
                                                    aria-expanded={isOpen}
                                                    aria-controls={isOpen ? `how-to-${item.id}` : undefined}
                                                    className={cn(
                                                        'w-full flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-lg text-left transition-colors duration-150 hover:bg-muted/50',
                                                        FOCUS
                                                    )}
                                                >
                                                    <span className="flex-1 min-w-0 text-xs font-semibold text-foreground truncate">
                                                        {item.title}
                                                    </span>
                                                    <ChevronDown
                                                        size={14}
                                                        aria-hidden="true"
                                                        className={cn(
                                                            'shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                                                            TSUB,
                                                            isOpen && 'rotate-180'
                                                        )}
                                                    />
                                                </button>

                                                {isOpen && (
                                                    <div id={`how-to-${item.id}`} className="px-3 pb-2.5">
                                                        <p className={cn('text-[11px] leading-relaxed', TSUB)}>
                                                            {item.body}
                                                        </p>
                                                        <Link
                                                            to={item.to}
                                                            className={cn('mt-1 inline-flex items-center gap-1 min-h-[44px] text-[11px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', TBRAND)}
                                                        >
                                                            {item.linkLabel}
                                                            <ChevronRight size={12} aria-hidden="true" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </section>

            {/* ── Members Matrix ──────────────────────────────────── */}
            <section
                id="members-matrix"
                aria-labelledby="members-matrix-heading"
                className="min-[1100px]:col-span-12 scroll-mt-24"
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-1">
                    <h2 id="members-matrix-heading" className="text-h3 text-foreground tracking-tight">
                        Members Matrix
                    </h2>
                    <p className={cn('text-xs tabular-nums', TSUB)}>
                        {users.length} listed · {activeCount} active
                    </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm content-visibility-auto">
                    <MembersTable
                        users={users}
                        isLoading={isMembersLoading}
                        onSearch={handleSearch}
                    />
                </div>
            </section>

            {/* Notification Modal */}
            <SendNotificationModal
                isOpen={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
            />
        </div>
    );
});

export default AdminDashboard;
