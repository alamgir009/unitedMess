import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineSparkles,
    HiOutlineShieldCheck,
    HiOutlineUserGroup,
    HiOutlineFire,
    HiOutlineMagnifyingGlass,
    HiOutlineXMark,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineCalendarDays,
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

/* ─────────────────────── Sub-components ─────────────────────── */

/* Skeleton (matches glass card shape) */
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

/* Animated stat pill */
const StatPill = ({ icon: Icon, label, value, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.35 }}
        className={`
            relative flex items-center gap-3 px-4 py-3 rounded-2xl
            border backdrop-blur-md overflow-hidden
            shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1
            ${color}
        `}
    >
        {/* Content – sits above decorative lines */}
        <div className="relative z-10 flex items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium opacity-70 leading-none truncate">{label}</p>
                <p className="text-xl font-black leading-tight tabular-nums">{value}</p>
            </div>
        </div>

        {/* Premium glossy top edge */}
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent pointer-events-none" />
        
        {/* Soft bottom shadow edge */}
        <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-black/5 dark:via-black/5 to-transparent pointer-events-none" />
    </motion.div>
);

/* Type filter pill */
const TypePill = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 ${active
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
            : 'bg-muted/40 text-muted-foreground border border-white/10 dark:border-white/5 hover:bg-muted/70 hover:text-foreground'
            }`}
    >
        {label}
    </button>
);

/* ─────────────────────── Main Page ─────────────────────── */
const MealPage = () => {
    const dispatch = useDispatch();
    const { meals, pagination, isLoading, isError, message } = useSelector((state) => state.meal);
    const { user } = useSelector((state) => state.auth);
    const isAdmin = user?.role === 'admin';

    /* modal state */
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);

    /* view and filter state */
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [pollDate, setPollDate] = useState(new Date().toISOString());

    /* pagination local state */
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    /* page-level error banner state */
    const [errorMsg, setErrorMsg] = useState('');

    // Initial fetch and param changes
    useEffect(() => {
        dispatch(fetchMeals({ page, limit }))
            .unwrap()
            .catch((err) => {
                const msg = typeof err === 'string' ? err : (err?.message || 'Failed to load meals');
                setErrorMsg(msg);
            });
        return () => { dispatch(reset()); };
    }, [dispatch, page, limit]);

    // Handle sort/filter local changes requiring page reset
    const handleFiltersResetPage = () => setPage(1);

    /* handlers */
    const openCreate = useCallback(() => { setEditingMeal(null); setIsModalOpen(true); }, []);
    const openEdit = useCallback((meal) => { setEditingMeal(meal); setIsModalOpen(true); }, []);
    const closeModal = useCallback(() => { setIsModalOpen(false); setEditingMeal(null); }, []);

    const handleSubmit = useCallback(async (formData) => {
        try {
            setErrorMsg(''); // clear previous error
            if (editingMeal) {
                const res = await dispatch(updateMeal({ mealId: editingMeal._id, mealData: formData })).unwrap();
                toast.success(res?.message || 'Meal updated successfully');
            } else {
                // If it's an admin and they've explicitly selected a DIFFERENT user
                if (isAdmin && formData.userId && formData.userId !== user._id && formData.userId !== user.id) {
                    const res = await dispatch(adminCreateMeal({ userId: formData.userId, mealData: formData })).unwrap();
                    toast.success(res?.message || 'Meal created successfully');
                } else {
                    const res = await dispatch(createMeal(formData)).unwrap();
                    toast.success(res?.message || 'Meal created successfully');
                }
            }
            closeModal();
            dispatch(fetchMeals({ page, limit })); // Keep current page
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to save meal');
            setErrorMsg(msg);
            closeModal();
        }
    }, [editingMeal, dispatch, closeModal, isAdmin, user, page, limit]);

    const handleDelete = useCallback(async (mealId) => {
        if (window.confirm('Delete this meal record?')) {
            try {
                setErrorMsg('');
                const res = await dispatch(deleteMeal(mealId)).unwrap();
                toast.success(res?.message || 'Meal deleted successfully');
            } catch (error) {
                const msg = typeof error === 'string' ? error : (error?.message || 'Failed to delete meal');
                setErrorMsg(msg);
            }
        }
    }, [dispatch]);

    const clearFilters = useCallback(() => {
        setSearchQuery(''); setTypeFilter('all'); setDateFrom(''); setDateTo('');
    }, []);

    /* derived stats */
    const totalMeals = useMemo(() => meals?.reduce?.((s, m) => s + (m.mealCount || 0), 0) || 0, [meals]);
    const guestMeals = useMemo(() => meals?.reduce?.((s, m) => s + (m.guestCount || 0), 0) || 0, [meals]);
    const uniqueUsers = useMemo(() =>
        isAdmin ? new Set(meals?.map?.(m => (typeof m.user === 'object' ? m.user?._id : m.user)) || []).size : 0,
        [meals, isAdmin]);

    /* filtered list */
    const filtered = useMemo(() => (meals || []).filter((meal) => {
        if (typeFilter !== 'all' && meal.type !== typeFilter) return false;
        if (dateFrom && new Date(meal.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(meal.date) > new Date(dateTo)) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const dateStr = format(new Date(meal.date), 'yyyy-MM-dd MMMM do EEEE').toLowerCase();
            const name = (typeof meal.user === 'object' ? meal.user?.name : '') || '';
            const email = (typeof meal.user === 'object' ? meal.user?.email : '') || '';
            const remarks = meal.remarks || '';
            if (!dateStr.includes(q) && !name.toLowerCase().includes(q) &&
                !email.toLowerCase().includes(q) && !remarks.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [meals, typeFilter, dateFrom, dateTo, searchQuery]);

    const hasActive = typeFilter !== 'all' || dateFrom || dateTo || searchQuery.trim();

    /* ── Render ── */
    return (
        <MainLayout>
            <div className="relative min-h-[80vh]">

                {/* Ambient orbs */}
                <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] -z-10" />
                <div className="pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] rounded-full bg-secondary-400/8 blur-[100px] -z-10" />
                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px] -z-10" />

                <div className="relative z-10 space-y-8">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                    >
                        <div className="space-y-1">
                            {/* Role badge */}
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                                    <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                                    Admin View
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                    <HiOutlineSparkles className="w-3.5 h-3.5" />
                                    My Meals
                                </span>
                            )}
                            <h2 className="text-3xl sm:text-4xl  tracking-tight text-foreground">
                                {isAdmin ? 'Meals Overview' : 'Meals Hub'}
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium">
                                {isAdmin
                                    ? 'Monitor and manage all meal records across all members.'
                                    : 'Track and manage your daily meal selections and history.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                            {/* View toggle */}
                            <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/30 border border-white/10 dark:border-white/5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiOutlineSquares2X2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiOutlineListBullet className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Add button */}
                            {/* Add button */}
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-white/10 before:to-transparent after:absolute after:top-0 after:inset-x-4 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(210,92%,52%) 0%, hsl(268,76%,56%) 100%)'
                                }}
                            >
                                <HiOutlinePlus className="w-4 h-4 relative" />
                                <span className="relative">Add Meal</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* --- Polling Section --- */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-[32px] p-6 sm:p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative gradient */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                        <MealPolling selectedDate={pollDate} />
                    </motion.div>

                    {/* ── Stats Pills ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"
                    >
                        <StatPill delay={0.10} icon={HiOutlineSparkles} label="Total Records" value={meals?.length || 0} color="bg-primary/10 border-primary/20 text-primary" />
                        <StatPill delay={0.15} icon={HiOutlineFire} label="Total Meals" value={totalMeals} color="bg-accent/10 border-accent/20 text-accent" />
                        {guestMeals > 0 && (
                            <StatPill delay={0.20} icon={HiOutlineUserGroup} label="Guest Meals" value={guestMeals} color="bg-amber-500/10 border-amber-500/20 text-amber-500" />
                        )}
                        {isAdmin && (
                            <StatPill delay={0.25} icon={HiOutlineShieldCheck} label="Members" value={uniqueUsers} color="bg-secondary-400/10 border-secondary-400/20 text-secondary-400" />
                        )}
                    </motion.div>

                    {/* ── Search + Filter Bar ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        className="group relative flex flex-col rounded-[18px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-lg hover:shadow-xl dark:shadow-black/40 ${cfg.glow} transition-all duration-300 hover:-translate-y-1 before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent after:absolute after:inset-x-12 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/20 dark:after:via-black/60 after:to-transparent"
                    // className="rounded-3xl border border-white/15 dark:border-white/8 bg-card/60 backdrop-blur-xl overflow-hidden shadow-md"
                    >
                        {/* Top bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">

                            {/* Search input */}
                            <div className="relative flex-1">
                                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder={isAdmin ? 'Search by name, email, date, remarks…' : 'Search by date or remarks…'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-10 rounded-2xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <HiOutlineXMark className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filter toggle + count */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                                    {filtered?.length || 0} of {meals?.length || 0} record{(meals?.length || 0) !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => setShowFilters((p) => !p)}
                                    className={`relative h-10 px-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 transition-all ${showFilters || hasActive
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-white/10 dark:border-white/5 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                                    <span>Filters</span>
                                    {hasActive && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                                    )}
                                </button>
                                {hasActive && (
                                    <button
                                        onClick={clearFilters}
                                        className="h-10 px-3 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all active:scale-95 flex items-center gap-1"
                                    >
                                        <HiOutlineXMark className="w-3.5 h-3.5" />
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden border-t border-white/10 dark:border-white/5"
                                >
                                    <div className="p-4 flex flex-wrap gap-5 items-start">

                                        {/* Type pills */}
                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meal Type</p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {['all', 'both', 'day', 'night', 'off'].map((t) => (
                                                    <TypePill
                                                        key={t}
                                                        label={t.charAt(0).toUpperCase() + t.slice(1)}
                                                        active={typeFilter === t}
                                                        onClick={() => setTypeFilter(t)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Date range */}
                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                                            <div className="relative">
                                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 flex-shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                                            <div className="relative">
                                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* ── Error Banner ── */}
                    <AnimatePresence>
                        {(isError || errorMsg) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mt-0.5 flex-shrink-0" />
                                    <p className="flex-1 text-sm font-semibold">
                                        {errorMsg || message || 'Something went wrong. Please try again.'}
                                    </p>
                                    <button
                                        onClick={() => { setErrorMsg(''); dispatch(reset()); }}
                                        className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-600"
                                        title="Dismiss"
                                    >
                                        <HiOutlineXMark className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Content ── */}
                    {isLoading && (!meals || meals.length === 0) ? (
                        <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
                        </div>
                    ) : (
                        <>
                            <MealList meals={filtered} viewMode={viewMode} onEdit={openEdit} onDelete={handleDelete} isAdmin={isAdmin} />

                            {/* ── Pagination ── */}
                            {!searchQuery && !dateFrom && !dateTo && typeFilter === 'all' && (
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={(p) => setPage(p)}
                                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                                />
                            )}
                        </>
                    )}

                </div>

                {/* ── Modal ── */}
                <MealModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={editingMeal ? 'Edit Meal Record' : (isAdmin ? 'Add Meal Record' : 'Track New Meal')}
                >
                    <MealForm
                        initialData={editingMeal}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        isAdmin={isAdmin}
                        currentUser={user}
                    />
                </MealModal>
            </div>
        </MainLayout>
    );
};

export default MealPage;