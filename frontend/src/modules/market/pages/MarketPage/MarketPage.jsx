import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import MarketForm from '../../components/MarketForm/MarketForm';
import MarketModal from '../../components/MarketModal/MarketModal';
import MarketScheduleChart from '../../components/MarketScheduleChart/MarketScheduleChart';

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

/* ── Skeleton loader card ── */
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

    // ── View & filter
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // ── Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // ── Error banner
    const [errorMsg, setErrorMsg] = useState('');

    /* ── Data fetch ── */
    useEffect(() => {
        dispatch(fetchMarkets({ page, limit }))
            .unwrap()
            .catch((err) => {
                setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to load market entries');
            });
            
        // Fetch current month schedule
        const now = new Date();
        dispatch(fetchMarketSchedule({ year: now.getFullYear(), month: now.getMonth() + 1 }));

        return () => { dispatch(reset()); };
    }, [dispatch, page, limit]);

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
            } else if (isAdmin && formData.userId && formData.userId !== user._id && formData.userId !== user.id) {
                const res = await dispatch(adminCreateMarket({ userId: formData.userId, marketData: formData })).unwrap();
                toast.success(res?.message || 'Market entry created successfully');
            } else {
                const res = await dispatch(createMarket(formData)).unwrap();
                toast.success(res?.message || 'Market entry created successfully');
            }
            closeModal();
            dispatch(fetchMarkets({ page, limit }));
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to save market entry');
            closeModal();
        }
    }, [editingMarket, dispatch, closeModal, isAdmin, user, page, limit]);

    const handleDelete = useCallback(async (marketId) => {
        if (!window.confirm('Delete this market entry?')) return;
        try {
            setErrorMsg('');
            const res = await dispatch(deleteMarket(marketId)).unwrap();
            toast.success(res?.message || 'Market entry deleted successfully');
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to delete market entry');
        }
    }, [dispatch]);

    const clearFilters = useCallback(() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }, []);

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

    /* ── Render ── */
    return (
        <MainLayout>
            <div className="relative min-h-[80vh]">

                {/* Ambient background orbs */}
                <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] -z-10" />
                <div className="pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] rounded-full bg-teal-400/8 blur-[100px] -z-10" />
                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px] -z-10" />

                <div className="relative z-10 space-y-8">

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

                    {/* ── Error banner ── */}
                    <AnimatePresence>
                        {(isError || errorMsg) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500"
                            >
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
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Content: skeleton → list/grid → pagination ── */}
                    <MarketScheduleChart schedule={schedule} isLoading={isScheduleLoading} />

                    {isLoading && (!markets || markets.length === 0) ? (
                        <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
                        </div>
                    ) : (
                        <>
                            <MarketList
                                markets={filtered}
                                viewMode={viewMode}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                isAdmin={isAdmin}
                            />

                            {!hasActive && (
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={(p) => setPage(p)}
                                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
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
                    <MarketForm
                        initialData={editingMarket}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        isAdmin={isAdmin}
                        currentUser={user}
                    />
                </MarketModal>

            </div>
        </MainLayout>
    );
};

export default MarketPage;