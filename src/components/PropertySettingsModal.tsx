/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building, 
  DEFAULT_EXPENSE_CATEGORIES, 
  DEFAULT_PAYMENT_METHODS, 
  DEFAULT_INCOME_CATEGORIES, 
  Tenant, 
  Payment, 
  Expense, 
  CustomPaymentMethod, 
  normalizePaymentMethods, 
  SaaSPlan, 
  SaaSAddon, 
  SaASCoupon, 
  StripeConfig, 
  MultiPropertyConfig 
} from '../types';
import { 
  Settings, 
  Home, 
  DollarSign, 
  Wallet, 
  FileSpreadsheet, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Activity, 
  Download, 
  Upload, 
  Shield, 
  RefreshCw, 
  CreditCard, 
  Landmark, 
  Sliders,
  CheckCircle,
  AlertCircle,
  Check,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { 
  fetchSaaSPlans, 
  fetchSaaSCoupons, 
  fetchStripeConfig, 
  fetchSaaSAddons, 
  fetchMultiPropertyConfig 
} from '../firebaseService';

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
  buildings?: Building[];
}

type SettingsTab = 'general' | 'expenses' | 'paymentMethods' | 'incomeSplits' | 'billing' | 'backup';

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
  buildings = [],
}: PropertySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // SaaS Billing State
  const [billingPlan, setBillingPlan] = useState<string>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [isSubmittingBilling, setIsSubmittingBilling] = useState(false);

  // Dynamic SaaS Billing State from Cloud
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [coupons, setCoupons] = useState<SaASCoupon[]>([]);
  const [addons, setAddons] = useState<SaaSAddon[]>([]);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [isLoadingBillingData, setIsLoadingBillingData] = useState(false);
  const [multiPropConfig, setMultiPropConfig] = useState<MultiPropertyConfig | null>(null);

  // General State
  const [name, setName] = useState(building.name);
  const [address, setAddress] = useState(building.address || '');
  const [currency, setCurrency] = useState(building.currency || 'JOD');
  const [defaultBaseRent, setDefaultBaseRent] = useState<number | string>(building.defaultBaseRent ?? 1000);
  const [defaultGuardFee, setDefaultGuardFee] = useState<number | string>(building.defaultGuardFee ?? 50);
  const [defaultMaintenanceFee, setDefaultMaintenanceFee] = useState<number | string>(building.defaultMaintenanceFee ?? 30);
  const [bankTransferId, setBankTransferId] = useState(building.bankTransferId || '');

  // Lists State initialized from building or helper defaults
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    building.customExpenseCategories || DEFAULT_EXPENSE_CATEGORIES
  );
  const [paymentMethods, setPaymentMethods] = useState<CustomPaymentMethod[]>(() =>
    normalizePaymentMethods(building.customPaymentMethods, building.bankTransferId)
  );
  const [incomeSplits, setIncomeSplits] = useState<string[]>(
    building.customIncomeCategories || DEFAULT_INCOME_CATEGORIES
  );

  // States for adding a custom payment method
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'Cash' | 'Transfer' | 'Credit Card'>('Cash');
  const [newMethodTransferId, setNewMethodTransferId] = useState('');
  const [newMethodPaymentLink, setNewMethodPaymentLink] = useState('');

  // States for editing a custom payment method
  const [editingMethodName, setEditingMethodName] = useState('');
  const [editingMethodType, setEditingMethodType] = useState<'Cash' | 'Transfer' | 'Credit Card'>('Cash');
  const [editingMethodTransferId, setEditingMethodTransferId] = useState('');
  const [editingMethodPaymentLink, setEditingMethodPaymentLink] = useState('');

  const [commonIncomes, setCommonIncomes] = useState<string[]>(
    building.commonAreaIncomeCategories || ['Guard Salary', 'Service Box']
  );
  const [commonExpenses, setCommonExpenses] = useState<string[]>(
    building.commonAreaExpenseCategories || ['Staff Salary', 'Cleaning', 'Utilities']
  );

  const getPlanBasePrice = (planId: string) => {
    // Check if portfolio discount applies
    const isAddon = buildings && buildings.length > 0 && (multiPropConfig?.isEnabled !== false);
    if (isAddon) {
      const ownerBldgs = buildings
        .filter(b => b.ownerId === building.ownerId)
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
      const isEligibleAddon = ownerBldgs.length > 1 && ownerBldgs[0].id !== building.id;
      if (isEligibleAddon) {
        const rate = multiPropConfig?.additionalPropertyRate ?? 5;
        return planId === 'annually' ? rate * 12 : rate;
      }
    }

    // Otherwise standard rates from DB plans or defaults
    const dbPlan = plans.find(p => p.id === planId);
    if (dbPlan) return dbPlan.price;
    return planId === 'annually' ? 96 : 10;
  };

  const getPlanCurrency = () => {
    if (multiPropConfig?.isEnabled) {
      return multiPropConfig.currency || 'JOD';
    }
    const dbPlan = plans[0];
    if (dbPlan) return dbPlan.currency || 'JOD';
    return 'JOD';
  };

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
    setBankTransferId(building.bankTransferId || '');
    setExpenseCategories(building.customExpenseCategories || DEFAULT_EXPENSE_CATEGORIES);
    setPaymentMethods(normalizePaymentMethods(building.customPaymentMethods, building.bankTransferId || bankTransferId));
    setIncomeSplits(building.customIncomeCategories || DEFAULT_INCOME_CATEGORIES);
    setCommonIncomes(building.commonAreaIncomeCategories || ['Guard Salary', 'Service Box']);
    setCommonExpenses(building.commonAreaExpenseCategories || ['Staff Salary', 'Cleaning', 'Utilities']);
  }, [building]);

  // Load SaaS dynamic configs on mount / open
  React.useEffect(() => {
    if (isOpen) {
      const loadBillingConfig = async () => {
        setIsLoadingBillingData(true);
        try {
          const [fetchedPlans, fetchedCoupons, fetchedStripe, fetchedAddons, fetchedMultiProp] = await Promise.all([
            fetchSaaSPlans(),
            fetchSaaSCoupons(),
            fetchStripeConfig(),
            fetchSaaSAddons(),
            fetchMultiPropertyConfig(),
          ]);
          setPlans(fetchedPlans.filter(p => p.isActive));
          setCoupons(fetchedCoupons.filter(c => c.isActive));
          setStripeConfig(fetchedStripe);
          setAddons(fetchedAddons.filter(a => a.isActive));
          setMultiPropConfig(fetchedMultiProp);
        } catch (err) {
          console.error("Failed to load SaaS billing config:", err);
        } finally {
          setIsLoadingBillingData(false);
        }
      };
      loadBillingConfig();
    }
  }, [isOpen]);

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
        bankTransferId,
      });
      showToast('General property settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save property specifications', 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  const handleApplyCoupon = () => {
    const cleanCoupon = couponCode.trim().toUpperCase();
    const matched = coupons.find(c => c.code.toUpperCase() === cleanCoupon);
    if (matched) {
      setAppliedDiscount(matched.discountPercent);
      showToast(`Coupon applied! ${matched.code} active (${matched.discountPercent}% off).`, "success");
    } else {
      // Fallback for demo defaults
      if (cleanCoupon === 'BOSSTSC26' || cleanCoupon === 'WELCOME50') {
        setAppliedDiscount(50); // 50% discount
        showToast("Coupon applied! WELCOME50 active (50% off).", "success");
      } else if (cleanCoupon === 'FREE30' || cleanCoupon === 'SAASFREE') {
        setAppliedDiscount(100); // 100% discount
        showToast("Coupon applied! SAASFREE active (100% off).", "success");
      } else {
        showToast("Invalid or inactive coupon code.", "error");
      }
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appliedDiscount < 100) {
      if (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        showToast("Please complete your credit card details.", "error");
        return;
      }
      if (cardNumber.replace(/\s+/g, '').length < 16) {
        showToast("Invalid card number format.", "error");
        return;
      }
    }

    setIsSubmittingBilling(true);
    try {
      const today = new Date();
      const startDateStr = today.toISOString().slice(0, 10);
      
      const selectedPlanObj = plans.find(p => p.id === billingPlan);
      const basePrice = getPlanBasePrice(billingPlan);
      const durationDays = selectedPlanObj 
        ? (selectedPlanObj.interval === 'year' ? 365 : 30)
        : (billingPlan === 'annually' ? 365 : 30);

      const endDate = new Date();
      endDate.setDate(today.getDate() + durationDays);
      const endDateStr = endDate.toISOString().slice(0, 10);
      
      const finalPrice = Math.max(0, basePrice - (basePrice * appliedDiscount) / 100);

      await onUpdateSettings({
        subscriptionStatus: 'active',
        subscriptionPlan: billingPlan,
        subscriptionStartDate: startDateStr,
        subscriptionEndDate: endDateStr,
        subscriptionAmountPaid: finalPrice,
      });

      const planName = selectedPlanObj ? selectedPlanObj.name : billingPlan;
      showToast(`Property successfully subscribed to the ${planName}!`, 'success');
      // Reset forms
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardName('');
      setCouponCode('');
      setAppliedDiscount(0);
    } catch (err) {
      console.error(err);
      showToast("Failed to process subscription settings.", "error");
    } finally {
      setIsSubmittingBilling(false);
    }
  };

  const handleAddItem = async (tab: SettingsTab) => {
    if (tab === 'paymentMethods') {
      const nameVal = newMethodName.trim();
      if (!nameVal) {
        showToast('Please enter a payment method name', 'error');
        return;
      }
      if (paymentMethods.some(x => x.name.toLowerCase() === nameVal.toLowerCase())) {
        showToast('Payment method already exists', 'error');
        return;
      }
      const newMethod: CustomPaymentMethod = {
        id: `pm-${Date.now()}`,
        name: nameVal,
        type: newMethodType,
        transferId: newMethodType === 'Transfer' ? newMethodTransferId.trim() : undefined,
        paymentLink: newMethodType === 'Credit Card' ? newMethodPaymentLink.trim() : undefined,
      };
      const updatedList = [...paymentMethods, newMethod];
      setPaymentMethods(updatedList);
      await onUpdateSettings({ customPaymentMethods: updatedList });
      showToast(`Added payment method: "${nameVal}"`, 'success');
      setNewMethodName('');
      setNewMethodType('Cash');
      setNewMethodTransferId('');
      setNewMethodPaymentLink('');
      return;
    }

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
    if (activeTab === 'paymentMethods') {
      const pm = paymentMethods[index];
      if (pm) {
        setEditingMethodName(pm.name);
        setEditingMethodType(pm.type);
        setEditingMethodTransferId(pm.transferId || '');
        setEditingMethodPaymentLink(pm.paymentLink || '');
      }
    }
  };

  const handleSaveEdit = async (tab: SettingsTab, index: number) => {
    if (tab === 'paymentMethods') {
      const nameVal = editingMethodName.trim();
      if (!nameVal) {
        showToast('Please enter a name for the payment method', 'error');
        return;
      }
      const updatedList = [...paymentMethods];
      updatedList[index] = {
        ...updatedList[index],
        name: nameVal,
        type: editingMethodType,
        transferId: editingMethodType === 'Transfer' ? editingMethodTransferId.trim() : undefined,
        paymentLink: editingMethodType === 'Credit Card' ? editingMethodPaymentLink.trim() : undefined,
      };
      setPaymentMethods(updatedList);
      await onUpdateSettings({ customPaymentMethods: updatedList });
      showToast(`Updated payment method config for "${nameVal}"`, 'success');
      setEditingIndex(null);
      return;
    }

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
      const updated = paymentMethods.filter((m) => m.name !== itemToDelete);
      setPaymentMethods(updated);
      await onUpdateSettings({ customPaymentMethods: updated });
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans">
      <div className="bg-slate-50 rounded-3xl max-w-5xl w-full border border-slate-100 shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[720px] overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Toast Warning banner within Settings */}
        {toast && (
          <div className={`absolute top-4 right-4 z-[70] p-3.5 rounded-2xl border text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-3 max-w-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-800'
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-extrabold ml-1.5 p-0.5">✕</button>
          </div>
        )}

        {/* Custom Confirmation Panel Modal Overlay */}
        {confirmDialog && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[65] animate-in fade-in duration-150">
            <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-500 mb-1">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h5 className="font-extrabold text-slate-800 text-sm">Confirm Deleting Item</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sidebar Tab Selection */}
        <div className="bg-white border-b md:border-b-0 md:border-r border-slate-100 p-5 md:w-64 shrink-0 flex flex-col md:justify-between font-sans">
          <div className="space-y-4 md:space-y-6 flex-1">
            <div className="flex items-center justify-between md:block">
              <div>
                <span className="text-[10px] font-bold font-mono text-blue-600 block uppercase tracking-wider">Property Manager</span>
                <h3 className="font-extrabold text-slate-800 text-base mt-1.5 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500 animate-spin-slow" />
                  Configurations
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'general' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                General Details
              </button>

              <button
                onClick={() => { setActiveTab('expenses'); setEditingIndex(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'expenses' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                Expense Categories
              </button>

              <button
                onClick={() => { setActiveTab('paymentMethods'); setEditingIndex(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'paymentMethods' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                Payment Methods
              </button>

              <button
                onClick={() => { setActiveTab('incomeSplits'); setEditingIndex(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'incomeSplits' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0" />
                Income Split Fees
              </button>

              <button
                onClick={() => { setActiveTab('billing'); setEditingIndex(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'billing' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                Billing & Subscription
              </button>

              <button
                onClick={() => { setActiveTab('backup'); setEditingIndex(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all shrink-0 w-full ${
                  activeTab === 'backup' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-100 shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-slate-700 bg-slate-100/50 md:bg-transparent'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                Backup & Recovery
              </button>
            </nav>
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex w-full items-center justify-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>

        {/* Tab Contents Frame */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-hidden">
          
          <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200/60 font-sans shrink-0">
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  {activeTab === 'general' && 'General Property Details'}
                  {activeTab === 'expenses' && 'Manage Expense Categories'}
                  {activeTab === 'paymentMethods' && 'Manage Rent Payment Methods'}
                  {activeTab === 'incomeSplits' && 'Manage Income Split Fields'}
                  {activeTab === 'billing' && 'Property Subscription'}
                  {activeTab === 'backup' && 'Data Sovereignty & Active Dev Stack'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTab === 'general' && 'Update the active property name, base rates, and its registered address.'}
                  {activeTab === 'expenses' && 'Define custom tags for grouping maintenance costs.'}
                  {activeTab === 'paymentMethods' && 'Add/Remove supported options for receiving rent.'}
                  {activeTab === 'incomeSplits' && 'Add, edit or rename sub-components for the payment ledger.'}
                  {activeTab === 'billing' && 'View, renew, or upgrade your monthly or annual property subscription.'}
                  {activeTab === 'backup' && 'Download JSON backups of all building files, restore states, or examine cloud parameters.'}
                </p>
              </div>
              <button onClick={onClose} className="hidden md:block text-slate-300 hover:text-slate-500 font-bold transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB CONTENT: GENERAL */}
            {activeTab === 'general' && (
              <div className="flex-1 overflow-y-auto pr-1">
                <form onSubmit={handleGeneralSave} className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2.5 border-slate-100">
                      <Home className="w-4 h-4 text-blue-500" />
                      Property Identity & Locale
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Property Name *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-sans transition-all"
                          placeholder="e.g. Grandview Residences"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Rent System Currency *</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold cursor-pointer transition-all"
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
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-sans transition-all"
                        placeholder="e.g. 100 Luxury Heights Boulevard"
                      />
                    </div>
                  </div>

                  {/* Tenant template profile defaults */}
                  <div className="border border-indigo-50 bg-gradient-to-br from-indigo-50/30 to-blue-50/30 p-5 rounded-2xl space-y-3.5">
                    <h5 className="font-extrabold text-indigo-950 text-xs flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Default Tenant Fee Template
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      When auto-registering unlisted tenants during CSV imports or creating new ones, they will automatically copy these predefined amounts instead of hardcoded developer defaults.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-indigo-100">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Base Rent ({currency})</label>
                        <input
                          type="number"
                          required
                          value={defaultBaseRent}
                          onChange={(e) => setDefaultBaseRent(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50/70 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-sans font-semibold transition-all"
                          placeholder="e.g. 1000"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-indigo-100">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Guard Fee ({currency})</label>
                        <input
                          type="number"
                          required
                          value={defaultGuardFee}
                          onChange={(e) => setDefaultGuardFee(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50/70 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-sans font-semibold transition-all"
                          placeholder="e.g. 50"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-indigo-100">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Service Box ({currency})</label>
                        <input
                          type="number"
                          required
                          value={defaultMaintenanceFee}
                          onChange={(e) => setDefaultMaintenanceFee(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50/70 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-sans font-semibold transition-all"
                          placeholder="e.g. 30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-colors font-sans cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {savingLoading ? 'Saving Settings...' : 'Save General Config'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: LIST BASED CATEGORIES (Expenses) */}
            {activeTab === 'expenses' && (
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Input Form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 font-sans">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2.5 border-slate-100">
                      <Plus className="w-4 h-4 text-blue-500" />
                      Add Expense Category
                    </h4>
                    
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Category Label Name *</label>
                      <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="e.g. Elevator Maintenance"
                        className="w-full text-xs p-3 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddItem('expenses');
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Default Classification</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('individual')}
                          className={`py-2 rounded-lg font-bold text-[10px] transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                            newItemClassification === 'individual'
                              ? 'bg-white text-slate-800 border border-slate-250 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600 bg-transparent'
                          }`}
                        >
                          👤 Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('common')}
                          className={`py-2 rounded-lg font-bold text-[10px] transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                            newItemClassification === 'common'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-600 bg-transparent'
                          }`}
                        >
                          🏢 Common Cost
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddItem('expenses')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      Save & Add Category
                    </button>
                  </div>
                </div>

                {/* Right: Scrollable List */}
                <div className="lg:col-span-7 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-xs">
                  <div className="bg-slate-50/50 p-3 px-4 border-b border-slate-200/60 flex items-center justify-between font-sans shrink-0">
                    <span className="text-xs font-bold text-slate-500">Configured Categories</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-full">{expenseCategories.length} Categories</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
                    {expenseCategories.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                        {editingIndex === idx ? (
                          <div className="flex items-center gap-2 w-full animate-in fade-in duration-100">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="flex-1 text-xs px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border focus:outline-none focus:border-blue-500 font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit('expenses', idx);
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit('expenses', idx)}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800">{item}</span>
                              <button
                                type="button"
                                onClick={() => toggleCommonStatus(item, 'expense')}
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                  commonExpenses.includes(item)
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200/50'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200/50 hover:bg-slate-200/50 hover:text-slate-500'
                                }`}
                                title="Click to toggle between Building Common Area Fee and Unit Individual Portion"
                              >
                                {commonExpenses.includes(item) ? '🏢 Building Common' : '👤 Unit Specific'}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 font-sans">
                              <button
                                onClick={() => handleStartEdit(idx, item)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItemClick('expenses', item)}
                                className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {expenseCategories.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-sans">
                        No configurations found. Add one above!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LIST BASED CATEGORIES (Income Splits) */}
            {activeTab === 'incomeSplits' && (
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Input Form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 font-sans">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2.5 border-slate-100">
                      <Plus className="w-4 h-4 text-blue-500" />
                      Add Income Split Tag
                    </h4>
                    
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Split Label Name *</label>
                      <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="e.g. Service Box"
                        className="w-full text-xs p-3 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddItem('incomeSplits');
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Default Classification</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('individual')}
                          className={`py-2 rounded-lg font-bold text-[10px] transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                            newItemClassification === 'individual'
                              ? 'bg-white text-slate-800 border border-slate-250 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600 bg-transparent'
                          }`}
                        >
                          👤 Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItemClassification('common')}
                          className={`py-2 rounded-lg font-bold text-[10px] transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                            newItemClassification === 'common'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-600 bg-transparent'
                          }`}
                        >
                          🏢 Common Alloc
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddItem('incomeSplits')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      Save & Add Split Tag
                    </button>
                  </div>
                </div>

                {/* Right: Scrollable List */}
                <div className="lg:col-span-7 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-xs">
                  <div className="bg-slate-50/50 p-3 px-4 border-b border-slate-200/60 flex items-center justify-between font-sans shrink-0">
                    <span className="text-xs font-bold text-slate-500">Revenue Sub-splits</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-full">{incomeSplits.length} Active Tags</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
                    {incomeSplits.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                        {editingIndex === idx ? (
                          <div className="flex items-center gap-2 w-full animate-in fade-in duration-100">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="flex-1 text-xs px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border focus:outline-none focus:border-blue-500 font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit('incomeSplits', idx);
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit('incomeSplits', idx)}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800">{item}</span>
                              <button
                                type="button"
                                onClick={() => toggleCommonStatus(item, 'income')}
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                  commonIncomes.includes(item)
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200/50'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200/50 hover:bg-slate-200/50 hover:text-slate-500'
                                }`}
                                title="Click to toggle between Building Common Area Fee and Unit Individual Portion"
                              >
                                {commonIncomes.includes(item) ? '🏢 Building Common' : '👤 Unit Specific'}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 font-sans">
                              <button
                                onClick={() => handleStartEdit(idx, item)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItemClick('incomeSplits', item)}
                                className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {incomeSplits.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-sans">
                        No split configurations found. Add one above!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CUSTOM STRUCTURED PAYMENT METHODS */}
            {activeTab === 'paymentMethods' && (
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
                {/* Left: Input Form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 text-xs font-sans">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2.5 border-slate-100">
                      <Plus className="w-4 h-4 text-blue-500" />
                      Configure Payment Option
                    </h4>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Option Behavior Type *</label>
                        <select
                          value={newMethodType}
                          onChange={(e) => setNewMethodType(e.target.value as any)}
                          className="w-full text-xs p-3 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-semibold transition-all cursor-pointer"
                        >
                          <option value="Cash">Cash Handover</option>
                          <option value="Transfer">Bank Transfer / Wire IBAN</option>
                          <option value="Credit Card">Credit Card Sandbox (Stripe)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Option Label / Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Arab Bank IBAN, Office Cash"
                          value={newMethodName}
                          onChange={(e) => setNewMethodName(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium transition-all"
                        />
                      </div>

                      {newMethodType === 'Transfer' && (
                        <div className="space-y-1.5 p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                          <label className="block text-[9px] font-extrabold text-blue-700 uppercase tracking-wider">
                            IBAN / Transfer ID Account *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="JO95 ARAB 0000..."
                            value={newMethodTransferId}
                            onChange={(e) => setNewMethodTransferId(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <p className="text-[9px] text-slate-400 leading-normal">
                            This identifier is automatically populated in WhatsApp payment notifications.
                          </p>
                        </div>
                      )}

                      {newMethodType === 'Credit Card' && (
                        <div className="space-y-2 p-3.5 bg-purple-50/40 border border-purple-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between">
                            <label className="block text-[9px] font-extrabold text-purple-700 uppercase tracking-wider">
                              Stripe Checkout Payment Link
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
                                setNewMethodPaymentLink(`https://checkout.stripe.com/pay/cs_test_sand_${rand}`);
                              }}
                              className="text-[8px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded hover:bg-purple-200 transition-colors uppercase cursor-pointer"
                            >
                              Autogen
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="https://checkout.stripe.com/..."
                            value={newMethodPaymentLink}
                            onChange={(e) => setNewMethodPaymentLink(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddItem('paymentMethods')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      Save Payment Option
                    </button>
                  </div>
                </div>

                {/* Right: Scrollable List */}
                <div className="lg:col-span-7 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-xs">
                  <div className="bg-slate-50/50 p-3 px-4 border-b border-slate-200/60 flex items-center justify-between font-sans shrink-0">
                    <span className="text-xs font-bold text-slate-500 font-sans">Supported Rent Channels</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-full">{paymentMethods.length} Methods</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
                    {paymentMethods.map((pm, idx) => {
                      const isEditingThis = editingIndex === idx;
                      return (
                        <div key={pm.id || idx} className="p-4 hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                          {isEditingThis ? (
                            <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 animate-in fade-in duration-100">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Option Name</label>
                                  <input
                                    type="text"
                                    value={editingMethodName}
                                    onChange={(e) => setEditingMethodName(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Behavior Type</label>
                                  <select
                                    value={editingMethodType}
                                    onChange={(e) => setEditingMethodType(e.target.value as any)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                                  >
                                    <option value="Cash">Cash Handover</option>
                                    <option value="Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                  </select>
                                </div>
                              </div>

                              {editingMethodType === 'Transfer' && (
                                <div className="animate-in slide-in-from-top-2 duration-150">
                                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">IBAN Account Details</label>
                                  <input
                                    type="text"
                                    value={editingMethodTransferId}
                                    onChange={(e) => setEditingMethodTransferId(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 font-mono"
                                  />
                                </div>
                              )}

                              {editingMethodType === 'Credit Card' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Stripe Card Link</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
                                        setEditingMethodPaymentLink(`https://checkout.stripe.com/pay/cs_test_sand_${rand}`);
                                      }}
                                      className="text-[8px] text-blue-600 font-bold underline cursor-pointer"
                                    >
                                      Autogen
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={editingMethodPaymentLink}
                                    onChange={(e) => setEditingMethodPaymentLink(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 font-mono"
                                  />
                                </div>
                              )}

                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  onClick={() => handleSaveEdit('paymentMethods', idx)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-[10px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingIndex(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-4 py-2 rounded-xl text-[10px] uppercase transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-sm">{pm.name}</span>
                                  <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    pm.type === 'Cash' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                      : pm.type === 'Transfer'
                                      ? 'bg-blue-50 text-blue-700 border-blue-150'
                                      : 'bg-purple-50 text-purple-700 border-purple-150'
                                  }`}>
                                    {pm.type === 'Cash' ? (
                                      <>
                                        <Wallet className="w-2.5 h-2.5 text-emerald-600" />
                                        Cash
                                      </>
                                    ) : pm.type === 'Transfer' ? (
                                      <>
                                        <Landmark className="w-2.5 h-2.5 text-blue-600" />
                                        Transfer
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="w-2.5 h-2.5 text-purple-600" />
                                        Card
                                      </>
                                    )}
                                  </span>
                                </div>
                                {pm.type === 'Transfer' && pm.transferId && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">
                                    IBAN/ALIAS: <span className="font-bold text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{pm.transferId}</span>
                                  </p>
                                )}
                                {pm.type === 'Credit Card' && pm.paymentLink && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[280px] sm:max-w-[340px] leading-normal" title={pm.paymentLink}>
                                    Checkout: <span className="font-semibold text-slate-600 underline">{pm.paymentLink}</span>
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0 font-sans">
                                <button
                                  onClick={() => handleStartEdit(idx, pm.name)}
                                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Configuration"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItemClick('paymentMethods', pm.name)}
                                  className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Option"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {paymentMethods.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-sans font-medium">
                        No custom payment options configured. Setup at least one!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SAAS BILLING */}
            {activeTab === 'billing' && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                {/* 1. Status Overview Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-slate-200/60 rounded-2xl p-4.5 bg-white shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest block">Subscription Status</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border ${
                          building.subscriptionStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : building.subscriptionStatus === 'trial'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : building.subscriptionStatus === 'expired'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-slate-50 text-slate-700 border-slate-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            building.subscriptionStatus === 'active'
                              ? 'bg-emerald-500'
                              : building.subscriptionStatus === 'trial'
                              ? 'bg-amber-500'
                              : building.subscriptionStatus === 'expired'
                              ? 'bg-rose-500'
                              : 'bg-slate-500'
                          }`}></span>
                          {building.subscriptionStatus || 'Trial (Default)'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {building.subscriptionStatus === 'active' ? 'Your premium building license is fully active.' : 'Upgrade or renew to unlock unrestricted service.'}
                    </p>
                  </div>

                  <div className="border border-slate-200/60 rounded-2xl p-4.5 bg-white shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest block">Current Pricing Plan</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-1.5 capitalize">
                        {building.subscriptionPlan === 'monthly' || building.subscriptionPlan === 'annually' ? `${building.subscriptionPlan} billing` : '30-Day Free Trial'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {building.subscriptionAmountPaid !== undefined ? `Last paid: JOD ${building.subscriptionAmountPaid}` : 'No previous subscription payment logged.'}
                    </p>
                  </div>

                  <div className="border border-slate-200/60 rounded-2xl p-4.5 bg-white shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest block">Billing Renewal Date</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-1.5 font-mono">
                        {building.subscriptionEndDate || 'None / Trial Period'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {building.subscriptionEndDate ? 'Active subscription cycles renew on this day.' : 'Free trial access will expire automatically.'}
                    </p>
                  </div>
                </div>

                {/* 2. Main Subscription Checkout Section */}
                <div className="border border-slate-200/60 rounded-3xl p-6 bg-white shadow-xs space-y-6">
                  <div className="border-b pb-4 border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      Renew or Change Subscription
                    </h5>
                    <p className="text-xs text-slate-400 mt-1">Choose a flexible plan that matches your building scale and secure your tenant billing services.</p>
                  </div>

                  <form onSubmit={handleSubscribe} className="space-y-6">
                    {/* Plan Selector Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {plans.length > 0 ? (
                        plans.map((p) => {
                          const isSelected = billingPlan === p.id;
                          return (
                            <div 
                              key={p.id}
                              onClick={() => setBillingPlan(p.id)}
                              className={`border rounded-2xl p-5 cursor-pointer transition-all select-none flex flex-col justify-between space-y-4 relative ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10 shadow-sm'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800">{p.name}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md capitalize">{p.interval}ly cycle</span>
                              </div>
                              <div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-slate-900 font-mono">{getPlanBasePrice(p.id)} {getPlanCurrency()}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">/ {p.interval}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{p.description}</p>
                              </div>
                              {isSelected && (
                                <span className="absolute top-4 right-4 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {/* Monthly Plan Card */}
                          <div 
                            onClick={() => setBillingPlan('monthly')}
                            className={`border rounded-2xl p-5 cursor-pointer transition-all select-none flex flex-col justify-between space-y-4 relative ${
                              billingPlan === 'monthly'
                                ? 'border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-800">Monthly Plan</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">Cancel Anytime</span>
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 font-mono">
                                  {getPlanBasePrice('monthly')} {getPlanCurrency()}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">/ month</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">Best for small committees starting off with single-building accounting.</p>
                            </div>
                            {billingPlan === 'monthly' && (
                              <span className="absolute top-4 right-4 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                            )}
                          </div>

                          {/* Annual Plan Card */}
                          <div 
                            onClick={() => setBillingPlan('annually')}
                            className={`border rounded-2xl p-5 cursor-pointer transition-all select-none flex flex-col justify-between space-y-4 relative ${
                              billingPlan === 'annually'
                                ? 'border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-800">Annual Plan</span>
                                <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Save 20%</span>
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-md">Best Value</span>
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 font-mono">
                                  {getPlanBasePrice('annually')} {getPlanCurrency()}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">/ year</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">Equivalent to {(getPlanBasePrice('annually') / 12).toFixed(1)} {getPlanCurrency()}/month. Perfect for long-term committee boards.</p>
                            </div>
                            {billingPlan === 'annually' && (
                              <span className="absolute top-4 right-4 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Promo Code & Discounts Section */}
                    {buildings && buildings.length > 1 && (multiPropConfig?.isEnabled !== false) && (() => {
                      const ownerBldgs = buildings
                        .filter(b => b.ownerId === building.ownerId)
                        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
                      const isEligibleAddon = ownerBldgs.length > 1 && ownerBldgs[0].id !== building.id;
                      if (isEligibleAddon) {
                        return (
                          <div className="bg-emerald-50/70 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs space-y-1 animate-in slide-in-from-top-2 duration-200">
                            <p className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                              <span>✨ Multi-Property Portfolio Discount Activated!</span>
                            </p>
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                              This building is identified as an additional property asset under your ownership portfolio. 
                              The subscription fee has been automatically discounted to <strong>{getPlanCurrency()} {multiPropConfig?.additionalPropertyRate ?? 5}/month</strong> (billed at {getPlanCurrency()} {getPlanBasePrice(billingPlan)} total).
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Have a Promotion Coupon?</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. WELCOME50 or SAASFREE" 
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-sans uppercase placeholder-slate-400 text-slate-800 bg-slate-50 focus:bg-white transition-all"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 uppercase tracking-wide"
                          >
                            Apply
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-1.5">Try coupon codes <strong>WELCOME50</strong> (50% off) or <strong>SAASFREE</strong> (100% off).</span>
                      </div>

                      <div className="flex flex-col justify-end text-right">
                        <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest">Total Active Pricing</span>
                        <div className="mt-1 flex items-baseline justify-end gap-2">
                          {appliedDiscount > 0 && (
                            <span className="text-sm font-semibold text-slate-400 line-through font-mono">
                              {getPlanCurrency()} {getPlanBasePrice(billingPlan)}
                            </span>
                          )}
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            {getPlanCurrency()} {Math.max(0, getPlanBasePrice(billingPlan) - (getPlanBasePrice(billingPlan) * appliedDiscount) / 100)}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">Includes cloud database access & WhatsApp templates server proxying.</span>
                      </div>
                    </div>

                    {/* Credit Card Inputs - only if price > 0 */}
                    {appliedDiscount < 100 && (
                      <div className="border-t border-slate-150 pt-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Secure Checkout Ledger Details</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Card Number</label>
                            <input 
                              type="text" 
                              placeholder="4111 2222 3333 4444"
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                setCardNumber(value);
                              }}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-slate-800 bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Card Holder Name</label>
                            <input 
                              type="text" 
                              placeholder="Name as written on Card"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800 bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Expiration Date</label>
                            <input 
                              type="text" 
                              placeholder="MM/YY"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => {
                                let v = e.target.value;
                                if (v.length === 2 && !v.includes('/')) {
                                  v += '/';
                                }
                                setCardExpiry(v);
                              }}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-slate-800 bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">CVV / Security Code</label>
                            <input 
                              type="password" 
                              placeholder="•••"
                              maxLength={3}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-slate-800 bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <button
                              type="submit"
                              disabled={isSubmittingBilling}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer uppercase tracking-wide"
                            >
                              {isSubmittingBilling ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Authorizing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  Subscribe & Activate
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {appliedDiscount === 100 && (
                      <div className="border-t border-slate-150 pt-5 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingBilling}
                          className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer uppercase tracking-wide"
                        >
                          {isSubmittingBilling ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Activating...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Activate Promo Access (100% Free)
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* 3. Modular SaaS Addons & Integration Center */}
                <div className="border border-slate-200/60 rounded-3xl p-6 bg-white shadow-xs space-y-5">
                  <div className="border-b pb-4 border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      Modular SaaS Addons
                    </h5>
                    <p className="text-xs text-slate-400 mt-1">Unlock powerful feature-packs to automate communications and predictive analytics.</p>
                  </div>

                  {addons.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                      No optional addons currently registered by administration.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addons.map((addon) => {
                        const isActive = building.activeAddons?.includes(addon.id) || false;
                        return (
                          <div 
                            key={addon.id} 
                            className={`border rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 relative transition-all ${
                              isActive 
                                ? 'border-amber-500 bg-amber-500/[0.02] shadow-xs' 
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-extrabold text-slate-800 leading-tight">{addon.name}</span>
                                {isActive && (
                                  <span className="bg-amber-100 text-amber-850 text-[8px] font-black uppercase px-2 py-0.5 rounded shrink-0">Active</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{addon.description}</p>
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                              <div>
                                <span className="text-xs font-black text-slate-900 font-mono">{addon.price} {addon.currency}</span>
                                <span className="text-[9px] text-slate-400 font-medium"> / {addon.interval === 'one_time' ? 'once' : addon.interval}</span>
                              </div>

                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentAddons = building.activeAddons || [];
                                    const updated = currentAddons.filter(id => id !== addon.id);
                                    await onUpdateSettings({ activeAddons: updated });
                                    showToast(`Addon "${addon.name}" deactivated.`, 'info');
                                  }}
                                  className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-red-100"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentAddons = building.activeAddons || [];
                                    const updated = [...currentAddons, addon.id];
                                    await onUpdateSettings({ activeAddons: updated });
                                    showToast(`Addon "${addon.name}" successfully activated!`, 'success');
                                  }}
                                  className="text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: BACKUP & RECOVERY */}
            {activeTab === 'backup' && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 animate-in fade-in duration-200">
                {/* Backup & Restore Interactive Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Download Card */}
                  <div className="border border-slate-200/60 rounded-2xl p-5 bg-white shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-blue-500" />
                        Export JSON Backup
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Download a complete ledger snapshot containing contact details, payments sheets, and maintenance logs. Keep your building records safe offline.
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
                        const cache = new Set();
                        const safeBackupStr = JSON.stringify(backupData, (key, value) => {
                          if (typeof value === 'object' && value !== null) {
                            if (cache.has(value)) return '[Circular]';
                            cache.add(value);
                          }
                          return value;
                        }, 2);
                        const blob = new Blob([safeBackupStr], { type: 'application/json' });
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
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download Backup File
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="border border-slate-200/60 rounded-2xl p-5 bg-white shadow-xs hover:border-amber-200 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-amber-500" />
                        Restore From Backup
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Import a previously exported JSON backup file to overwrite and recovery local configurations. Circular reference-proof parsing is applied automatically.
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
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer text-center block"
                      >
                        <Upload className="w-4 h-4" />
                        Upload & Restore JSON
                      </label>
                    </div>
                  </div>
                </div>

                {/* Production Architecture Display Panel */}
                <div className="border border-slate-850 bg-slate-900 rounded-3xl p-5 space-y-3.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-white font-mono tracking-wide">Technical Specs Node Monitor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[11px] text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono">
                    <div className="flex justify-between border-b border-slate-900 py-1">
                      <span className="text-slate-500">Layer 4: Access</span>
                      <span className="text-slate-200">Firebase OAuth Stream</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 py-1">
                      <span className="text-slate-500">Layer 8: Rules</span>
                      <span className="text-emerald-400 font-bold">✓ Active Security</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 py-1">
                      <span className="text-slate-500">Layer 3: Caching</span>
                      <span className="text-slate-200">Offline Cache Enabled</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 py-1">
                      <span className="text-slate-500">Layer 13: Integrity</span>
                      <span className="text-slate-200">Atomic JSON Archiver</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium px-1">
                    This architecture leverages real-time stream subscription patterns, strict validation ABAC guards, atomic write-once logs, client cache persistence, and robust JSON backup.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-semibold leading-normal flex items-center gap-2 shrink-0 bg-slate-50/50 mt-4 rounded-xl px-3 py-2">
            <Activity className="w-4 h-4 text-blue-500 shrink-0 animate-pulse" />
            <span>Settings reflect immediately inside your workspace and synchronize with the persistent Firestore database.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
