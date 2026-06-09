/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Expense, ExpenseCategory, formatCurrency } from '../types';
import { Plus, Search, Trash2, Edit2, Eye, UploadCloud, DollarSign } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  customExpenseCategories: string[];
  activeBuilding?: any;
}

export default function ExpenseTracker({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  customExpenseCategories,
  activeBuilding,
}: ExpenseTrackerProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState('2026-06-08');
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
    if (!attachmentUrl) {
      alert('An attachment receipt is strictly required for expense validation.');
      return;
    }

    const payload = {
      title,
      category,
      amount: Number(amount),
      date,
      notes,
      attachmentName,
      attachmentUrl,
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

  const filteredExpenses = expenses.filter(e => {
    // category filter
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;

    // keyword filter
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      return matchTitle || matchNotes;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="expense-tracker-module">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Building Outflow & Expenses</h2>
          <p className="text-xs text-slate-400">Track structural repairs, cleanouts, insurance and tax with receipt logs</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg self-start sm:self-center shadow-sm transition-colors animate-none"
        >
          <Plus className="w-4 h-4" />
          Log Maintenance/Expense
        </button>
      </div>

      {/* Controls: Searching and Category filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Toggle selectors */}
        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              filterCategory === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            All Categories ({expenses.length})
          </button>
          {customExpenseCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                filterCategory === cat ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {cat} ({expenses.filter(e => e.category === cat).length})
            </button>
          ))}
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search keywords, bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs py-2 pl-9 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Expense ledger list / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExpenses.map((exp) => (
          <div key={exp.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              {/* Top Row - Category & value */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="bg-orange-50 text-orange-600 font-extrabold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-mono">
                  {exp.category}
                </span>
                <span className="text-slate-400 text-xs font-mono">{exp.date}</span>
              </div>

              {/* Expense Details */}
              <div className="space-y shadow-none">
                <h3 className="font-bold text-slate-800 text-sm leading-tight min-h-[40px] flex items-start">
                  {exp.title}
                </h3>

                <h4 className="font-mono font-extrabold text-lg text-slate-900 flex items-center mt-2.5">
                  {formatCurrency(exp.amount, activeBuilding?.currency || 'JOD')}
                </h4>

                {exp.notes && (
                  <p className="text-slate-400 text-xs leading-relaxed max-line-clamp-2 mt-2">
                    {exp.notes}
                  </p>
                )}

                {/* Receipt Attachment Container */}
                {exp.attachmentUrl && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div 
                        className="w-10 h-10 rounded-lg border bg-white overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                        onClick={() => setZoomedAttachment({ url: exp.attachmentUrl!, title: exp.title })}
                      >
                        {exp.attachmentUrl.startsWith('data:application/pdf') ? (
                          <div className="w-full h-full bg-red-50 flex items-center justify-center text-red-600 font-extrabold text-[10px] uppercase font-mono">
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
                        <span className="text-[11px] font-semibold text-slate-600 block truncate" title={exp.attachmentName}>
                          {exp.attachmentName || 'Uploaded Receipt Attachment'}
                        </span>
                        <span className="text-[9px] text-blue-500 font-bold uppercase block">Receipt verified</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setZoomedAttachment({ url: exp.attachmentUrl!, title: exp.title })}
                      className="text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 rounded border border-slate-100 transition-colors"
                      title="Inspect Receipt Full Screen"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons banner */}
            <div className="flex border-t border-slate-100 mt-5 pt-4 gap-2">
              <button
                onClick={() => openEditForm(exp)}
                className="flex-1 text-slate-500 hover:text-slate-700 text-xs font-bold flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmId(exp.id);
                }}
                className="flex-1 text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-rose-50/55 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}

        {filteredExpenses.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl" id="empty-expenses-state">
            <UploadCloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No expenses recorded for filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting parameters or log a new building cost breakdown.</p>
          </div>
        )}
      </div>

      {/* Maintenance expense addition modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b p-5 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {editingExpense ? 'Edit Maintenance / Building Expense' : 'Log Maintenance / Building Expense'}
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
                <label className="block text-xs font-semibold text-slate-500 mb-1">Expense Title / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Roof tile repairs, water utility"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Outflow Category *</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cost Amount ({activeBuilding?.currency || 'JOD'}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 500"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Expense Log Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Document/Receipt PDF Image File Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Attach Receipt Image/PDF *</label>
                
                {attachmentUrl ? (
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs uppercase text-slate-500 font-mono">
                        {attachmentUrl.startsWith('data:application/pdf') ? 'PDF' : <img referrerPolicy="no-referrer" src={attachmentUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-slate-700 block truncate">{attachmentName || 'attachment.png'}</span>
                        <span className="text-[10px] text-emerald-600 font-bold block">✓ Attachment Loaded</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={removeAttachedFile} 
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-white border px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      Remove
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
                    <p className="text-xs font-semibold text-slate-600">Drag & drop receipt here, or <span className="text-blue-500">browse</span></p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports images, receipts photo up to 5MB</p>
                    
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
                <label className="block text-xs font-semibold text-slate-500 mb-1">Additional description & Notes</label>
                <textarea
                  placeholder="Memo, repairs contractor, check code, extra specifics if needed..."
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  {editingExpense ? 'Save Expense Changes' : 'Log Maintenance/Expense'}
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
              <span className="font-bold text-slate-800 truncate max-w-sm">Receipt Image: {zoomedAttachment.title}</span>
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
        title="Delete Expense Record?"
        message="Are you sure you want to permanently delete this expense log? This will adjust your overall building expense balances and cash calculation accordingly."
        confirmLabel="Permanently Delete"
        cancelLabel="Discard"
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
