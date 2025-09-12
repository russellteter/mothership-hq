import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface Column<T> {
  id: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: number;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  height?: number;
  onRowClick?: (item: T, index: number) => void;
  selectedItemId?: string;
  getItemId: (item: T) => string;
  className?: string;
  stickyHeader?: boolean;
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  height = 400,
  onRowClick,
  selectedItemId,
  getItemId,
  className,
  stickyHeader = true
}: VirtualizedTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 200), 0);
  }, [columns]);

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div 
        className={cn(
          "grid bg-muted/50 border-b border-border",
          stickyHeader && "sticky top-0 z-10"
        )}
        style={{
          gridTemplateColumns: columns.map(col => `${col.width || 200}px`).join(' ')
        }}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "h-12 px-4 text-left align-middle font-medium text-muted-foreground flex items-center text-sm",
              column.className
            )}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual Scrollable Body */}
      <div
        ref={parentRef}
        className="w-full overflow-auto"
        style={{
          height: `${height}px`,
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const itemId = getItemId(item);
            const isSelected = selectedItemId === itemId;

            return (
              <div
                key={virtualRow.key}
                className={cn(
                  "grid border-b border-border absolute top-0 left-0 w-full cursor-pointer hover:bg-muted/50 transition-colors",
                  isSelected && "bg-muted",
                  "group"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: columns.map(col => `${col.width || 200}px`).join(' ')
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={cn(
                      "px-4 align-middle flex items-center text-sm",
                      column.className
                    )}
                  >
                    {column.accessor(item)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}