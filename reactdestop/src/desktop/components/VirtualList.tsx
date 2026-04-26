import type { CSSProperties, ReactNode, UIEvent } from 'react';
import { Fragment, useMemo, useState } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  maxHeight?: number;
  overscan?: number;
  className?: string;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  maxHeight = 620,
  overscan = 6,
  className = '',
  getKey,
  renderItem,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = Math.min(items.length * itemHeight, maxHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);
  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex).map((item, offset) => ({ item, index: startIndex + offset })),
    [endIndex, items, startIndex],
  );

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div className={`virtual-list ${className}`.trim()} style={{ height: viewportHeight }} onScroll={handleScroll}>
      <div className="virtual-spacer" style={{ height: items.length * itemHeight }}>
        {visibleItems.map(({ item, index }) => (
          <Fragment key={getKey(item, index)}>
            {renderItem(item, index, {
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
