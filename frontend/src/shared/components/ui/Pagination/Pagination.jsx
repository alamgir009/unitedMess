import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 mt-6 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Rows per page:</span>
        <div className="relative">
          <select
            value={isAll ? 'all' : limit}
            onChange={(e) => onLimitChange(e.target.value)}
            aria-label="Rows per page"
            className="appearance-none bg-muted/40 hover:bg-muted/60 text-foreground text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-border focus:ring-2 focus:ring-ring/40 focus:outline-none transition-colors cursor-pointer"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All' : opt}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {total === 0 ? '0' : isAll ? `All ${total}` : `${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`}
        </span>

        {!isAll && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrev}
              aria-label="Previous page"
              className={`touch-target p-1.5 rounded-lg border transition-all ${
                !hasPrev
                  ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                  : 'border-border hover:bg-muted/40 text-foreground'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-1 mx-2 text-sm" aria-label={`Page ${page} of ${pages}`}>
              {getPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => onPageChange(num)}
                    aria-label={`Go to page ${num}`}
                    aria-current={num === page ? 'page' : undefined}
                    className={`touch-target min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all ${
                      num === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {num}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              aria-label="Next page"
              className={`touch-target p-1.5 rounded-lg border transition-all ${
                !hasNext
                  ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                  : 'border-border hover:bg-muted/40 text-foreground'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
