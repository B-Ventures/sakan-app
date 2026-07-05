import { describe, it, expect } from 'vitest';
import { Payment, isMonthCovered } from '../types';
import { checkAndSyncPayments } from '../utils/billingSync';

// Extract the exact logic used in the updated filters
function getUnpaidReminders(payments: Payment[], targetMonth: string): Payment[] {
  return payments.filter(p => {
    if (p.status === 'Paid') return false;
    if (!isMonthCovered(p.monthPaidFor, targetMonth)) return false;
    
    // Check if there is another payment with status 'Paid' covering this targetMonth for this tenant
    const isAlreadyPaid = payments.some(other => 
      other.status === 'Paid' && 
      other.tenantId === p.tenantId && 
      isMonthCovered(other.monthPaidFor, targetMonth)
    );
    return !isAlreadyPaid;
  });
}

describe('Reminder Clearance and Multi-Month Verification Gate', () => {
  const tenantId = 'tenant_motasem';

  it('should list overdue payment when no paid record exists for the month', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        tenantId,
        tenantName: 'Motasem Hammouri',
        unit: 'U 10',
        amount: 10,
        status: 'Overdue',
        monthPaidFor: '2026-06',
        date: '',
        method: 'Cash',
        receiptNumber: 'REC-1'
      }
    ];

    const reminders = getUnpaidReminders(payments, '2026-06');
    expect(reminders.length).toBe(1);
    expect(reminders[0].id).toBe('p1');
  });

  it('should clear all reminders for a month if a multi-month range paid payment covers it', () => {
    const payments: Payment[] = [
      {
        id: 'p1', // Old overdue record
        tenantId,
        tenantName: 'Motasem Hammouri',
        unit: 'U 10',
        amount: 10,
        status: 'Overdue',
        monthPaidFor: '2026-06',
        date: '',
        method: 'Cash',
        receiptNumber: 'REC-1'
      },
      {
        id: 'p2', // Multi-month range payment marked as Paid
        tenantId,
        tenantName: 'Motasem Hammouri',
        unit: 'U 10',
        amount: 30,
        status: 'Paid',
        monthPaidFor: '2026-05 to 2026-07',
        date: '2026-06-10',
        method: 'Bank Transfer',
        receiptNumber: 'REC-2'
      }
    ];

    const reminders = getUnpaidReminders(payments, '2026-06');
    // Since p2 is Paid and covers June (2026-06 is between 2026-05 and 2026-07), June reminders must be cleared!
    expect(reminders.length).toBe(0);
  });

  it('should clear reminders for a month if a specific paid payment covers it', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        tenantId,
        tenantName: 'Motasem Hammouri',
        unit: 'U 10',
        amount: 10,
        status: 'Overdue',
        monthPaidFor: '2026-06',
        date: '',
        method: 'Cash',
        receiptNumber: 'REC-1'
      },
      {
        id: 'p2', // Direct single-month payment marked as Paid
        tenantId,
        tenantName: 'Motasem Hammouri',
        unit: 'U 10',
        amount: 10,
        status: 'Paid',
        monthPaidFor: '2026-06',
        date: '2026-06-10',
        method: 'Bank Transfer',
        receiptNumber: 'REC-2'
      }
    ];

    const reminders = getUnpaidReminders(payments, '2026-06');
    expect(reminders.length).toBe(0);
  });
});

describe('Billing Synchronization and Auto-Check Engine', () => {
  const tenantId = 't_abu_sara';
  const tenantName = 'Abu Sara';
  const unit = '02';

  const sampleTenant = {
    id: tenantId,
    name: tenantName,
    unit,
    monthlyRent: 10,
    guardFee: 0,
    maintenanceFee: 0,
    rentDueDateDay: 5,
    startDate: '2025-10-01',
    endDate: '2026-10-01',
    phone: '+962790074656',
    email: 'abusara@example.com',
    status: 'active' as const
  };

  const sampleBuilding = {
    id: 'b1',
    name: 'Al-Manaseer Building',
    address: 'Amman, Jordan',
    ownerId: 'owner-123',
    createdAt: '2025-09-01T00:00:00.000Z'
  };

  const referenceDate = new Date(2026, 6, 5); // July 5th, 2026

  it('should auto-create missing invoices for all unpaid months in lease range', () => {
    // In this scenario, Abu Sara has paid nothing since Oct 2025.
    // Sync should generate missing records from 2025-10 up to 2026-07.
    const result = checkAndSyncPayments([sampleTenant], [], sampleBuilding, referenceDate);

    // From 2025-10 to 2026-07 is 10 months. All should be created.
    expect(result.paymentsToCreate.length).toBe(10);
    expect(result.paymentsToCreate[0].tenantName).toBe(tenantName);
    expect(result.paymentsToCreate[0].monthPaidFor).toBe('2025-10');
    expect(result.paymentsToCreate[0].status).toBe('Overdue');
  });

  it('should not create invoices for months covered by a Paid record', () => {
    // Oct 2025, Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026 are covered by an annual/range payment
    const payments = [
      {
        id: 'p_annual',
        tenantId,
        tenantName,
        unit,
        amount: 60,
        status: 'Paid' as const,
        monthPaidFor: '2025-10 to 2026-03',
        date: '2025-10-10',
        method: 'Bank Transfer',
        receiptNumber: 'REC-ANNUAL'
      }
    ];

    const result = checkAndSyncPayments([sampleTenant], payments, sampleBuilding, referenceDate);

    // Remaining months to check: 2026-04, 2026-05, 2026-06, 2026-07 (4 months)
    expect(result.paymentsToCreate.length).toBe(4);
    expect(result.paymentsToCreate[0].monthPaidFor).toBe('2026-04');
    expect(result.paymentsToCreate[3].monthPaidFor).toBe('2026-07');
  });

  it('should update Pending unpaid records to Overdue if due day has passed', () => {
    const payments = [
      {
        id: 'p_pending_old',
        tenantId,
        tenantName,
        unit,
        amount: 10,
        status: 'Pending' as const,
        monthPaidFor: '2026-06',
        date: '',
        method: 'Bank Transfer',
        receiptNumber: 'REC-OLD'
      }
    ];

    const result = checkAndSyncPayments([sampleTenant], payments, sampleBuilding, referenceDate);

    // Since June 2026 is checked, and today is July 5th (due day is 5th of June), June record must be updated to Overdue
    const update = result.paymentsToUpdate.find(u => u.id === 'p_pending_old');
    expect(update).toBeDefined();
    expect(update?.status).toBe('Overdue');
  });
});

