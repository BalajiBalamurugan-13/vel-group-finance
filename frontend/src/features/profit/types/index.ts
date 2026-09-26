export type InvestmentType = 'Initial' | 'Additional';

export interface Investment {
  id: string;
  investment_code?: string | null;
  investment_type: InvestmentType;
  amount: number;
  investment_date: string;
  business_week: number;
  group_id?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentCreate {
  investment_type: InvestmentType;
  amount: number;
  investment_date: string;
  description?: string;
  group_id?: string;
}

export interface InvestmentSummary {
  total_initial_investment: number;
  total_additional_investment: number;
  total_owner_investment: number;
  count_initial: number;
  count_additional: number;
  investments: Investment[];
}

export interface ProfitSummary {
  total_owner_investment: number;
  total_initial_investment: number;
  total_additional_investment: number;

  total_loan_capital_deployed: number;
  total_contractual_repayment: number;
  total_contractual_profit: number;

  total_actual_collections: number;
  total_outstanding: number;

  principal_recovered: number;
  principal_remaining: number;

  total_groups_count: number;
  total_members_count: number;
  active_loan_cycles_count: number;
  groups_by_funding_source: Record<string, number>;
}

export interface GroupCreationSummary {
  id: string;
  group_name: string;
  group_code?: string | null;
  location: string;
  funding_source: string;
  recycled_sub_type?: string;
  owner_investment_amount?: number;
  member_count: number;
  loan_capital: number;
}

export interface WeeklyFinancialBreakdown {
  week_number: number;
  start_date: string;
  end_date: string;

  initial_investment: number;
  additional_investment: number;
  total_investment: number;

  groups_created_count: number;
  groups_created: GroupCreationSummary[];
  members_added_count: number;
  loan_capital_deployed: number;
  funding_source_breakdown: Record<string, number>;

  expected_collection: number;
  actual_collection: number;
  collection_gap: number;

  contractual_profit: number;
}
