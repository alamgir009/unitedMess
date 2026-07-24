import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '@/core/utils/helpers/string.helper';
import { format, parseISO, isValid } from 'date-fns';
import {
    HiOutlineCalendarDays,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineClock,
    HiOutlineArrowPath,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiOutlineArrowRight,
} from 'react-icons/hi2';
import {
    fetchAuditMonths,
    fetchAuditDays,
    fetchAuditLogsByDay,
    resetAuditDays,
    resetAuditLogs,
} from '../../store/meal.slice';

const EVENT_LABELS = {
    vote_created: { text: 'Vote Created', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    vote_updated: { text: 'Vote Changed', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    vote_unchanged: { text: 'No Change', color: 'bg-muted/40 text-muted-foreground border-border/40' },
};

const TYPE_LABELS = {
    both: 'Both',
    day: 'Day',
    night: 'Night',
    off: 'Off',
};

// ─── Inline Pager (replaces Pagination to avoid onLimitChange crash) ─────────
const InlinePager = React.memo(({ pagination, onPageChange }) => {
    if (!pagination || pagination.pages <= 1) return null;

    const { page, pages, hasNext, hasPrev, total } = pagination;

    const pageNumbers = useMemo(() => {
        const nums = [];
        const maxVisible = 5;
        if (pages <= maxVisible) {
            for (let i = 1; i <= pages; i++) nums.push(i);
        } else {
            nums.push(1);
            let start = Math.max(2, page - 1);
            let end = Math.min(pages - 1, page + 1);
            if (page <= 3) { start = 2; end = 4; }
            if (page >= pages - 2) { start = pages - 3; end = pages - 1; }
            if (start > 2) nums.push('...');
            for (let i = start; i <= end; i++) nums.push(i);
            if (end < pages - 1) nums.push('...');
            nums.push(pages);
        }
        return nums;
    }, [page, pages]);

    return (
        <div className="flex items-center justify-between gap-3 pt-3">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {total} total
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrev}
                    className={cn(
                        'p-1.5 rounded-lg border text-xs font-medium transition-all',
                        !hasPrev
                            ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                            : 'border-border hover:bg-muted/40 text-foreground'
                    )}
                    aria-label="Previous page"
                >
                    <HiOutlineChevronLeft className="w-3.5 h-3.5" />
                </button>
                {pageNumbers.map((num, i) =>
                    num === '...' ? (
                        <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                    ) : (
                        <button
                            key={num}
                            type="button"
                            onClick={() => onPageChange(num)}
                            className={cn(
                                'min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all',
                                num === page
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            )}
                            aria-label={`Page ${num}`}
                            aria-current={num === page ? 'page' : undefined}
                        >
                            {num}
                        </button>
                    )
                )}
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNext}
                    className={cn(
                        'p-1.5 rounded-lg border text-xs font-medium transition-all',
                        !hasNext
                            ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                            : 'border-border hover:bg-muted/40 text-foreground'
                    )}
                    aria-label="Next page"
                >
                    <HiOutlineChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
});
InlinePager.displayName = 'InlinePager';

// ─── Skeleton Components ─────────────────────────────────────────────────────

const SkeletonMonth = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-9 w-9 rounded-lg bg-muted/60" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-muted/40 rounded" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
            </div>
        </div>
    </div>
));
SkeletonMonth.displayName = 'SkeletonMonth';

const SkeletonDay = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-7 w-7 rounded-md bg-muted/60" />
            <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 bg-muted/40 rounded" />
                <div className="h-2.5 w-14 bg-muted/30 rounded" />
            </div>
        </div>
    </div>
));
SkeletonDay.displayName = 'SkeletonDay';

