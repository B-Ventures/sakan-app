/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tenant, Payment, Expense, ExpenseCategory, formatCurrency } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Building, Percent, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight, Send, Upload } from 'lucide-react';
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
  // Calculations
  const occupiedUnits = tenants.filter(t => t.status === 'active').length;
  const totalUnits = tenants.length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Realized income (paid payments)
  const totalIncomePaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const defaultGuard = activeBuilding?.defaultGuardFee ?? 50;
  const defaultMaint = activeBuilding?.defaultMaintenanceFee ?? 30;

  let totalRentPaid = 0;
  let totalGuardPaid = 0;
  let totalMaintenancePaid = 0;

  payments.filter(p => p.status === 'Paid').forEach(p => {
    if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
      totalRentPaid += p.rentPaid ?? 0;
      totalGuardPaid += p.guardPaid ?? 0;
      totalMaintenancePaid += p.maintenancePaid ?? 0;
    } else {
      const gPaid = Math.min(p.amount, defaultGuard);
      const remaining1 = Math.max(0, p.amount - gPaid);
      const mPaid = Math.min(remaining1, defaultMaint);
      const rPaid = Math.max(0, remaining1 - mPaid);

      totalGuardPaid += gPaid;
      totalMaintenancePaid += mPaid;
      totalRentPaid += rPaid;
    }
  });

  // Projected Income (Paid + Pending + Overdue)
  const totalProjectedIncome = payments.reduce((sum, p) => sum + p.amount, 0);

  // Total Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncomePaid - totalExpenses;

  // Unpaid Rent Accounts (Pending & Overdue for current month or overall)
  const unpaidRentPayments = payments.filter(p => p.status !== 'Paid');

  // Breakdown of active expenses by Category
  const expenseByCategory: Record<string, number> = {};

  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
  });

  const categoriesList = Object.keys(expenseByCategory);
  const maxCategoryExpense = Math.max(...Object.values(expenseByCategory), 1);

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
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Import historical ledger promo banner */}
      {onOpenImportModal && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs" id="bulk-import-banner">
          <div className="flex items-start gap-3 text-left">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs">Bulk Import Historical Bookkeeping</h4>
              <p className="text-[10.5px] text-slate-400 mt-0.5 leading-relaxed">
                Excel or Google Sheets bookkeeping? Download our custom format template, fill your records, and upload to update everything at once.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenImportModal}
            id="dashboard-btn-open-importer"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm transition-colors cursor-pointer"
          >
            Import Ledger (CSV)
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Flow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-net">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Net Profit</span>
            <div className={`p-2 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(netProfit, activeBuilding?.currency || 'JOD')}</h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <span>Income minus operational cost</span>
            </p>
          </div>
        </div>

        {/* Total Rent Income Received */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between" id="kpi-income">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Collected Income (Paid)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncomePaid, activeBuilding?.currency || 'JOD')}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-blue-600 font-semibold text-[11px]">
                  {formatCurrency(totalProjectedIncome, activeBuilding?.currency || 'JOD')}
                </span>
                <span>projectation</span>
              </p>
            </div>
            
            {/* Split sources breakdown */}
            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[10px] text-slate-500 font-medium leading-normal">
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Base Share</span>
                <span className="font-bold text-slate-800 font-mono text-[9px] truncate block">{formatCurrency(totalRentPaid, activeBuilding?.currency || 'JOD')}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Guard</span>
                <span className="font-bold text-slate-800 font-mono text-[9px] truncate block">{formatCurrency(totalGuardPaid, activeBuilding?.currency || 'JOD')}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Svc Box</span>
                <span className="font-bold text-slate-800 font-mono text-[9px] truncate block">{formatCurrency(totalMaintenancePaid, activeBuilding?.currency || 'JOD')}</span>
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
            <p className="text-xs text-slate-400 mt-2">
              Across {expenses.length} recorded items
            </p>
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
            <h3 className="text-3xl font-bold text-slate-900">{occupancyRate}%</h3>
            <p className="text-xs text-slate-400 mt-2">
              {occupiedUnits} occupied / {totalUnits} total units
            </p>
          </div>
        </div>
      </div>

      {/* Main Core Section: Charts and Alerts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Visual Charts & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income vs Expenses Visual custom SVG bar widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Financial Performance Breakdown</h3>
                <p className="text-xs text-slate-400">Total share collections versus maintenance & building expenses</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-blue-500 rounded"></span>Income</span>
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-orange-500 rounded"></span>Expenses</span>
              </div>
            </div>

            {/* Custom high-performance SVG bar container */}
            <div className="relative h-48 w-full border-b border-slate-100 mt-6 flex items-end justify-around pb-2">
              {/* Scale Labels */}
              <div className="absolute left-0 top-0 text-[10px] text-slate-400 flex flex-col justify-between h-full pointer-events-none">
                <span>{formatCurrency(Math.max(totalIncomePaid, totalExpenses, 1000), activeBuilding?.currency || 'JOD')}</span>
                <span>{formatCurrency(Math.round(Math.max(totalIncomePaid, totalExpenses, 1000) / 2), activeBuilding?.currency || 'JOD')}</span>
                <span>{formatCurrency(0, activeBuilding?.currency || 'JOD')}</span>
              </div>

              {/* Real Bar 1: Income Chart bar */}
              <div className="flex flex-col items-center gap-2 w-1/4">
                <div className="w-16 bg-blue-100 hover:bg-blue-200 rounded-t-lg relative transition-all duration-300" 
                     style={{ height: `${(totalIncomePaid / Math.max(totalIncomePaid, totalExpenses, 1000)) * 140}px` }}>
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white font-mono text-[10px] py-0.5 px-1.5 rounded opacity-0 hover:opacity-100 hover:-top-8 transition-all duration-200 pointer-events-none">
                    {formatCurrency(totalIncomePaid, activeBuilding?.currency || 'JOD')}
                  </div>
                  <div className="w-full h-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-lg"></div>
                </div>
                <span className="text-xs font-semibold text-slate-600">Gross Income Received</span>
              </div>

              {/* Real Bar 2: Expenses Logged bar */}
              <div className="flex flex-col items-center gap-2 w-1/4">
                <div className="w-16 bg-orange-100 hover:bg-orange-200 rounded-t-lg relative transition-all duration-300"
                     style={{ height: `${(totalExpenses / Math.max(totalIncomePaid, totalExpenses, 1000)) * 140}px` }}>
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white font-mono text-[10px] py-0.5 px-1.5 rounded opacity-0 hover:opacity-100 hover:-top-8 transition-all duration-200 pointer-events-none border">
                    {formatCurrency(totalExpenses, activeBuilding?.currency || 'JOD')}
                  </div>
                  <div className="w-full h-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg"></div>
                </div>
                <span className="text-xs font-semibold text-slate-600">Total Operational Cost</span>
              </div>

              {/* Real Bar 3: Net Cash flow bar */}
              <div className="flex flex-col items-center gap-2 w-1/4">
                <div className={`w-16 rounded-t-lg relative transition-all duration-300 ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}
                     style={{ height: `${(Math.abs(netProfit) / Math.max(totalIncomePaid, totalExpenses, 1000)) * 140}px` }}>
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white font-mono text-[10px] py-0.5 px-1.5 rounded opacity-0 hover:opacity-100 hover:-top-8 transition-all duration-200 pointer-events-none">
                    {formatCurrency(netProfit, activeBuilding?.currency || 'JOD')}
                  </div>
                  <div className={`w-full h-full rounded-t-lg bg-gradient-to-t ${netProfit >= 0 ? 'from-emerald-500 to-emerald-400' : 'from-rose-500 to-rose-400'}`}></div>
                </div>
                <span className="text-xs font-semibold text-slate-600">Net Operating Flow</span>
              </div>
            </div>
          </div>

          {/* Expense Categories Splitting Visual */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Expense Distribution</h3>
            <p className="text-xs text-slate-400 mb-5">Categorized breakdown of all expenditures</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoriesList.map(cat => {
                const amount = expenseByCategory[cat];
                const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                if (amount === 0) return null;

                return (
                  <div key={cat} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-400 font-mono">{formatCurrency(amount, activeBuilding?.currency || 'JOD')} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full" 
                        style={{ width: `${(amount / maxCategoryExpense) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {totalExpenses === 0 && (
                <div className="col-span-2 text-center text-sm py-8 text-slate-400">
                  No operational expenses logged yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Outstanding Balances & Actionable Reminders */}
        <div className="space-y-6">
          {/* Reminders list & outstanding payments panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Reminders Center</h3>
                <p className="text-xs text-slate-400">Generate Whatsapp reminder deep links</p>
              </div>
              <span className="bg-rose-50 text-rose-600 text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {unpaidRentPayments.length} Pending
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
              {unpaidRentPayments.map(p => {
                // Find matching tenant for phone information
                const tenant = tenants.find(t => t.id === p.tenantId);
                const hasPhone = tenant && tenant.phone;

                // Send WhatsApp reminder
                const waLink = tenant ? getReminderWhatsAppLink(
                  tenant.phone,
                  tenant.name,
                  tenant.unit,
                  p.amount,
                  `Day ${tenant.rentDueDateDay}`,
                  p.monthPaidFor,
                  activeBuilding?.reminderTemplate,
                  activeBuilding?.currency || 'JOD'
                ) : '#';

                return (
                  <div key={p.id} className="p-3 border border-slate-100 rounded-xl hover:border-blue-100 hover:bg-slate-50 transition-all flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-sm">{p.tenantName}</span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded">
                            Unit {p.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Month: {p.monthPaidFor}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-slate-950">{formatCurrency(p.amount, activeBuilding?.currency || 'JOD')}</span>
                        <div>
                          <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                            p.status === 'Overdue' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100/70">
                      <span className="text-[10px] text-slate-400 font-medium">Due: Day {tenant?.rentDueDateDay || '5'}</span>
                      {hasPhone ? (
                        <a 
                          href={waLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-2.5 py-1.5 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Send Remind Link
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No phone attached</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {unpaidRentPayments.length === 0 && (
                <div className="text-center py-12 text-slate-300">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Percent className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">All current balances are clear</p>
                  <p className="text-xs text-slate-400 mt-1">Excellent collection status this month!</p>
                </div>
              )}
            </div>

            {unpaidRentPayments.length > 0 && (
              <button 
                onClick={() => onNavigateToTab('reminders')}
                className="w-full text-center py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg mt-4 transition-colors"
              >
                View Automations Settings & Reminders →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row - Rent ledger recent list */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Union Ledger Overview</h3>
            <p className="text-xs text-slate-400">Unified list of payouts and collections</p>
          </div>
          <button 
            onClick={() => onNavigateToTab('payments')}
            className="text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Review Audit Trail
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pt-2 pl-2">Details</th>
                <th className="pb-3 pt-2">Scope/Category</th>
                <th className="pb-3 pt-2">Date Logged</th>
                <th className="pb-3 pt-2 text-right pr-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {recentTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                      <span className="font-medium text-slate-800 text-sm">{tx.title}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      tx.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 text-xs font-mono">{tx.date || 'TBD'}</td>
                  <td className={`py-3 text-right pr-2 font-mono font-bold text-xs ${
                    tx.type === 'income' ? 'text-blue-600' : 'text-orange-500'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, activeBuilding?.currency || 'JOD')}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-400">
                    No transactions registered in this building.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
