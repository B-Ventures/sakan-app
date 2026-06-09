/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Building, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PAYMENT_METHODS, DEFAULT_INCOME_CATEGORIES, Tenant, Payment, Expense } from '../types';
import { Settings, Home, DollarSign, Wallet, FileSpreadsheet, Plus, Edit2, Trash2, Save, X, Activity, Download, Upload, Shield, RefreshCw } from 'lucide-react';

interface PropertySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building;
  onUpdateSettings: (updatedFields: Partial<Building>) => Promise<void>;
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  isDemoMode: boolean;
  onRestoreBackup?: (backupData: { tenants: Tenant[], payments: Payment[], expenses: Expense[] }) => Promise<void>;
}

type SettingsTab = 'general' | 'expenses' | 'paymentMethods' | 'incomeSplits' | 'backup';

export default function PropertySettingsModal({
  isOpen,
  onClose,
  building,
  onUpdateSettings,
  tenants = [],
  payments = [],
  expenses = [],
  isDemoMode = false,
  onRestoreBackup,
}: PropertySettingsModalProps) {
  const [activeTab, setActiveTab ] = useState<SettingsTab>('general');

  // General State
  const [name, setName] = useState(building.name);
  const [address, setAddress] = useState(building.address || '');
  const [currency, setCurrency] = useState(building.currency || 'JOD');
  const [defaultBaseRent, setDefaultBaseRent] = useState<number | string>(building.defaultBaseRent ?? 1000);
  const [defaultGuardFee, setDefaultGuardFee] = useState<number | string>(building.defaultGuardFee ?? 50);
  const [defaultMaintenanceFee, setDefaultMaintenanceFee] = useState<number | string>(building.defaultMaintenanceFee ?? 30);

  // Lists State initialized from building or helper defaults
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    building.customExpenseCategories || DEFAULT_EXPENSE_CATEGORIES
  );
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    building.customPaymentMethods || DEFAULT_PAYMENT_METHODS
  );
  const [incomeSplits, setIncomeSplits] = useState<string[]>(
    building.customIncomeCategories || DEFAULT_INCOME_CATEGORIES
  );

  const [commonIncomes, setCommonIncomes] = useState<string[]>(
    building.commonAreaIncomeCategories || ['Guard Salary', 'Service Box']
  );
  const [commonExpenses, setCommonExpenses] = useState<string[]>(
    building.commonAreaExpenseCategories || ['Staff Salary', 'Cleaning', 'Utilities']
  );

  // Embedded messaging & inline custom confirmations states
  const [newItemClassification, setNewItemClassification] = useState<'common' | 'individual'>('individual');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    tab: SettingsTab;
    item: string;
    message: string;
  } | null>(null);

  // Keep modal states in sync with props updates from the cloud
  React.useEffect(() => {
    setName(building.name);
    setAddress(building.address || '');
    setCurrency(building.currency || 'JOD');
    setDefaultBaseRent(building.defaultBaseRent ?? 1000);
    setDefaultGuardFee(building.defaultGuardFee ?? 50);
    setDefaultMaintenanceFee(building.defaultMaintenanceFee ?? 30);
    setExpenseCategories(building.customExpenseCategories || DEFAULT_EXPENSE_CATEGORIES);
    setPaymentMethods(building.customPaymentMethods || DEFAULT_PAYMENT_METHODS);
    setIncomeSplits(building.customIncomeCategories || DEFAULT_INCOME_CATEGORIES);
    setCommonIncomes(building.commonAreaIncomeCategories || ['Guard Salary', 'Service Box']);
    setCommonExpenses(building.commonAreaExpenseCategories || ['Staff Salary', 'Cleaning', 'Utilities']);
  }, [building]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  const toggleCommonStatus = async (item: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      const updated = commonIncomes.includes(item)
        ? commonIncomes.filter(x => x !== item)
        : [...commonIncomes, item];
      setCommonIncomes(updated);
      await onUpdateSettings({ commonAreaIncomeCategories: updated });
      showToast(`Categorized "${item}" as ${updated.includes(item) ? '🏢 Common Area Allocation' : '👤 Individual Unit Portion'}`, 'success');
    } else {
      const updated = commonExpenses.includes(item)
        ? commonExpenses.filter(x => x !== item)
        : [...commonExpenses, item];
      setCommonExpenses(updated);
      await onUpdateSettings({ commonAreaExpenseCategories: updated });
      showToast(`Categorized "${item}" as ${updated.includes(item) ? '🏢 Common Area Cost' : '👤 Individual Unit Portion'}`, 'success');
    }
  };

  // Editors/Adding State
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingLoading, setSavingLoading] = useState(false);

  if (!isOpen) return null;

  const handleGeneralSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLoading(true);
    try {
      await onUpdateSettings({ 
        name, 
        address,
        currency,
        defaultBaseRent: Number(defaultBaseRent) || 0,
        defaultGuardFee: Number(defaultGuardFee) || 0,
        defaultMaintenanceFee: Number(defaultMaintenanceFee) || 0,
      });
      showToast('General property settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save property specifications', 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  const handleAddItem = async (tab: SettingsTab) => {
    if (!newItemText.trim()) return;
    const item = newItemText.trim();
    let updatedList: string[] = [];

    if (tab === 'expenses') {
      if (expenseCategories.includes(item)) {
        showToast('Expense category already exists', 'error');
        return;
      }
      updatedList = [...expenseCategories, item];
      setExpenseCategories(updatedList);

      const updatedCommon = newItemClassification === 'common'
        ? (commonExpenses.includes(item) ? commonExpenses : [...commonExpenses, item])
        : commonExpenses.filter(x => x !== item);
      setCommonExpenses(updatedCommon);

      await onUpdateSettings({ 
        customExpenseCategories: updatedList,
        commonAreaExpenseCategories: updatedCommon
      });
      showToast(`Added expense category: "${item}"`, 'success');
    } else if (tab === 'paymentMethods') {
      if (paymentMethods.includes(item)) {
        showToast('Payment method already exists', 'error');
        return;
      }
      updatedList = [...paymentMethods, item];
      setPaymentMethods(updatedList);
      await onUpdateSettings({ customPaymentMethods: updatedList });
      showToast(`Added payment method: "${item}"`, 'success');
    } else if (tab === 'incomeSplits') {
      if (incomeSplits.includes(item)) {
        showToast('Income split field already exists', 'error');
        return;
      }
      updatedList = [...incomeSplits, item];
      setIncomeSplits(updatedList);

      const updatedCommon = newItemClassification === 'common'
        ? (commonIncomes.includes(item) ? commonIncomes : [...commonIncomes, item])
        : commonIncomes.filter(x => x !== item);
      setCommonIncomes(updatedCommon);

      await onUpdateSettings({ 
        customIncomeCategories: updatedList,
        commonAreaIncomeCategories: updatedCommon
      });
      showToast(`Added income split: "${item}"`, 'success');
    }

    setNewItemText('');
  };

  const handleStartEdit = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const handleSaveEdit = async (tab: SettingsTab, index: number) => {
    if (!editingText.trim()) return;
    const item = editingText.trim();
    let updatedList: string[] = [];

    if (tab === 'expenses') {
      const oldItem = expenseCategories[index];
      updatedList = [...expenseCategories];
      updatedList[index] = item;
      setExpenseCategories(updatedList);

      const updatedCommon = commonExpenses.map(x => x === oldItem ? item : x);
      setCommonExpenses(updatedCommon);

      await onUpdateSettings({ 
        customExpenseCategories: updatedList,
        commonAreaExpenseCategories: updatedCommon
      });
      showToast(`Updated expense category identifier to "${item}"`, 'success');
    } else if (tab === 'paymentMethods') {
      updatedList = [...paymentMethods];
      updatedList[index] = item;
      setPaymentMethods(updatedList);
      await onUpdateSettings({ customPaymentMethods: updatedList });
      showToast(`Updated payment method label to "${item}"`, 'success');
    } else if (tab === 'incomeSplits') {
      const oldItem = incomeSplits[index];
      updatedList = [...incomeSplits];
      updatedList[index] = item;
      setIncomeSplits(updatedList);

      const updatedCommon = commonIncomes.map(x => x === oldItem ? item : x);
      setCommonIncomes(updatedCommon);

      await onUpdateSettings({ 
        customIncomeCategories: updatedList,
        commonAreaIncomeCategories: updatedCommon
      });
      showToast(`Updated income split tag to "${item}"`, 'success');
    }

    setEditingIndex(null);
    setEditingText('');
  };

  const handleDeleteItemClick = (tab: SettingsTab, itemToDelete: string) => {
    setConfirmDialog({
      tab,
      item: itemToDelete,
      message: `Are you sure you want to permanently delete "${itemToDelete}"? Historical logs will persist but future forms will exclude this tag.`
    });
  };

  const handleExecuteDelete = async () => {
    if (!confirmDialog) return;
    const { tab, item: itemToDelete } = confirmDialog;
    let updatedList: string[] = [];

    if (tab === 'expenses') {
      updatedList = expenseCategories.filter((c) => c !== itemToDelete);
      setExpenseCategories(updatedList);

      const updatedCommon = commonExpenses.filter((c) => c !== itemToDelete);
      setCommonExpenses(updatedCommon);

      await onUpdateSettings({ 
        customExpenseCategories: updatedList,
        commonAreaExpenseCategories: updatedCommon
      });
    } else if (tab === 'paymentMethods') {
      updatedList = paymentMethods.filter((m) => m !== itemToDelete);
      setPaymentMethods(updatedList);
      await onUpdateSettings({ customPaymentMethods: updatedList });
    } else if (tab === 'incomeSplits') {
      updatedList = incomeSplits.filter((s) => s !== itemToDelete);
      setIncomeSplits(updatedList);

      const updatedCommon = commonIncomes.filter((s) => s !== itemToDelete);
      setCommonIncomes(updatedCommon);

      await onUpdateSettings({ 
        customIncomeCategories: updatedList,
        commonAreaIncomeCategories: updatedCommon
      });
    }

    showToast(`Removed "${itemToDelete}" successfully`, 'success');
    setConfirmDialog(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-100 shadow-2xl flex flex-col md:flex-row h-[85vh] md:h-[550px] overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Toast Warning banner within Settings */}
        {toast && (
          <div className={`absolute top-4 right-4 z-[70] p-3 rounded-xl border text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-3 max-w-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-800'
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-extrabold ml-1">✕</button>
          </div>
        )}

        {/* Custom Confirmation Panel Modal Overlay */}
        {confirmDialog && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[65] animate-in fade-in duration-150">
            <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-500 mb-1">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h5 className="font-extrabold text-slate-800 text-sm">Confirm Deleting Item</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sidebar Tab Selection */}
        <div className="bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-5 md:w-56 shrink-0 flex flex-col md:justify-between font-sans">
          <div className="space-y-3.5 md:space-y-5 flex-1">
            <div className="flex items-center justify-between md:block">
              <div>
                <span className="text-xs font-bold font-mono text-blue-600 block uppercase tracking-wider">Property Manager</span>
                <h3 className="font-extrabold text-slate-800 text-sm mt-1 flex items-center gap-1">
                  <Settings className="w-4 h-4 text-slate-500 animate-spin-slow" />
                  Property Settings
                </h3>
              </div>
              <button
                onClick={onClose}
                className="md:hidden text-slate-400 hover:text-slate-600 font-bold p-1"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex md:flex-col gap-1.5 text-xs font-bold text-slate-500 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none select-none">
              <button
                onClick={() => { setActiveTab('general'); setEditingIndex(null); }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all shrink-0 ${
                  activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' : 'hover:bg-slate-100/50 hover:text-slate-700 bg-slate-100/40 md:bg-transparent'
                }`}
              >
                <Home className="w-4 h-4" />
                General Details
              </button>

              <button
                onClick={() => { setActiveTab('expenses'); setEditingIndex(null); }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all shrink-0 ${
                  activeTab === 'expenses' ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' : 'hover:bg-slate-100/50 hover:text-slate-700 bg-slate-100/40 md:bg-transparent'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Expense Categories
              </button>

              <button
                onClick={() => { setActiveTab('paymentMethods'); setEditingIndex(null); }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all shrink-0 ${
                  activeTab === 'paymentMethods' ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' : 'hover:bg-slate-100/50 hover:text-slate-700 bg-slate-100/40 md:bg-transparent'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Payment Methods
              </button>

              <button
                onClick={() => { setActiveTab('incomeSplits'); setEditingIndex(null); }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all shrink-0 ${
                  activeTab === 'incomeSplits' ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' : 'hover:bg-slate-100/50 hover:text-slate-700 bg-slate-100/40 md:bg-transparent'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Income Split Fees
              </button>

              <button
                onClick={() => { setActiveTab('backup'); setEditingIndex(null); }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all shrink-0 ${
                  activeTab === 'backup' ? 'bg-white text-amber-600 border border-amber-100 shadow-xs' : 'hover:bg-slate-100/50 hover:text-slate-700 bg-slate-100/40 md:bg-transparent'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform" />
                Backup & Recovery
              </button>
            </nav>
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
          >
            Close Settings
          </button>
        </div>

        {/* Tab Contents Frame */}
        <div className="flex-1 p-5 md:p-8 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between border-b pb-3 md:pb-4 border-slate-100 font-sans">
              <div>
                <h4 className="text-sm md:text-md font-bold text-slate-800">
                  {activeTab === 'general' && 'General Property Details'}
                  {activeTab === 'expenses' && 'Manage Expense Categories'}
                  {activeTab === 'paymentMethods' && 'Manage Rent Payment Methods'}
                  {activeTab === 'incomeSplits' && 'Manage Income Split Fields'}
                  {activeTab === 'backup' && 'Data Sovereignty & Active Dev Stack'}
                </h4>
                <p className="text-[11px] md:text-xs text-slate-400 mt-1">
                  {activeTab === 'general' && 'Update the active property name and its registered address.'}
                  {activeTab === 'expenses' && 'Define custom tags for grouping maintenance costs.'}
                  {activeTab === 'paymentMethods' && 'Add/Remove supported options for receiving rent.'}
                  {activeTab === 'incomeSplits' && 'Add, edit or rename sub-components for the payment ledger.'}
                  {activeTab === 'backup' && 'Download JSON backups of all building files, restore states, or examine cloud parameters.'}
                </p>
              </div>
              <button onClick={onClose} className="hidden md:block text-slate-300 hover:text-slate-500 font-bold text-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB CONTENT: GENERAL */}
            {activeTab === 'general' && (
              <form onSubmit={handleGeneralSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Property Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                      placeholder="e.g. Grandview Residences"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Rent System Currency *</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-blue-500 font-sans bg-white shadow-xs cursor-pointer"
                    >
                      <option value="JOD">JOD (Jordanian Dinar - د.أ)</option>
                      <option value="USD">USD (US Dollar - $)</option>
                      <option value="EUR">EUR (Euro - €)</option>
                      <option value="GBP">GBP (British Pound - £)</option>
                      <option value="SAR">SAR (Saudi Riyal - ر.س)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Mailing Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                    placeholder="e.g. 100 Luxury Heights Boulevard"
                  />
                </div>

                {/* Tenant template profile defaults */}
                <div className="border border-indigo-50 bg-gradient-to-br from-indigo-50/20 to-blue-50/20 p-4 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    👤 Default Tenant Fee Template Defaults
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    When auto-registering unlisted tenants during CSV imports or creating new ones, they will automatically copy these predefined amounts instead of hardcoded developer defaults.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">Base Rent ({currency})</label>
                      <input
                        type="number"
                        required
                        value={defaultBaseRent}
                        onChange={(e) => setDefaultBaseRent(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                        placeholder="e.g. 1000"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">Guard Fee ({currency})</label>
                      <input
                        type="number"
                        required
                        value={defaultGuardFee}
                        onChange={(e) => setDefaultGuardFee(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                        placeholder="e.g. 50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">Service Box ({currency})</label>
                      <input
                        type="number"
                        required
                        value={defaultMaintenanceFee}
                        onChange={(e) => setDefaultMaintenanceFee(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors pt-2.5 font-sans cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {savingLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: LIST BASED CATEGORIES (Expenses, Methods, splits) */}
            {activeTab !== 'general' && (
              <div className="space-y-4">
                {/* Add Box with Classification Selector for Expenses and Income Splits */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 font-sans">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder={
                        activeTab === 'expenses' 
                          ? "e.g., Elevators, Guard Salary..." 
                          : activeTab === 'paymentMethods' 
                          ? "e.g., Bank Transfer, Cash..." 
                          : "e.g., Rent portion, Service Box..."
                      }
                      className="flex-1 text-xs px-3 py-2.5 bg-white rounded-xl border focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(activeTab);
                      }}
                    />
                    <button
                      onClick={() => handleAddItem(activeTab)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl flex items-center justify-center gap-1 transition-colors shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  {(activeTab === 'expenses' || activeTab === 'incomeSplits') && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white/70 p-2.5 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-sans">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        Default Class for New Category:
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('individual')}
                          className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[9px] transition-all border ${
                            newItemClassification === 'individual'
                              ? 'bg-slate-200 border-slate-300 text-slate-800 font-bold'
                              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          👤 Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('common')}
                          className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[9px] transition-all border ${
                            newItemClassification === 'common'
                              ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          🏢 Building Common
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items loop */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-50 shadow-xs font-sans">
                  {((activeTab === 'expenses' ? expenseCategories : activeTab === 'paymentMethods' ? paymentMethods : incomeSplits) || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                      {editingIndex === idx ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 text-xs px-2 py-1.5 rounded border focus:outline-none focus:border-blue-500 font-sans"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(activeTab, idx);
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(activeTab, idx)}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold px-2 py-1.5 rounded transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold px-2 py-1.5 rounded transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800">{item}</span>
                            {(activeTab === 'expenses' || activeTab === 'incomeSplits') && (
                              <button
                                type="button"
                                onClick={() => toggleCommonStatus(item, activeTab === 'incomeSplits' ? 'income' : 'expense')}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                  (activeTab === 'incomeSplits' ? commonIncomes.includes(item) : commonExpenses.includes(item))
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200/50 font-bold'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200/50 hover:bg-slate-200/50 hover:text-slate-500'
                                }`}
                                title="Click to toggle between Building Common Area Fee and Unit Individual Portion"
                              >
                                {(activeTab === 'incomeSplits' ? commonIncomes.includes(item) : commonExpenses.includes(item))
                                  ? '🏢 Building Common'
                                  : '👤 Unit Specific'}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              onClick={() => handleStartEdit(idx, item)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItemClick(activeTab, item)}
                              className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {((activeTab === 'expenses' ? expenseCategories : activeTab === 'paymentMethods' ? paymentMethods : incomeSplits) || []).length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-sans">
                      No configurations found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: BACKUP & RECOVERY */}
            {activeTab === 'backup' && (
              <div className="space-y-4 animate-in fade-in duration-200 font-sans">
                {/* Backup & Restore Interactive Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Download Card */}
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60 hover:bg-slate-100/50 transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                        Export JSON Backup
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-1 lines-2 leading-relaxed">
                        Download a complete ledger snapshot containing contact details, payments sheets, and maintenance logs.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const backupData = {
                          version: "1.0",
                          exportedAt: new Date().toISOString(),
                          building: {
                            id: building.id,
                            name: building.name,
                            address: building.address,
                            currency: building.currency,
                            defaultBaseRent: building.defaultBaseRent,
                            defaultGuardFee: building.defaultGuardFee,
                            defaultMaintenanceFee: building.defaultMaintenanceFee,
                          },
                          tenants,
                          payments,
                          expenses,
                        };
                        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `property_backup_${building.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast("JSON Backup downloaded successfully!", "success");
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Download Backup
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60 hover:bg-slate-100/50 transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-amber-500" />
                        Restore From Backup
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-1 lines-2 leading-relaxed">
                        Import a previously exported JSON backup file to overwrite and recovery local configurations.
                      </p>
                    </div>
                    <div>
                      <input
                        type="file"
                        id="backup-upload-input"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const raw = event.target?.result as string;
                              const parsed = JSON.parse(raw);
                              if (!parsed.tenants || !parsed.payments || !parsed.expenses) {
                                throw new Error("Required collections (tenants/payments/expenses) are missing in the JSON file.");
                              }
                              if (onRestoreBackup) {
                                await onRestoreBackup({
                                  tenants: parsed.tenants,
                                  payments: parsed.payments,
                                  expenses: parsed.expenses,
                                });
                                showToast("Backup data recovered successfully!", "success");
                              } else {
                                showToast("Missing restore handler configuration.", "error");
                              }
                            } catch (err: any) {
                              showToast(`Restore Failed: ${err?.message || "Invalid JSON structure"}`, "error");
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="backup-upload-input"
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer text-center"
                      >
                        <Upload className="w-3 h-3" />
                        Upload & Restore JSON
                      </label>
                    </div>
                  </div>
                </div>

                {/* 13 Layers Stack Info Display Dashboard */}
                <div className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">Production Architecture Specifications (13 Layers)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-600 bg-white/70 p-3 rounded-xl border border-blue-50/50">
                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                      <span className="text-slate-400">Layer 4: Auth</span>
                      <span className="font-semibold font-mono text-slate-700">Firebase OAuth</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                      <span className="text-slate-400">Layer 8: Rules (RLS)</span>
                      <span className="font-semibold font-mono text-slate-700">Active</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                      <span className="text-slate-400">Layer 3: Caching</span>
                      <span className="font-semibold font-mono text-slate-700">Offline Enabled</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                      <span className="text-slate-400">Layer 13: Availability</span>
                      <span className="font-semibold font-mono text-slate-700">JSON Archiver</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-normal font-medium">
                    This architecture leverages real-time stream subscription patterns, strict validation ABAC guards, atomic write-once logs, client cache persistence, and robust JSON backup.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-medium leading-normal flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Changes are persisted to Cloud and reflect immediately inside your workspace.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
