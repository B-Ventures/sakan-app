/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tenant, Payment, formatCurrency, getMonthCount } from '../types';
import { Plus, Check, Clock, AlertTriangle, Search, Send, Receipt, Printer, Trash2, Edit2, Save, Download, Copy, FileImage } from 'lucide-react';
import { getReceiptWhatsAppLink } from '../utils/whatsapp';
import html2canvas from 'html2canvas';
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
  const [imageStatus, setImageStatus] = useState<'idle' | 'rendering' | 'copied' | 'downloaded' | 'error'>('idle');

  const viewerTenant = viewingReceipt ? tenants.find(t => t.id === viewingReceipt.tenantId) : null;
  const viewerPayMethodName = viewingReceipt ? (viewingReceipt.method || 'Bank Transfer') : '';
  const viewerWaLink = (viewingReceipt && viewerTenant) ? getReceiptWhatsAppLink(
    viewerTenant.phone,
    viewerTenant.name,
    viewingReceipt.unit,
    viewingReceipt.amount,
    viewingReceipt.monthPaidFor,
    viewingReceipt.receiptNumber,
    viewingReceipt.date || 'TBD',
    viewerPayMethodName,
    activeBuilding?.receiptTemplate,
    activeBuilding?.currency || 'JOD'
  ) : '#';

  const parseColorParams = (str: string): number[] => {
    const start = str.indexOf('(');
    const end = str.lastIndexOf(')');
    if (start === -1 || end === -1) return [];
    const inner = str.slice(start + 1, end).trim();
    const parts = inner.split(/[\s,/\u00A0]+/);
    const nums: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      let p = parts[i].trim();
      if (!p) continue;
      let isPercent = false;
      if (p.endsWith('%')) {
        isPercent = true;
        p = p.slice(0, -1);
      }
      if (p.endsWith('deg')) {
        p = p.slice(0, -3);
      }
      let val = parseFloat(p);
      if (isNaN(val)) val = 0;
      if (isPercent) {
        val = val / 100;
      }
      nums.push(val);
    }
    return nums;
  };

  const oklchToRgb = (oklchStr: string): string => {
    try {
      const nums = parseColorParams(oklchStr);
      if (nums.length < 3) return 'rgb(120, 120, 120)';

      const l = nums[0];
      const c = nums[1];
      const h = nums[2];
      const a = nums.length >= 4 ? nums[3] : 1;

      const hRad = (h * Math.PI) / 180;
      const a_lab = c * Math.cos(hRad);
      const b_lab = c * Math.sin(hRad);

      const l1 = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
      const m1 = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
      const s1 = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

      const l_lms = l1 * l1 * l1;
      const m_lms = m1 * m1 * m1;
      const s_lms = s1 * s1 * s1;

      const r_lin =  4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
      const g_lin = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
      const b_lin = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

      const gamma = (coeff: number) => {
        return coeff <= 0.0031308
          ? 12.92 * coeff
          : 1.055 * Math.pow(coeff, 1 / 2.4) - 0.055;
      };

      const r = Math.round(Math.min(255, Math.max(0, gamma(r_lin) * 255)));
      const g = Math.round(Math.min(255, Math.max(0, gamma(g_lin) * 255)));
      const b = Math.round(Math.min(255, Math.max(0, gamma(b_lin) * 255)));

      return nums.length >= 4 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    } catch (err) {
      console.warn('Failed to parse OKLCH color, falling back:', err);
      return 'rgb(120, 120, 120)';
    }
  };

  const oklabToRgb = (oklabStr: string): string => {
    try {
      const nums = parseColorParams(oklabStr);
      if (nums.length < 3) return 'rgb(120, 120, 120)';

      const l = nums[0];
      const a_lab = nums[1];
      const b_lab = nums[2];
      const alpha = nums.length >= 4 ? nums[3] : 1;

      const l1 = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
      const m1 = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
      const s1 = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

      const l_lms = l1 * l1 * l1;
      const m_lms = m1 * m1 * m1;
      const s_lms = s1 * s1 * s1;

      const r_lin =  4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
      const g_lin = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
      const b_lin = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

      const gamma = (coeff: number) => {
        return coeff <= 0.0031308
          ? 12.92 * coeff
          : 1.055 * Math.pow(coeff, 1 / 2.4) - 0.055;
      };

      const r = Math.round(Math.min(255, Math.max(0, gamma(r_lin) * 255)));
      const g = Math.round(Math.min(255, Math.max(0, gamma(g_lin) * 255)));
      const b = Math.round(Math.min(255, Math.max(0, gamma(b_lin) * 255)));

      return nums.length >= 4 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
    } catch (err) {
      console.warn('Failed to parse OKLAB color, falling back:', err);
      return 'rgb(120, 120, 120)';
    }
  };

  const replaceOklchAndOklab = (val: string): string => {
    if (typeof val !== 'string') return val;
    let res = val;
    if (res.includes('oklch(')) {
      res = res.replace(/oklch\([^)]+\)/gi, (m) => oklchToRgb(m));
    }
    if (res.includes('oklab(')) {
      res = res.replace(/oklab\([^)]+\)/gi, (m) => oklabToRgb(m));
    }
    return res;
  };

  const runWithOklchPolyfill = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const origGetComputedStyle = window.getComputedStyle;

    try {
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = origGetComputedStyle.call(window, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return (propertyName: string) => {
                const val = target.getPropertyValue(propertyName);
                return replaceOklchAndOklab(val);
              };
            }
            const val = target[prop as keyof typeof target];
            if (typeof val === 'function') {
              return (val as Function).bind(target);
            }
            if (typeof val === 'string') {
              return replaceOklchAndOklab(val);
            }
            return val;
          }
        });
      };
    } catch (err) {
      console.warn('Error setting up OKLCH polyfill overrides:', err);
    }

    try {
      return await fn();
    } finally {
      try {
        window.getComputedStyle = origGetComputedStyle;
      } catch (err) {
        console.error('Error restoring original CSS overrides:', err);
      }
    }
  };

  const proceedWithDownload = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const nameStr = viewingReceipt?.tenantName ? viewingReceipt.tenantName.replace(/\s+/g, '_') : 'resident';
    const fileName = `Receipt_Unit_${viewingReceipt?.unit || 'X'}_${nameStr}_${viewingReceipt?.monthPaidFor || 'month'}.png`;
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const captureFullReceiptImage = async (): Promise<HTMLCanvasElement> => {
    const element = document.getElementById('receipt-print-area');
    if (!element) throw new Error('Receipt print area element not found');

    // Scroll to top of receipt to prevent clipped or offset captured canvases
    const originalScrollTop = element.scrollTop;
    element.scrollTop = 0;

    // Preserve original layout styles before temporary enlargement
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalHeight = element.style.height;

    const modalEl = document.getElementById('receipt-modal');
    const parentContainer = element.parentElement;

    const originalModalOverflow = modalEl ? modalEl.style.overflow : '';
    const originalModalMaxHeight = modalEl ? modalEl.style.maxHeight : '';
    const originalParentOverflow = parentContainer ? parentContainer.style.overflow : '';
    const originalParentMaxHeight = parentContainer ? parentContainer.style.maxHeight : '';

    // Temporarily expand container overflow constraints to permit complete layout rendering
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('max-height', 'none', 'important');
    element.style.setProperty('height', 'auto', 'important');

    if (parentContainer) {
      parentContainer.style.setProperty('overflow', 'visible', 'important');
      parentContainer.style.setProperty('max-height', 'none', 'important');
      parentContainer.style.setProperty('height', 'auto', 'important');
    }

    if (modalEl) {
      modalEl.style.setProperty('overflow', 'visible', 'important');
      modalEl.style.setProperty('max-height', 'none', 'important');
    }

    try {
      const targetWidth = element.offsetWidth || 384; // Default modal width fallback
      const targetHeight = element.scrollHeight;

      const canvas = await runWithOklchPolyfill(() => html2canvas(element, {
        scale: 3, // Premium high-density capture
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: targetWidth,
        height: targetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
      }));

      return canvas;
    } finally {
      // Synchronously restore original list constraints
      element.scrollTop = originalScrollTop;
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;

      if (parentContainer) {
        parentContainer.style.overflow = originalParentOverflow;
        parentContainer.style.maxHeight = originalParentMaxHeight;
        parentContainer.style.height = '';
      }

      if (modalEl) {
        modalEl.style.overflow = originalModalOverflow;
        modalEl.style.maxHeight = originalModalMaxHeight;
      }
    }
  };

  const handleCopyImageToClipboard = async () => {
    setImageStatus('rendering');
    try {
      const canvas = await captureFullReceiptImage();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setImageStatus('error');
          setTimeout(() => setImageStatus('idle'), 3000);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          setImageStatus('copied');
          setTimeout(() => setImageStatus('idle'), 6000);
        } catch (err) {
          console.error('Clipboard write blocked or failed, downloading instead:', err);
          // Auto-fallback to download if iframe / secure context limits keyboard clipboard functionality
          proceedWithDownload(canvas);
          setImageStatus('downloaded');
          setTimeout(() => setImageStatus('idle'), 6000);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error rendering element:', error);
      setImageStatus('error');
      setTimeout(() => setImageStatus('idle'), 3000);
    }
  };

  const handleDownloadPNG = async () => {
    setImageStatus('rendering');
    try {
      const canvas = await captureFullReceiptImage();
      proceedWithDownload(canvas);
      setImageStatus('downloaded');
      setTimeout(() => setImageStatus('idle'), 4000);
    } catch (err) {
      console.error('Error writing receipt file download:', err);
      setImageStatus('error');
      setTimeout(() => setImageStatus('idle'), 3000);
    }
  };

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print-mode print-mode-modal">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait !important;
                margin: 10mm 15mm !important;
              }
              body {
                background-color: #ffffff !important;
              }
              /* Hide all normal body content */
              body * {
                visibility: hidden !important;
              }
              /* Keep only the print wrapper and receipt card visible */
              .print-mode-modal,
              .print-mode-modal *,
              #receipt-modal,
              #receipt-modal *,
              #receipt-print-area,
              #receipt-print-area * {
                visibility: visible !important;
              }
              /* Center and style the receipt layout specifically for printing */
              .print-mode-modal {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: #ffffff !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 99999 !important;
              }
              #receipt-modal {
                border: none !important;
                box-shadow: none !important;
                margin: 0 auto !important;
                padding: 0 !important;
                max-width: 450px !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                display: block !important;
              }
              #receipt-print-area {
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
            }
          `}} />
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in" id="receipt-modal">
            {/* Header */}
            <div className="bg-slate-50 border-b px-5 py-4 flex justify-between items-center shrink-0 no-print">
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

            {/* Digital Share & Screenshot Helpers (No Print) */}
            <div className="bg-slate-50 border-t px-5 py-4 space-y-3.5 no-print text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 tracking-wide uppercase text-[10px]">Digital Share Panel</span>
                
                {/* Image status dynamic badge */}
                {imageStatus === 'rendering' && (
                  <span className="text-[10px] text-blue-600 font-semibold animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    Generating Receipt Image...
                  </span>
                )}
                {imageStatus === 'copied' && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 animate-none">
                    ✓ Image copied!
                  </span>
                )}
                {imageStatus === 'downloaded' && (
                  <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 animate-none">
                    ✓ Downloaded PNG
                  </span>
                )}
                {imageStatus === 'error' && (
                  <span className="text-[10px] text-rose-600 font-semibold animate-none">
                    ⚠ Failed to capture receipt
                  </span>
                )}
                {imageStatus === 'idle' && (
                  <span className="text-[9.5px] text-slate-400">Attach receipt photo instantly</span>
                )}
              </div>

              {/* Action grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyImageToClipboard}
                  disabled={imageStatus === 'rendering'}
                  className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Render receipt as PNG and copy to keyboard"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  Copy Image
                </button>

                <button
                  onClick={handleDownloadPNG}
                  disabled={imageStatus === 'rendering'}
                  className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Download receipt as PNG image to device"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Download PNG
                </button>
              </div>

              {/* Explain explicit instruction to send with image */}
              <div className="bg-blue-50/40 border border-blue-100/30 p-2.5 rounded-xl space-y-1 text-[10.5px] leading-relaxed text-slate-500">
                <p className="text-slate-600 font-medium">
                  💡 How to send on WhatsApp with the Receipt Image:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px] pl-0.5">
                  <li>Click <strong className="text-slate-700">Copy Image</strong> (saves PNG to keyboard clipboard).</li>
                  <li>Click <strong className="text-slate-700">Send to WhatsApp</strong> below (opens the chat).</li>
                  <li>Simply <strong className="text-slate-700">Paste (Ctrl+V / Cmd+V)</strong> in WhatsApp to send image!</li>
                </ol>
              </div>

              {/* Send WhatsApp action */}
              {viewerTenant?.phone ? (
                <a
                  href={viewerWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 text-emerald-700 font-bold py-2 text-center rounded-xl transition-all font-sans cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  Send to WhatsApp ({viewerTenant.phone})
                </a>
              ) : (
                <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl text-center text-[10px] text-amber-700 font-medium">
                  No phone contact on record for {viewingReceipt.tenantName} to send via WhatsApp.
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-slate-50 border-t p-4 flex gap-2 no-print">
              <button
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="flex-1 flex justify-center items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
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
