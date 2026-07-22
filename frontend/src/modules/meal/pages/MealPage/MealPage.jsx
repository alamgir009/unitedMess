import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    HiOutlinePlus, HiOutlineSquares2X2, HiOutlineListBullet,
    HiOutlineShieldCheck, HiOutlineSparkles,
    HiOutlineXMark, HiOutlineChevronDown, HiOutlineInformationCircle,
    HiOutlineClock,
} from 'react-icons/hi2';
import { IoFastFoodOutline } from "react-icons/io5";
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import Button from '@/shared/components/ui/Button/Button';
import { SkeletonCard } from '@/shared/components/ui/Loader';
import MealList from '../../components/MealList/MealList';
import AdminMealView from '../../components/AdminMealView/AdminMealView';
import MealForm from '../../components/MealForm/MealForm';
import MealModal from '../../components/MealModal/MealModal';
import MealPolling from '../../components/MealPolling/MealPolling';
import Pagination from '@/shared/components/ui/Pagination/Pagination';
import { fetchMeals, createMeal, bulkCreateMeals, updateMeal, deleteMeal, bulkDeleteMeals, reset } from '../../store/meal.slice';


import DeleteMealDialog from '../../components/DeleteMealDialog/DeleteMealDialog';
import MealSearchBar from '../../components/MealSearchBar/MealSearchBar';
import MealStatsBar from '../../components/MealStatsBar/MealStatsBar';

