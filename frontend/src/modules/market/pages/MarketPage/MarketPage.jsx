import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import toast from 'react-hot-toast';

import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import Pagination from '@/shared/components/ui/Pagination/Pagination';

// Market-specific components
import MarketHeader from '../../components/MarketHeader/MarketHeader';
import MarketStatsBar from '../../components/MarketStatsBar/MarketStatsBar';
import MarketSearchBar from '../../components/MarketSearchBar/MarketSearchBar';
import MarketList from '../../components/MarketList/MarketList';
import AdminMarketView from '../../components/AdminMarketView/AdminMarketView';
import MarketModal from '../../components/MarketModal/MarketModal';
import MarketScheduleChart from '../../components/MarketScheduleChart/MarketScheduleChart';
import DeleteMarketDialog from '../../components/DeleteMarketDialog/DeleteMarketDialog';

// Redux actions
import {
    fetchMarkets,
    fetchMarketSchedule,
    createMarket,
    updateMarket,
    deleteMarket,
    reset,
    adminCreateMarket,
} from '../../store/market.slice';



const MarketForm = lazy(() => import('../../components/MarketForm/MarketForm'));

/* ── Skeleton loader card ── */
const SkeletonCard = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card p-5 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="space-y-2">
                <div className="h-7 w-14 bg-muted/60 rounded-md" />
                <div className="h-3 w-28 bg-muted/40 rounded" />
            </div>
            <div className="h-6 w-14 bg-muted/40 rounded-full" />
        </div>
        <div className="h-3 w-full bg-muted/30 rounded mb-1.5" />
        <div className="h-3 w-2/3 bg-muted/20 rounded mb-5" />
        <div className="h-8 w-full bg-muted/30 rounded-lg" />
    </div>
));
SkeletonCard.displayName = 'SkeletonCard';

