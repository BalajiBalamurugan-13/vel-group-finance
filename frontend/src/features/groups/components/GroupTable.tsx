import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Play, CheckCircle2 } from 'lucide-react';
import { GroupStatusBadge } from './GroupStatusBadge';
import {
  type PlaceRouteConfig,
  resolvePlaceRouteInfo,
} from '@/features/places';
import type { Group, GroupStatus } from '../types';

interface GroupTableProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onRequestStatusChange: (group: Group, targetStatus: GroupStatus) => void;
  formatMoney: (val: number) => string;
  places?: PlaceRouteConfig[];
  placeLookup?: Map<string, PlaceRouteConfig>;
}

export function GroupTable({
  groups,
  onEdit,
  onRequestStatusChange,
  formatMoney,
  places = [],
  placeLookup = new Map(),
}: GroupTableProps) {
  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary-50 text-[11px] font-semibold uppercase tracking-wider text-secondary-500 border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Group
              </th>
              <th scope="col" className="px-4 py-2.5">
                Location
              </th>
              <th scope="col" className="px-4 py-2.5">
                Scheme
              </th>
              <th scope="col" className="px-4 py-2.5 text-center">
                Members
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Total Amount
              </th>
              <th scope="col" className="px-4 py-2.5">
                Start Date
              </th>
              <th scope="col" className="px-4 py-2.5">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-secondary-900 truncate max-w-[200px]">
                      {group.group_name}
                    </span>
                    {group.group_code && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600 flex-shrink-0">
                        {group.group_code}
                      </span>
                    )}
                  </div>
                  {group.remarks && (
                    <span className="block text-[11px] font-normal text-secondary-400 line-clamp-1 mt-0.5">
                      {group.remarks}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary-700 font-medium">
                  {(() => {
                    const info = resolvePlaceRouteInfo(
                      group.location,
                      group.group_name,
                      placeLookup,
                      places,
                    );
                    const isMorning = info.session === 'morning';
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{group.location}</span>
                        {info.order < 9000 && (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isMorning
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                            }`}
                            title={`${isMorning ? 'Morning' : 'Evening'} Route Stop #${info.order}`}
                          >
                            {isMorning ? '☀️' : '🌙'} #{info.order}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-secondary-600">
                  {group.scheme ? (
                    <div>
                      <span className="font-medium text-secondary-900">
                        {group.scheme.scheme_name}
                      </span>
                      <span className="block text-[11px] text-secondary-400">
                        {formatMoney(group.scheme.loan_amount)} · {group.scheme.total_weeks} wks
                      </span>
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-secondary-900">
                  {group.member_count}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-secondary-900 tabular-nums">
                  {formatMoney(group.total_group_amount)}
                </td>
                <td className="px-4 py-3 text-secondary-600">
                  <span className="tabular-nums">{group.start_date || '—'}</span>
                  {group.funding_source && (
                    <span
                      className={
                        group.funding_source === 'Initial Investment'
                          ? 'block mt-0.5 text-[10px] text-primary-700 font-medium'
                          : group.funding_source === 'Additional Investment'
                            ? 'block mt-0.5 text-[10px] text-amber-700 font-medium'
                            : group.recycled_sub_type === 'Recycled + Owner Investment'
                              ? 'block mt-0.5 text-[10px] text-cyan-800 font-semibold'
                              : 'block mt-0.5 text-[10px] text-secondary-500'
                      }
                    >
                      {group.funding_source === 'Recycled Collections'
                        ? group.recycled_sub_type === 'Recycled + Owner Investment' && group.owner_investment_amount
                          ? `Recycled (+${formatMoney(group.owner_investment_amount)} Cash)`
                          : 'Recycled'
                        : group.funding_source}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <GroupStatusBadge status={group.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Draft: Edit + Activate */}
                    {group.status === 'Draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => onEdit(group)}
                          title="Edit metadata"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Play className="h-3.5 w-3.5 text-primary-600" />}
                          onClick={() => onRequestStatusChange(group, 'Active')}
                        >
                          Activate
                        </Button>
                      </>
                    )}

                    {/* Active: Edit + Complete */}
                    {group.status === 'Active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => onEdit(group)}
                          title="Edit metadata"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-primary-600" />}
                          onClick={() => onRequestStatusChange(group, 'Completed')}
                        >
                          Complete
                        </Button>
                      </>
                    )}

                    {/* Completed: Read-only */}
                    {group.status === 'Completed' && (
                      <span className="text-xs text-secondary-400">Completed</span>
                    )}

                    {/* Closed: Read-only */}
                    {group.status === 'Closed' && (
                      <span className="text-xs text-secondary-400">Closed</span>
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