const SkeletonLogEntry = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        <div className="px-4 py-3.5 space-y-2.5">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted/60" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 bg-muted/40 rounded" />
                    <div className="h-2.5 w-20 bg-muted/30 rounded" />
                </div>
                <div className="h-5 w-20 rounded-full bg-muted/40" />
            </div>
            <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-16 bg-muted/30 rounded" />
                <div className="h-3 w-4 bg-muted/30 rounded" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
            </div>
        </div>
    </div>
));
SkeletonLogEntry.displayName = 'SkeletonLogEntry';

// ─── Empty & Error States ────────────────────────────────────────────────────

const EmptyMonthState = React.memo(() => (
    <div className="flex flex-col items-center gap-3 py-12 select-none">
        <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center">
            <HiOutlineCalendarDays className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No audit logs yet</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                Audit entries will appear here as members vote on meal polls.
            </p>
        </div>
    </div>
));
EmptyMonthState.displayName = 'EmptyMonthState';

const EmptyDayState = React.memo(() => (
    <div className="flex flex-col items-center gap-3 py-12 select-none">
        <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center">
            <HiOutlineDocumentText className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No logs for this day</p>
            <p className="text-xs text-muted-foreground mt-0.5">
                No polling activity recorded on this date.
            </p>
        </div>
    </div>
));
EmptyDayState.displayName = 'EmptyDayState';

const ErrorState = React.memo(({ message, onRetry }) => (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
        <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message || 'Something went wrong'}</p>
        </div>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Retry"
                aria-label="Retry loading"
            >
                <HiOutlineArrowPath className="w-4 h-4" />
            </button>
        )}
    </div>
));
ErrorState.displayName = 'ErrorState';

// ─── Row Components ──────────────────────────────────────────────────────────

const MonthRow = React.memo(({ month, onSelect }) => {
    const displayMonth = useMemo(() => {
        try {
            const d = parseISO(`${month.monthKey}-01`);
            return isValid(d) ? format(d, 'MMMM yyyy') : month.monthKey;
        } catch {
            return month.monthKey;
        }
    }, [month.monthKey]);

    return (
        <button
            type="button"
            onClick={() => onSelect(month.monthKey)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card text-left transition-all duration-150 hover:bg-muted/20 hover:border-border/70"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                <HiOutlineCalendarDays className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{displayMonth}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                    {month.count} {month.count === 1 ? 'event' : 'events'}
                </p>
            </div>
            <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </button>
    );
});
MonthRow.displayName = 'MonthRow';

const DayRow = React.memo(({ day, onSelect }) => {
    const displayDate = useMemo(() => {
        try {
            const d = parseISO(day.dayKey);
            return isValid(d) ? format(d, 'EEE, MMM d') : day.dayKey;
        } catch {
            return day.dayKey;
        }
    }, [day.dayKey]);

    const dayNum = useMemo(() => {
        try {
            return format(parseISO(day.dayKey), 'd');
        } catch {
            return '?';
        }
    }, [day.dayKey]);

    return (
        <button
            type="button"
            onClick={() => onSelect(day.dayKey)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card text-left transition-all duration-150 hover:bg-muted/20 hover:border-border/70"
        >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground text-[10px] font-bold">
                {dayNum}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{displayDate}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                    {day.count} {day.count === 1 ? 'entry' : 'entries'}
                </p>
            </div>
            <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        </button>
    );
});
DayRow.displayName = 'DayRow';

const LogEntry = React.memo(({ log }) => {
    const user = log.user || {};
    const initial = user.name?.charAt(0)?.toUpperCase() ?? '?';
    const eventMeta = EVENT_LABELS[log.eventType] || EVENT_LABELS.vote_unchanged;

    const displayTime = useMemo(() => {
        try {
            const d = parseISO(log.timestamp);
            return isValid(d) ? format(d, 'h:mm a') : '';
        } catch {
            return '';
        }
    }, [log.timestamp]);

    return (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name ?? 'Member'}
                            className="h-8 w-8 rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">
                            {initial}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {user.name || 'Unknown Member'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                    <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
                        eventMeta.color
                    )}>
                        {eventMeta.text}
                    </span>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    {log.previousState?.type ? (
                        <>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 font-medium tabular-nums">
                                {TYPE_LABELS[log.previousState.type] || log.previousState.type}
                            </span>
                            <HiOutlineArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 font-medium tabular-nums">
                                {TYPE_LABELS[log.newState?.type] || log.newState?.type}
                            </span>
                        </>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 font-medium tabular-nums">
                            {TYPE_LABELS[log.newState?.type] || log.newState?.type}
                        </span>
                    )}
                    <span className="text-muted-foreground/30 mx-0.5">·</span>
                    <HiOutlineClock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <span className="tabular-nums">{displayTime}</span>
                </div>
            </div>
        </div>
    );
});
LogEntry.displayName = 'LogEntry';