/* ══════════════════════════════════════════════
   MARKET PAGE
   Responsibilities:
   - Data fetching & Redux state
   - Filter / search / pagination logic
   - CRUD handlers
   - Composes UI from extracted sub-components
══════════════════════════════════════════════ */
const MarketPage = () => {
    const dispatch = useDispatch();
    const { markets, schedule, isScheduleLoading, pagination, isLoading, isError, message } = useSelector((s) => s.market);
    const { user } = useSelector((s) => s.auth);
    const isAdmin = user?.role === 'admin';

    // ── Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMarket, setEditingMarket] = useState(null);
    
    // ── Delete Dialog
    const [marketToDelete, setMarketToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── View & filter
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // ── Scheduler collapse
    const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

    // ── Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // ── Error banner
    const [errorMsg, setErrorMsg] = useState('');

    const fetchParams = useMemo(() =>
        isAdmin ? { page: 1, limit: 'all' } : { page, limit },
        [isAdmin, page, limit],
    );

    /* ── Data fetch ── */
    useEffect(() => {
        dispatch(fetchMarkets(fetchParams))
            .unwrap()
            .catch((err) => {
                setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to load market entries');
            });
            
        // Fetch current month schedule
        const now = new Date();
        dispatch(fetchMarketSchedule({ year: now.getFullYear(), month: now.getMonth() + 1 }));

        return () => { dispatch(reset()); };
    }, [dispatch, fetchParams]);

    /* ── Modal handlers ── */
    const openCreate = useCallback(() => { setEditingMarket(null); setIsModalOpen(true); }, []);
    const openEdit   = useCallback((m) => { setEditingMarket(m);    setIsModalOpen(true); }, []);
    const closeModal = useCallback(() => { setIsModalOpen(false);   setEditingMarket(null); }, []);

    /* ── CRUD handlers ── */
    const handleSubmit = useCallback(async (formData) => {
        try {
            setErrorMsg('');
            if (editingMarket) {
                const res = await dispatch(updateMarket({ marketId: editingMarket._id, marketData: formData })).unwrap();
                toast.success(res?.message || 'Market entry updated successfully');
            } else if (isAdmin && formData.userIds?.length > 0) {
                let created = 0, errors = 0;
                for (const uid of formData.userIds) {
                    try {
                        await dispatch(adminCreateMarket({ userId: uid, marketData: formData })).unwrap();
                        created++;
                    } catch {
                        errors++;
                    }
                }
                if (errors === 0) {
                    toast.success(`Entries created for ${created} member${created !== 1 ? 's' : ''}`);
                } else {
                    toast.success(`${created} created, ${errors} failed`);
                }
            } else {
                const res = await dispatch(createMarket(formData)).unwrap();
                toast.success(res?.message || 'Market entry created successfully');
            }
            closeModal();
            dispatch(fetchMarkets(fetchParams));
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to save market entry');
            closeModal();
        }
    }, [editingMarket, dispatch, closeModal, isAdmin, fetchParams]);

    const handleDeleteClick = useCallback((market) => {
        setMarketToDelete(market);
    }, []);

    const executeDelete = useCallback(async () => {
        if (!marketToDelete) return;
        try {
            setIsDeleting(true);
            setErrorMsg('');
            const res = await dispatch(deleteMarket(marketToDelete._id)).unwrap();
            toast.success(res?.message || 'Market entry deleted successfully');
            setMarketToDelete(null);
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to delete market entry');
        } finally {
            setIsDeleting(false);
        }
    }, [dispatch, marketToDelete]);

    const clearFilters = useCallback(() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }, []);

    const toggleScheduler = useCallback(() => {
        setIsSchedulerOpen((p) => !p);
    }, []);

    /* ── Derived stats ── */
    const totalAmount  = useMemo(() => markets?.reduce((s, m) => s + (m.amount || 0), 0) || 0, [markets]);
    const uniqueUsers  = useMemo(() =>
        isAdmin ? new Set(markets?.map(m => typeof m.user === 'object' ? m.user?._id : m.user) || []).size : 0,
    [markets, isAdmin]);

    /* ── Client-side filter ── */
    const filtered = useMemo(() => (markets || []).filter((m) => {
        if (dateFrom && new Date(m.date) < new Date(dateFrom)) return false;
        if (dateTo   && new Date(m.date) > new Date(dateTo))   return false;
        if (searchQuery.trim()) {
            const q    = searchQuery.toLowerCase();
            const name = (typeof m.user === 'object' ? m.user?.name  : '') || '';
            const mail = (typeof m.user === 'object' ? m.user?.email : '') || '';
            if (
                !name.toLowerCase().includes(q) &&
                !mail.toLowerCase().includes(q) &&
                !(m.items || '').toLowerCase().includes(q) &&
                !(m.description || '').toLowerCase().includes(q)
            ) return false;
        }
        return true;
    }), [markets, dateFrom, dateTo, searchQuery]);

    const hasActive = !!(dateFrom || dateTo || searchQuery.trim());

    /* ── Stable pagination callbacks ── */
    const handlePageChange = useCallback((p) => setPage(p), []);
    const handleLimitChange = useCallback((l) => { setLimit(l); setPage(1); }, []);

    /* ── Stable error dismiss callback ── */
    const dismissError = useCallback(() => { setErrorMsg(''); dispatch(reset()); }, [dispatch]);

    /* ── Render ── */
    return (
        <MainLayout>
            <div className="relative min-h-[80vh] max-w-7xl mx-auto">
                <div className="relative z-10 space-y-6">

                    {/* ── Header (title + view toggle + add button) ── */}
                    <MarketHeader
                        isAdmin={isAdmin}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        onAddClick={openCreate}
                    />

                    {/* ── Stat pills ── */}
                    <MarketStatsBar
                        totalRecords={markets?.length || 0}
                        totalAmount={totalAmount}
                        uniqueUsers={uniqueUsers}
                        isAdmin={isAdmin}
                    />

                    {/* ── Error banner ── */}
                    <AnimatePresence>
                        {(isError || errorMsg) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
                            >
                                <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                                <p className="flex-1 text-sm font-medium">
                                    {errorMsg || message || 'Something went wrong. Please try again.'}
                                </p>
                                <button
                                    onClick={dismissError}
                                    className="flex-shrink-0 p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                                    title="Dismiss"
                                    aria-label="Dismiss error"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Content: skeleton → list/grid → pagination ── */}
                    <MarketScheduleChart
                        schedule={schedule}
                        isLoading={isScheduleLoading}
                        isCollapsed={!isSchedulerOpen}
                        onToggle={toggleScheduler}
                    />

                    {/* ── Search + date filter bar ── */}
                    <MarketSearchBar
                        isAdmin={isAdmin}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        dateFrom={dateFrom}
                        onDateFromChange={setDateFrom}
                        dateTo={dateTo}
                        onDateToChange={setDateTo}
                        showFilters={showFilters}
                        onToggleFilters={() => setShowFilters((p) => !p)}
                        filteredCount={filtered?.length || 0}
                        totalCount={markets?.length || 0}
                        hasActive={hasActive}
                        onClearFilters={clearFilters}
                    />

                    {isLoading && !isAdmin && (!markets || markets.length === 0) ? (
                        <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
                        </div>
                    ) : isAdmin ? (
                        <AdminMarketView
                            markets={filtered}
                            isLoading={isLoading}
                            viewMode={viewMode}
                            onEdit={openEdit}
                            onDelete={handleDeleteClick}
                            isAdmin={isAdmin}
                        />
                    ) : (
                        <>
                            <MarketList
                                markets={filtered}
                                viewMode={viewMode}
                                onEdit={openEdit}
                                onDelete={handleDeleteClick}
                                isAdmin={isAdmin}
                            />

                            {!hasActive && (
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                />
                            )}
                        </>
                    )}

                </div>

                {/* ── Create / Edit modal ── */}
                <MarketModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={editingMarket
                        ? 'Edit Market Entry'
                        : isAdmin ? 'Add Market Entry' : 'Log New Purchase'}
                >
                    {isModalOpen && (
                        <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>}>
                            <MarketForm
                                initialData={editingMarket}
                                onSubmit={handleSubmit}
                                onCancel={closeModal}
                                isAdmin={isAdmin}
                                currentUser={user}
                            />
                        </Suspense>
                    )}
                </MarketModal>

                <DeleteMarketDialog
                    market={marketToDelete}
                    isDeleting={isDeleting}
                    onConfirm={executeDelete}
                    onCancel={() => setMarketToDelete(null)}
                />

            </div>
        </MainLayout>
    );
};

export default MarketPage;
