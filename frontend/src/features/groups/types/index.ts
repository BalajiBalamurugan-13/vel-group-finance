export type GroupStatus = 'Draft' | 'Active' | 'Completed' | 'Renewed' | 'Closed';

export interface GroupSchemeSummary {
  id: string;
  scheme_code?: string | null; // SCH-0001 — added in migration 002
  scheme_name: string;
  loan_amount: number;
  weekly_installment: number;
  total_weeks: number;
  note_cost: number;
  status: string;
}

export type GroupFundingSource = 'Initial Investment' | 'Additional Investment' | 'Recycled Collections';

export interface Group {
  id: string;
  group_code?: string | null; // GRP-0001 — added in migration 002
  scheme_id: string;
  location: string;
  group_name: string;
  start_date: string | null;
  funding_source?: GroupFundingSource;
  status: GroupStatus;
  remarks: string | null;
  member_count: number;
  total_group_amount: number;
  scheme?: GroupSchemeSummary;
  created_at: string;
  updated_at: string;
}

export interface GroupCreate {
  location: string;
  scheme_id: string;
  group_name?: string;
  start_date?: string;
  funding_source?: GroupFundingSource;
  remarks?: string;
}

export interface GroupUpdate {
  group_name?: string;
  location?: string;
  start_date?: string;
  funding_source?: GroupFundingSource;
  remarks?: string;
}

export interface GroupStatusUpdate {
  status: GroupStatus;
}

export interface GroupSuggestNameResponse {
  suggested_name: string;
  next_number: number;
}

export interface GroupFiltersState {
  status?: GroupStatus | 'All';
  location?: string;
  search?: string;
}
