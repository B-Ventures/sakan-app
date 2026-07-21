/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Expense, ExpenseCategory, formatCurrency } from '../types';
import { Plus, Search, Trash2, Edit2, Eye, UploadCloud, DollarSign, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { useLanguage } from '../context/LanguageContext';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  customExpenseCategories: string[];
  activeBuilding?: any;
  isReadOnly?: boolean;
}

export default function ExpenseTracker({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  customExpenseCategories,
  activeBuilding,
  isReadOnly = false,
}: ExpenseTrackerProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'dueDate' | 'amount' | 'title' | 'category' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Extract unique months from expenses for filter dropdown
  const uniqueMonths = React.useMemo(() => {
    const months = expenses.map(e => e.date ? e.date.substring(0, 7) : '').filter(Boolean);
    return Array.from(new Set(months)).sort((a, b) => b.localeCompare(a)); // Descending order
  }, [expenses]);

  // Reset page when filters or sorting change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterStatus, filterMonth, sortField, sortOrder, itemsPerPage]);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState('2026-06-08');
  const [status, setStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Paid');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // File upload state & base64
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image zoom preview popover
  const [zoomedAttachment, setZoomedAttachment] = useState<{ url: string; title: string } | null>(null);

  // Convert uploaded file to base64
  const handleFileChange = (file: File) => {
    if (!file) return;
    
    setAttachmentName(file.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };

  const removeAttachedFile = () => {
    setAttachmentName('');
    setAttachmentUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddForm = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory(customExpenseCategories[0] || 'Other');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('Paid');
    setDueDate('');
    setNotes('');
    setAttachmentName('');
    setAttachmentUrl('');
    setIsFormOpen(true);
  };

  const openEditForm = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(exp.date);
    setStatus(exp.status || 'Paid');
    setDueDate(exp.dueDate || '');
    setNotes(exp.notes || '');
    setAttachmentName(exp.attachmentName || '');
    setAttachmentUrl(exp.attachmentUrl || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Expense title is required');
      return;
    }
    if (amount <= 0) {
      alert('Please specify an amount greater than $0');
      return;
    }

    const payload = {
      title,
      category,
      amount: Number(amount),
      date,
      notes,
      attachmentName: attachmentUrl ? (attachmentName || 'Invoice_Attachment') : '',
      attachmentUrl: attachmentUrl || '',
      status,
      dueDate: dueDate || undefined,
    };

    if (editingExpense) {
      onEditExpense({
        ...editingExpense,
        ...payload,
      });
    } else {
      onAddExpense(payload);
    }

    setIsFormOpen(false);
  };

  // 1. Filter Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      // category filter
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;

      // status filter
      if (filterStatus !== 'all') {
        const currentStatus = e.status || 'Paid';
        if (currentStatus !== filterStatus) return false;
      }

      // month filter
      if (filterMonth !== 'all') {
        const m = e.date ? e.date.substring(0, 7) : '';
        if (m !== filterMonth) return false;
      }

      // keyword filter
      if (search.trim() !== '') {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchNotes = e.notes?.toLowerCase().includes(q);
        return matchTitle || matchNotes;
      }
      return true;
    });
  }, [expenses, filterCategory, filterStatus, filterMonth, search]);

  // 2. Sort Expenses
  const sortedExpenses = React.useMemo(() => {
    // Safe parser for dates in multiple formats to sort chronologically
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

    return [...filteredExpenses].sort((a, b) => {
      if (sortField === 'date') {
        const timeA = parseDateToTime(a.date || '');
        const timeB = parseDateToTime(b.date || '');
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredExpenses, sortField, sortOrder]);

  // 3. Paginate Expenses
  const paginatedExpenses = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedExpenses, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);

  // Helper to toggle sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default desc
    }
  };

  return (
    <div className="space-y-6" id="expense-tracker-module">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('outflowExpensesTitle')}</h2>
          <p className="text-xs text-slate-400">{t('outflowExpensesSub')}</p>
        </div>
        <button
          onClick={openAddForm}
          disabled={isReadOnly}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg self-start sm:self-center shadow-sm transition-colors animate-none disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="w-4 h-4" />
          {t('logMaintenanceExpense')}
        </button>
      </div>

      {isReadOnly && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-800 animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-bold">
              {language === 'ar' 
                ? 'وضع المعاينة للقراءة فقط (الاشتراك منتهي)' 
                : 'Read-Only Preview Mode (Subscription Expired)'}
            </p>
            <p className="mt-0.5 opacity-90">
              {language === 'ar' 
                ? 'تم إيقاف العمليات التفاعلية وإمكانية الحفظ أو التعديل مؤقتاً لهذا البناية نظراً لانتهاء رخصة الاشتراك المتميزة.' 
                : 'Interactive operations and saving modifications have been disabled temporarily due to expired subscription license.'}
            </p>
          </div>
        </div>
      )}

      {/* Controls: Searching and Category, Status, Month filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center" id="expense-filters-container">
        {/* Dropdown filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
          {/* Category, Status & Month dropdown filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('categoryFilterLabel')}</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
              >
                <option value="all">{t('allCategories')} ({expenses.length})</option>
                {customExpenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({expenses.filter(e => e.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('statusFilterLabel')}</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="Paid">{t('paid')}</option>
                <option value="Pending">{t('pending')}</option>
                <option value="Overdue">{t('overdue')}</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('monthFilterLabel')}</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
              >
                <option value="all">{t('allMonths')}</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Input bar */}
        <div className="relative w-full xl:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={language === 'ar' ? "ابحث عن كلمات دليلة، فواتير..." : "Search keywords, bills..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs py-2 pl-9 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Expense ledger list / Table view similar to ledger */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden" id="expenses-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50 select-none">
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors text-start" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">
                    {t('expenseDetailsCol')}
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'title' ? 'text-blue-500 font-bold' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors text-start" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    {t('statusCol')}
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status' ? 'text-blue-500 font-bold' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors text-start" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    {t('logDueDateCol')}
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'date' ? 'text-blue-500 font-bold' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-start">{t('additionalNotesCol')}</th>
                <th className="py-3.5 px-4 text-start">{t('invoiceReceiptCol')}</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors text-start" onClick={() => handleSort('amount')}>
                  <div className="flex items-center gap-1">
                    {t('outflowCostCol')}
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'amount' ? 'text-blue-500 font-bold' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-end">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {paginatedExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 text-start">
                    <div>
                      <span className="bg-orange-50 text-orange-600 font-extrabold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono">
                        {exp.category}
                      </span>
                      <div className="font-bold text-slate-800 text-sm mt-1.5">{exp.title}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-start">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      exp.status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : exp.status === 'Overdue'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {exp.status === 'Paid' ? t('paid') : exp.status === 'Overdue' ? t('overdue') : t('pending')}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-start">
                    <div className="text-xs font-mono text-slate-500">{exp.date}</div>
                    {exp.dueDate && (
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-slate-500">{language === 'ar' ? 'مستحق:' : 'Due:'}</span>
                        <span className="font-mono text-slate-500">{exp.dueDate}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate text-start" title={exp.notes}>
                    {exp.notes || <span className="text-slate-300 italic">{t('noNotesPlaceholder')}</span>}
                  </td>
                  <td className="py-4 px-4 text-start">
                    {exp.attachmentUrl ? (
                      <div className="flex items-center gap-2 overflow-hidden max-w-[180px]">
                        <div 
                          className="w-8 h-8 rounded border bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setZoomedAttachment({ url: exp.attachmentUrl!, title: exp.title })}
                          title={language === 'ar' ? "انقر لعرض الإيصال كاملاً" : "Click to view full receipt"}
                        >
                          {exp.attachmentUrl.startsWith('data:application/pdf') ? (
                            <div className="w-full h-full bg-red-50 flex items-center justify-center text-red-600 font-extrabold text-[8px] uppercase font-mono">
                              PDF
                            </div>
                          ) : (
                            <img 
                              referrerPolicy="no-referrer" 
                              src={exp.attachmentUrl} 
                              alt="receipt mini stub" 
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-semibold text-slate-600 block truncate" title={exp.attachmentName}>
                            {exp.attachmentName || (language === 'ar' ? 'مرفق' : 'Attachment')}
                          </span>
                          <span className="text-[8px] text-blue-500 font-bold uppercase block tracking-tight">{t('receiptVerifiedLabel')}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">{t('noAttachmentPlaceholder')}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-start">
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(exp.amount, activeBuilding?.currency || 'JOD')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditForm(exp)}
                        disabled={isReadOnly}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors animate-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
                        title={language === 'ar' ? "تعديل السجل" : "Edit entry"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(exp.id)}
                        disabled={isReadOnly}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                        title={language === 'ar' ? "إزالة السجل" : "Remove entry"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedExpenses.length === 0 && (
          <div className="text-center py-16 bg-white border-t border-slate-100" id="empty-expenses-state">
            <UploadCloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">{t('noExpensesRecorded')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('noExpensesRecordedSub')}</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-500 font-sans" id="expenses-pagination">
          <div className="flex items-center gap-2">
            <span>{language === 'ar' ? 'عرض' : 'Show'}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-semibold focus:outline-none cursor-pointer"
            >
              {[5, 10, 15, 25, 50, 100].map(sz => (
                <option key={sz} value={sz}>{sz} {t('rowsLabel')}</option>
              ))}
            </select>
            <span>
              {t('showingRows')} <strong className="text-slate-700">{sortedExpenses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> {t('toPage')}{" "}
              <strong className="text-slate-700">{Math.min(sortedExpenses.length, currentPage * itemsPerPage)}</strong> {t('ofPage')}{" "}
              <strong className="text-slate-700">{sortedExpenses.length}</strong> {t('expensesLabel')}
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                title={language === 'ar' ? "الصفحة الأولى" : "First Page"}
              >
                <ChevronLeft className="w-3.5 h-3.5 -mr-1 inline-block" />
                <ChevronLeft className="w-3.5 h-3.5 inline-block" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                title={language === 'ar' ? "الصفحة السابقة" : "Previous Page"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 font-sans">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isNear = Math.abs(currentPage - pageNum) <= 1;
                  const isEnds = pageNum === 1 || pageNum === totalPages;
                  
                  if (!isNear && !isEnds) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} className="px-1 text-slate-300">...</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                title={language === 'ar' ? "الصفحة التالية" : "Next Page"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                title={language === 'ar' ? "الصفحة الأخيرة" : "Last Page"}
              >
                <ChevronRight className="w-3.5 h-3.5 inline-block" />
                <ChevronRight className="w-3.5 h-3.5 -ml-1 inline-block" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Maintenance expense addition modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b p-5 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {editingExpense ? t('editMaintenanceTitle') : t('logMaintenanceTitle')}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Expense Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('expenseTitleLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? "مثال: صيانة السطح، فاتورة المياه" : "e.g., Roof tile repairs, water utility"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('outflowCategoryLabel')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {customExpenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('costAmountLabel')} ({activeBuilding?.currency || 'JOD'}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder={language === 'ar' ? 'مثال: 500' : 'e.g. 500'}
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date & Due Date and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('expenseLogDateLabel')}</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('dueDateOptionalLabel')}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('paymentStatusLabel')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Paid' | 'Pending' | 'Overdue')}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Paid">{t('paid')}</option>
                  <option value="Pending">{t('pending')}</option>
                  <option value="Overdue">{t('overdue')}</option>
                </select>
              </div>

              {/* Document/Receipt PDF Image File Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('attachInvoiceLabel')}</label>
                
                {attachmentUrl ? (
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs uppercase text-slate-500 font-mono">
                        {attachmentUrl.startsWith('data:application/pdf') ? 'PDF' : <img referrerPolicy="no-referrer" src={attachmentUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-slate-700 block truncate">{attachmentName || (language === 'ar' ? 'مرفق' : 'attachment.png')}</span>
                        <span className="text-[10px] text-emerald-600 font-bold block">✓ {t('attachmentLoaded')}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={removeAttachedFile} 
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-white border px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      {t('removeLabel')}
                    </button>
                  </div>
                ) : (
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      {language === 'ar' ? 'اسحب وأفلت الفاتورة هنا، أو ' : 'Drag & drop invoice here, or '}
                      <span className="text-blue-500">{language === 'ar' ? 'تصفح ملفاتك' : 'browse'}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{t('fileSupportHelp')}</p>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleInputChange}
                      accept="image/*,application/pdf"
                      className="hidden" 
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('additionalNotesLabel')}</label>
                <textarea
                  placeholder={language === 'ar' ? "مذكرة، مقاول الإصلاحات، رقم الشيك، تفاصيل إضافية..." : "Memo, repairs contractor, check code, extra specifics if needed..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  {editingExpense ? t('saveExpenseChanges') : t('logMaintenanceExpense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zooms Attachment Viewer Modal */}
      {zoomedAttachment && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border shadow-2xl overflow-hidden animate-zoom-in">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 truncate max-w-sm">
                {language === 'ar' ? 'صورة الإيصال: ' : 'Receipt Image: '} {zoomedAttachment.title}
              </span>
              <button onClick={() => setZoomedAttachment(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <div className="p-4 bg-white flex items-center justify-center min-h-[300px]">
              {zoomedAttachment.url.startsWith('data:application/pdf') ? (
                <iframe src={zoomedAttachment.url} className="w-full h-[400px] border rounded" title="Receipt PDF Preview" />
              ) : (
                <img referrerPolicy="no-referrer" src={zoomedAttachment.url} alt="Expanded preview receipt" className="max-w-full max-h-[450px] object-contain rounded-xl border" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Overlay */}
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title={t('deleteExpenseConfirmTitle')}
        message={t('deleteExpenseConfirmMessage')}
        confirmLabel={t('permanentlyDelete')}
        cancelLabel={t('keepRecord')}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteExpense(deleteConfirmId);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
