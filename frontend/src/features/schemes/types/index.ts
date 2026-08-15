export type SchemeStatus = 'Active' | 'Inactive';

export interface Scheme {
  id: string;
  scheme_name: string;
  description: string | null;
  loan_amount: number;
  weekly_installment: number;
  total_weeks: number;
  note_cost: number;
  status: SchemeStatus;
  created_at: string;
  updated_at: string;
}

export interface SchemeCreate {
  scheme_name: string;
  description?: string;
  // Use number for the API payload. The form will handle string-to-number conversion.
  loan_amount: number;
  weekly_installment: number;
  total_weeks: number;
  note_cost: number;
}

export interface SchemeUpdate {
  scheme_name?: string;
  description?: string;
}

export interface SchemeStatusUpdate {
  status: SchemeStatus;
}
