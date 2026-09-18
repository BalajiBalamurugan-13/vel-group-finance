import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Play, CheckCircle2, Users, Calendar, MapPin } from 'lucide-react';
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
  const schemeName = group.scheme?.scheme_name || 'N/A';

  return (
    <Card className="flex flex-col p-0 overflow-hidden">
      {/* Card Header: Name + Code + Status */}
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-secondary-900 leading-snug break-words">
              {group.group_name}
            </h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {group.group_code && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600 flex-shrink-0">
                  {group.group_code}
                </span>
              )}
              <GroupStatusBadge status={group.status} />
            </div>
          </div>
        </div>

        {/* Meta: Location + Date */}
        <div className="mt-2 flex items-center gap-3 text-xs text-secondary-500 flex-wrap">
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 text-secondary-400 flex-shrink-0" />
            <span className="truncate">{group.location}</span>
          </span>
          {group.start_date && (
            <span className="inline-flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-3 w-3 text-secondary-400" />
              {group.start_date}
            </span>
          )}
        </div>
      </div>

      {/* Stats Block */}
      <div className="mx-3.5 mb-2.5 rounded-lg bg-secondary-50 p-2.5">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {/* Scheme */}
          <div className="col-span-3 pb-1.5 border-b border-secondary-200/70">
            <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
              Scheme
            </div>
            <div className="text-xs font-semibold text-secondary-900 truncate mt-0.5">
              {schemeName}
            </div>
          </div>

          {/* Members */}
          <div className="pt-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
              <Users className="h-3 w-3 inline-block mr-0.5 -mt-0.5" />
              Members
            </div>
            <div className="text-sm font-bold text-secondary-900 mt-0.5">
              {group.member_count}
            </div>
          </div>

          {/* Total Amount */}
          <div className="pt-1.5 col-span-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
              Total Amount
            </div>
            <div className="text-sm font-bold text-secondary-900 tabular-nums mt-0.5">
              {formatMoney(group.total_group_amount)}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks if any */}
      {group.remarks && (
        <div className="px-3.5 pb-2">
          <p className="text-[11px] text-secondary-500 line-clamp-1 italic">
            {group.remarks}
          </p>
        </div>
      )}

      {/* Action Buttons — Clean lifecycle */}
      <div className="mt-auto px-3.5 py-2.5 border-t border-border/50 bg-secondary-50/30 flex items-center gap-2">
        {group.status === 'Draft' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(group)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              Edit
            </Button>
            <div className="flex-1" />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={() => onRequestStatusChange(group, 'Active')}
            >
              Activate
            </Button>
          </>
        )}

        {group.status === 'Active' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(group)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              Edit
            </Button>
            <div className="flex-1" />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => onRequestStatusChange(group, 'Completed')}
            >
              Complete
            </Button>
          </>
        )}

        {group.status === 'Completed' && (
          <div className="w-full text-center">
            <span className="text-xs text-secondary-400 font-medium">
              Loan cycle completed
            </span>
          </div>
        )}

        {group.status === 'Closed' && (
          <div className="w-full text-center">
            <span className="text-xs text-secondary-400 font-medium">
              Group closed
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
