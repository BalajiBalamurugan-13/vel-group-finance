import { useMemo } from 'react';
import { Edit, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { MemberStatusBadge } from './MemberStatusBadge';
import {
  usePlacesRoute,
  buildPlaceLookupMap,
  resolvePlaceRouteInfo,
} from '@/features/places';
import type { Member, MemberStatus } from '../types';

interface MemberTableProps {
  members: Member[];
  onViewDetails: (member: Member) => void;
  onEdit: (member: Member) => void;
  onRequestStatusChange: (member: Member, targetStatus: MemberStatus) => void;
}

export function MemberTable({
  members,
  onViewDetails,
  onEdit,
  onRequestStatusChange,
}: MemberTableProps) {
  const { places } = usePlacesRoute();
  const placeLookup = useMemo(() => buildPlaceLookupMap(places), [places]);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-secondary-600">
          <thead className="border-b border-border bg-secondary-50 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3">
                Member
              </th>
              <th scope="col" className="px-4 py-3">
                Group / Location
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Loan Amount
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Cash Given
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Weekly Inst.
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Joined Week
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const loanAmount = Number(member.loan_amount || 0);
              const cashGiven = Number(member.cash_given || 0);
              const weeklyInstallment = Number(member.weekly_installment || 0);
              const immediateCollection = Number(member.immediate_collection || 0);

              return (
                <tr
                  key={member.id}
                  className="transition-colors hover:bg-secondary-50/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-secondary-900">
                        {member.member_name}
                      </span>
                      {member.member_code && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary-50 text-primary-700 border border-primary-200/60">
                          {member.member_code}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-secondary-500 font-mono mt-0.5">
                      {member.phone_number}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const routeInfo = resolvePlaceRouteInfo(
                        member.location,
                        member.group_name,
                        placeLookup,
                        places,
                      );
                      const isMorning = routeInfo.session === 'morning';
                      return (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-secondary-900">
                              {member.group_name || '—'}
                            </span>
                            {routeInfo.order < 9000 && (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  isMorning
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                }`}
                                title={`${isMorning ? 'Morning' : 'Evening'} Route Stop #${routeInfo.order}`}
                              >
                                {isMorning ? '☀️' : '🌙'} #{routeInfo.order}
                              </span>
                            )}
                          </div>
                          {member.location && (
                            <div className="text-xs text-secondary-500">
                              {member.location}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-secondary-900">
                    {loanAmount > 0 ? formatCurrency(loanAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-success-600">
                    {cashGiven > 0 ? formatCurrency(cashGiven) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-secondary-900">
                    {weeklyInstallment > 0
                      ? formatCurrency(weeklyInstallment)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700">
                      W{member.joined_week}
                    </span>
                    {immediateCollection > 0 && member.joined_week > 1 && (
                      <div className="text-[11px] font-medium text-warning-700 mt-0.5">
                        Due: {formatCurrency(immediateCollection)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <MemberStatusBadge status={member.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(member)}
                        title="View Details"
                        aria-label={`View details for ${member.member_name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(member)}
                        title="Edit Profile"
                        aria-label={`Edit ${member.member_name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.status === 'Active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-info-600 hover:bg-info-50 hover:text-info-700"
                          onClick={() =>
                            onRequestStatusChange(member, 'Completed')
                          }
                          title="Mark Completed"
                          aria-label={`Mark ${member.member_name} as Completed`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {member.status === 'Completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900"
                          onClick={() => onRequestStatusChange(member, 'Closed')}
                          title="Close Member"
                          aria-label={`Close ${member.member_name}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
