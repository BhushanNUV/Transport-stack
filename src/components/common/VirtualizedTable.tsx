'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface VirtualizedTableProps {
  data: any[];
  rowHeight: number;
  visibleRows: number;
  renderRow: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export default function VirtualizedTable({
  data,
  rowHeight,
  visibleRows,
  renderRow,
  className = ''
}: VirtualizedTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = data.length * rowHeight;
  const viewportHeight = visibleRows * rowHeight;
  
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.min(
    startIndex + visibleRows + 1,
    data.length
  );

  const offsetY = startIndex * rowHeight;
  const visibleData = data.slice(startIndex, endIndex);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: viewportHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleData.map((item, index) => (
            <div key={startIndex + index} style={{ height: rowHeight }}>
              {renderRow(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}