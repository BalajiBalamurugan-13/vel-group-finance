import { useState } from 'react';
import { Receipt, Plus, ChevronDown } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { CollectionTable } from './CollectionTable';
import { CollectionCard } from './CollectionCard';
import type { Collection } from '../types';

const PAGE_SIZE = 20;

interface CollectionListProps {
  collections: Collection[];
  isLoading: boolean;
  onRecordPayment: () => void;
  onViewDetails: (collection: Collection) => void;
}

export function CollectionList({
  collections,
  isLoading,
  onRecordPayment,
  onViewDetails,
}: CollectionListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-xl border border-border bg-surface p-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Mobile skeleton */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="w-12 h-12 text-secondary-400" />}
        title="No collection records found"
        description="No weekly installment payments match your search or filters."
        action={
          <Button onClick={onRecordPayment} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Record Weekly Payment
          </Button>
        }
      />
    );
  }

  const visibleCollections = collections.slice(0, visibleCount);
  const hasMore = visibleCount < collections.length;

  return (
    <div className="mt-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <CollectionTable
          collections={visibleCollections}
          onViewDetails={onViewDetails}
        />
      </div>

      {/* Mobile Card Grid */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {visibleCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Load More / Count */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-secondary-500">
          Showing {visibleCollections.length} of {collections.length} records
        </p>
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            leftIcon={<ChevronDown className="h-4 w-4" />}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
}
