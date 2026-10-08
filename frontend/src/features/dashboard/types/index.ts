/**
 * VEL Finance — Dashboard Feature Types
 * ========================================
 * TypeScript types mirroring backend DashboardResponse schema.
 * All monetary values are represented as strings (serialised from Python Decimal).
 * Never parse these strings into JS float — display as-is.
 */

export interface GroupLocationSummary {
  location: string;
  active_groups: number;
  active_members: number;
}

export interface RecentCollection {
  id: string;
  receipt_code?: string | null; // RCP-0001 — added in migration 002
  member_id: string;
  member_code?: string | null; // M-0001
  member_name: string | null;
  group_id: string;
  group_code?: string | null; // GRP-0001
  group_name: string | null;
  location: string | null;
  collector_name: string | null;
  week_number: number;
  /** Decimal string from backend — never parse to float */
  amount_paid: string;
  payment_date: string; // ISO date string
  payment_status: string;
}

export interface DashboardSummary {
  /** Formula 11: Total Paid Collections − Total Loan Cash Given */
  available_cash: string;
  total_cash_in: string;
  total_cash_out: string;
  /** SUM of today's paid collection amounts */
  todays_collection: string;
  todays_collection_count?: number;
  /** Consolidated weekly activity metrics */
  weekly_expected?: string;
  weekly_collected?: string;
  weekly_pending?: string;
  weekly_progress?: number;
  /** SUM(loan_transactions.cash_given) — actual cash handed to members (net of note cost) */
  total_disbursement: string;
  /** SUM(loan_transactions.loan_amount) — gross loan principal issued per Formula 16 */
  total_loan_amount: string;
  /** SUM(loan_transactions.note_cost) — note cost income recognised upfront */
  total_note_cost: string;
  /** Formula 5/19: SUM(remaining_installments × weekly_installment) for active cycles */
  total_outstanding: string;
  active_groups: number;
  active_members: number;
  total_groups: number;
  total_members: number;
  groups_by_location: GroupLocationSummary[];
  recent_collections: RecentCollection[];
  /** Owner investments sum added to cash in */
  total_investment?: string;
  /** Total collections sum */
  total_collection?: string;
  /** Calibration offset applied during data migration */
  migration_offset?: string;
  /** Whether initial migration calibration has been performed */
  is_migration_completed?: boolean;
}

export interface MigrationStatusResponse {
  completed: boolean;
  completed_at: string | null;
  offset_amount: string;
  current_balance: string;
}

export interface CompleteMigrationResponse {
  message: string;
  offset_amount: string;
  completed_at: string;
}
