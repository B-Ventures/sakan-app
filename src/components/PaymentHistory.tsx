/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tenant, Payment, formatCurrency, getMonthCount } from '../types';
import { Plus, Check, Clock, AlertTriangle, Search, Send, Receipt, Printer, Trash2, Edit2, Save } from 'lucide-react';
import { getReceiptWhatsAppLink } from '../utils/whatsapp';
import ConfirmationDialog from './ConfirmationDialog';

interface PaymentHistoryProps {
  payments: Payment[];
  tenants: Tenant[];
  onAddPayment: (payment: Omit<Payment, 'id' | 'receiptNumber'>) => void;
  onEditPayment: (payment: Payment) => void;
  onUpdatePaymentStatus: (id: string, status: Payment['status'], datePaid?: string) => void;
  onDeletePayment: (id: string) => void;
  customPaymentMethods: string[];
  customIncomeCategories: string[];
  activeBuilding?: any;
}

export default function PaymentHistory({
  payments,
  tenants,
  onAddPayment,
  onEditPayment,
  onUpdatePaymentStatus,
  onDeletePayment,
  customPaymentMethods,
  customIncomeCategories,
  activeBuilding,
}: PaymentHistoryProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Selected Payment for Receipt Viewer
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);

  // Form Fields State
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dynamicSplits, setDynamicSplits] = useState<Record<string, number>>({});
  const [billingMonthType, setBillingMonthType] = useState<'single' | 'multi'>('single');
  const [monthPaidFor, setMonthPaidFor] = useState('2026-06');
  const [monthPaidForEnd, setMonthPaidForEnd] = useState('2026-06');
  const [method, setMethod] = useState('Bank Transfer');
  const [status, setStatus] = useState<Payment['status']>('Paid');
  const [date, setDate] = useState('2026-06-08');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    const numMonths = billingMonthType === 'multi' ? getMonthCount(monthPaidFor, monthPaidForEnd) : 1;
    const monthlySum = Object.values(dynamicSplits).reduce((sum, val) => sum + Number(val || 0), 0);
    setAmount(monthlySum * numMonths);
  }, [dynamicSplits, billingMonthType, monthPaidFor, monthPaidForEnd]);

  const getTenantDefaultSplits = (tenant: Tenant, categories: string[]) => {
    const splits: Record<string, number> = {};
    categories.forEach(cat => {
      const lower = cat.toLowerCase();
      if (lower.includes('rent')) {
        splits[cat] = tenant.monthlyRent || 0;
      } else if (lower.includes('guard')) {
        splits[cat] = tenant.guardFee ?? 50;
      } else if (lower.includes('service') || lower.includes('maint')) {
        splits[cat] = tenant.maintenanceFee ?? 30;
      } else {
        splits[cat] = 0;
      }
    });
    return splits;
  };

  const handleTenantSelectChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      const splits = getTenantDefaultSplits(tenant, customIncomeCategories);
      setDynamicSplits(splits);
      setAmount(Object.values(splits).reduce((a, b) => Number(a) + Number(b || 0), 0));
    }
  };

  const openAddForm = () => {
    setEditingPayment(null);
    const activeTenants = tenants.filter(t => t.status === 'active');
    let defaultTenantId = '';
    let initialSplits: Record<string, number> = {};
    
    if (activeTenants.length > 0) {
      defaultTenantId = activeTenants[0].id;
      initialSplits = getTenantDefaultSplits(activeTenants[0], customIncomeCategories);
    } else {
      customIncomeCategories.forEach(cat => {
        initialSplits[cat] = cat.toLowerCase().includes('rent') ? 1200 : cat.toLowerCase().includes('guard') ? 50 : cat.toLowerCase().includes('service') ? 30 : 0;
      });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    setSelectedTenantId(defaultTenantId);
    setDynamicSplits(initialSplits);
    setAmount(Object.values(initialSplits).reduce((a, b) => Number(a) + Number(b || 0), 0));
    setBillingMonthType('single');
    setMonthPaidFor(currentMonth);
    setMonthPaidForEnd(currentMonth);
    setMethod(customPaymentMethods[0] || 'Bank Transfer');
    setStatus('Paid');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPayment(null);
  };

  const openEditForm = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedTenantId(payment.tenantId);
    
    let initialSplits: Record<string, number> = {};
    const defaultGuard = activeBuilding?.defaultGuardFee ?? 50;
    const defaultMaint = activeBuilding?.defaultMaintenanceFee ?? 30;
    if (payment.splits) {
      initialSplits = { ...payment.splits };
    } else {
      customIncomeCategories.forEach(cat => {
        const lower = cat.toLowerCase();
        if (lower.includes('rent')) {
          initialSplits[cat] = payment.rentPaid ?? Math.max(0, payment.amount - (payment.guardPaid ?? defaultGuard) - (payment.maintenancePaid ?? defaultMaint));
        } else if (lower.includes('guard')) {
          initialSplits[cat] = payment.guardPaid ?? defaultGuard;
        } else if (lower.includes('service') || lower.includes('maint')) {
          initialSplits[cat] = payment.maintenancePaid ?? defaultMaint;
        } else {
          initialSplits[cat] = 0;
        }
      });
    }

    const rangeMonths = payment.monthPaidFor && payment.monthPaidFor.includes(' to ')
      ? getMonthCount(payment.monthPaidFor.split(/\s*to\s*/)[0], payment.monthPaidFor.split(/\s*to\s*/)[1])
      : 1;

    const editSplits: Record<string, number> = {};
    Object.keys(initialSplits).forEach(key => {
      editSplits[key] = (initialSplits[key] || 0) / rangeMonths;
    });

    setDynamicSplits(editSplits);
    setAmount(payment.amount);

    if (payment.monthPaidFor && payment.monthPaidFor.includes(' to ')) {
      const parts = payment.monthPaidFor.split(/\s*to\s*/);
      setMonthPaidFor(parts[0]);
      setMonthPaidForEnd(parts[1] || parts[0]);
      setBillingMonthType('multi');
    } else {
      setMonthPaidFor(payment.monthPaidFor || '2026-06');
      setMonthPaidForEnd(payment.monthPaidFor || '2026-06');
      setBillingMonthType('single');
    }

    setMethod(payment.method);
    setStatus(payment.status);
    setDate(payment.date || '');
    setNotes(payment.notes || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      alert('Please select an active resident/beneficiary');
      return;
    }

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    const finalMonth = billingMonthType === 'multi'
      ? `${monthPaidFor} to ${monthPaidForEnd}`
      : monthPaidFor;

    const numMonths = billingMonthType === 'multi' ? getMonthCount(monthPaidFor, monthPaidForEnd) : 1;
    const persistedSplits: Record<string, number> = {};
    Object.keys(dynamicSplits).forEach(key => {
      persistedSplits[key] = Number(dynamicSplits[key] || 0) * numMonths;
    });

    const payload = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      unit: tenant.unit,
      amount: Number(amount),
      // Legacy support for backwards compatibility
      rentPaid: Number(persistedSplits[customIncomeCategories[0]] || 0),
      guardPaid: Number(persistedSplits[customIncomeCategories[1]] || 0),
      maintenancePaid: Number(persistedSplits[customIncomeCategories[2]] || 0),
      splits: persistedSplits,
      date: status === 'Paid' ? date : '',
      monthPaidFor: finalMonth,
      method,
      status,
      notes,
    };

    if (editingPayment) {
      onEditPayment({
        ...editingPayment,
        ...payload,
      });
    } else {
      onAddPayment(payload);
    }

    closeForm();
  };

  // Filter Payments
  const filteredPayments = payments.filter(p => {
    // filter status
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;

    // filter search
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = p.tenantName.toLowerCase().includes(q);
      const matchUnit = p.unit.toLowerCase().includes(q);
      const matchReceipt = p.receiptNumber.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      return matchName || matchUnit || matchReceipt || matchNotes;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="payment-history-module">
      {/* Header sections */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Income Collections Ledger</h2>
          <p className="text-xs text-slate-400">Track invoices, pending balances, and distribute WhatsApp Receipts</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg self-start sm:self-center shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Payment
        </button>
      </div>

      {/* Controls panel: Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Toggle selectors */}
        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {['all', 'Paid', 'Pending', 'Overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                filterStatus === st ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {st === 'all' ? 'All Statements' : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search occupant, unit, receipt no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs py-2 pl-9 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Ledger list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden" id="payments-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Receipt No & Beneficiary</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Financial Amount</th>
                <th className="py-3 px-4">Method & Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredPayments.map(p => {
                // Determine WhatsApp send link
                const tenant = tenants.find(t => t.id === p.tenantId);
                const hasPhone = tenant && tenant.phone;
                const payMethodName = p.method || 'Bank Transfer';

                const waLink = tenant ? getReceiptWhatsAppLink(
                  tenant.phone,
                  tenant.name,
                  p.unit,
                  p.amount,
                  p.monthPaidFor,
                  p.receiptNumber,
                  p.date || 'TBD',
                  payMethodName,
                  activeBuilding?.receiptTemplate,
                  activeBuilding?.currency || 'JOD'
                ) : '#';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mr-1">
                          {p.receiptNumber}
                        </span>
                        <div className="font-bold text-slate-800 text-sm mt-1">{p.tenantName}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs font-mono">
                        {p.unit}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-slate-600">
                      {p.monthPaidFor}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-[13px] text-slate-900 block">
                        {formatCurrency(p.amount, activeBuilding?.currency || 'JOD')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block whitespace-nowrap font-normal">
                        {customIncomeCategories.map((cat, idx) => {
                          const defaultG = activeBuilding?.defaultGuardFee ?? 50;
                          const defaultM = activeBuilding?.defaultMaintenanceFee ?? 30;
                          const val = p.splits ? (p.splits[cat] || 0) : (
                            idx === 0 ? (p.rentPaid ?? Math.max(0, p.amount - (p.guardPaid ?? defaultG) - (p.maintenancePaid ?? defaultM))) :
                            idx === 1 ? (p.guardPaid ?? defaultG) :
                            idx === 2 ? (p.maintenancePaid ?? defaultM) : 0
                          );
                          return `${cat.split(' ')[0]}: ${formatCurrency(val, activeBuilding?.currency || 'JOD')}`;
                        }).join(' | ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <div className="text-slate-700 font-medium">{p.method}</div>
                      <div className="text-slate-400 font-mono mt-0.5">{p.date || '—'}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        p.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {p.status === 'Paid' ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : p.status === 'Pending' ? (
                          <Clock className="w-2.5 h-2.5" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        )}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit entry */}
                        <button
                          onClick={() => openEditForm(p)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors animate-none"
                          title="Edit transaction details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* If status is Pending or Overdue, allow settling manually */}
                        {p.status !== 'Paid' && (
                          <button
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              onUpdatePaymentStatus(p.id, 'Paid', today);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            title="Mark as Paid"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Settle
                          </button>
                        )}

                        {/* View statement bill/receipt */}
                        <button
                          onClick={() => setViewingReceipt(p)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors"
                          title="Generate Receipt Document"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Receipt link */}
                        {p.status === 'Paid' ? (
                          hasPhone ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-lg transition-colors flex items-center justify-center"
                              title="Send Receipt via WhatsApp link"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="bg-slate-100 text-slate-300 p-2 rounded-lg cursor-not-allowed"
                              title="No WhatsApp phone on record"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )
                        ) : null}

                        {/* Delete entry */}
                        <button
                          onClick={() => {
                            setDeleteConfirmId(p.id);
                          }}
                          className="border border-rose-50 hover:border-rose-100 text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          title="Delete payment receipt log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 bg-white">
                    <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">No income statements registered</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting filter or record a new receipt.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual log form dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 duration-200">
            <div className="bg-slate-50 border-b p-5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800">
                {editingPayment ? 'Edit Payment Log' : 'Log Payment'}
              </h3>
              <button
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select Unit & Resident *</label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => handleTenantSelectChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-violet-500 bg-white"
                >
                  <option value="">-- Choose Resident / Reference --</option>
                  {tenants
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        Unit {t.unit} - {t.name} (Share: {formatCurrency(t.monthlyRent, activeBuilding?.currency || 'JOD')})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period Duration</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBillingMonthType('single')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      billingMonthType === 'single'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Single Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMonthType('multi')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      billingMonthType === 'multi'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Multiple Months
                  </button>
                </div>
              </div>

              {billingMonthType === 'single' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Billing Month *</label>
                    <input
                       type="month"
                       required
                       value={monthPaidFor}
                       onChange={(e) => {
                         setMonthPaidFor(e.target.value);
                         setMonthPaidForEnd(e.target.value);
                       }}
                       className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Total Dynamic Sum</label>
                    <div className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 text-slate-700 font-mono font-bold">
                      {formatCurrency(amount, activeBuilding?.currency || 'JOD')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 truncate mb-1">Start Month *</label>
                    <input
                       type="month"
                       required
                       value={monthPaidFor}
                       onChange={(e) => setMonthPaidFor(e.target.value)}
                       className="w-full text-[11px] p-2 border rounded-xl focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 truncate mb-1">End Month *</label>
                    <input
                       type="month"
                       required
                       value={monthPaidForEnd}
                       onChange={(e) => setMonthPaidForEnd(e.target.value)}
                       className="w-full text-[11px] p-2 border rounded-xl focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 truncate mb-1">Total</label>
                    <div className="w-full text-[11px] p-2 border bg-slate-50 text-slate-700 font-mono font-bold flex items-center justify-center rounded-xl">
                      {formatCurrency(amount, activeBuilding?.currency || 'JOD')}
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Itemized Split Formulary */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Income Categories Covered by Payment</span>
                
                <div className="space-y-2">
                  {customIncomeCategories.map(cat => (
                    <div key={cat} className="flex items-center justify-between gap-4 text-xs">
                      <label className="text-slate-500 font-semibold truncate max-w-[150px]">{cat}</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={dynamicSplits[cat] ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const nextSplits = { ...dynamicSplits, [cat]: val };
                          setDynamicSplits(nextSplits);
                          setAmount((Object.values(nextSplits) as number[]).reduce((a, b) => a + b, 0));
                        }}
                        className="w-28 font-mono p-1.5 border rounded bg-white text-xs focus:outline-none focus:border-violet-500 text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-violet-500 bg-white"
                  >
                    {customPaymentMethods.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {status === 'Paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Internal Notes</label>
                <textarea
                  placeholder="Memo, check number, bank auth reference ID..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedTenantId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  {editingPayment ? 'Save Transaction Changes' : 'Log Payment Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Interactive Payment Receipt Statement Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in" id="receipt-modal">
            {/* Header */}
            <div className="bg-slate-50 border-b px-5 py-4 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-500" />
                Receipt Generator
              </span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div className="p-6 bg-white space-y-6 overflow-y-auto flex-1" id="receipt-print-area">
              <div className="text-center">
                <h4 className="text-md font-extrabold text-slate-900 uppercase tracking-widest">{viewingReceipt.tenantName ? (activeBuilding?.name || 'Grandview Residences') : 'Property Receipt'}</h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{activeBuilding?.address || 'Premium Building Management'}</p>
                <div className="w-12 h-1 bg-blue-500 mx-auto mt-3 rounded-full"></div>
              </div>

              {/* Receipt Code and stamp */}
              <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Receipt Code</span>
                  <span className="font-mono font-bold text-slate-800">{viewingReceipt.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${
                    viewingReceipt.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                  }`}>
                    {viewingReceipt.status}
                  </span>
                </div>
              </div>

              {/* Invoice Lines */}
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-400">Received From</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.tenantName}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-400">Rental Unit</span>
                  <span className="font-bold text-slate-800 font-mono">Unit {viewingReceipt.unit}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-400">Statement Month</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.monthPaidFor}</span>
                </div>
                
                {/* Itemized Splits display */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 mt-2">
                  <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Income Breakdown</div>
                  {customIncomeCategories.map((cat, idx) => {
                    const defaultG = activeBuilding?.defaultGuardFee ?? 50;
                    const defaultM = activeBuilding?.defaultMaintenanceFee ?? 30;
                    const value = viewingReceipt.splits ? (viewingReceipt.splits[cat] ?? 0) : (
                      idx === 0 ? (viewingReceipt.rentPaid ?? Math.max(0, viewingReceipt.amount - (viewingReceipt.guardPaid ?? defaultG) - (viewingReceipt.maintenancePaid ?? defaultM))) :
                      idx === 1 ? (viewingReceipt.guardPaid ?? defaultG) :
                      idx === 2 ? (viewingReceipt.maintenancePaid ?? defaultM) : 0
                    );
                    return (
                      <div className="flex justify-between text-xs" key={cat}>
                        <span className="text-slate-500">{cat}</span>
                        <span className="font-semibold text-slate-800 font-mono text-[11px]">
                          {formatCurrency(value, activeBuilding?.currency || 'JOD')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2 pt-1">
                  <span className="text-slate-400">Payment Option</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.method}</span>
                </div>
                {viewingReceipt.date && (
                  <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                    <span className="text-slate-400">Settled Date</span>
                    <span className="font-bold text-slate-800 font-mono">{viewingReceipt.date}</span>
                  </div>
                )}
              </div>

              {/* Grand Total section */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Total Amount Cleared</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                  {formatCurrency(viewingReceipt.amount, activeBuilding?.currency || 'JOD')}
                </div>
              </div>

              {/* Barcode Mock visual element */}
              <div className="pt-2 text-center flex flex-col items-center">
                <div className="flex gap-[1.5px] h-8 items-stretch opacity-60">
                  {[1,3,2,1,4,1,2,3,1,4,1,2,1,2,3].map((w, idx) => (
                    <div key={idx} className={`bg-slate-900`} style={{ width: `${w * 1.2}px` }}></div>
                  ))}
                </div>
                <span className="text-[8px] font-mono text-slate-400 tracking-widest mt-1">
                  *TX-GRANDVIEW-{viewingReceipt.receiptNumber}*
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-50 border-t p-4 flex gap-2">
              <button
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="flex-1 flex justify-center items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Statement
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="flex-1 flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-colors animate-none"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Overlay */}
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Income record?"
        message="Are you sure you want to delete this payment receipt log? This will adjust the unit dashboard calculation accordingly."
        confirmLabel="Delete Log"
        cancelLabel="Discard"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeletePayment(deleteConfirmId);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
