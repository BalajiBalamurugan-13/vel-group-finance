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

export interface CollectionUpdate {
  amount_paid?: number;
  payment_date?: string;
  week_number?: number;
  payment_status?: PaymentStatus;
  remarks?: string;
}

export interface BulkCollectionCreate {
  items: CollectionCreate[];
}

export interface BulkCollectionResponse {
  total_recorded: number;
  total_amount: number;
  collections: Collection[];
  errors?: string[];
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

export interface RecordWeekGroupBreakdown {
  group_id: string;
  group_name: string;
  location?: string | null;
  active_members: number;
  pending_members: number;
  already_paid_members: number;
  weekly_installment: number | string;
  pending_amount: number | string;
}

export interface RecordWeekPreviewResponse {
  business_week: number;
  target_date: string;
  week_start_date: string;
  week_end_date: string;
  total_active_members: number;
  eligible_members_count: number;
  already_paid_count: number;
  total_expected_amount: number | string;
  total_pending_amount: number | string;
  total_already_paid_amount: number | string;
  groups: RecordWeekGroupBreakdown[];
}

export interface RecordWeekRequest {
  payment_date?: string;
  business_week?: number;
  collector_id?: string;
  group_ids?: string[];
  remarks?: string;
}

export interface RecordWeekResponse {
  business_week: number;
  payment_date: string;
  total_recorded: number;
  total_amount: number | string;
  skipped_count: number;
  errors?: string[];
}
