import { describe, it, expect } from 'vitest';
import { Tenant, Payment, Expense } from '../types';

// Extracting allocation logic from DashboardOverview to test in isolation
function calculateDashboardStats(
  tenants: Tenant[],
  payments: Payment[],
  expenses: Expense[],
  activeBuilding?: { defaultGuardFee?: number; defaultMaintenanceFee?: number }
) {
  const occupiedUnits = tenants.filter(t => t.status === 'active').length;
  const totalUnits = tenants.length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const totalIncomePaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const defaultGuard = Number(activeBuilding?.defaultGuardFee ?? 50);
  const defaultMaint = Number(activeBuilding?.defaultMaintenanceFee ?? 30);

  let totalRentPaid = 0;
  let totalGuardPaid = 0;
  let totalMaintenancePaid = 0;

  payments.filter(p => p.status === 'Paid').forEach(p => {
    if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
      totalRentPaid += Number(p.rentPaid ?? 0);
      totalGuardPaid += Number(p.guardPaid ?? 0);
      totalMaintenancePaid += Number(p.maintenancePaid ?? 0);
    } else {
      const pAmount = Number(p.amount || 0);
      const gPaid = Math.min(pAmount, defaultGuard);
      const remaining1 = Math.max(0, pAmount - gPaid);
      const mPaid = Math.min(remaining1, defaultMaint);
      const rPaid = Math.max(0, remaining1 - mPaid);

      totalGuardPaid += gPaid;
      totalMaintenancePaid += mPaid;
      totalRentPaid += rPaid;
    }
  });

  const totalProjectedIncome = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalIncomePaid - totalExpenses;

  // Expense categories mapping
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
  });

  return {
    occupiedUnits,
    totalUnits,
    occupancyRate,
    totalIncomePaid,
    totalRentPaid,
    totalGuardPaid,
    totalMaintenancePaid,
    totalProjectedIncome,
    totalExpenses,
    netProfit,
    expenseByCategory
  };
}

describe('Dashboard Calculation Engine Unit Tests', () => {
  it('should correctly calculate occupancy metrics', () => {
    const tenants: Tenant[] = [
      { id: 't1', name: 'Tenant A', unit: '101', monthlyRent: 1000, guardFee: 50, maintenanceFee: 30, rentDueDateDay: 5, startDate: '2026-01-01', endDate: '2027-01-01', phone: '', email: '', status: 'active' },
      { id: 't2', name: 'Tenant B', unit: '102', monthlyRent: 1100, guardFee: 50, maintenanceFee: 30, rentDueDateDay: 5, startDate: '2026-01-01', endDate: '2027-01-01', phone: '', email: '', status: 'active' },
      { id: 't3', name: 'Tenant C', unit: '103', monthlyRent: 1200, guardFee: 50, maintenanceFee: 30, rentDueDateDay: 5, startDate: '', endDate: '', phone: '', email: '', status: 'vacant' }
    ];

    const stats = calculateDashboardStats(tenants, [], []);
    expect(stats.totalUnits).toBe(3);
    expect(stats.occupiedUnits).toBe(2);
    expect(stats.occupancyRate).toBe(67); // 2/3 as integer percentage
  });

  it('should correctly allocate rent, guard and maintenance fees from paid payments using explicit fields', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        tenantId: 't1',
        tenantName: 'Tenant A',
        unit: '101',
        amount: 1080,
        rentPaid: 1000,
        guardPaid: 50,
        maintenancePaid: 30,
        date: '2026-06-01',
        monthPaidFor: '2026-06',
        method: 'Cash',
        status: 'Paid',
        receiptNumber: 'REC-001'
      }
    ];

    const stats = calculateDashboardStats([], payments, []);
    expect(stats.totalIncomePaid).toBe(1080);
    expect(stats.totalRentPaid).toBe(1000);
    expect(stats.totalGuardPaid).toBe(50);
    expect(stats.totalMaintenancePaid).toBe(30);
  });

  it('should fallback to allocation logic if payment fee breakdown is undefined', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        tenantId: 't1',
        tenantName: 'Tenant A',
        unit: '101',
        amount: 1080,
        date: '2026-06-01',
        monthPaidFor: '2026-06',
        method: 'Cash',
        status: 'Paid',
        receiptNumber: 'REC-001'
        // rentPaid, guardPaid, maintenancePaid omitted/undefined
      }
    ];

    const stats = calculateDashboardStats([], payments, [], { defaultGuardFee: 40, defaultMaintenanceFee: 20 });
    
    // Allocation priority: 
    // 1. Guard = min(1080, 40) = 40
    // 2. Maint = min(1040, 20) = 20
    // 3. Rent = 1040 - 20 = 1020
    expect(stats.totalGuardPaid).toBe(40);
    expect(stats.totalMaintenancePaid).toBe(20);
    expect(stats.totalRentPaid).toBe(1020);
    expect(stats.totalIncomePaid).toBe(1080);
  });

  it('should correctly balance income, projected revenue, expenses, and net profit', () => {
    const payments: Payment[] = [
      { id: 'p1', tenantId: 't1', tenantName: 'A', unit: '1', amount: 500, status: 'Paid', date: '2026-06-01', monthPaidFor: '2026-06', method: 'Cash', receiptNumber: 'REC-1' },
      { id: 'p2', tenantId: 't2', tenantName: 'B', unit: '2', amount: 600, status: 'Pending', date: '', monthPaidFor: '2026-06', method: 'Cash', receiptNumber: 'REC-2' }
    ];

    const expenses: Expense[] = [
      { id: 'e1', title: 'Cleaning service', category: 'Cleaning', amount: 150, date: '2026-06-02' },
      { id: 'e2', title: 'Plumber', category: 'Maintenance', amount: 100, date: '2026-06-03' }
    ];

    const stats = calculateDashboardStats([], payments, expenses);

    expect(stats.totalIncomePaid).toBe(500); // Only 'Paid' counts towards realized income
    expect(stats.totalProjectedIncome).toBe(1100); // Paid + Pending = 1100
    expect(stats.totalExpenses).toBe(250); // 150 + 100 = 250
    expect(stats.netProfit).toBe(250); // Realized Income (500) - Total Expenses (250) = 250
  });

  it('should correctly categorize and group expenses', () => {
    const expenses: Expense[] = [
      { id: 'e1', title: 'A', category: 'Maintenance', amount: 100, date: '' },
      { id: 'e2', title: 'B', category: 'Cleaning', amount: 150, date: '' },
      { id: 'e3', title: 'C', category: 'Maintenance', amount: 200, date: '' },
      { id: 'e4', title: 'D', category: undefined, amount: 80, date: '' }
    ];

    const stats = calculateDashboardStats([], [], expenses);

    expect(stats.expenseByCategory['Maintenance']).toBe(300);
    expect(stats.expenseByCategory['Cleaning']).toBe(150);
    expect(stats.expenseByCategory['Other']).toBe(80); // undefined fallback to 'Other'
  });
});
