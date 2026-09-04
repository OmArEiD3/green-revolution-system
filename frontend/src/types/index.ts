export interface User {
  id: number;
  username: string;
  first_name: string;
  email?: string;
  is_staff: boolean;
}

export interface Member {
  id: number;
  full_name: string;
  mobile_number: string;
  national_id: string;
  street_number: number;
  has_guard: boolean;
  guard_name: string;
  guard_mobile: string;
  is_active: boolean;
  is_deleted: boolean;
  practices_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PracticeType {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Payment {
  id: number;
  practice: number;
  member: number;
  member_name?: string;
  practice_type_name?: string;
  practice_month?: number;
  practice_year?: number;
  amount: string;
  payment_date: string;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  notes: string;
  is_voided: boolean;
  void_reason: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  practice: number;
  member: number;
  member_name: string;
  street_number: number;
  practice_type_name: string;
  practice_year: number;
  practice_month: number;
  receipt_amount: string;
  status: 'NOT_RECEIVED' | 'RECEIVED' | 'DELIVERED';
  received_date: string | null;
  delivery_date: string | null;
  receipt_image: string | null;
  notes: string;
  created_at: string;
}

export interface Practice {
  id: number;
  member: number;
  member_name: string;
  street_number: number;
  practice_type: number;
  practice_type_name: string;
  year: number;
  month: number;
  required_amount: string;
  notes: string;
  total_paid: string;
  remaining_amount: string;
  overpayment_amount: string;
  payment_status: 'UNPAID' | 'FULLY_PAID';
  receipt?: Receipt;
  payments?: Payment[];
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  amount: string;
  expense_date: string;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'OTHER';
  description: string;
  document_image: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface FinancialTransaction {
  id: number;
  transaction_type: 'PRACTICE_COLLECTION' | 'OVERPAYMENT' | 'EXPENSE' | 'REFUND' | 'ADJUSTMENT';
  transaction_type_display: string;
  amount: string;
  transaction_date: string;
  payment_method: string;
  member: number | null;
  member_name: string | null;
  street_number: number | null;
  practice: number | null;
  payment: number | null;
  expense: number | null;
  source_payer_name: string;
  description: string;
  created_at: string;
}

export interface DashboardData {
  period: { year: number; month: number };
  members: {
    total_members: number;
  };
  collections: {
    total_required: string;
    total_paid: string;
    remaining: string;
  };
  payment_status: {
    fully_paid: number;
    unpaid: number;
  };
  receipts: {
    total: number;
    received: number;
    delivered: number;
    not_received: number;
  };
  financials: {
    overpayments: string;
    expenses: string;
    net_balance: string;
  };
}

export interface StreetData {
  street_number: number;
  street_name: string;
  members_count: number;
  required_amount: string;
  paid_amount: string;
  remaining_amount: string;
  practices_count: number;
}

export interface MemberStatement {
  member: Member;
  period: { year: number; month: number };
  summary: {
    total_required: string;
    total_paid: string;
    remaining: string;
    overpayment: string;
    status: 'UNPAID' | 'FULLY_PAID';
  };
  practices: Practice[];
  payments: Payment[];
  receipts: Receipt[];
}
