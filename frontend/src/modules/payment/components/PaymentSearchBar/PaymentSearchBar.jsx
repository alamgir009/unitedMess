import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar } from '@/shared/components/ui';

/* ─── Filter data ─────────────────────────────────────── */
const STATUS_OPTS = [
    { value: '',                    label: 'All' },
    { value: 'pending',             label: 'Pending' },
    { value: 'pending_verification',label: 'Pending Verification' },
    { value: 'completed',           label: 'Completed' },
    { value: 'failed',              label: 'Failed' },
    { value: 'refunded',            label: 'Refunded' },
];

const TYPE_OPTS = [
    { value: '',          label: 'All' },
    { value: 'mess_bill', label: 'Mess Bill' },
    { value: 'gas_bill',  label: 'Gas Bill' },
    { value: 'other',     label: 'Other' },
];

const METHOD_OPTS = [
    { value: '',          label: 'All' },
    { value: 'cash',      label: 'Cash' },
    { value: 'online',    label: 'Online' },
    { value: 'razorpay',  label: 'Razorpay' },
    { value: 'upi_manual',label: 'Manual UPI' },
];

/* ─── Pill toggle group ────────────────────────────────── */
const PillGroup = ({ label, options, value, onChange }) => (
    <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">
            {label}
        </p>
        <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            active
                                ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30'
                                : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    </div>
);

/* ─── Date field ───────────────────────────────────────── */
const DateField = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">{label}</p>
        <div className="relative">
            <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 pl-8 pr-3 rounded-xl border border-border/50 bg-muted/30 text-xs text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
        </div>
    </div>
);

/**
 * PaymentSearchBar — search + collapsible pill-filter panel.
 */
const PaymentSearchBar = ({
    isAdmin,
    searchQuery, onSearchChange,
    dateFrom,    onDateFromChange,
    dateTo,      onDateToChange,
    statusFilter,  onStatusChange,
    typeFilter,    onTypeChange,
    methodFilter,  onMethodChange,
    showFilters,   onToggleFilters,
    filteredCount, totalCount,
    hasActive,     onClearFilters,
}) => (
    <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder={isAdmin ? 'Search name, email, month, remarks…' : 'Search month, remarks…'}
        filteredCount={filteredCount}
        totalCount={totalCount}
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasActive={hasActive}
        onClearFilters={onClearFilters}
    >
        <div className="flex flex-wrap gap-x-6 gap-y-4">
            <PillGroup label="Status" options={STATUS_OPTS} value={statusFilter} onChange={onStatusChange} />
            <PillGroup label="Type"   options={TYPE_OPTS}   value={typeFilter}   onChange={onTypeChange} />
            <PillGroup label="Method" options={METHOD_OPTS} value={methodFilter} onChange={onMethodChange} />

            {/* Date range */}
            <div className="flex flex-wrap gap-3">
                <DateField label="From" value={dateFrom} onChange={onDateFromChange} />
                <DateField label="To"   value={dateTo}   onChange={onDateToChange}   />
            </div>
        </div>
    </SearchBar>
);

export default PaymentSearchBar;