// ─── Main Component ──────────────────────────────────────────────────────────

const AuditLogPanel = () => {
    const dispatch = useDispatch();
    const {
        auditMonths,
        auditMonthsLoading,
        auditMonthsError,
        auditDays,
        auditDayPagination,
        auditDaysLoading,
        auditDaysError,
        auditLogs,
        auditLogPagination,
        auditLogsLoading,
        auditLogsError,
    } = useSelector((s) => s.meal);

    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    // ── Fetch months on mount ──────────────────────────────────────────────
    useEffect(() => {
        dispatch(fetchAuditMonths()).unwrap().catch(() => {});
    }, [dispatch]);

    // ── Fetch days when month changes (and clear stale child state) ────────
    useEffect(() => {
        if (!selectedMonth) return;
        // Clear previous child-view data so stale rows don't flash
        dispatch(resetAuditLogs());
        setSelectedDay(null);
        dispatch(fetchAuditDays({ monthKey: selectedMonth, page: 1, limit: 50 }))
            .unwrap()
            .catch(() => {});
    }, [dispatch, selectedMonth]);

    // ── Fetch logs when day changes ────────────────────────────────────────
    useEffect(() => {
        if (!selectedDay) return;
        dispatch(fetchAuditLogsByDay({ dayKey: selectedDay, page: 1, limit: 50 }))
            .unwrap()
            .catch(() => {});
    }, [dispatch, selectedDay]);

    // ── Navigation handlers ────────────────────────────────────────────────

    const handleSelectMonth = useCallback((monthKey) => {
        setSelectedMonth(monthKey);
        setSelectedDay(null);
    }, []);

    const handleSelectDay = useCallback((dayKey) => {
        setSelectedDay(dayKey);
    }, []);

    const handleBackToMonths = useCallback(() => {
        setSelectedMonth(null);
        setSelectedDay(null);
        dispatch(resetAuditDays());
        dispatch(resetAuditLogs());
    }, [dispatch]);

    const handleBackToDays = useCallback(() => {
        setSelectedDay(null);
        dispatch(resetAuditLogs());
    }, [dispatch]);

    const handleDayPageChange = useCallback((page) => {
        if (selectedMonth) {
            dispatch(fetchAuditDays({ monthKey: selectedMonth, page, limit: 50 }));
        }
    }, [dispatch, selectedMonth]);

    const handleLogPageChange = useCallback((page) => {
        if (selectedDay) {
            dispatch(fetchAuditLogsByDay({ dayKey: selectedDay, page, limit: 50 }));
        }
    }, [dispatch, selectedDay]);

    const handleRetryMonths = useCallback(() => {
        dispatch(fetchAuditMonths());
    }, [dispatch]);

    const handleRetryDays = useCallback(() => {
        if (selectedMonth) {
            dispatch(fetchAuditDays({ monthKey: selectedMonth, page: 1, limit: 50 }));
        }
    }, [dispatch, selectedMonth]);

    const handleRetryLogs = useCallback(() => {
        if (selectedDay) {
            dispatch(fetchAuditLogsByDay({ dayKey: selectedDay, page: 1, limit: 50 }));
        }
    }, [dispatch, selectedDay]);

    // ── Derived header label ───────────────────────────────────────────────

    const headerLabel = useMemo(() => {
        if (selectedDay) {
            try {
                const d = parseISO(selectedDay);
                return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : selectedDay;
            } catch {
                return selectedDay;
            }
        }
        if (selectedMonth) {
            try {
                const d = parseISO(`${selectedMonth}-01`);
                return isValid(d) ? format(d, 'MMMM yyyy') : selectedMonth;
            } catch {
                return selectedMonth;
            }
        }
        return 'Poll Activity Log';
    }, [selectedMonth, selectedDay]);

    const showBackButton = selectedMonth || selectedDay;

    return (
        <section className="w-full">
            <div className={cn(
                'relative w-full overflow-hidden',
                'md:rounded-xl',
                'md:border md:border-border/50',
                'md:bg-card',
                'md:shadow-sm',
                'md:px-5 md:py-5'
            )}>
                {/* HEADER */}
                <header className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {showBackButton && (
                            <button
                                type="button"
                                onClick={selectedDay ? handleBackToDays : handleBackToMonths}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                                aria-label={selectedDay ? 'Back to days' : 'Back to months'}
                            >
                                <HiOutlineChevronLeft className="h-4 w-4" />
                            </button>
                        )}
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 mb-1.5">
                                <HiOutlineDocumentText className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/75">
                                    Audit Trail
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                                {headerLabel}
                            </h3>
                        </div>
                    </div>
                </header>

                {/* ═══════════ MONTHS VIEW ═══════════ */}
                {!selectedMonth && (
                    <>
                        {auditMonthsError && (
                            <div className="mb-4">
                                <ErrorState message={auditMonthsError} onRetry={handleRetryMonths} />
                            </div>
                        )}
                        <div className="space-y-2">
                            {auditMonthsLoading && auditMonths.length === 0 ? (
                                [1, 2, 3].map((n) => <SkeletonMonth key={n} />)
                            ) : auditMonths.length === 0 ? (
                                <EmptyMonthState />
                            ) : (
                                auditMonths.map((month) => (
                                    <MonthRow
                                        key={month.monthKey}
                                        month={month}
                                        onSelect={handleSelectMonth}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════ DAYS VIEW ═══════════ */}
                {selectedMonth && !selectedDay && (
                    <>
                        {auditDaysError && (
                            <div className="mb-4">
                                <ErrorState message={auditDaysError} onRetry={handleRetryDays} />
                            </div>
                        )}
                        <div className="space-y-2">
                            {auditDaysLoading && auditDays.length === 0 ? (
                                [1, 2, 3, 4, 5].map((n) => <SkeletonDay key={n} />)
                            ) : auditDays.length === 0 ? (
                                <EmptyDayState />
                            ) : (
                                <>
                                    {auditDays.map((day) => (
                                        <DayRow
                                            key={day.dayKey}
                                            day={day}
                                            onSelect={handleSelectDay}
                                        />
                                    ))}
                                    <InlinePager
                                        pagination={auditDayPagination}
                                        onPageChange={handleDayPageChange}
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════ LOG ENTRIES VIEW ═══════════ */}
                {selectedDay && (
                    <>
                        {auditLogsError && (
                            <div className="mb-4">
                                <ErrorState message={auditLogsError} onRetry={handleRetryLogs} />
                            </div>
                        )}
                        <div className="space-y-2">
                            {auditLogsLoading && auditLogs.length === 0 ? (
                                [1, 2, 3].map((n) => <SkeletonLogEntry key={n} />)
                            ) : auditLogs.length === 0 ? (
                                <EmptyDayState />
                            ) : (
                                <>
                                    {auditLogs.map((log) => (
                                        <LogEntry key={log._id} log={log} />
                                    ))}
                                    <InlinePager
                                        pagination={auditLogPagination}
                                        onPageChange={handleLogPageChange}
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default React.memo(AuditLogPanel);
