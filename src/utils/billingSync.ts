import { Tenant, Payment, Building, isMonthCovered, getYearMonthFromDateStr } from '../types';

export function getMonthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  if (!start || !end) return [];
  
  // Extract Year and Month numbers
  let [startY, startM] = start.split('-').map(Number);
  const [endY, endM] = end.split('-').map(Number);
  
  if (isNaN(startY) || isNaN(startM) || isNaN(endY) || isNaN(endM)) {
    return [end];
  }
  
  let currentY = startY;
  let currentM = startM;
  
  // Limit to avoid infinite loops if bad input
  let limit = 0;
  while ((currentY < endY || (currentY === endY && currentM <= endM)) && limit < 100) {
    months.push(`${currentY}-${String(currentM).padStart(2, '0')}`);
    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
    limit++;
  }
  return months;
}

export function isDueDatePassed(month: string, dueDay: number, referenceDate: Date = new Date()): boolean {
  const parts = month.split('-');
  const year = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(year) || isNaN(m)) return true;
  
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // Date.getMonth is 0-indexed
  const refDay = referenceDate.getDate();
  
  if (refYear > year) return true;
  if (refYear < year) return false;
  if (refMonth > m) return true;
  if (refMonth < m) return false;
  return refDay >= dueDay;
}

export interface SyncResult {
  paymentsToCreate: Omit<Payment, 'id'>[];
  paymentsToUpdate: { id: string; status: Payment['status'] }[];
  paymentsToDelete: string[];
}

export function checkAndSyncPayments(
  tenants: Tenant[],
  payments: Payment[],
  building: Building | null,
  referenceDate: Date = new Date()
): SyncResult {
  const paymentsToCreate: Omit<Payment, 'id'>[] = [];
  const paymentsToUpdate: { id: string; status: Payment['status'] }[] = [];
  const paymentsToDelete: string[] = [];

  // Determine current calendar month (e.g., '2026-07')
  const currentMonthStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;

  // Filter active tenants
  const activeTenants = tenants.filter(t => t.status === 'active');

  activeTenants.forEach(tenant => {
    // Determine the starting point for this tenant's billing
    let startMonth = tenant.startDate ? getYearMonthFromDateStr(tenant.startDate) : '2026-01';
    if (!startMonth) {
      startMonth = '2026-01';
    }

    // Restriction to avoid massive historical backfills (limit to absolute floor of 2025-01 or last 12 months)
    const absoluteFloor = '2025-01';
    if (startMonth < absoluteFloor) {
      startMonth = absoluteFloor;
    }

    // Get list of all months from lease start (or floor) to the current month
    const monthsToCheck = getMonthsBetween(startMonth, currentMonthStr);

    monthsToCheck.forEach(month => {
      // 1. Is there a 'Paid' payment covering this specific month?
      const isAlreadyPaid = payments.some(p => 
        p.status === 'Paid' && 
        p.tenantId === tenant.id && 
        isMonthCovered(p.monthPaidFor, month)
      );

      // 2. Find any existing 'Pending' or 'Overdue' records for this month
      const unpaidRecords = payments.filter(p => 
        p.status !== 'Paid' && 
        p.tenantId === tenant.id && 
        isMonthCovered(p.monthPaidFor, month)
      );

      if (isAlreadyPaid) {
        // If it is covered by a 'Paid' record, any duplicate 'Pending' or 'Overdue' records for this month should be deleted
        unpaidRecords.forEach(dup => {
          if (!paymentsToDelete.includes(dup.id)) {
            paymentsToDelete.push(dup.id);
          }
        });
        return;
      }

      // If NOT already paid, determine what the status should be
      const passed = isDueDatePassed(month, tenant.rentDueDateDay, referenceDate);
      const expectedStatus: Payment['status'] = passed ? 'Overdue' : 'Pending';

      if (unpaidRecords.length > 0) {
        // Unpaid record(s) exist. Check if their status matches the expected status
        unpaidRecords.forEach(rec => {
          if (rec.status !== expectedStatus) {
            paymentsToUpdate.push({ id: rec.id, status: expectedStatus });
          }
        });
      } else {
        // No billing registry for this month! We must auto-generate a new pending/overdue invoice
        const receiptCode = `REC-${month.replace('-', '')}-${tenant.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const guardFee = tenant.guardFee ?? building?.defaultGuardFee ?? 0;
        const maintenanceFee = tenant.maintenanceFee ?? building?.defaultMaintenanceFee ?? 0;
        const totalAmount = tenant.monthlyRent + guardFee + maintenanceFee;

        const newPayment: Omit<Payment, 'id'> = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          unit: tenant.unit,
          amount: totalAmount,
          rentPaid: tenant.monthlyRent,
          guardPaid: guardFee,
          maintenancePaid: maintenanceFee,
          date: '', // No payment date yet since it's unpaid
          monthPaidFor: month,
          method: 'Bank Transfer',
          status: expectedStatus,
          notes: 'Auto-posted by Autopilot Scheduler',
          receiptNumber: receiptCode
        };

        paymentsToCreate.push(newPayment);
      }
    });
  });

  return {
    paymentsToCreate,
    paymentsToUpdate,
    paymentsToDelete
  };
}
