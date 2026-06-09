/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_INCOME_CATEGORIES = ['Rent portion', 'Guard Salary', 'Service Box'];
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Maintenance',
  'Utilities',
  'Insurance',
  'Tax',
  'Cleaning',
  'Staff Salary',
  'Marketing',
  'Other'
];
export const DEFAULT_PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Credit Card', 'Check', 'Other'];

export interface Tenant {
  id: string;
  name: string;
  unit: string;
  monthlyRent: number;
  guardFee?: number; // e.g. guard salary fee (defaults to 50 or 0)
  maintenanceFee?: number; // e.g. maintenance box fee (defaults to 30 or 0)
  rentDueDateDay: number; // e.g. 5 means 5th of every month
  startDate: string;
  endDate: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'vacant';
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  unit: string;
  amount: number; // Total amount paid (sum of rentPaid, guardPaid, maintenancePaid)
  rentPaid?: number; // Rent portion of payment
  guardPaid?: number; // Guard salary portion of payment
  maintenancePaid?: number; // Maintenance box portion of payment
  splits?: Record<string, number>; // Dynamic splits! Key is the category name, value is the portion amount.
  category?: string; // Designated single category of the payment
  date: string; // YYYY-MM-DD
  monthPaidFor: string; // e.g. "2026-06"
  method: string; // e.g. Bank Transfer, Cash, Check, etc.
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  receiptNumber: string;
}

export type ExpenseCategory = string; // Made dynamic instead of strict union

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  attachmentName?: string;
  attachmentUrl?: string; // Base64 data-URL or local image URL
}

export interface Building {
  id: string;
  name: string;
  address?: string;
  ownerId: string;
  createdAt: string;
  currency?: string; // e.g. 'JOD', 'USD' (defaults to 'JOD')
  defaultBaseRent?: number; // e.g. 1000
  defaultGuardFee?: number; // e.g. 50
  defaultMaintenanceFee?: number; // e.g. 30
  customIncomeCategories?: string[]; // e.g. ['Rent portion', 'Guard Salary', 'Service Box']
  customExpenseCategories?: string[]; // e.g. ['Maintenance', 'Utilities', 'Insurance', 'Tax', 'Cleaning', 'Staff Salary', 'Marketing', 'Other']
  customPaymentMethods?: string[]; // e.g. ['Bank Transfer', 'Cash', 'Credit Card', 'Check', 'Other']
  commonAreaIncomeCategories?: string[]; // Income categories designated for building/common area
  commonAreaExpenseCategories?: string[]; // Expense categories designated for building/common area
  reminderTemplate?: string; // Custom WhatsApp/statement payment reminder template
  receiptTemplate?: string; // Custom WhatsApp payment receipt confirmation template
}

export function formatCurrency(amount: number, currency: string = 'JOD'): string {
  const rounded = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (currency === 'USD') {
    return `$${rounded}`;
  }
  return `${rounded} ${currency}`;
}

export function normalizeMonthStr(m: string): string {
  if (!m) return '';
  const clean = m.trim().replace(/\//g, '-'); // replace slashes with dashes
  const parts = clean.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}`;
  }
  return clean;
}

export function isMonthCovered(monthPaidFor: string, targetMonth: string): boolean {
  if (!monthPaidFor || !targetMonth) return false;
  
  const normTarget = normalizeMonthStr(targetMonth);
  
  if (monthPaidFor.includes(' to ')) {
    const [start, end] = monthPaidFor.trim().split(/\s*to\s*/);
    const normStart = normalizeMonthStr(start);
    const normEnd = normalizeMonthStr(end);
    return normTarget >= normStart && normTarget <= normEnd;
  }
  
  return normalizeMonthStr(monthPaidFor) === normTarget;
}
