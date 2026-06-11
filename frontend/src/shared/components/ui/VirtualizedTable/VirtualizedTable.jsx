import { useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { cn } from '@/core/utils/helpers/string.helper';

const VirtualizedTable = ({
  columns = [],
  rows = [],
  rowHeight = 56,
  headerHeight = 44,
  maxHeight = 600,
  onRowClick,
  className,
  overscanCount = 5,
}) => {
  const listRef = useRef(null);

  const Row = useCallback(({ index, style }) => {
    const row = rows[index];
    return (
      <div
        style={style}
        className={cn(
          'flex items-center border-b border-border transition-colors',
          onRowClick && 'cursor-pointer hover:bg-muted/40',
          index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
        )}
        onClick={() => onRowClick?.(row)}
        role={onRowClick ? 'button' : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            style={{ flex: col.flex || 1, minWidth: col.minWidth || 80, maxWidth: col.maxWidth }}
            className={cn(
              'px-4 truncate text-sm',
              col.align === 'right' && 'text-right tabular-nums',
              col.align === 'center' && 'text-center',
              col.className,
            )}
          >
            {col.render ? col.render(row) : row[col.id]}
          </div>
        ))}
      </div>
    );
  }, [rows, columns, onRowClick]);

  if (rows.length === 0) return null;

  return (
    <div className={cn('border border-border rounded-lg overflow-x-auto bg-card', className)}>
      <div
        className="flex items-center border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        style={{ height: headerHeight }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            style={{ flex: col.flex || 1, minWidth: col.minWidth || 80, maxWidth: col.maxWidth }}
            className={cn(
              'px-4 truncate',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            )}
          >
            {col.label}
          </div>
        ))}
      </div>

      <List
        ref={listRef}
        height={Math.min(rows.length * rowHeight, maxHeight)}
        itemCount={rows.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={overscanCount}
      >
        {Row}
      </List>
    </div>
  );
};

VirtualizedTable.displayName = 'VirtualizedTable';
export default VirtualizedTable;
