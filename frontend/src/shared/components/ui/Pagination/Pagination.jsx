import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
  if (!pagination) return null;

  const { page, limit, total, pages, hasNext, hasPrev, isAll } = pagination;

  if (total === 0) return null;

  const limitOptions = [10, 20, 50, 'all'];

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;

    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(pages - 1, page + 1);

      if (page <= 3) {
        start = 2;
        end = 4;
      }
      if (page >= pages - 2) {
        start = pages - 3;
        end = pages - 1;
      }

      if (start > 2) pageNumbers.push('...');
      for (let i = start; i <= end; i++) pageNumbers.push(i);
      if (end < pages - 1) pageNumbers.push('...');
      pageNumbers.push(pages);
    }
    return pageNumbers;
  };

  const rangeLabel = isAll
    ? `All ${total}`
    : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`;

  const btnBase = 'inline-flex items-center justify-center min-w-[36px] h-9 rounded-lg border border-border/40 bg-muted/20 text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-35 disabled:cursor-not-allowed hover:text-foreground hover:bg-muted/50 hover:border-border/60 active:scale-95';

  return (
    <nav aria-label="Pagination" className="mt-6 space-y-2.5">

      {/* ═══════════ MOBILE: single compact row ═══════════ */}
      <div className="sm:hidden flex items-center gap-2 rounded-xl border border-border/50 bg-card depth-top px-3 py-2.5">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
          className={btnBase}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center: range + page indicator */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground tabular-nums truncate select-none">
            {rangeLabel}
          </span>
          {!isAll && (
            <>
              <span className="text-muted-foreground/30 text-xs select-none">&middot;</span>
              <span className="text-xs font-bold text-foreground tabular-nums select-none">
                {page}<span className="text-muted-foreground/50 font-medium">/{pages}</span>
              </span>
            </>
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
          className={btnBase}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile: rows per page — compact inline */}
      <div className="sm:hidden flex items-center justify-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground/70 select-none">Rows</span>
        <div className="relative">
          <select
            value={isAll ? 'all' : limit}
            onChange={(e) => onLimitChange(e.target.value)}
            aria-label="Rows per page"
            className="appearance-none bg-muted/30 hover:bg-muted/50 active:bg-muted/70 text-foreground text-[11px] font-semibold h-7 pl-2.5 pr-6 rounded-md border border-border/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none transition-colors cursor-pointer tabular-nums"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All' : opt}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-1 flex items-center pointer-events-none text-muted-foreground/50">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ═══════════ DESKTOP: full layout (unchanged) ═══════════ */}
      <div className="hidden sm:flex items-center justify-between gap-4 py-3 px-5 rounded-xl border border-border/50 bg-card depth-top">
        {/* Left: Rows per page */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-muted-foreground select-none">Rows per page</span>
          <div className="relative">
            <select
              value={isAll ? 'all' : limit}
              onChange={(e) => onLimitChange(e.target.value)}
              aria-label="Rows per page"
              className="appearance-none bg-muted/40 hover:bg-muted/60 active:bg-muted/80 text-foreground text-xs font-semibold h-8 pl-3 pr-7 rounded-lg border border-border/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none transition-colors cursor-pointer tabular-nums"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All' : opt}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none text-muted-foreground/60">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center: Range info */}
        <span className="text-xs font-medium text-muted-foreground tabular-nums select-none">
          {rangeLabel}
        </span>

        {/* Right: Page navigation */}
        {!isAll && (
          <div className="flex items-center gap-1.5">
            {/* First page */}
            <button
              onClick={() => onPageChange(1)}
              disabled={!hasPrev}
              aria-label="First page"
              className={btnBase}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrev}
              aria-label="Previous page"
              className={btnBase}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1" aria-label={`Page ${page} of ${pages}`}>
              {getPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground/40 text-xs select-none">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => onPageChange(num)}
                    aria-label={`Go to page ${num}`}
                    aria-current={num === page ? 'page' : undefined}
                    className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 ${
                      num === page
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 ring-1 ring-primary/15'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent hover:border-border/50'
                    }`}
                  >
                    {num}
                  </button>
                )
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              aria-label="Next page"
              className={btnBase}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last page */}
            <button
              onClick={() => onPageChange(pages)}
              disabled={!hasNext}
              aria-label="Last page"
              className={btnBase}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

Pagination.displayName = 'Pagination';
export default Pagination;
