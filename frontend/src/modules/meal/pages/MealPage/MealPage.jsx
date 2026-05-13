import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlinePlus, HiOutlineSquares2X2, HiOutlineListBullet,
    HiOutlineSparkles, HiOutlineShieldCheck, HiOutlineUserGroup,
    HiOutlineFire, HiOutlineMagnifyingGlass, HiOutlineXMark,
    HiOutlineAdjustmentsHorizontal, HiOutlineCalendarDays,
    HiOutlineExclamationTriangle, HiOutlineInformationCircle,
    HiOutlineSun, HiOutlineMoon, HiOutlineNoSymbol,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import MealList from '../../components/MealList/MealList';
import MealForm from '../../components/MealForm/MealForm';
import MealModal from '../../components/MealModal/MealModal';
import MealPolling from '../../components/MealPolling/MealPolling';
import Pagination from '@/shared/components/ui/Pagination/Pagination';
import { fetchMeals, createMeal, updateMeal, deleteMeal, reset, adminCreateMeal } from '../../store/meal.slice';

/* ── Skeleton ── */
const SkeletonCard = () => (
    <div className="rounded-3xl border border-white/10 dark:border-white/5 bg-card/50 p-6 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="space-y-2">
                <div className="h-8 w-16 bg-muted/60 rounded-xl" />
                <div className="h-3.5 w-32 bg-muted/40 rounded-lg" />
            </div>
            <div className="h-7 w-16 bg-muted/40 rounded-full" />
        </div>
        <div className="h-3 w-full bg-muted/30 rounded mb-1.5" />
        <div className="h-3 w-2/3 bg-muted/20 rounded mb-6" />
        <div className="h-9 w-full bg-muted/30 rounded-2xl" />
    </div>
);

const StatPill = ({ icon: Icon, label, value, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.35 }}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${color}`}
    >
        <div className="relative z-10 flex items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium opacity-70 leading-none truncate">{label}</p>
                <p className="text-xl font-black leading-tight tabular-nums">{value}</p>
            </div>
        </div>
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent pointer-events-none" />
    </motion.div>
);

const TypePill = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 ${active
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
            : 'bg-muted/40 text-muted-foreground border border-white/10 dark:border-white/5 hover:bg-muted/70 hover:text-foreground'}`}
    >
        {label}
    </button>
);


/* ── Delete Meal Dialog ────────────────────────────────────────────────────────
   Portal-based modal:
   • Mobile  → bottom-sheet that springs up from the bottom edge
   • Desktop → centred card with spring animation
   • Accessible: Escape to close, aria-labelledby/describedby, role=alertdialog
   • Body scroll locked while open
   • Animated loading spinner on confirm button
   ──────────────────────────────────────────────────────────────────────────── */
const MEAL_TYPE_META = {
    both:  { label: 'Both Meals',    Icon: HiOutlineSparkles, color: 'text-primary bg-primary/10'       },
    day:   { label: 'Day Meal',      Icon: HiOutlineSun,      color: 'text-amber-500 bg-amber-500/10'   },
    night: { label: 'Night Meal',    Icon: HiOutlineMoon,     color: 'text-indigo-400 bg-indigo-400/10' },
    off:   { label: 'No Meal (Off)', Icon: HiOutlineNoSymbol, color: 'text-muted-foreground bg-muted/40'},
};

