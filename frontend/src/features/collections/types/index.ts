export type PaymentStatus = 'Paid' | 'Pending' | 'Partial' | 'Waived';

export interface Collection {
  id: string;
  receipt_code?: string | null; // RCP-0001 — added in migration 002
  loan_cycle_id: string;
  member_id: string;
  group_id: string;
  collector_id: string;
  week_number: number;
  payment_date: string;
  amount_paid: string | number;
  payment_status: PaymentStatus;
  remarks?: string | null;
  created_at: string;

  // Contextual joined fields
  member_name?: string;
  phone_number?: string;
  group_name?: string;
  location?: string;
  collector_name?: string;
  weekly_installment?: string | number;
  total_weeks?: number;
  weeks_paid?: number;
  remaining_installments?: number;
  outstanding_amount?: string | number;
  completion_percentage?: number;
}

export interface CollectionCreate {
  member_id: string;
  week_number: number;
  amount_paid: number;
  collector_id?: string;
  payment_date?: string;
  payment_status?: PaymentStatus;
  remarks?: string;
}

export interface TodayCollectionSummary {
  date: string;
  total_collected: string | number;
  collection_count: number;
  collections: Collection[];
}

export interface GroupWeeklySummary {
  group_id: string;
  group_name: string;
  location: string;
  active_members: number;
  weekly_installment: string | number;
  total_expected: string | number;
  total_collected: string | number;
  total_pending: string | number;
  completion_percentage: number;
}

export interface WeeklyCollectionSummary {
  total_expected: string | number;
  total_collected: string | number;
  total_pending: string | number;
  collection_count: number;
  groups_summary: GroupWeeklySummary[];
}

export interface CollectionFiltersState {
  group_id?: string;
  member_id?: string;
  collector_id?: string;
  payment_date?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}
