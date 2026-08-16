import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { GroupStatusBadge } from './GroupStatusBadge';
import type { Group, GroupStatus } from '../types';

interface GroupTableProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onRequestStatusChange: (group: Group, targetStatus: GroupStatus) => void;
  formatMoney: (val: number) => string;
}

export function GroupTable({
  groups,
  onEdit,
  onRequestStatusChange,
  formatMoney,
}: GroupTableProps) {
  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary-50 text-xs font-semibold uppercase text-secondary-500 border-b border-border">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Group Name
              </th>
              <th scope="col" className="px-6 py-3.5">
                Location
              </th>
              <th scope="col" className="px-6 py-3.5">
                Scheme
              </th>
              <th scope="col" className="px-6 py-3.5 text-center">
                Members
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Total Amount
              </th>
              <th scope="col" className="px-6 py-3.5">
                Start Date
              </th>
              <th scope="col" className="px-6 py-3.5">
                Status
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {groups.map((group) => (
              <tr
                key={group.id}
                className="hover:bg-secondary-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-secondary-900">
                  {group.group_name}
                  {group.remarks && (
                    <span className="block text-xs font-normal text-secondary-500 line-clamp-1">
                      {group.remarks}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-secondary-700 font-medium">
                  {group.location}
                </td>
                <td className="px-6 py-4 text-secondary-600">
                  {group.scheme ? (
                    <div>
                      <span className="font-medium text-secondary-900">
                        {group.scheme.scheme_name}
                      </span>
                      <span className="block text-xs text-secondary-500">
                        {formatMoney(group.scheme.loan_amount)} · {group.scheme.total_weeks} wks
                      </span>
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 text-center font-medium text-secondary-900">
                  {group.member_count}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-secondary-900">
                  {formatMoney(group.total_group_amount)}
                </td>
                <td className="px-6 py-4 text-secondary-600">
                  {group.start_date || '—'}
                </td>
                <td className="px-6 py-4">
                  <GroupStatusBadge status={group.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {group.status !== 'Closed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                        onClick={() => onEdit(group)}
                        title="Edit metadata"
                      >
                        Edit
                      </Button>
                    )}

                    {group.status === 'Draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Play className="h-3.5 w-3.5 text-primary-600" />}
                        onClick={() => onRequestStatusChange(group, 'Active')}
                      >
                        Activate
                      </Button>
                    )}

                    {group.status === 'Active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-info-600" />}
                        onClick={() => onRequestStatusChange(group, 'Completed')}
                      >
                        Complete
                      </Button>
                    )}

                    {group.status !== 'Closed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error-600 hover:bg-error-50 hover:text-error-700"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => onRequestStatusChange(group, 'Closed')}
                        title="Close group"
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