const MealPage = () => {
    const dispatch = useDispatch();
    const meals = useSelector((s) => s.meal.meals);
    const pagination = useSelector((s) => s.meal.pagination);
    const isLoading = useSelector((s) => s.meal.isLoading);
    const isError = useSelector((s) => s.meal.isError);
    const message = useSelector((s) => s.meal.message);
    const { user } = useSelector((s) => s.auth);
    const isAdmin = user?.role === 'admin';

    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [errorMsg, setErrorMsg] = useState('');
    const [deletingMeal, setDeletingMeal] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const fetchParams = useMemo(() =>
        isAdmin ? { page: 1, limit: 'all' } : { page, limit },
        [isAdmin, page, limit],
    );

    const selectedDate = useMemo(() => new Date().toISOString(), []);

    useEffect(() => {
        dispatch(fetchMeals(fetchParams))
            .unwrap()
            .catch((err) => {
                const msg = typeof err === 'string' ? err : (err?.message || 'Failed to load meals');
                setErrorMsg(msg);
            });
    }, [dispatch, fetchParams]);

    const openCreate = useCallback(() => { setEditingMeal(null); setIsModalOpen(true); }, []);
    const openEdit = useCallback((meal) => { setEditingMeal(meal); setIsModalOpen(true); }, []);
    const closeModal = useCallback(() => { setIsModalOpen(false); setEditingMeal(null); }, []);
    const clearFilters = useCallback(() => { setSearchQuery(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }, []);

    const handleSubmit = useCallback(async (formData) => {
        try {
            setErrorMsg('');

            // ── EDIT mode ──────────────────────────────────────────────
            if (editingMeal) {
                const res = await dispatch(updateMeal({ mealId: editingMeal._id, mealData: formData })).unwrap();
                toast.success(res?.message || 'Meal updated successfully');
                closeModal();
                dispatch(fetchMeals(fetchParams));
                return;
            }

            // ── RANGE mode (has startDate/endDate) ─────────────────────
            if (formData.startDate && formData.endDate) {
                const res = await dispatch(bulkCreateMeals({
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    type: formData.type,
                    userIds: formData.userIds || [],
                    isGuestMeal: formData.isGuestMeal,
                    guestCount: formData.guestCount || 0,
                    remarks: formData.remarks || '',
                })).unwrap();

                const result = res?.data || res;
                const inserted = result?.inserted || 0;
                const updated = result?.updated || 0;
                const skipped = result?.skipped || 0;

                if (inserted > 0 || updated > 0) {
                    const parts = [];
                    if (inserted > 0) parts.push(`${inserted} added`);
                    if (updated > 0) parts.push(`${updated} updated`);
                    if (skipped > 0) parts.push(`${skipped} unchanged`);
                    toast.success(parts.join(' · '));
                } else if (skipped > 0) {
                    toast(`All ${skipped} meals unchanged.`, { icon: 'ℹ️' });
                } else {
                    toast.success('Meals saved successfully');
                }

                closeModal();
                dispatch(fetchMeals(fetchParams));
                return;
            }

            // ── SINGLE DAY mode ────────────────────────────────────────
            if (isAdmin && formData.userIds?.length > 0) {
                // Admin creating for multiple members → use bulk API with same start/end
                const res = await dispatch(bulkCreateMeals({
                    startDate: formData.date,
                    endDate: formData.date,
                    type: formData.type,
                    userIds: formData.userIds,
                    isGuestMeal: formData.isGuestMeal,
                    guestCount: formData.guestCount || 0,
                    remarks: formData.remarks || '',
                })).unwrap();

                const result = res?.data || res;
                const inserted = result?.inserted || 0;
                const updated = result?.updated || 0;
                const skipped = result?.skipped || 0;

                if (inserted > 0 || updated > 0) {
                    const parts = [];
                    if (inserted > 0) parts.push(`${inserted} added`);
                    if (updated > 0) parts.push(`${updated} updated`);
                    if (skipped > 0) parts.push(`${skipped} unchanged`);
                    toast.success(parts.join(' · '));
                } else if (skipped > 0) {
                    toast(`All ${skipped} meals unchanged.`, { icon: 'ℹ️' });
                } else {
                    toast.success('Meals saved successfully');
                }
            } else {
                // Regular user single-day creation
                const res = await dispatch(createMeal(formData)).unwrap();
                toast.success(res?.message || 'Meal created successfully');
            }

            closeModal();
            dispatch(fetchMeals(fetchParams));
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to save meal');
            setErrorMsg(msg);
            toast.error(msg);
        }
    }, [editingMeal, dispatch, closeModal, isAdmin, fetchParams]);

    const handleDeleteRequest = useCallback((meal) => setDeletingMeal(meal), []);
    const handleDeleteCancel = useCallback(() => { if (!isDeleting) setDeletingMeal(null); }, [isDeleting]);
    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingMeal || isDeleting) return;
        setIsDeleting(true);
        try {
            setErrorMsg('');
            const res = await dispatch(deleteMeal(deletingMeal._id)).unwrap();
            toast.success(res?.message || 'Meal deleted successfully');
            setDeletingMeal(null);
            dispatch(fetchMeals(fetchParams));
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to delete meal');
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    }, [dispatch, deletingMeal, isDeleting, fetchParams]);

    // ── Multi-select / Bulk Delete ────────────────────────────────────────

    const handleToggleSelect = useCallback((mealId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(mealId)) next.delete(mealId);
            else next.add(mealId);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback((mealsArray) => {
        setSelectedIds((prev) => {
            if (prev.size === mealsArray.length) return new Set();
            return new Set(mealsArray.map((m) => m._id));
        });
    }, []);

    const handleBulkDeleteRequest = useCallback(() => {
        if (selectedIds.size === 0) return;
        setBulkDeleteTarget({ mealIds: [...selectedIds], count: selectedIds.size });
    }, [selectedIds]);

    const handleBulkDeleteConfirm = useCallback(async () => {
        if (!bulkDeleteTarget || isBulkDeleting) return;
        setIsBulkDeleting(true);
        try {
            setErrorMsg('');
            await dispatch(bulkDeleteMeals({ mealIds: bulkDeleteTarget.mealIds })).unwrap();
            toast.success(`${bulkDeleteTarget.count} meal(s) deleted successfully`);
            setBulkDeleteTarget(null);
            setSelectedIds(new Set());
            dispatch(fetchMeals(fetchParams));
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.message || 'Failed to delete meals');
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsBulkDeleting(false);
        }
    }, [dispatch, bulkDeleteTarget, isBulkDeleting, fetchParams]);

    const handleBulkDeleteCancel = useCallback(() => {
        if (!isBulkDeleting) setBulkDeleteTarget(null);
    }, [isBulkDeleting]);

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
    const isFiltered = hasActive;

    const handlePageChange = useCallback((p) => setPage(p), []);
    const handleLimitChange = useCallback((l) => { setLimit(l); setPage(1); }, []);
    const handleToggleFilters = useCallback(() => setShowFilters(p => !p), []);

    return (
        <MainLayout>
            <div className="relative min-h-[80vh] max-w-7xl mx-auto">
                <div className="relative z-10 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                                    <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Admin View
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    <HiOutlineSparkles className="w-3.5 h-3.5" /> My Meals
                                </span>
                            )}
                            <h2 className="text-h1">
                                {isAdmin ? 'Meals Overview' : 'Meals Hub'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {isAdmin ? 'Monitor and manage all meal records across all members.' : 'Track and manage your daily meal selections and history.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={openCreate}
                            >
                                <HiOutlinePlus className="w-4 h-4 flex-shrink-0" />
                                <span>Add Meal</span>
                            </Button>

                            <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border/40">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                    aria-label="Grid view"
                                    className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiOutlineSquares2X2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                    aria-label="List view"
                                    className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiOutlineListBullet className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <MealStatsBar meals={meals || []} isAdmin={isAdmin} />

                    {/* Dining Roster */}
                    <div
                        className="card-base overflow-hidden"
                    >
                        <button
                            onClick={() => setIsRosterOpen(p => !p)}
                            className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left group"
                            aria-expanded={isRosterOpen}
                            aria-label="Toggle dining roster"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <IoFastFoodOutline className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                                        Dining Roster
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {isRosterOpen ? 'Viewing meal preferences' : 'Tap to view meal preferences'}
                                    </p>
                                </div>
                            </div>

                            <div
                                className="text-muted-foreground group-hover:text-foreground transition-transform duration-200"
                                style={{ transform: isRosterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >
                                <HiOutlineChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </button>

                        <div
                            className="overflow-hidden transition-all duration-300 ease-out"
                            style={{
                                maxHeight: isRosterOpen ? '2000px' : '0px',
                                opacity: isRosterOpen ? 1 : 0,
                                transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
                            }}
                        >
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 contain-content">
                                <MealPolling selectedDate={selectedDate} />
                            </div>
                        </div>
                    </div>


                    {/* Search + Filter Bar */}
                    <MealSearchBar
                        isAdmin={isAdmin}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        typeFilter={typeFilter}
                        onTypeChange={setTypeFilter}
                        dateFrom={dateFrom}
                        onDateFromChange={setDateFrom}
                        dateTo={dateTo}
                        onDateToChange={setDateTo}
                        showFilters={showFilters}
                        onToggleFilters={handleToggleFilters}
                        filteredCount={filtered?.length || 0}
                        totalCount={meals?.length || 0}
                        hasActive={hasActive}
                        onClearFilters={clearFilters}
                    />

                    {/* Error Banner */}
                    {(isError || errorMsg) && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                            <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                            <p className="flex-1 text-sm font-medium">{errorMsg || message || 'Something went wrong. Please try again.'}</p>
                            <button
                                onClick={() => { setErrorMsg(''); dispatch(reset()); }}
                                className="flex-shrink-0 p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                                title="Dismiss"
                                aria-label="Dismiss error"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    {isLoading && !isAdmin && (!meals || meals.length === 0) ? (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : isAdmin ? (
                        <AdminMealView
                            meals={filtered}
                            isLoading={isLoading}
                            viewMode={viewMode}
                            onEdit={openEdit}
                            onDelete={handleDeleteRequest}
                            selectedIds={selectedIds}
                            onToggleSelect={handleToggleSelect}
                            onSelectAll={handleSelectAll}
                            onBulkDeleteRequest={handleBulkDeleteRequest}
                        />
                    ) : (
                        <div className="card-base overflow-hidden">
                            <button
                                onClick={() => setIsHistoryOpen(p => !p)}
                                className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left group"
                                aria-expanded={isHistoryOpen}
                                aria-label="Toggle meals history"
                                type="button"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
                                        <HiOutlineClock className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                                            Meals History
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {isHistoryOpen ? 'Showing all meal records' : 'Tap to view meal records'}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className="text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0"
                                    style={{ transform: isHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >
                                    <HiOutlineChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                            </button>
                            <div
                                className="overflow-hidden transition-all duration-300 ease-out"
                                style={{
                                    maxHeight: isHistoryOpen ? '9999px' : '0px',
                                    opacity: isHistoryOpen ? 1 : 0,
                                    transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
                                }}
                            >
                                <div className="px-4 pb-4 sm:px-5 sm:pb-5 contain-content">
                                    <div className="pt-3 border-t border-border/40 space-y-4">
                                        {isFiltered && meals?.length > 0 && (
                                            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-primary text-xs font-medium">
                                                <HiOutlineInformationCircle className="w-4 h-4 flex-shrink-0" />
                                                Filtering within the current page ({meals.length} records). Clear filters to browse all pages.
                                            </div>
                                        )}
                                        <MealList
                                            meals={filtered}
                                            viewMode={viewMode}
                                            onEdit={openEdit}
                                            onDelete={handleDeleteRequest}
                                            isAdmin={isAdmin}
                                            selectedIds={selectedIds}
                                            onToggleSelect={handleToggleSelect}
                                            onSelectAll={handleSelectAll}
                                            onBulkDeleteRequest={handleBulkDeleteRequest}
                                        />
                                        {!isFiltered && (
                                            <Pagination pagination={pagination} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Meal create/edit modal */}
                <MealModal isOpen={isModalOpen} onClose={closeModal}
                    title={editingMeal ? 'Edit Meal Record' : (isAdmin ? 'Add Meal Record' : 'Track New Meal')}>
                    <MealForm
                        initialData={editingMeal}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        isAdmin={isAdmin}
                        currentUser={user}
                    />
                </MealModal>

                {/* Bulk delete confirm dialog */}
                {bulkDeleteTarget && (
                    <DeleteMealDialog
                        isBulk
                        mealIds={bulkDeleteTarget.mealIds}
                        selectedCount={bulkDeleteTarget.count}
                        onConfirm={handleBulkDeleteConfirm}
                        onCancel={handleBulkDeleteCancel}
                        isDeleting={isBulkDeleting}
                    />
                )}
                {/* Single delete confirm dialog */}
                {!bulkDeleteTarget && deletingMeal && (
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
