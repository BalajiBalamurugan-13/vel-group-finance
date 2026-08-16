import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Play, CheckCircle2, XCircle, Users, Calendar, MapPin } from 'lucide-react';
import { GroupStatusBadge } from './GroupStatusBadge';
import type { Group, GroupStatus } from '../types';

interface GroupCardProps {
  group: Group;
  onEdit: (group: Group) => void;
  onRequestStatusChange: (group: Group, targetStatus: GroupStatus) => void;
  formatMoney: (val: number) => string;
}

export function GroupCard({
  group,
  onEdit,
  onRequestStatusChange,
  formatMoney,
}: GroupCardProps) {
  return (
    <Card className="flex flex-col p-4">
      {/* Header: Name + Status Badge */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-secondary-900">
            {group.group_name}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-secondary-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-secondary-400" />
              {group.location}
            </span>
            {group.start_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-secondary-400" />
                {group.start_date}
              </span>
            )}
          </div>
        </div>
        <GroupStatusBadge status={group.status} />
      </div>

      {/* Scheme & Stats Block */}
      <div className="mb-4 space-y-2 rounded-lg bg-secondary-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary-500">Scheme</span>
          <span className="font-medium text-secondary-900">
            {group.scheme?.scheme_name || 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-secondary-500">
            <Users className="h-3.5 w-3.5" />
            Members
          </span>
          <span className="font-medium text-secondary-900">
            {group.member_count}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-secondary-200 pt-2 text-xs">
          <span className="text-secondary-500">Total Group Amount</span>
          <span className="font-semibold text-secondary-900">
            {formatMoney(group.total_group_amount)}
          </span>
        </div>
      </div>

      {/* Remarks if any */}
      {group.remarks && (
        <p className="mb-3 text-xs text-secondary-500 line-clamp-1 italic">
          {group.remarks}
        </p>
      )}

      {/* Action Buttons (Touch targets >= 44px) */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        {group.status !== 'Closed' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            leftIcon={<Edit2 className="h-4 w-4" />}
            onClick={() => onEdit(group)}
          >
            Edit
          </Button>
        )}

        {group.status === 'Draft' && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 min-h-[44px]"
            leftIcon={<Play className="h-4 w-4" />}
            onClick={() => onRequestStatusChange(group, 'Active')}
          >
            Activate
          </Button>
        )}

        {group.status === 'Active' && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 min-h-[44px]"
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => onRequestStatusChange(group, 'Completed')}
          >
            Complete
          </Button>
        )}

        {group.status !== 'Closed' && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] text-error-600 hover:bg-error-50"
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={() => onRequestStatusChange(group, 'Closed')}
          >
            Close
          </Button>
        )}
      </div>
    </Card>
  );
}
