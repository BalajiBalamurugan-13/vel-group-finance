export type RiskStatusCategory = 'Current' | 'Overdue' | 'At Risk';

export interface LoanRiskMember {
  member_id: string;
  member_code?: string | null;
  member_name: string;
  phone_number: string;
  group_id: string;
  group_code?: string | null;
  group_name: string;
  location: string;
  scheme_name: string;
  loan_amount: number;
  weekly_installment: number;
  total_weeks: number;
  joined_week: number;
  expected_weeks_paid: number;
  actual_weeks_paid: number;
  weeks_overdue: number;
  overdue_amount: number;
  outstanding_amount: number;
  total_paid_amount: number;
  last_payment_date: string | null;
  risk_status: RiskStatusCategory;
}

export interface LoanRiskSummary {
  total_members_analyzed: number;
  current_count: number;
  overdue_count: number;
  at_risk_count: number;
  total_overdue_amount: number;
  total_outstanding_amount: number;
  members: LoanRiskMember[];
}

export interface LoanRiskFiltersState {
  risk_status?: RiskStatusCategory | 'All';
  group_id?: string;
  search?: string;
}
