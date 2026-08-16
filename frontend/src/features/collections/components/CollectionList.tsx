import { Receipt, Plus } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { CollectionTable } from './CollectionTable';
import { CollectionCard } from './CollectionCard';
import type { Collection } from '../types';

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
  if (isLoading) {
    return (
      <div className="space-y-4">
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
          <Button onClick={onRecordPayment} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Record Weekly Payment
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <CollectionTable
          collections={collections}
          onViewDetails={onViewDetails}
        />
      </div>

      {/* Mobile Card Grid */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </>
  );
}
