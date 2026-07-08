/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tenant, Payment, Expense, ExpenseCategory, formatCurrency, isMonthCovered } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Building, Percent, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight, Send, Upload, Search } from 'lucide-react';
import { getReminderWhatsAppLink } from '../utils/whatsapp';

interface DashboardOverviewProps {
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  onNavigateToTab: (tab: string) => void;
  onSelectTenantForReminder?: (tenant: Tenant) => void;
  onOpenImportModal?: () => void;
  activeBuilding?: any;
}

export default function DashboardOverview({
  tenants,
  payments,
  expenses,
  onNavigateToTab,
  onOpenImportModal,
  activeBuilding,
}: DashboardOverviewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [reminderTab, setReminderTab] = React.useState<'rent' | 'expenses'>('rent');

  // Calculations
  const occupiedUnits = tenants.filter(t => t.status === 'active').length;
  const totalUnits = tenants.length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Realized income (paid payments)
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

  // Projected Income (Paid + Pending + Overdue)
  const totalProjectedIncome = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Total Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalExpensesPaid = expenses
    .filter(e => (e.status || 'Paid') === 'Paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalIncomePaid - totalExpensesPaid;

  // Unpaid Rent Accounts (Pending & Overdue for current month or overall)
  // We exclude any unpaid payment if there exists a 'Paid' payment covering the same month for this unit/tenant
  const unpaidRentPayments = payments.filter(p => {
    if (p.status === 'Paid') return false;
    const isAlreadyPaid = payments.some(other => 
      other.status === 'Paid' && 
      other.tenantId === p.tenantId && 
      isMonthCovered(other.monthPaidFor, p.monthPaidFor)
    );
    return !isAlreadyPaid;
  });

  // Group unpaid payments by unit at the component level
  const groupedUnpaidDues = React.useMemo(() => {
    const groupsMap = new Map<string, Payment[]>();
    unpaidRentPayments.forEach(p => {
      const key = p.unit || 'Unknown';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(p);
    });

    const list: {
      unit: string;
      tenantName: string;
      tenantId: string;
      payments: Payment[];
      totalDueAmount: number;
    }[] = [];

    groupsMap.forEach((pList, unit) => {
      const firstP = pList[0];
      const tenant = tenants.find(t => t.id === firstP.tenantId) || tenants.find(t => t.unit === unit);
      
      const totalDueAmount = pList.reduce((sum, p) => {
        const pAmount = p.amount > 0
          ? p.amount
          : (tenant
              ? (tenant.monthlyRent + (tenant.guardFee ?? activeBuilding?.defaultGuardFee ?? 0) + (tenant.maintenanceFee ?? activeBuilding?.defaultMaintenanceFee ?? 0))
              : 0
            );
        return sum + pAmount;
      }, 0);

      list.push({
        unit,
        tenantName: tenant ? tenant.name : (firstP.tenantName || 'Unknown Occupant'),
        tenantId: firstP.tenantId,
        payments: pList,
        totalDueAmount
      });
    });

    return list.sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' }));
  }, [unpaidRentPayments, tenants, activeBuilding]);

  const totalDueIncome = React.useMemo(() => {
    return unpaidRentPayments.reduce((sum, p) => {
      const tenant = tenants.find(t => t.id === p.tenantId) || tenants.find(t => t.unit === p.unit);
      const pAmount = p.amount > 0
        ? p.amount
        : (tenant
            ? (tenant.monthlyRent + (tenant.guardFee ?? activeBuilding?.defaultGuardFee ?? 0) + (tenant.maintenanceFee ?? activeBuilding?.defaultMaintenanceFee ?? 0))
            : 0
          );
      return sum + pAmount;
    }, 0);
  }, [unpaidRentPayments, tenants, activeBuilding]);

  const totalDueExpenses = React.useMemo(() => {
    return expenses
      .filter(e => e.status === 'Pending' || e.status === 'Overdue')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  // Breakdown of active expenses by Category
  const expenseByCategory: Record<string, number> = {};

  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
  });

  const categoriesList = Object.keys(expenseByCategory);
  const maxCategoryExpense = Math.max(...Object.values(expenseByCategory), 1);

  // Safe parser for dates in multiple formats (YYYY-MM-DD, D/M/YYYY, etc.) to sort chronologically
  const parseDateToTime = (dStr: string) => {
    if (!dStr) return 0;
    if (dStr.includes('/')) {
      const parts = dStr.split('/');
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 12) {
          return new Date(p2, p1 - 1, p0).getTime();
        } else {
          return new Date(p2, p0 - 1, p1).getTime();
        }
      }
    }
    if (dStr.includes('-')) {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 1000) {
          return new Date(p0, p1 - 1, p2).getTime();
        } else if (p2 > 1000) {
          if (p0 > 12) {
            return new Date(p2, p1 - 1, p0).getTime();
          } else {
            return new Date(p2, p0 - 1, p1).getTime();
          }
        }
      }
    }
    const t = Date.parse(dStr);
    return isNaN(t) ? 0 : t;
  };

  // Recent Transactions combining both
  const recentTransactions = [
    ...payments.filter(p => p.status === 'Paid').map(p => ({
      type: 'income' as const,
      id: p.id,
      title: `${p.tenantName} (Unit ${p.unit})`,
      amount: p.amount,
      date: p.date,
      category: 'Share' as const,
    })),
    ...expenses.map(e => ({
      type: 'expense' as const,
      id: e.id,
      title: e.title,
      amount: e.amount,
      date: e.date,
      category: e.category,
    })),
  ].sort((a, b) => {
    const timeA = parseDateToTime(a.date);
    const timeB = parseDateToTime(b.date);
    return timeB - timeA;
  }).slice(0, 5);

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Informative KPI Cards at the Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Flow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-net">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Net Balance</span>
            <div className={`p-2 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netProfit, activeBuilding?.currency || 'JOD')}
            </h3>
            <div className="text-xs text-slate-400 mt-2.5 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span>Projected (After Bills):</span>
                <span className={`font-semibold ${(netProfit - totalDueExpenses) >= 0 ? 'text-emerald-650' : 'text-rose-650'}`}>
                  {formatCurrency(netProfit - totalDueExpenses, activeBuilding?.currency || 'JOD')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Rent Income Received */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-income">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Collected Income</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncomePaid, activeBuilding?.currency || 'JOD')}</h3>
            <div className="text-xs text-slate-400 mt-2.5 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span>Uncollected (Due):</span>
                <span className="text-rose-600 font-semibold">{formatCurrency(totalDueIncome, activeBuilding?.currency || 'JOD')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-expenses">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Expenses Logged</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses, activeBuilding?.currency || 'JOD')}</h3>
            <div className="text-xs text-slate-400 mt-2.5 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span>Unpaid (Due):</span>
                <span className="text-orange-600 font-semibold">{formatCurrency(totalDueExpenses, activeBuilding?.currency || 'JOD')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-occupancy">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Occupancy Rate</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{occupancyRate}%</h3>
            <div className="text-xs text-slate-400 mt-2.5 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span>Occupied / Total:</span>
                <span className="text-slate-700 font-semibold">{occupiedUnits}/{totalUnits}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Financial Insights Row (Equal-Height horizontal block) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Financial Performance Breakdown Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-[390px] hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Financial Performance</h3>
                <p className="text-[11px] text-slate-400">Collected income vs costs</p>
              </div>
              <div className="flex gap-2.5 text-[10px] shrink-0">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs"></span>In
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-xs"></span>Out
                </span>
              </div>
            </div>

            {/* Custom Bar Chart Container */}
            <div className="relative h-44 w-full mt-6">
              {/* Grid Lines & Scale Labels */}
              <div className="absolute left-0 right-0 top-8 h-[104px] pointer-events-none">
                {/* 100% Grid Line */}
                <div className="absolute top-0 left-14 right-0 border-t border-dashed border-slate-100 flex items-center">
                  <span className="absolute -left-14 -translate-y-1/2 text-[9px] font-mono text-slate-400 w-12 text-right">
                    {formatCurrency(Math.max(totalIncomePaid, totalExpensesPaid, 1000), activeBuilding?.currency || 'JOD')}
                  </span>
                </div>
                {/* 50% Grid Line */}
                <div className="absolute top-1/2 left-14 right-0 border-t border-dashed border-slate-100 flex items-center">
                  <span className="absolute -left-14 -translate-y-1/2 text-[9px] font-mono text-slate-400 w-12 text-right">
                    {formatCurrency(Math.round(Math.max(totalIncomePaid, totalExpensesPaid, 1000) / 2), activeBuilding?.currency || 'JOD')}
                  </span>
                </div>
                {/* 0% Grid Line (Baseline) */}
                <div className="absolute bottom-0 left-14 right-0 border-t border-slate-200 flex items-center">
                  <span className="absolute -left-14 -translate-y-1/2 text-[9px] font-mono text-slate-400 w-12 text-right">
                    {formatCurrency(0, activeBuilding?.currency || 'JOD')}
                  </span>
                </div>
              </div>

              {/* Bars Container */}
              <div className="absolute left-14 right-0 top-8 h-[104px] flex items-end justify-around">
                {/* Bar 1: Gross Received */}
                <div className="flex flex-col items-center h-full justify-end relative w-1/3 group">
                  {/* Floating Value Badge */}
                  <div 
                    className="absolute z-10 transition-all duration-300 pointer-events-none whitespace-nowrap"
                    style={{ bottom: `${(totalIncomePaid / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104 + 6}px` }}
                  >
                    <span className="bg-blue-50 text-blue-700 border border-blue-100/80 px-2 py-0.5 rounded-md text-[9.5px] font-black font-mono shadow-xs">
                      {formatCurrency(totalIncomePaid, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                  {/* The Bar */}
                  <div 
                    className="w-10 sm:w-12 bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-t-md shadow-xs transition-all duration-300 cursor-pointer" 
                    style={{ height: `${(totalIncomePaid / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104}px` }}
                  />
                  {/* Label */}
                  <span className="absolute -bottom-7 text-[10.5px] font-extrabold text-slate-500 whitespace-nowrap text-center">Received</span>
                </div>

                {/* Bar 2: Total Operational Costs (Paid) */}
                <div className="flex flex-col items-center h-full justify-end relative w-1/3 group">
                  {/* Floating Value Badge */}
                  <div 
                    className="absolute z-10 transition-all duration-300 pointer-events-none whitespace-nowrap"
                    style={{ bottom: `${(totalExpensesPaid / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104 + 6}px` }}
                  >
                    <span className="bg-orange-50 text-orange-700 border border-orange-100/80 px-2 py-0.5 rounded-md text-[9.5px] font-black font-mono shadow-xs">
                      {formatCurrency(totalExpensesPaid, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                  {/* The Bar */}
                  <div 
                    className="w-10 sm:w-12 bg-gradient-to-t from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 rounded-t-md shadow-xs transition-all duration-300 cursor-pointer" 
                    style={{ height: `${(totalExpensesPaid / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104}px` }}
                  />
                  {/* Label */}
                  <span className="absolute -bottom-7 text-[10.5px] font-extrabold text-slate-500 whitespace-nowrap text-center">Costs</span>
                </div>

                {/* Bar 3: Net Cash Flow */}
                <div className="flex flex-col items-center h-full justify-end relative w-1/3 group">
                  {/* Floating Value Badge */}
                  <div 
                    className="absolute z-10 transition-all duration-300 pointer-events-none whitespace-nowrap"
                    style={{ bottom: `${(Math.abs(netProfit) / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104 + 6}px` }}
                  >
                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black font-mono shadow-xs border ${
                      netProfit >= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100/80' 
                        : 'bg-rose-50 text-rose-700 border-rose-100/80'
                    }`}>
                      {formatCurrency(netProfit, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                  {/* The Bar */}
                  <div 
                    className={`w-10 sm:w-12 rounded-t-md shadow-xs transition-all duration-300 cursor-pointer bg-gradient-to-t ${
                      netProfit >= 0 
                        ? 'from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300' 
                        : 'from-rose-500 to-rose-400 hover:from-rose-400 hover:to-rose-300'
                    }`}
                    style={{ height: `${(Math.abs(netProfit) / Math.max(totalIncomePaid, totalExpensesPaid, 1000)) * 104}px` }}
                  />
                  {/* Label */}
                  <span className="absolute -bottom-7 text-[10.5px] font-extrabold text-slate-500 whitespace-nowrap text-center">Net Flow</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 p-2 rounded-xl mt-3">
            <span>Performance Status:</span>
            <span className={`font-extrabold uppercase text-[10.5px] tracking-wider ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {netProfit >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* 2. Income Distribution Progressive Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-[390px] hover:shadow-md transition-shadow" id="income-distribution-card">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Income Distribution</h3>
            <p className="text-[11px] text-slate-400 mb-5">Breakdown of collected income components</p>

            <div className="space-y-4">
              {[
                { name: 'Base Share', amount: totalRentPaid },
                { name: 'Guard Share', amount: totalGuardPaid },
                { name: 'Svc Box Share', amount: totalMaintenancePaid }
              ].map(source => {
                const percentage = totalIncomePaid > 0 ? Math.round((source.amount / totalIncomePaid) * 105) : 0;
                const maxSourceAmount = Math.max(totalRentPaid, totalGuardPaid, totalMaintenancePaid, 1);

                return (
                  <div key={source.name} className="space-y-1.5 p-1 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>{source.name}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{formatCurrency(source.amount, activeBuilding?.currency || 'JOD')} ({Math.min(100, percentage)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${(source.amount / maxSourceAmount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {totalIncomePaid === 0 && (
                <div className="text-center text-xs py-10 text-slate-400">
                  No collected income registered yet.
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-50 flex justify-between items-center bg-blue-50/20 p-2 rounded-xl mt-3">
            <span>Collected Realized:</span>
            <span className="font-mono font-extrabold text-slate-800">{formatCurrency(totalIncomePaid, activeBuilding?.currency || 'JOD')}</span>
          </div>
        </div>

        {/* 3. Expense Distribution Progressive Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-[390px] hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Expense Distribution</h3>
            <p className="text-[11px] text-slate-400 mb-5">Breakdown of operational categories</p>

            <div className="space-y-3.5 overflow-y-auto max-h-[200px] pr-0.5">
              {categoriesList.map(cat => {
                const amount = expenseByCategory[cat];
                const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                if (amount === 0) return null;

                return (
                  <div key={cat} className="space-y-1.5 p-1 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span className="truncate max-w-[120px]" title={cat}>{cat}</span>
                      <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">{formatCurrency(amount, activeBuilding?.currency || 'JOD')} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${(amount / maxCategoryExpense) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {totalExpenses === 0 && (
                <div className="text-center text-xs py-10 text-slate-400">
                  No operational expenses logged.
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-50 flex justify-between items-center bg-orange-50/20 p-2 rounded-xl mt-3">
            <span>Total Operational Out:</span>
            <span className="font-mono font-extrabold text-slate-800">{formatCurrency(totalExpenses, activeBuilding?.currency || 'JOD')}</span>
          </div>
        </div>

      </div>

      {/* Operations & Action Split Hub: Reminders Center (2/3 Wide) vs Union Ledger Overview Activity Feed (1/3 Narrow) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Spacious, Fully Detailed Reminders Center (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-bold text-slate-800 text-base">Reminders Center</h3>
                
                {/* Rent vs Expenses Toggle Buttons */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setReminderTab('rent')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      reminderTab === 'rent'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tenant Dues ({groupedUnpaidDues.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderTab('expenses')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      reminderTab === 'expenses'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Expense Bills ({expenses.filter(e => e.status === 'Pending' || e.status === 'Overdue').length})
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {reminderTab === 'rent' 
                  ? 'Contact outstanding rent accounts & send customized billing statements'
                  : 'Track and update payment status for pending contractor or maintenance vendor costs'
                }
              </p>
            </div>
            
            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder={reminderTab === 'rent' ? 'Search unit or tenant...' : 'Search category or cost...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-xs pl-9 pr-3 py-2 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-150 rounded-xl transition-all font-medium outline-hidden"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Dues Cards Grid inside the spacious panel */}
          <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1.5 scrollbar-thin">
            {(() => {
              if (reminderTab === 'expenses') {
                const unpaidExpenses = expenses.filter(e => e.status === 'Pending' || e.status === 'Overdue');
                const filteredExpensesList = unpaidExpenses.filter(e => {
                  const query = searchQuery.trim().toLowerCase();
                  if (!query) return true;
                  return e.title.toLowerCase().includes(query) || e.category.toLowerCase().includes(query);
                });

                if (filteredExpensesList.length === 0) {
                  return (
                    <div className="text-center py-20 text-slate-350 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150">
                      <div className="w-12 h-12 bg-white shadow-xs rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="w-5 h-5 text-slate-350" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500 font-sans">No outstanding expenses match your filter</p>
                      <p className="text-xs text-slate-400 mt-1 font-sans">All recorded costs are settled!</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredExpensesList.map(exp => {
                      const isOverdue = exp.status === 'Overdue' || (exp.dueDate && new Date(exp.dueDate) < new Date());

                      return (
                        <div key={exp.id} className="p-4 border border-slate-100 bg-white rounded-xl hover:bg-slate-50/75 transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 bg-orange-50 group-hover:bg-orange-100/50 text-orange-600 font-extrabold text-[10px] uppercase flex items-center justify-center rounded-lg transition-colors border border-orange-100/30 font-mono shrink-0">
                                OUT
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 text-xs block tracking-tight truncate max-w-[150px]" title={exp.title}>{exp.title}</span>
                                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-sans">{exp.category}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-extrabold text-xs text-slate-900 block">{formatCurrency(exp.amount, activeBuilding?.currency || 'JOD')}</span>
                              <span className={`inline-block text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                                isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {isOverdue ? 'Overdue' : (exp.status || 'Pending')}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-1 text-slate-600 border border-slate-100/50 font-sans">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">Log Date:</span>
                              <span className="font-mono font-medium text-slate-700">{exp.date}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-semibold">Due Date:</span>
                              <span className={`font-mono font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                {exp.dueDate || 'No deadline'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 mt-0.5 shrink-0 font-sans">
                            <span className="text-[10px] text-slate-400 font-medium truncate flex-1" title={exp.notes}>
                              {exp.notes ? `Memo: ${exp.notes}` : 'No notes'}
                            </span>
                            <button
                              onClick={() => onNavigateToTab('reminders')}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 active:scale-95"
                            >
                              Update Status
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Filter by search query from the precomputed groupedUnpaidDues
              const filteredList = groupedUnpaidDues.filter(g => {
                const query = searchQuery.trim().toLowerCase();
                if (!query) return true;
                return g.tenantName.toLowerCase().includes(query) || g.unit.toLowerCase().includes(query);
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-20 text-slate-350 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150">
                    <div className="w-12 h-12 bg-white shadow-xs rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-slate-350" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No outstanding dues match your filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try searching a different unit code or tenant name</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredList.map(group => {
                    const tenant = tenants.find(t => t.id === group.tenantId);
                    const hasPhone = tenant && tenant.phone;

                    // Calculate consolidated splits for all unpaid months in group
                    const baseRentTotal = group.payments.reduce((sum, p) => {
                      const base = p.rentPaid !== undefined ? p.rentPaid : (tenant?.monthlyRent ?? 0);
                      return sum + Number(base);
                    }, 0);

                    const guardFeeTotal = group.payments.reduce((sum, p) => {
                      const guard = p.guardPaid !== undefined ? p.guardPaid : (tenant?.guardFee ?? activeBuilding?.defaultGuardFee ?? 0);
                      return sum + Number(guard);
                    }, 0);

                    const maintenanceFeeTotal = group.payments.reduce((sum, p) => {
                      const maint = p.maintenancePaid !== undefined ? p.maintenancePaid : (tenant?.maintenanceFee ?? activeBuilding?.defaultMaintenanceFee ?? 0);
                      return sum + Number(maint);
                    }, 0);

                    const combinedMonths = group.payments.map(x => x.monthPaidFor).join(', ');
                    const dueAmount = group.totalDueAmount;

                    const waLink = tenant ? getReminderWhatsAppLink(
                      tenant.phone,
                      tenant.name,
                      tenant.unit,
                      dueAmount,
                      `Day ${tenant.rentDueDateDay}`,
                      combinedMonths,
                      activeBuilding?.reminderTemplate,
                      activeBuilding?.currency || 'JOD',
                      activeBuilding?.bankTransferId
                    ) : '#';

                    const isOverdue = group.payments.some(p => p.status === 'Overdue');

                    return (
                      <div key={group.unit} className="p-4 border border-slate-100 bg-white rounded-xl hover:bg-slate-50/75 transition-all duration-205 flex flex-col justify-between gap-3.5 relative overflow-hidden group">
                        {/* Unit Badge and Tenant details */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-slate-50 group-hover:bg-blue-50/50 text-slate-700 group-hover:text-blue-600 font-extrabold text-xs flex items-center justify-center rounded-xl transition-colors border border-slate-100/80">
                              U {group.unit}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block tracking-tight line-clamp-1">{group.tenantName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unpaid: {combinedMonths}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-extrabold text-sm text-slate-900 block">{formatCurrency(dueAmount, activeBuilding?.currency || 'JOD')}</span>
                            <span className={`inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded mt-1 ${
                              isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {/* Detailed Split Breakdown Box */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100/50">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">Base rent</span>
                            <span className="block text-[10px] font-semibold text-slate-700 font-mono mt-0.5">{formatCurrency(baseRentTotal, activeBuilding?.currency || 'JOD')}</span>
                          </div>
                          <div className="border-x border-slate-150">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">Guard</span>
                            <span className="block text-[10px] font-semibold text-slate-700 font-mono mt-0.5">{formatCurrency(guardFeeTotal, activeBuilding?.currency || 'JOD')}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">Svc Box</span>
                            <span className="block text-[10px] font-semibold text-slate-700 font-mono mt-0.5">{formatCurrency(maintenanceFeeTotal, activeBuilding?.currency || 'JOD')}</span>
                          </div>
                        </div>

                        {/* Card bottom details and WhatsApp triggers */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                          <span className="text-[10px] text-slate-450 font-semibold flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Due: Day {tenant?.rentDueDateDay || '5'} of month
                          </span>

                          {hasPhone ? (
                            <a 
                              href={waLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-xl px-3 py-2 transition-all duration-250 shrink-0 hover:shadow-xs focus:ring-1 focus:ring-emerald-200 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              Send Reminder
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-medium">No contact attached</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <button 
            onClick={() => onNavigateToTab('reminders')}
            className="w-full text-center py-2.5 mt-5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/85 rounded-xl transition-all duration-200 focus:outline-hidden"
          >
            Go to Reminder Settings & System Automations &rarr;
          </button>
        </div>

        {/* Right Side: High-density chronological Union Ledger Activity Feed (1/3 width) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Union Ledger Overview</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Chronological record of building cashflow</p>
              </div>
              <button 
                onClick={() => onNavigateToTab('payments')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 shrink-0 uppercase tracking-wider"
              >
                Full Trail
              </button>
            </div>

            {/* List Activity Items */}
            <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-0.5">
              {recentTransactions.map(tx => (
                <div 
                  key={tx.id} 
                  className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50/75 transition-all duration-205 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      tx.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate leading-tight mb-1" title={tx.title}>
                        {tx.title}
                      </p>
                      <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-medium leading-none">
                        <span className={`font-semibold uppercase text-[9.5px] px-1.5 py-0.5 rounded-xs shrink-0 ${
                          tx.type === 'income' ? 'bg-blue-50/60 text-blue-500' : 'bg-orange-50/60 text-orange-500'
                        }`}>
                          {tx.category}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{tx.date || 'TBD'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-auto">
                    <span className={`font-mono font-extrabold text-xs block ${
                      tx.type === 'income' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount || 0, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                </div>
              ))}

              {recentTransactions.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-150">
                  <p className="text-xs font-medium">No recorded audit transactions yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-50/80 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/50 p-2.5 rounded-xl">
            <span>Recent ledger entries:</span>
            <span className="font-bold text-slate-700 font-mono">{recentTransactions.length} items</span>
          </div>
        </div>

      </div>
    </div>
  );
}
