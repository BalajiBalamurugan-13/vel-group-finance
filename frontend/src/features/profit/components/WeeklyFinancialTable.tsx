import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Calendar, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { WeeklyFinancialBreakdown } from '../types';

interface WeeklyFinancialTableProps {
  breakdown?: WeeklyFinancialBreakdown[];
  isLoading?: boolean;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function WeeklyFinancialTable({
  breakdown = [],
  isLoading,
}: WeeklyFinancialTableProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-secondary-500">
        Loading weekly financial breakdown...
      </Card>
    );
  }

  if (breakdown.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-secondary-500">
        No weekly financial records available.
      </Card>
    );
  }

  const toggleWeek = (w: number) => {
    setExpandedWeek((prev) => (prev === w ? null : w));
  };

  return (
    <Card noPadding className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600" />
            Weekly Business Growth &amp; Performance
          </h3>
        </div>
        <span className="text-xs font-semibold text-secondary-500 bg-secondary-100 px-2.5 py-0.5 rounded-full shrink-0">
          {breakdown.length} Weeks
        </span>
      </div>

      {/* ── Mobile Card View (< md) ─────────────────────────────────────────── */}
      <div className="block md:hidden divide-y divide-border">
        {breakdown.map((item) => {
          const isExpanded = expandedWeek === item.week_number;
          const hasGroups = item.groups_created && item.groups_created.length > 0;

          return (
            <div key={item.week_number} className="p-4 space-y-3">
              {/* Week Title & Dates */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => hasGroups && toggleWeek(item.week_number)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary-700">
                      Week {item.week_number}
                    </span>
                    {item.groups_created_count > 0 && (
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        {item.groups_created_count} {item.groups_created_count === 1 ? 'group' : 'groups'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary-500 mt-0.5">
                    {item.start_date} → {item.end_date}
                  </p>
                </div>

                {hasGroups && (
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-secondary-100 text-secondary-600 hover:text-secondary-900 flex items-center gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWeek(item.week_number);
                    }}
                    aria-label="Toggle group details"
                  >
                    <span className="text-[11px] font-medium">Details</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Mini Stats Grid for Mobile */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Capital Deployed */}
                <div className="bg-secondary-50/80 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                    Capital Deployed
                  </span>
                  <span className="text-sm font-bold text-secondary-900 mt-0.5 block">
                    {item.loan_capital_deployed > 0
                      ? formatINR(item.loan_capital_deployed)
                      : '—'}
                  </span>
                </div>

                {/* Contractual Profit */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
                    Contractual Profit
                  </span>
                  <span className="text-sm font-bold text-emerald-900 mt-0.5 block">
                    {item.contractual_profit > 0
                      ? formatINR(item.contractual_profit)
                      : '—'}
                  </span>
                </div>

                {/* Collections (Actual / Exp) */}
                <div className="bg-secondary-50/80 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                    Collections
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                    {formatINR(item.actual_collection)}
                  </span>
                  <span className="text-[10px] text-secondary-500">
                    exp. {formatINR(item.expected_collection)}
                  </span>
                </div>

                {/* Members & Owner Capital */}
                <div className="bg-secondary-50/80 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                    {item.total_investment > 0 ? 'Owner Capital' : 'Members'}
                  </span>
                  {item.total_investment > 0 ? (
                    <>
                      <span className="text-xs font-bold text-secondary-900 mt-0.5 block">
                        {formatINR(item.total_investment)}
                      </span>
                      <span className="text-[10px] text-secondary-500">
                        {item.members_added_count > 0 ? `+${item.members_added_count} members` : 'Owner fund'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-secondary-900 mt-0.5 block">
                        {item.members_added_count > 0 ? `+${item.members_added_count}` : '0'}
                      </span>
                      <span className="text-[10px] text-secondary-500">members added</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Expanded Groups List */}
              {isExpanded && (
                <div className="bg-secondary-50/90 rounded-lg p-3 space-y-2 border border-border mt-2">
                  <h4 className="text-[11px] font-bold text-secondary-800 flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-primary-600" />
                    Groups Created in Week {item.week_number}
                  </h4>
                  <div className="space-y-2">
                    {item.groups_created.map((g) => (
                      <div
                        key={g.id}
                        className="bg-surface p-2.5 rounded-lg border border-border text-xs space-y-1 shadow-2xs"
                      >
                        <div className="font-bold text-secondary-900 flex items-center justify-between">
                          <span>{g.group_name}</span>
                          <span className="text-[10px] font-mono text-secondary-500 bg-secondary-100 px-1 py-0.5 rounded">
                            {g.group_code || 'GRP'}
                          </span>
                        </div>
                        <div className="text-secondary-500 text-[11px] flex items-center justify-between">
                          <span>{g.location}</span>
                          <span>{g.member_count} members</span>
                        </div>
                        <div className="text-[11px] flex items-center justify-between pt-1 border-t border-secondary-100 flex-wrap gap-1">
                          <span className="text-primary-700 font-medium flex items-center gap-1">
                            {g.funding_source}
                            {g.recycled_sub_type === 'Recycled + Owner Investment' && g.owner_investment_amount ? (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                                +{formatINR(g.owner_investment_amount)} Cash
                              </span>
                            ) : null}
                          </span>
                          <span className="font-bold text-secondary-800">{formatINR(g.loan_capital)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop Tabular View (>= md) ────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary-50/80 text-secondary-600 font-semibold border-b border-border">
            <tr>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Dates (Sun–Sat)</th>
              <th className="px-4 py-3 text-right">Owner Capital</th>
              <th className="px-4 py-3 text-center">Groups Created</th>
              <th className="px-4 py-3 text-center">Members</th>
              <th className="px-4 py-3 text-right">Capital Deployed</th>
              <th className="px-4 py-3 text-right">Actual / Expected</th>
              <th className="px-4 py-3 text-right">Contractual Profit</th>
              <th className="px-4 py-3 text-center w-10">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-secondary-900">
            {breakdown.map((item) => {
              const isExpanded = expandedWeek === item.week_number;
              const hasGroups = item.groups_created && item.groups_created.length > 0;

              return (
                <tr key={item.week_number} className="hover:bg-secondary-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary-700">
                    Week {item.week_number}
                  </td>
                  <td className="px-4 py-3 text-secondary-600 font-medium">
                    {item.start_date} → {item.end_date}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {item.total_investment > 0 ? (
                      <div>
                        <span className="text-secondary-900 font-bold">
                          {formatINR(item.total_investment)}
                        </span>
                        <span className="block text-[10px] text-secondary-400">
                          {item.initial_investment > 0 && `Init: ${formatINR(item.initial_investment)} `}
                          {item.additional_investment > 0 && `Add: ${formatINR(item.additional_investment)}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-secondary-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.groups_created_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.groups_created_count} groups
                      </span>
                    ) : (
                      <span className="text-secondary-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {item.members_added_count > 0 ? (
                      <span className="font-semibold text-secondary-900">+{item.members_added_count}</span>
                    ) : (
                      <span className="text-secondary-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-secondary-900">
                    {item.loan_capital_deployed > 0
                      ? formatINR(item.loan_capital_deployed)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-emerald-700">
                      {formatINR(item.actual_collection)}
                    </span>
                    <span className="block text-[10px] text-secondary-400">
                      exp. {formatINR(item.expected_collection)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800">
                    {item.contractual_profit > 0
                      ? formatINR(item.contractual_profit)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasGroups && (
                      <button
                        onClick={() => toggleWeek(item.week_number)}
                        className="p-1 rounded hover:bg-secondary-200/60 text-secondary-500 hover:text-secondary-900 transition-colors"
                        title={isExpanded ? 'Hide details' : 'Show created groups'}
                        aria-label="Toggle week details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Group Details for Desktop View */}
      {expandedWeek !== null && (
        <div className="hidden md:block bg-secondary-50/80 p-4 border-t border-border">
          <h4 className="text-xs font-bold text-secondary-800 mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary-600" />
            Groups Created in Week {expandedWeek}:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {breakdown
              .find((b) => b.week_number === expandedWeek)
              ?.groups_created.map((g) => (
                <div
                  key={g.id}
                  className="bg-surface p-2.5 rounded-lg border border-border text-xs space-y-1 shadow-2xs"
                >
                  <div className="font-bold text-secondary-900 flex items-center justify-between">
                    <span>{g.group_name}</span>
                    <span className="text-[10px] font-mono text-secondary-500 bg-secondary-100 px-1 py-0.5 rounded">
                      {g.group_code || 'GRP'}
                    </span>
                  </div>
                  <div className="text-secondary-500 text-[11px] flex items-center justify-between">
                    <span>{g.location}</span>
                    <span>{g.member_count} members</span>
                  </div>
                  <div className="text-[11px] flex items-center justify-between pt-1 border-t border-secondary-100 flex-wrap gap-1">
                    <span className="text-primary-700 font-medium flex items-center gap-1">
                      {g.funding_source}
                      {g.recycled_sub_type === 'Recycled + Owner Investment' && g.owner_investment_amount ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                          +{formatINR(g.owner_investment_amount)} Cash
                        </span>
                      ) : null}
                    </span>
                    <span className="font-bold text-secondary-800">{formatINR(g.loan_capital)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
