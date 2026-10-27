export interface Batch {
  id: string;
  name: string;
  description?: string;
  className?: string;
  startTime?: string;
  endTime?: string;
  active: boolean;
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  guardianName?: string;
  className: string;
  schoolName?: string;
  phoneNumber: string;
  whatsappNumber?: string;
  monthlyFee: number;
  dueDay: number; // 1 to 31
  enrollmentDate: string; // YYYY-MM-DD
  active: boolean;
  batchId?: string; // assigned batch ID
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  batchId?: string; // batch in which the student attended
  date: string; // YYYY-MM-DD (local date)
  status: 'present' | 'absent';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type FeeStatus = 'paid' | 'partially_paid' | 'pending' | 'overdue';

export interface FeeRecord {
  id: string;
  studentId: string;
  billingMonth: string; // MM (01-12)
  billingYear: number; // e.g. 2026
  amountCharged: number; // in rupees
  dueDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  studentId: string;
  feeRecordId: string;
  amount: number; // in rupees
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
  transactionReference?: string;
  notes?: string;
  isReversed?: boolean;
  reversalReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: string; // 'settings'
  tutorName: string;
  instituteName: string;
  defaultCountryCode: string; // '+91'
  defaultMonthlyFee: number;
  defaultDueDay: number;
  schemaVersion: number;
}

export type NavTab = 'dashboard' | 'batches' | 'students' | 'attendance' | 'fees' | 'payments' | 'settings';
