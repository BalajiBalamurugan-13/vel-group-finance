export type MemberStatus = 'Active' | 'Completed' | 'Closed';

export interface LoanTransaction {
  id: string;
  transaction_code?: string | null; // TXN-0001 — added in migration 002
  loan_cycle_id: string;
  member_id: string;
  loan_amount: string | number;
  note_cost: string | number;
  cash_given: string | number;
  disbursement_date: string;
  remarks?: string | null;
  created_at: string;
}

export interface LoanCycle {
  id: string;
  cycle_code?: string | null; // LC-0001 — added in migration 002
  member_id: string;
  group_id: string;
  scheme_id: string;
  cycle_number: number;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  loan_transaction?: LoanTransaction | null;
}

export interface Member {
  id: string;
  member_code?: string | null; // M-0001 — added in migration 002
  group_id: string;
  member_name: string;
  phone_number: string;
  address: string;
  photo_url?: string | null;
  nominee?: string | null;
  id_proof?: string | null;
  joined_week: number;
  joined_date?: string | null;
  status: MemberStatus;
  remarks?: string | null;
  group_name?: string | null;
  location?: string | null;
  scheme_name?: string | null;
  loan_amount?: string | number | null;
  note_cost?: string | number | null;
  cash_given?: string | number | null;
  weekly_installment?: string | number | null;
  immediate_collection?: string | number | null;
  current_cycle?: LoanCycle | null;
  created_at: string;
  updated_at: string;
}

export interface MemberCreate {
  group_id: string;
  member_name: string;
  phone_number: string;
  address: string;
  photo_url?: string | null;
  nominee?: string | null;
  id_proof?: string | null;
  joined_date?: string | null;
  remarks?: string | null;
}

export interface MemberUpdate {
  member_name?: string;
  phone_number?: string;
  address?: string;
  photo_url?: string | null;
  nominee?: string | null;
  id_proof?: string | null;
  remarks?: string | null;
}

export interface MemberStatusUpdate {
  status: MemberStatus;
}

export interface MemberFiltersState {
  status?: MemberStatus | 'All';
  group_id?: string;
  search?: string;
}