const DeleteMealDialog = ({ meal, onConfirm, onCancel, isDeleting }) => {
    const meta      = MEAL_TYPE_META[meal?.type] ?? MEAL_TYPE_META.both;
    const { Icon }  = meta;
    const dateLabel = meal?.date ? format(new Date(meal.date), 'EEEE, MMMM d, yyyy') : '—';

    /* Escape key handler */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel, isDeleting]);

    /* Lock body scroll */
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {meal && (
                <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">

                    {/* Backdrop */}
                    <motion.div
                        key="del-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 md:backdrop-blur-sm"
                        onClick={() => !isDeleting && onCancel()}
                        aria-hidden="true"
                    />

                    {/* Panel — slides up on mobile, pops in on desktop */}
                    <motion.div
                        key="del-panel"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="del-dialog-title"
                        aria-describedby="del-dialog-desc"
                        initial={{ opacity: 0, y: 56 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 56 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                        className={[
                            'relative z-10 w-full sm:max-w-[380px] mx-auto',
                            /* Mobile: full-width bottom-sheet; Desktop: floating card */
                            'rounded-t-[28px] sm:rounded-[28px]',
                            'bg-white dark:bg-slate-900',
                            'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                            'shadow-[0_-8px_48px_rgba(0,0,0,0.22)] sm:shadow-[0_32px_72px_rgba(0,0,0,0.28)]',
                            'overflow-hidden',
                        ].join(' ')}
                    >
                        {/* Top accent gradient bar */}
                        <div className="h-[3px] w-full bg-gradient-to-r from-rose-500 via-red-400 to-orange-400" />

                        {/* Drag indicator — mobile only */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-muted/50" />
                        </div>

                        <div className="px-6 pt-4 pb-7 sm:px-8 sm:pt-6 sm:pb-8 space-y-5">

                            {/* Warning icon */}
                            <div className="flex justify-center">
                                <div className="w-[60px] h-[60px] rounded-[18px] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shadow-inner">
                                    <HiOutlineExclamationTriangle className="w-7 h-7 text-rose-500" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="text-center space-y-1">
                                <h3 id="del-dialog-title" className="text-[17px] font-bold tracking-tight text-foreground">
                                    Delete Meal Record?
                                </h3>
                                <p id="del-dialog-desc" className="text-[13px] text-muted-foreground leading-relaxed">
                                    This is permanent and cannot be undone.
                                </p>
                            </div>

                            {/* Meal preview chip */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${meta.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        {meta.label}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground truncate">{dateLabel}</p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isDeleting}
                                    className="flex-1 h-11 rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-sm font-bold text-foreground transition-all active:scale-[0.97] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                                            Deleting…
                                        </>
                                    ) : (
                                        'Yes, Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

/* ── Main Page ── */
const MealPage = () => {
    const dispatch = useDispatch();
    const { meals, pagination, isLoading, isError, message } = useSelector((s) => s.meal);
    const { user } = useSelector((s) => s.auth);
    const isAdmin = user?.role === 'admin';

    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [editingMeal, setEditingMeal]   = useState(null);
    const [viewMode, setViewMode]         = useState('grid');
    const [searchQuery, setSearchQuery]   = useState('');
    const [typeFilter, setTypeFilter]     = useState('all');
    const [dateFrom, setDateFrom]         = useState('');
    const [dateTo, setDateTo]             = useState('');
    const [showFilters, setShowFilters]   = useState(false);
    const [page, setPage]                 = useState(1);
    const [limit, setLimit]               = useState(20);
    const [errorMsg, setErrorMsg]         = useState('');
    const [deletingMeal, setDeletingMeal] = useState(null);  // full meal object shown in dialog
    const [isDeleting, setIsDeleting]     = useState(false); // spinner on confirm button

    /* Fetch on mount and page/limit changes — no reset() in cleanup so
       data survives tab switches and avoids flicker on strict-mode double-invoke */
    useEffect(() => {
        dispatch(fetchMeals({ page, limit }))
            .unwrap()
            .catch((err) => {
                const msg = typeof err === 'string' ? err : (err?.message || 'Failed to load meals');
                setErrorMsg(msg);
            });
    }, [dispatch, page, limit]);

    const openCreate  = useCallback(() => { setEditingMeal(null); setIsModalOpen(true); }, []);
    const openEdit    = useCallback((meal) => { setEditingMeal(meal); setIsModalOpen(true); }, []);
    const closeModal  = useCallback(() => { setIsModalOpen(false); setEditingMeal(null); }, []);
    const clearFilters = useCallback(() => { setSearchQuery(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }, []);

    const handleSubmit = useCallback(async (formData) => {
        try {
            setErrorMsg('');
            if (editingMeal) {
                const res = await dispatch(updateMeal({ mealId: editingMeal._id, mealData: formData })).unwrap();
                toast.success(res?.message || 'Meal updated successfully');
            } else if (isAdmin && formData.userId && formData.userId !== user?._id && formData.userId !== user?.id) {
                const res = await dispatch(adminCreateMeal({ userId: formData.userId, mealData: formData })).unwrap();
                toast.success(res?.message || 'Meal created successfully');
            } else {
                const res = await dispatch(createMeal(formData)).unwrap();
                toast.success(res?.message || 'Meal created successfully');
            }
            closeModal();
            dispatch(fetchMeals({ page, limit }));
        } catch (error) {
            /* Stay in modal so user can see/fix the error without losing form state */
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to save meal');
            setErrorMsg(msg);
            toast.error(msg);
        }
    }, [editingMeal, dispatch, closeModal, isAdmin, user, page, limit]);

    /* Delete handlers — MealList now passes the full meal object, not just the ID */
    const handleDeleteRequest = useCallback((meal) => setDeletingMeal(meal), []);
    const handleDeleteCancel  = useCallback(() => { if (!isDeleting) setDeletingMeal(null); }, [isDeleting]);
    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingMeal || isDeleting) return;
        setIsDeleting(true);
        try {
            setErrorMsg('');
            const res = await dispatch(deleteMeal(deletingMeal._id)).unwrap();
            toast.success(res?.message || 'Meal deleted successfully');
            setDeletingMeal(null);
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to delete meal');
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    }, [dispatch, deletingMeal, isDeleting]);

    /* Derived stats */
    const totalMeals  = useMemo(() => meals?.reduce((s, m) => s + (m.mealCount || 0), 0) || 0, [meals]);
    const guestMeals  = useMemo(() => meals?.reduce((s, m) => s + (m.guestCount || 0), 0) || 0, [meals]);
    const uniqueUsers = useMemo(() =>
        isAdmin ? new Set(meals?.map(m => (typeof m.user === 'object' ? m.user?._id : m.user)) || []).size : 0,
    [meals, isAdmin]);

    const filtered = useMemo(() => (meals || []).filter((meal) => {
        if (typeFilter !== 'all' && meal.type !== typeFilter) return false;
        if (dateFrom && new Date(meal.date) < new Date(dateFrom)) return false;
        if (dateTo   && new Date(meal.date) > new Date(dateTo))   return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const dateStr = format(new Date(meal.date), 'yyyy-MM-dd MMMM do EEEE').toLowerCase();
            const name    = (typeof meal.user === 'object' ? meal.user?.name  : '') || '';
            const email   = (typeof meal.user === 'object' ? meal.user?.email : '') || '';
            const remarks = meal.remarks || '';
            if (!dateStr.includes(q) && !name.toLowerCase().includes(q) &&
                !email.toLowerCase().includes(q) && !remarks.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [meals, typeFilter, dateFrom, dateTo, searchQuery]);

    const hasActive  = typeFilter !== 'all' || dateFrom || dateTo || searchQuery.trim();
    const isFiltered = hasActive;

    return (
        <MainLayout>
            <div className="relative min-h-[80vh]">
                <div className="hidden md:block pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent -z-10" />
                <div className="hidden md:block pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-400/10 via-secondary-400/5 to-transparent -z-10" />

                <div className="relative z-10 space-y-8">

                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                        <div className="space-y-1">
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                                    <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Admin View
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                    <HiOutlineSparkles className="w-3.5 h-3.5" /> My Meals
                                </span>
                            )}
                            <h2 className="text-3xl sm:text-4xl tracking-tight text-foreground">
                                {isAdmin ? 'Meals Overview' : 'Meals Hub'}
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium">
                                {isAdmin ? 'Monitor and manage all meal records across all members.' : 'Track and manage your daily meal selections and history.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                            <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/30 border border-white/10 dark:border-white/5">
                                <button onClick={() => setViewMode('grid')} title="Grid view"
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                    <HiOutlineSquares2X2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setViewMode('list')} title="List view"
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                    <HiOutlineListBullet className="w-4 h-4" />
                                </button>
                            </div>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={openCreate}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-white/10 before:to-transparent"
                                style={{ background: 'linear-gradient(135deg, hsl(210,92%,52%) 0%, hsl(268,76%,56%) 100%)' }}>
                                <HiOutlinePlus className="w-4 h-4 relative" />
                                <span className="relative">Add Meal</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Polling Section */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                        className="rounded-[32px] p-6 sm:p-8 bg-white/95 dark:bg-slate-900/95 md:bg-white/40 md:dark:bg-slate-900/40 md:backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-sm md:shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent -z-10" />
                        <MealPolling selectedDate={new Date().toISOString()} />
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                        <StatPill delay={0.10} icon={HiOutlineSparkles} label="Total Records" value={meals?.length || 0} color="bg-primary/10 border-primary/20 text-primary" />
                        <StatPill delay={0.15} icon={HiOutlineFire}     label="Total Meals"   value={totalMeals}          color="bg-accent/10 border-accent/20 text-accent" />
                        {guestMeals > 0 && (
                            <StatPill delay={0.20} icon={HiOutlineUserGroup} label="Guest Meals" value={guestMeals} color="bg-amber-500/10 border-amber-500/20 text-amber-500" />
                        )}
                        {isAdmin && (
                            <StatPill delay={0.25} icon={HiOutlineShieldCheck} label="Members" value={uniqueUsers} color="bg-secondary-400/10 border-secondary-400/20 text-secondary-400" />
                        )}
                    </motion.div>

                    {/* Search + Filter Bar */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                        className="group relative flex flex-col rounded-[18px] bg-white/95 dark:bg-slate-900/95 md:bg-white/60 md:dark:bg-slate-900/40 md:backdrop-blur-md border border-black/5 dark:border-white/10 overflow-hidden shadow-sm md:shadow-lg hover:shadow-xl dark:shadow-black/40 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">
                            <div className="relative flex-1">
                                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <input type="text"
                                    placeholder={isAdmin ? 'Search by name, email, date, remarks…' : 'Search by date or remarks…'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-10 rounded-2xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                        <HiOutlineXMark className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                                    {filtered?.length || 0} of {meals?.length || 0} record{(meals?.length || 0) !== 1 ? 's' : ''}
                                </span>
                                <button onClick={() => setShowFilters(p => !p)}
                                    className={`relative h-10 px-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 transition-all ${showFilters || hasActive
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-white/10 dark:border-white/5 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                                    <span>Filters</span>
                                    {hasActive && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />}
                                </button>
                                {hasActive && (
                                    <button onClick={clearFilters}
                                        className="h-10 px-3 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all active:scale-95 flex items-center gap-1">
                                        <HiOutlineXMark className="w-3.5 h-3.5" /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                    className="overflow-hidden border-t border-white/10 dark:border-white/5">
                                    <div className="p-4 flex flex-wrap gap-5 items-start">
                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meal Type</p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {['all', 'both', 'day', 'night', 'off'].map(t => (
                                                    <TypePill key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                                            <div className="relative">
                                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                                            <div className="relative">
                                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Partial-search info banner */}
                    <AnimatePresence>
                        {isFiltered && meals?.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary/5 border border-primary/20 text-primary text-xs font-medium">
                                <HiOutlineInformationCircle className="w-4 h-4 flex-shrink-0" />
                                Filtering within the current page ({meals.length} records). Clear filters to browse all pages.
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Banner */}
                    <AnimatePresence>
                        {(isError || errorMsg) && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mt-0.5 flex-shrink-0" />
                                    <p className="flex-1 text-sm font-semibold">{errorMsg || message || 'Something went wrong. Please try again.'}</p>
                                    <button onClick={() => { setErrorMsg(''); dispatch(reset()); }}
                                        className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-600" title="Dismiss">
                                        <HiOutlineXMark className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* Content */}
                    {isLoading && (!meals || meals.length === 0) ? (
                        <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : (
                        <>
                            <MealList meals={filtered} viewMode={viewMode} onEdit={openEdit} onDelete={handleDeleteRequest} isAdmin={isAdmin} />
                            {!isFiltered && (
                                <Pagination pagination={pagination}
                                    onPageChange={p => setPage(p)}
                                    onLimitChange={l => { setLimit(l); setPage(1); }} />
                            )}
                        </>
                    )}
                </div>

                {/* Meal create/edit modal */}
                <MealModal isOpen={isModalOpen} onClose={closeModal}
                    title={editingMeal ? 'Edit Meal Record' : (isAdmin ? 'Add Meal Record' : 'Track New Meal')}>
                    <MealForm
                        initialData={editingMeal}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        onBulkComplete={() => dispatch(fetchMeals({ page, limit }))}
                        isAdmin={isAdmin}
                        currentUser={user}
                    />
                </MealModal>

                {/* Delete confirm dialog — portal, sits above everything */}
                {deletingMeal && (
                    <DeleteMealDialog
                        meal={deletingMeal}
                        onConfirm={handleDeleteConfirm}
                        onCancel={handleDeleteCancel}
                        isDeleting={isDeleting}
                    />
                )}
            </div>
        </MainLayout>
    );
};

export default MealPage;