import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Phone, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { LoanRiskMember } from '../types';

interface LoanRiskTableProps {
  members?: LoanRiskMember[];
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

export function LoanRiskTable({ members = [], isLoading }: LoanRiskTableProps) {
  const { language } = useLanguage();

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-secondary-500">
        {language === 'ta' ? 'கடன் இடர் பதிவுகள் ஏற்றப்படுகின்றன...' : 'Loading loan risk records...'}
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-secondary-500">
        {language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட வடிகட்டிக்கு உறுப்பினர்கள் எதுவும் கிடைக்கவில்லை.' : 'No members found matching the selected filter criteria.'}
      </Card>
    );
  }

  return (
    <Card noPadding className="overflow-hidden">
      {/* ── Mobile Card View (< md) ─────────────────────────────────────────── */}
      <div className="block md:hidden divide-y divide-border">
        {members.map((m) => (
          <div key={m.member_id} className="p-4 space-y-3">
            {/* Header: Name, Code & Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-secondary-900">{m.member_name}</span>
                  {m.member_code && (
                    <span className="font-mono text-[10px] text-secondary-500 bg-secondary-100 px-1.5 py-0.5 rounded">
                      {m.member_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-secondary-400" />
                    {m.group_name} ({m.location})
                  </span>
                </div>
              </div>

              <div>
                {m.risk_status === 'Current' && (
                  <Badge variant="success">{language === 'ta' ? 'சரியான நிலை' : 'Current'}</Badge>
                )}
                {m.risk_status === 'Overdue' && (
                  <Badge variant="warning">{language === 'ta' ? 'தாமதம்' : 'Overdue'}</Badge>
                )}
                {m.risk_status === 'At Risk' && (
                  <Badge variant="error">{language === 'ta' ? 'அதிக அபாயம்' : 'At Risk'}</Badge>
                )}
              </div>
            </div>

            {/* Phone & Scheme */}
            <div className="flex items-center justify-between text-xs text-secondary-600">
              {m.phone_number ? (
                <a
                  href={`tel:${m.phone_number}`}
                  className="flex items-center gap-1 text-primary-700 font-medium hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {m.phone_number}
                </a>
              ) : (
                <span className="text-secondary-400">{language === 'ta' ? 'எண் இல்லை' : 'No phone'}</span>
              )}
              <span className="text-[11px] text-secondary-500">
                {m.scheme_name} · {formatINR(m.weekly_installment)}/{language === 'ta' ? 'வா' : 'wk'}
              </span>
            </div>

            {/* Overdue Alert banner if >= 4 weeks */}
            {m.weeks_overdue >= 4 && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span>
                  <strong>{language === 'ta' ? 'கடன் இழப்பு அபாயம்:' : 'Loan Loss Candidate:'}</strong>{' '}
                  {language === 'ta'
                    ? `தொடர்ச்சியாக ${m.weeks_overdue} வாரங்கள் தாமதம்.`
                    : `Overdue for ${m.weeks_overdue} consecutive weeks.`}
                </span>
              </div>
            )}

            {/* Mini stats grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-secondary-50/80 rounded-lg p-2 text-center">
                <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                  {language === 'ta' ? 'தாமதம்' : 'Overdue'}
                </span>
                <span className="font-bold text-rose-700 block mt-0.5">
                  {m.overdue_amount > 0 ? formatINR(m.overdue_amount) : '₹0'}
                </span>
                <span className="text-[10px] text-secondary-500">
                  {m.weeks_overdue} {language === 'ta' ? 'வா' : m.weeks_overdue === 1 ? 'wk' : 'wks'}
                </span>
              </div>

              <div className="bg-secondary-50/80 rounded-lg p-2 text-center">
                <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                  {language === 'ta' ? 'நிலுவை' : 'Outstanding'}
                </span>
                <span className="font-bold text-secondary-900 block mt-0.5">
                  {formatINR(m.outstanding_amount)}
                </span>
                <span className="text-[10px] text-secondary-500">
                  {language === 'ta' ? 'அசல் + வட்டி' : 'principal + margin'}
                </span>
              </div>

              <div className="bg-secondary-50/80 rounded-lg p-2 text-center">
                <span className="text-[10px] uppercase font-semibold text-secondary-500 block">
                  {language === 'ta' ? 'செலுத்தியது' : 'Paid / Exp'}
                </span>
                <span className="font-bold text-secondary-900 block mt-0.5">
                  {m.actual_weeks_paid} / {m.expected_weeks_paid}
                </span>
                <span className="text-[10px] text-secondary-500">
                  {language === 'ta' ? 'வாரங்கள்' : 'weeks'}
                </span>
              </div>
            </div>

            {/* Last payment footer */}
            <div className="text-[11px] text-secondary-500 flex items-center justify-between pt-1 border-t border-secondary-100">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-secondary-400" />
                {language === 'ta' ? 'கடைசி வசூல்:' : 'Last payment:'} {m.last_payment_date || (language === 'ta' ? 'ஏதுமில்லை' : 'None')}
              </span>
              <span>
                {language === 'ta' ? 'மொத்தம்:' : 'Total:'} {m.total_weeks} {language === 'ta' ? 'வாரங்கள்' : 'weeks'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Tabular View (>= md) ────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary-50/80 text-secondary-600 font-semibold border-b border-border">
            <tr>
              <th className="px-4 py-3">{language === 'ta' ? 'உறுப்பினர்' : 'Member'}</th>
              <th className="px-4 py-3">{language === 'ta' ? 'குழு & இடம்' : 'Group & Location'}</th>
              <th className="px-4 py-3">{language === 'ta' ? 'திட்டம்' : 'Scheme'}</th>
              <th className="px-4 py-3 text-center">{language === 'ta' ? 'செலுத்தியது / எதிர்பார்ப்பு' : 'Paid / Expected'}</th>
              <th className="px-4 py-3 text-center">{language === 'ta' ? 'தாமதமான வாரங்கள்' : 'Weeks Overdue'}</th>
              <th className="px-4 py-3 text-right">{language === 'ta' ? 'தாமதத் தொகை' : 'Overdue Amount'}</th>
              <th className="px-4 py-3 text-right">{language === 'ta' ? 'நிலுவைத் தொகை' : 'Outstanding'}</th>
              <th className="px-4 py-3">{language === 'ta' ? 'கடைசி வசூல்' : 'Last Payment'}</th>
              <th className="px-4 py-3 text-center">{language === 'ta' ? 'நிலை' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-secondary-900">
            {members.map((m) => {
              return (
                <tr key={m.member_id} className="hover:bg-secondary-50/50 transition-colors">
                  {/* Member Name, Code, Phone */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-secondary-900">{m.member_name}</span>
                      {m.member_code && (
                        <span className="font-mono text-[10px] text-secondary-500 bg-secondary-100 px-1 py-0.5 rounded">
                          {m.member_code}
                        </span>
                      )}
                    </div>
                    {m.phone_number && (
                      <span className="flex items-center gap-1 text-[11px] text-secondary-500 mt-0.5">
                        <Phone className="h-3 w-3 text-secondary-400" />
                        {m.phone_number}
                      </span>
                    )}
                  </td>

                  {/* Group & Location */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-secondary-900">{m.group_name}</div>
                    <span className="flex items-center gap-1 text-[11px] text-secondary-500 mt-0.5">
                      <MapPin className="h-3 w-3 text-secondary-400" />
                      {m.location}
                    </span>
                  </td>

                  {/* Scheme */}
                  <td className="px-4 py-3 text-secondary-600">
                    <div className="font-medium text-secondary-900">{m.scheme_name}</div>
                    <span className="text-[11px] text-secondary-500 block mt-0.5">
                      {formatINR(m.weekly_installment)}/{language === 'ta' ? 'வா' : 'wk'} · {m.total_weeks} {language === 'ta' ? 'வாரங்கள்' : 'wks'}
                    </span>
                  </td>

                  {/* Progress: Actual / Expected */}
                  <td className="px-4 py-3 text-center font-medium">
                    <span className="font-bold text-secondary-900">{m.actual_weeks_paid}</span>
                    <span className="text-secondary-400"> / {m.expected_weeks_paid} {language === 'ta' ? 'வா' : 'wks'}</span>
                  </td>

                  {/* Weeks Overdue */}
                  <td className="px-4 py-3 text-center">
                    {m.weeks_overdue > 0 ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          m.weeks_overdue >= 4
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.weeks_overdue} {language === 'ta' ? 'வா' : m.weeks_overdue === 1 ? 'wk' : 'wks'}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">0</span>
                    )}
                  </td>

                  {/* Overdue Amount */}
                  <td className="px-4 py-3 text-right">
                    {m.overdue_amount > 0 ? (
                      <span className="font-bold text-rose-700">
                        {formatINR(m.overdue_amount)}
                      </span>
                    ) : (
                      <span className="text-secondary-400">—</span>
                    )}
                  </td>

                  {/* Total Outstanding */}
                  <td className="px-4 py-3 text-right font-semibold text-secondary-900">
                    {formatINR(m.outstanding_amount)}
                  </td>

                  {/* Last Payment */}
                  <td className="px-4 py-3 text-secondary-600">
                    {m.last_payment_date ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-secondary-400" />
                        {m.last_payment_date}
                      </span>
                    ) : (
                      <span className="text-secondary-400 text-[11px]">{language === 'ta' ? 'வசூல் ஏதுமில்லை' : 'No payments yet'}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {m.risk_status === 'Current' && (
                      <Badge variant="success">{language === 'ta' ? 'சரியான நிலை' : 'Current'}</Badge>
                    )}
                    {m.risk_status === 'Overdue' && (
                      <Badge variant="warning">{language === 'ta' ? 'தாமதம்' : 'Overdue'}</Badge>
                    )}
                    {m.risk_status === 'At Risk' && (
                      <Badge variant="error">{language === 'ta' ? 'அதிக அபாயம்' : 'At Risk'}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
