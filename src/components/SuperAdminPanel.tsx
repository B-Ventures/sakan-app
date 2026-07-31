import React, { useState, useEffect } from 'react';
import { UserRecord, Building, Tenant, Payment, Expense, SaaSPlan, SaaSAddon, SaASCoupon, StripeConfig, MultiPropertyConfig, LandingPageConfig, DEFAULT_LANDING_CONFIG } from '../types';
import { 
  Users, 
  Building2, 
  Search, 
  RefreshCw, 
  UserCheck, 
  ArrowRightLeft,
  Calendar,
  Lock,
  BadgeAlert,
  Sliders,
  DollarSign,
  Edit,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  Activity,
  CheckCircle,
  CreditCard,
  FileText,
  Landmark,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  updateUserProfile, 
  deleteBuildingWithSubcollections, 
  createBuilding, 
  saveTenant, 
  savePayment, 
  saveExpense,
  saveBuilding,
  fetchSaaSPlans,
  saveSaaSPlan,
  deleteSaaSPlan,
  fetchSaaSCoupons,
  saveSaaSCoupon,
  deleteSaaSCoupon,
  fetchSaaSAddons,
  saveSaaSAddon,
  deleteSaaSAddon,
  fetchStripeConfig,
  saveStripeConfig,
  fetchMultiPropertyConfig,
  saveMultiPropertyConfig
} from '../firebaseService';
import ConfirmationDialog from './ConfirmationDialog';
import { useLanguage } from '../context/LanguageContext';

interface SuperAdminPanelProps {
  customers: UserRecord[];
  buildings: Building[];
  tenants: any[];
  payments: any[];
  expenses: any[];
  loading: boolean;
  impersonatedUser: { uid: string; email: string; displayName?: string } | null;
  onImpersonate: (user: { uid: string; email: string; displayName?: string }) => void;
  onEndImpersonation: () => void;
  onRefresh: () => void;
  activeSubTab?: 'directory' | 'analytics' | 'subscriptions' | 'packages' | 'landing_page';
  onChangeSubTab?: (tab: 'directory' | 'analytics' | 'subscriptions' | 'packages' | 'landing_page') => void;
  landingConfig?: LandingPageConfig;
  onSaveLandingConfig?: (config: LandingPageConfig) => Promise<void>;
}

export default function SuperAdminPanel({
  customers,
  buildings,
  tenants,
  payments,
  expenses,
  loading,
  impersonatedUser,
  onImpersonate,
  onEndImpersonation,
  onRefresh,
  activeSubTab: propActiveSubTab,
  onChangeSubTab,
  landingConfig,
  onSaveLandingConfig
}: SuperAdminPanelProps) {
  const { t, language } = useLanguage();
  const [localSubTab, setLocalSubTab] = useState<'directory' | 'analytics' | 'subscriptions' | 'packages' | 'landing_page'>('analytics');
  
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : localSubTab;
  const setActiveSubTab = (tab: 'directory' | 'analytics' | 'subscriptions' | 'packages' | 'landing_page') => {
    setLocalSubTab(tab);
    if (onChangeSubTab) {
      onChangeSubTab(tab);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Custom non-blocking dialogs & notification states
  const [deleteBldConfig, setDeleteBldConfig] = useState<{ id: string; name: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States for subscription and plan management
  const [editingSubscriptionBld, setEditingSubscriptionBld] = useState<Building | null>(null);
  const [subEditPlan, setSubEditPlan] = useState<string>('monthly');
  const [subEditStatus, setSubEditStatus] = useState<'active' | 'expired' | 'trial' | 'none'>('active');
  const [subEditEndDate, setSubEditEndDate] = useState('');
  const [subEditAmount, setSubEditAmount] = useState<number>(0);

  // Manual Offline Payment logging state
  const [manualPaymentBld, setManualPaymentBld] = useState<Building | null>(null);
  const [manualAmount, setManualAmount] = useState<string>('20');
  const [manualMethod, setManualMethod] = useState<string>('Bank Transfer');
  const [manualRef, setManualRef] = useState<string>('');
  const [manualPeriod, setManualPeriod] = useState<'1_month' | '12_months'>('1_month');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Subscriptions Tab Filtering States
  const [subSearch, setSubSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'trial' | 'monthly' | 'annually' | 'none'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'trial' | 'near_expiry'>('all');

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Profile fields state
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null);

  // New building fields state for a specific customer
  const [newBName, setNewBName] = useState('');
  const [newBAddress, setNewBAddress] = useState('');
  const [addingBuildingForId, setAddingBuildingForId] = useState<string | null>(null);

  // State to filter platform lists in analytics
  const [tenantSearch, setTenantSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  
  // Backup / Restore statuses
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  // SaaS and Stripe configurations states
  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>([]);
  const [saasCoupons, setSaasCoupons] = useState<SaASCoupon[]>([]);
  const [saasAddons, setSaaSAddons] = useState<SaaSAddon[]>([]);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);

  // Editing items
  const [editingPlanItem, setEditingPlanItem] = useState<SaaSPlan | null>(null);
  const [editingCouponItem, setEditingCouponItem] = useState<SaASCoupon | null>(null);
  const [editingAddonItem, setEditingAddonItem] = useState<SaaSAddon | null>(null);

  // New item creators
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [showAddAddon, setShowAddAddon] = useState(false);

  // Form states
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(0);
  const [newPlanInterval, setNewPlanInterval] = useState<'month' | 'year'>('month');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');
  const [newPlanStripePriceId, setNewPlanStripePriceId] = useState('');

  const [newCouponId, setNewCouponId] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  const [newCouponDescription, setNewCouponDescription] = useState('');
  const [newCouponIsActive, setNewCouponIsActive] = useState(true);
  const [newCouponValidPlanId, setNewCouponValidPlanId] = useState<string>('all');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<string>('');
  const [newCouponMaxUsesPerUser, setNewCouponMaxUsesPerUser] = useState<string>('');

  const [newAddonId, setNewAddonId] = useState('');
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState(0);
  const [newAddonInterval, setNewAddonInterval] = useState<'one_time' | 'month' | 'year'>('month');
  const [newAddonDescription, setNewAddonDescription] = useState('');
  const [newAddonStripePriceId, setNewAddonStripePriceId] = useState('');
  const [newAddonIsActive, setNewAddonIsActive] = useState(true);

  // Stripe form state
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [stripeRedirectType, setStripeRedirectType] = useState<'simulated' | 'hosted_checkout'>('simulated');

  // Multi-Property Policy Config State
  const [multiPropEnabled, setMultiPropEnabled] = useState(true);
  const [multiPropFirstRate, setMultiPropFirstRate] = useState(20);
  const [multiPropAdditionalRate, setMultiPropAdditionalRate] = useState(5);
  const [multiPropCurrency, setMultiPropCurrency] = useState('JOD');

  // Landing Page Editor State
  const [savingConfig, setSavingConfig] = useState(false);
  const [landingConfigForm, setLandingConfigForm] = useState<LandingPageConfig>(DEFAULT_LANDING_CONFIG);
  const [editorLang, setEditorLang] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    if (landingConfig) {
      setLandingConfigForm({
        ...DEFAULT_LANDING_CONFIG,
        ...landingConfig
      });
    }
  }, [landingConfig]);

  const handleSaveLandingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveLandingConfig) return;
    setSavingConfig(true);
    try {
      await onSaveLandingConfig(landingConfigForm);
      setNotification({ message: "Landing page updated successfully!", type: "success" });
    } catch (error) {
      setNotification({ message: "Failed to update landing page configuration.", type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  const loadSaaSConfigData = async () => {
    try {
      const fetchedPlans = await fetchSaaSPlans();
      const fetchedCoupons = await fetchSaaSCoupons();
      const fetchedAddons = await fetchSaaSAddons();
      const fetchedStripe = await fetchStripeConfig();
      const fetchedMultiProp = await fetchMultiPropertyConfig();

      setSaasPlans(fetchedPlans);
      setSaasCoupons(fetchedCoupons);
      setSaaSAddons(fetchedAddons);
      setStripeConfig(fetchedStripe);

      setStripeEnabled(fetchedStripe.isEnabled);
      setStripePublicKey(fetchedStripe.publicKey || '');
      setStripeSecretKey(fetchedStripe.secretKey || '');
      setStripeMode(fetchedStripe.mode || 'test');
      setStripeRedirectType(fetchedStripe.checkoutRedirectType || 'simulated');

      setMultiPropEnabled(fetchedMultiProp.isEnabled);
      setMultiPropFirstRate(fetchedMultiProp.firstPropertyRatePremium);
      setMultiPropAdditionalRate(fetchedMultiProp.additionalPropertyRate);
      setMultiPropCurrency(fetchedMultiProp.currency || 'JOD');
    } catch (err) {
      console.error("Error loading SaaS config:", err);
    }
  };

  React.useEffect(() => {
    loadSaaSConfigData();
  }, [activeSubTab]);

  // Computations
  const totalCustomers = customers.length;
  const totalBuildings = buildings.length;

  // Filtered listing
  const filteredCustomers = customers.filter(c => {
    const term = searchQuery.toLowerCase();
    const emailMatch = c.email?.toLowerCase().includes(term);
    const nameMatch = (c.displayName || 'Unnamed User').toLowerCase().includes(term);
    const idMatch = c.id?.toLowerCase().includes(term);
    
    const customerBuildings = buildings.filter(b => b.ownerId === c.id);
    const buildingMatch = customerBuildings.some(b => b.name?.toLowerCase().includes(term));

    return emailMatch || nameMatch || idMatch || buildingMatch;
  });

  const handleUpdateProfile = async (customer: UserRecord) => {
    try {
      setBusyMessage('Updating customer account details...');
      await updateUserProfile(customer.id, {
        displayName: editingName,
        email: editingEmail
      });
      setUpdatingProfileId(null);
      triggerNotification('User profile updated successfully!', 'success');
      onRefresh();
    } catch (err) {
      triggerNotification('Failed to update profile: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleAddBuilding = async (ownerId: string) => {
    if (!newBName.trim()) {
      triggerNotification('Please specify a property name.', 'error');
      return;
    }
    try {
      setBusyMessage('Spawning property asset record...');
      await createBuilding({
        name: newBName,
        address: newBAddress,
        ownerId: ownerId
      });
      setNewBName('');
      setNewBAddress('');
      setAddingBuildingForId(null);
      triggerNotification('Property building registered successfully for owner!', 'success');
      onRefresh();
    } catch (err) {
      triggerNotification('Failed to register property: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteBuilding = (buildingId: string, bName: string) => {
    setDeleteBldConfig({ id: buildingId, name: bName });
  };

  const executeDeleteBuilding = async () => {
    if (!deleteBldConfig) return;
    const { id, name } = deleteBldConfig;
    try {
      setBusyMessage(`Wiping building collections for ${name}...`);
      await deleteBuildingWithSubcollections(id);
      triggerNotification('Property and all subordinate metrics deleted successfully!', 'success');
      onRefresh();
    } catch (err) {
      triggerNotification('Deletion failed: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
      setDeleteBldConfig(null);
    }
  };

  const handleBackup = (ownerId: string, email: string) => {
    try {
      setBusyMessage('Compiling client database entries...');
      const customerBuildings = buildings.filter(b => b.ownerId === ownerId);
      
      const payload = customerBuildings.map(b => {
        const bTenants = tenants.filter(t => t.buildingId === b.id || (t.ownerId === ownerId && t.buildingName === b.name));
        const bPayments = payments.filter(p => p.buildingId === b.id || (p.ownerId === ownerId && p.buildingName === b.name));
        const bExpenses = expenses.filter(e => e.buildingId === b.id || (e.ownerId === ownerId && e.buildingName === b.name));

        return {
          building: b,
          tenants: bTenants,
          payments: bPayments,
          expenses: bExpenses
        };
      });

      const cache = new Set();
      const safePayloadStr = JSON.stringify(payload, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        return value;
      }, 2);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(safePayloadStr);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bprop_export_${email.replace(/[@.]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      triggerNotification('Failed to backup: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleRestoreFile = (ownerId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setBusyMessage('Parsing & validating JSON database file...');
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json)) {
          triggerNotification('Invalid snapshot file format.', 'error');
          return;
        }

        setBusyMessage(`Restoring ${json.length} property clusters sequentially...`);
        for (const cluster of json) {
          // 1. Restore/Register Building
          const mockB = cluster.building;
          const createdB = await createBuilding({
            name: mockB.name,
            address: mockB.address || '',
            ownerId: ownerId,
            currency: mockB.currency || 'JOD',
            defaultBaseRent: mockB.defaultBaseRent || 1000,
            defaultGuardFee: mockB.defaultGuardFee || 50,
            defaultMaintenanceFee: mockB.defaultMaintenanceFee || 30,
            customIncomeCategories: mockB.customIncomeCategories || [],
            customExpenseCategories: mockB.customExpenseCategories || [],
            customPaymentMethods: mockB.customPaymentMethods || []
          });

          // 2. Tenants
          if (Array.isArray(cluster.tenants)) {
            setBusyMessage(`Restoring tenants for "${createdB.name}"...`);
            for (const t of cluster.tenants) {
              await saveTenant(createdB.id, {
                name: t.name,
                unit: t.unit,
                monthlyRent: t.monthlyRent || 0,
                guardFee: t.guardFee || 0,
                maintenanceFee: t.maintenanceFee || 0,
                rentDueDateDay: t.rentDueDateDay || 5,
                startDate: t.startDate || new Date().toISOString().slice(0, 10),
                endDate: t.endDate || new Date().toISOString().slice(0, 10),
                phone: t.phone || '',
                email: t.email || '',
                status: t.status || 'active'
              });
            }
          }

          // 3. Payments
          if (Array.isArray(cluster.payments)) {
            setBusyMessage(`Restoring ledger income for "${createdB.name}"...`);
            for (const p of cluster.payments) {
              await savePayment(createdB.id, {
                tenantId: p.tenantId,
                tenantName: p.tenantName,
                unit: p.unit,
                amount: p.amount,
                rentPaid: p.rentPaid || 0,
                guardPaid: p.guardPaid || 0,
                maintenancePaid: p.maintenancePaid || 0,
                date: p.date,
                monthPaidFor: p.monthPaidFor,
                method: p.method,
                status: p.status,
                notes: p.notes || '',
                receiptNumber: p.receiptNumber || ''
              });
            }
          }

          // 4. Expenses
          if (Array.isArray(cluster.expenses)) {
            setBusyMessage(`Restoring ledger expenses for "${createdB.name}"...`);
            for (const ex of cluster.expenses) {
              await saveExpense(createdB.id, {
                title: ex.title,
                category: ex.category || 'Other',
                amount: ex.amount,
                date: ex.date,
                notes: ex.notes || '',
                attachmentName: ex.attachmentName || '',
                attachmentUrl: ex.attachmentUrl || ''
              });
            }
          }
        }

        triggerNotification('Restoration operation completed successfully! Core metrics refreshed.', 'success');
        onRefresh();
      } catch (err) {
        triggerNotification('Restore failure: ' + (err as Error).message, 'error');
      } finally {
        setBusyMessage(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveMultiPropConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusyMessage('Saving multi-property policy...');
      await saveMultiPropertyConfig({
        isEnabled: multiPropEnabled,
        firstPropertyRatePremium: Number(multiPropFirstRate),
        additionalPropertyRate: Number(multiPropAdditionalRate),
        currency: multiPropCurrency
      });
      triggerNotification('Multi-property policy saved successfully!', 'success');
    } catch (err: any) {
      triggerNotification('Failed to save policy: ' + err.message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleExpandCustomer = (customer: UserRecord) => {
    if (expandedCustomerId === customer.id) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customer.id);
      setEditingName(customer.displayName || '');
      setEditingEmail(customer.email || '');
      setUpdatingProfileId(null);
      setAddingBuildingForId(null);
    }
  };

  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const today = new Date();
    end.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isPortfolioAddon = (building: Building) => {
    const ownerBldgs = buildings
      .filter(b => b.ownerId === building.ownerId)
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
    
    if (ownerBldgs.length <= 1) return false;
    return ownerBldgs[0].id !== building.id;
  };

  const handleOpenSubscriptionEdit = (bld: Building) => {
    setEditingSubscriptionBld(bld);
    setSubEditPlan(bld.subscriptionPlan || 'none');
    setSubEditStatus(bld.subscriptionStatus || 'trial');
    setSubEditEndDate(bld.subscriptionEndDate || '');
    setSubEditAmount(bld.subscriptionAmountPaid || 0);
  };

  const handleOpenManualPayment = (bld: Building) => {
    setManualPaymentBld(bld);
    const isAddon = isPortfolioAddon(bld);
    if (isAddon && multiPropEnabled) {
      setManualAmount(String(multiPropAdditionalRate));
    } else {
      setManualAmount(bld.subscriptionPlan === 'annually' ? '150' : String(multiPropFirstRate));
    }
    setManualMethod('Bank Transfer');
    setManualRef('');
    setManualPeriod('1_month');
    setManualDate(new Date().toISOString().substring(0, 10));
  };

  const handleSaveSubscriptionOverride = async () => {
    if (!editingSubscriptionBld) return;
    try {
      setBusyMessage('Saving subscription overrides...');
      const updatedBld: Building = {
        ...editingSubscriptionBld,
        subscriptionPlan: subEditPlan,
        subscriptionStatus: subEditStatus,
        subscriptionEndDate: subEditEndDate || undefined,
        subscriptionAmountPaid: Number(subEditAmount) || 0
      };
      await saveBuilding(updatedBld);
      setEditingSubscriptionBld(null);
      triggerNotification('Subscription overridden successfully!', 'success');
      onRefresh();
    } catch (err) {
      triggerNotification('Failed to update subscription: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  // CRUD actions for SaaS Plans
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusyMessage('Saving plan configurations...');
      const targetId = editingPlanItem ? editingPlanItem.id : (newPlanId.trim().toLowerCase() || Date.now().toString());
      const payload: SaaSPlan = {
        id: targetId,
        name: newPlanName,
        price: Number(newPlanPrice),
        currency: 'JOD',
        interval: newPlanInterval,
        description: newPlanDescription,
        features: newPlanFeatures.split(',').map(f => f.trim()).filter(Boolean),
        stripePriceId: newPlanStripePriceId,
        isActive: true
      };
      await saveSaaSPlan(payload);
      triggerNotification(`SaaS plan "${payload.name}" saved successfully!`, 'success');
      setEditingPlanItem(null);
      setShowAddPlan(false);
      
      // Clear forms
      setNewPlanId('');
      setNewPlanName('');
      setNewPlanPrice(0);
      setNewPlanDescription('');
      setNewPlanFeatures('');
      setNewPlanStripePriceId('');

      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to save plan: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeletePlanItem = async (id: string) => {
    try {
      setBusyMessage('Purging SaaS Plan...');
      await deleteSaaSPlan(id);
      triggerNotification('SaaS Plan purged successfully!', 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to delete plan: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  // CRUD actions for Coupons
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusyMessage('Saving promo coupon...');
      const code = editingCouponItem ? editingCouponItem.code : newCouponId.trim().toUpperCase();
      const payload: SaASCoupon = {
        id: code,
        code,
        discountPercent: Number(newCouponDiscount),
        description: newCouponDescription,
        isActive: newCouponIsActive,
        validPlanId: newCouponValidPlanId === 'all' ? undefined : newCouponValidPlanId,
        maxUses: newCouponMaxUses ? Number(newCouponMaxUses) : undefined,
        maxUsesPerUser: newCouponMaxUsesPerUser ? Number(newCouponMaxUsesPerUser) : undefined,
        usedCount: editingCouponItem?.usedCount ?? 0,
        userUsage: editingCouponItem?.userUsage ?? {}
      };
      await saveSaaSCoupon(payload);
      triggerNotification(`Coupon "${payload.code}" saved!`, 'success');
      setEditingCouponItem(null);
      setShowAddCoupon(false);
      
      setNewCouponId('');
      setNewCouponDiscount(10);
      setNewCouponDescription('');
      setNewCouponIsActive(true);
      setNewCouponValidPlanId('all');
      setNewCouponMaxUses('');
      setNewCouponMaxUsesPerUser('');

      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to save coupon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleToggleCouponActive = async (coupon: SaASCoupon) => {
    try {
      setBusyMessage('Toggling coupon status...');
      const payload: SaASCoupon = {
        ...coupon,
        isActive: !coupon.isActive
      };
      await saveSaaSCoupon(payload);
      triggerNotification(`Coupon "${coupon.code}" is now ${payload.isActive ? 'active' : 'deactivated'}!`, 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to toggle coupon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteCouponItem = async (id: string) => {
    try {
      setBusyMessage('Deleting coupon...');
      await deleteSaaSCoupon(id);
      triggerNotification('Coupon deleted.', 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to delete coupon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  // CRUD actions for Addons
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusyMessage('Saving system addon...');
      const targetId = editingAddonItem ? editingAddonItem.id : (newAddonId.trim().toLowerCase() || Date.now().toString());
      const payload: SaaSAddon = {
        id: targetId,
        name: newAddonName,
        price: Number(newAddonPrice),
        currency: 'JOD',
        interval: newAddonInterval,
        description: newAddonDescription,
        stripePriceId: newAddonStripePriceId,
        isActive: newAddonIsActive
      };
      await saveSaaSAddon(payload);
      triggerNotification(`SaaS addon "${payload.name}" saved!`, 'success');
      setEditingAddonItem(null);
      setShowAddAddon(false);

      setNewAddonId('');
      setNewAddonName('');
      setNewAddonPrice(0);
      setNewAddonDescription('');
      setNewAddonStripePriceId('');
      setNewAddonIsActive(true);

      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to save addon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleToggleAddonActive = async (addon: SaaSAddon) => {
    try {
      setBusyMessage('Toggling addon status...');
      const payload: SaaSAddon = {
        ...addon,
        isActive: !addon.isActive
      };
      await saveSaaSAddon(payload);
      triggerNotification(`Addon "${addon.name}" is now ${payload.isActive ? 'active' : 'deactivated'}!`, 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to toggle addon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteAddonItem = async (id: string) => {
    try {
      setBusyMessage('Wiping addon config...');
      await deleteSaaSAddon(id);
      triggerNotification('Addon wiped.', 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to delete addon: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  // Save Stripe configurations
  const handleSaveStripeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusyMessage('Applying Stripe Merchant configs...');
      const payload: StripeConfig = {
        isEnabled: stripeEnabled,
        publicKey: stripePublicKey,
        secretKey: stripeSecretKey,
        mode: stripeMode,
        checkoutRedirectType: stripeRedirectType
      };
      await saveStripeConfig(payload);
      triggerNotification('Stripe Integration configuration applied!', 'success');
      loadSaaSConfigData();
    } catch (err) {
      triggerNotification('Failed to save Stripe config: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleLogManualPayment = async () => {
    if (!manualPaymentBld) return;
    try {
      setBusyMessage('Logging offline payment & renewing license...');
      const amountPaidNum = parseFloat(manualAmount) || 0;
      
      let baseDate = new Date();
      if (manualPaymentBld.subscriptionEndDate && manualPaymentBld.subscriptionStatus === 'active') {
        const currentEnd = new Date(manualPaymentBld.subscriptionEndDate);
        if (currentEnd > baseDate) {
          baseDate = currentEnd;
        }
      }
      
      if (manualPeriod === '1_month') {
        baseDate.setDate(baseDate.getDate() + 30);
      } else {
        baseDate.setDate(baseDate.getDate() + 365);
      }
      
      const newEndDateStr = baseDate.toISOString().substring(0, 10);
      const currentPaid = manualPaymentBld.subscriptionAmountPaid || 0;
      const updatedBld: Building = {
        ...manualPaymentBld,
        subscriptionPlan: manualPeriod === '1_month' ? 'monthly' : 'annually',
        subscriptionStatus: 'active',
        subscriptionStartDate: manualDate,
        subscriptionEndDate: newEndDateStr,
        subscriptionAmountPaid: currentPaid + amountPaidNum
      };
      
      await saveBuilding(updatedBld);
      setManualPaymentBld(null);
      triggerNotification(`Manual payment of ${multiPropCurrency} ${amountPaidNum} logged! License extended to ${newEndDateStr}.`, 'success');
      onRefresh();
    } catch (err) {
      triggerNotification('Failed to log payment: ' + (err as Error).message, 'error');
    } finally {
      setBusyMessage(null);
    }
  };

  // PLATFORM METRIC ACCUMULATORS
  const paidPayments = payments.filter(p => p.status === 'Paid');
  const platformRent = paidPayments.reduce((sum, p) => sum + (p.rentPaid || p.amount || 0), 0);
  const platformGuard = paidPayments.reduce((sum, p) => sum + (p.guardPaid || 0), 0);
  const platformMaintenance = paidPayments.reduce((sum, p) => sum + (p.maintenancePaid || 0), 0);
  const platformPaymentsTotal = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const platformExpensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const platformBalance = platformPaymentsTotal - platformExpensesTotal;

  // Tenants breakdown
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const vacantTenants = tenants.filter(t => t.status === 'vacant').length;
  const inactiveTenants = tenants.filter(t => t.status === 'inactive').length;

  // SaaS subscription accumulators
  const activeSubscriptionsCount = buildings.filter(b => b.subscriptionStatus === 'active').length;
  const trialSubscriptionsCount = buildings.filter(b => b.subscriptionStatus === 'trial' || !b.subscriptionStatus).length;
  const expiredSubscriptionsCount = buildings.filter(b => b.subscriptionStatus === 'expired').length;
  const totalSaaSPaidRevenue = buildings.reduce((sum, b) => sum + (b.subscriptionAmountPaid || 0), 0);
  const mrrEstimate = buildings.reduce((sum, b) => {
    if (b.subscriptionStatus !== 'active') return sum;
    // Try to find matching plan in configured saasPlans
    const plan = saasPlans.find(p => p.id === b.subscriptionPlan);
    if (plan) {
      if (plan.interval === 'year') {
        return sum + Math.round((plan.price || 0) / 12);
      } else {
        return sum + (plan.price || 0);
      }
    }
    // Context-aware fallback matching based on case-insensitive plan name keywords
    const planIdLower = (b.subscriptionPlan || '').toLowerCase();
    if (planIdLower.includes('annual') || planIdLower.includes('year') || planIdLower === 'annually') {
      return sum + 8; // standard annual plan is equivalent to JOD 8/month
    } else if (planIdLower.includes('month') || planIdLower.includes('premium')) {
      return sum + 10; // standard monthly or generic premium is JOD 10/month
    }
    // Default fallback value if an active subscription plan exists but is unrecognized
    if (b.subscriptionPlan && b.subscriptionPlan !== 'none') {
      return sum + 10;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6" id="superadmin-panel">
      {/* Busy Overlay */}
      {busyMessage && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-50 animate-fade-in">
          <RefreshCw className="w-10 h-10 text-white animate-spin" />
          <span className="text-white text-xs font-mono font-bold tracking-widest uppercase">{busyMessage}</span>
        </div>
      )}





      {/* SUB-VIEW 1: SYSTEM DIRECTORY CLIENT MODULE */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">PLATFORM OWNERS</span>
                <span className="text-xl font-black text-slate-800 tracking-tight block mt-1">{totalCustomers} Registered</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">PLATFORM BUILDINGS</span>
                <span className="text-xl font-black text-slate-800 tracking-tight block mt-1">{totalBuildings} Portfolio Assets</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">ADMINISTRATIVE PASSBACK</span>
                <span className="text-xs font-bold block mt-1 text-slate-600 truncate">
                  {impersonatedUser ? `Impersonating (${impersonatedUser.email})` : 'Master Security Shell active'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">{language === 'ar' ? 'فهرس الدليل الرئيسي' : 'Master Directory Index'}</h3>
                <p className="text-xs text-slate-400">{language === 'ar' ? 'انقر فوق أي صف مستخدم لتحديث تفاصيل الملف الشخصي أو حقن الأصول أو تنزيل/استعادة النسخ الاحتياطية.' : 'Click on any user row to update profile details, inject assets, or download/restore snapshot backups.'}</p>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'تصفية العملاء أو الأبنية...' : 'Filter customers or buildings...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-9 pe-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-semibold">No records match the current filter</p>
                <p className="text-slate-400 text-xs mt-1">Try clarifying keywords or sync the registry.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const customerBuildings = buildings.filter(b => b.ownerId === customer.id);
                  const isExpanded = expandedCustomerId === customer.id;
                  const isImpersonating = impersonatedUser?.uid === customer.id;

                  return (
                    <div key={customer.id} className="transition-all duration-150">
                      {/* Customer Row Summary Header */}
                      <div 
                        onClick={() => handleExpandCustomer(customer)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 cursor-pointer select-none transition-colors ${
                          isExpanded ? 'bg-slate-50/70 border-l-4 border-red-600 pl-4' : 'hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl font-mono font-black flex items-center justify-center uppercase shrink-0 text-xs text-white ${
                            customer.isSuperAdmin ? 'bg-red-600 border border-red-300' : 'bg-slate-800'
                          }`}>
                            {customer.displayName ? customer.displayName.substring(0, 2) : customer.email.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 tracking-tight text-sm truncate">{customer.displayName || 'No Name Configured'}</span>
                              {customer.isSuperAdmin && (
                                <span className="bg-red-50 border border-red-100 text-red-600 text-[8px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 rounded">SYSTEM CODE</span>
                              )}
                            </div>
                            <span className="text-slate-400 text-xs block mt-0.5">{customer.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 text-[11px] font-semibold text-slate-500 font-mono">
                          <div className="text-left sm:text-right">
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">MANAGED PORTFOLIO</span>
                            <span className="text-slate-800 font-bold block mt-0.5">{customerBuildings.length} active property files</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isImpersonating && (
                              <span className="text-[10px] uppercase font-mono font-extrabold bg-red-100 text-red-700 px-2 py-1 rounded-md animate-pulse">TUNNEL ACTIVE</span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                      </div>

                      {/* Customer Row Expanded Detail Hub */}
                      {isExpanded && (
                        <div className="px-5 pb-6 bg-slate-50/40 border-t border-slate-100 pt-5 space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Card 1: Account & Profile Management */}
                            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                              <div>
                                <span className="text-[9px] font-mono font-extrabold text-red-500 uppercase tracking-widest block mb-1">CLIENT CONFIGURATION</span>
                                <h4 className="text-sm font-extrabold text-slate-800">Operational Owner Profile</h4>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Owner / Primary Contact Name</label>
                                  <input 
                                    type="text" 
                                    value={editingName} 
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-red-500 font-sans text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Email Coordinates</label>
                                  <input 
                                    type="email" 
                                    value={editingEmail} 
                                    onChange={(e) => setEditingEmail(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-red-500 font-sans text-slate-800"
                                  />
                                </div>

                                <div className="pt-2 flex gap-2">
                                  <button 
                                    onClick={() => handleUpdateProfile(customer)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    Save Changes
                                  </button>
                                  <button 
                                    onClick={() => onImpersonate({ uid: customer.id, email: customer.email, displayName: customer.displayName })}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Launch Tunnel
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Property Portfolios (CRUD Buildings) */}
                            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <span className="text-[9px] font-mono font-extrabold text-red-500 uppercase tracking-widest block mb-1">PROPERTY REGISTRY</span>
                                  <h4 className="text-sm font-extrabold text-slate-800">Portfolio Assets Manager</h4>
                                </div>
                                <button 
                                  onClick={() => setAddingBuildingForId(addingBuildingForId === customer.id ? null : customer.id)}
                                  className="text-xs font-black text-red-600 flex items-center gap-1.5 cursor-pointer bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Property
                                </button>
                              </div>

                              {addingBuildingForId === customer.id && (
                                <div className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl animate-fade-in">
                                  <h5 className="text-[10px] font-extrabold text-slate-700">Add New Building Asset</h5>
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      placeholder="Property Name (e.g., Al-Saeed Square)"
                                      value={newBName}
                                      onChange={(e) => setNewBName(e.target.value)}
                                      className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden bg-white"
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Street Coordinates / Address"
                                      value={newBAddress}
                                      onChange={(e) => setNewBAddress(e.target.value)}
                                      className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden bg-white"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button 
                                        type="button" 
                                        onClick={() => setAddingBuildingForId(null)}
                                        className="text-[10px] text-slate-600 font-bold px-2 py-1 rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => handleAddBuilding(customer.id)}
                                        className="bg-red-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-xl shadow-xs"
                                      >
                                        Register Asset
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customerBuildings.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">No building assets recorded for this workspace. Click Add Property above to initialize a registered building file.</p>
                              ) : (
                                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                                  {customerBuildings.map(b => (
                                    <div key={b.id} className="py-2.5 flex items-center justify-between gap-4">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-slate-800 text-[11px] block truncate max-w-[120px]">{b.name}</span>
                                          <span className={`inline-flex items-center text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full border tracking-wider scale-90 ${
                                            b.subscriptionStatus === 'active'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                              : b.subscriptionStatus === 'expired'
                                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                                              : 'bg-amber-50 text-amber-700 border-amber-100'
                                          }`}>
                                            {b.subscriptionStatus || 'trial'}
                                          </span>
                                        </div>
                                        <span className="text-[9px] font-medium text-slate-400 block truncate mt-0.5">{b.address || 'Address unassigned'}</span>
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteBuilding(b.id, b.name)}
                                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Terminates building and all subordinates list databases"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Card 3: Database Snapshots BackUp & Restore */}
                            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                              <div>
                                <span className="text-[9px] font-mono font-extrabold text-red-500 uppercase tracking-widest block mb-1">DATA IMMUTABILITY</span>
                                <h4 className="text-sm font-extrabold text-slate-800">Snapshot Backup Suite</h4>
                              </div>

                              <div className="space-y-4">
                                <button 
                                  onClick={() => handleBackup(customer.id, customer.email)}
                                  className="w-full bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                                >
                                  <Download className="w-4 h-4" />
                                  Download Snapshot JSON
                                </button>

                                <div className="border-t border-slate-100 pt-3">
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Restore snapshot record</label>
                                  <div className="relative border border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-4 text-center group cursor-pointer transition-colors bg-slate-50/50">
                                    <input 
                                      type="file" 
                                      accept=".json"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleRestoreFile(customer.id, file);
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <Upload className="w-5 h-5 text-slate-400 mx-auto group-hover:text-red-500 transition-colors" />
                                    <span className="text-[10px] font-extrabold text-slate-600 block mt-1.5">Upload JSON Snapshot</span>
                                    <span className="text-[8px] font-medium text-slate-400 block mt-0.5 leading-snug">Writes files, apartments, and financial books</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: GLOBAL PLATFORM ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Accumulated Funds Visual Ledger Boards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">TOTAL INCOMES COLLECTED</span>
              <span className="text-xl font-bold font-mono tracking-tight text-emerald-600 block mt-1">JOD {platformPaymentsTotal.toLocaleString()}</span>
              <div className="mt-3 flex gap-2 justify-between text-[8px] font-mono font-bold text-slate-400 uppercase border-t border-slate-50 pt-2.5">
                <span>Rent portion: JOD {platformRent}</span>
                <span>Guard salary: JOD {platformGuard}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">TOTAL EXPENSES PAID</span>
              <span className="text-xl font-bold font-mono tracking-tight text-red-600 block mt-1">JOD {platformExpensesTotal.toLocaleString()}</span>
              <div className="mt-3 text-[8px] font-mono font-bold text-slate-400 uppercase border-t border-slate-50 pt-2.5 flex justify-between">
                <span>Maintenance box: JOD {platformMaintenance}</span>
                <span>Expenses count: {expenses.length}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">NET LIQUID RESERVE</span>
              <span className={`text-xl font-bold font-mono tracking-tight block mt-1 ${platformBalance >= 0 ? 'text-blue-600' : 'text-red-700'}`}>
                JOD {platformBalance.toLocaleString()}
              </span>
              <div className="mt-3 text-[8px] font-mono font-bold text-slate-400 uppercase border-t border-slate-50 pt-2.5">
                <span>NET PLATFORM BALANCE RESIDUE</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <span className="text-[9px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">APARTMENTS / UNITS SECTIONS</span>
              <span className="text-xl font-bold block mt-1 text-slate-800">{tenants.length} Unit Profiles</span>
              <div className="mt-3 flex gap-1 justify-between text-[8px] font-mono font-semibold text-slate-400 border-t border-slate-50 pt-2.5">
                <span className="text-emerald-600">{activeTenants} Occ</span>
                <span className="text-amber-500">{vacantTenants} Vac</span>
                <span className="text-slate-400">{inactiveTenants} Inactive</span>
              </div>
            </div>
          </div>

          {/* SaaS Subscriptions & Recurring Revenue Dashboard */}
          <div className="bg-white border border-slate-200 text-slate-800 rounded-3xl p-5 shadow-xs space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Revenue & Billing Subscriptions Hub
                </h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Global metrics computed from property owner subscriptions.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-100 font-extrabold">
                  Active MRR: JOD {mrrEstimate.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-100 font-extrabold">
                  Total Rec: JOD {totalSaaSPaidRevenue.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-50/80 transition-all">
                <span className="text-[8px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">ACTIVE PREMIUM SUBSCRIPTIONS</span>
                <span className="text-xl font-black font-mono tracking-tight text-emerald-600 block mt-1">{activeSubscriptionsCount} Properties</span>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">Billed monthly or annually.</span>
              </div>

              <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-50/80 transition-all">
                <span className="text-[8px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">ACTIVE TRIAL BUILDINGS</span>
                <span className="text-xl font-black font-mono tracking-tight text-amber-600 block mt-1">{trialSubscriptionsCount} Properties</span>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">Within 30-day trial period.</span>
              </div>

              <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-50/80 transition-all">
                <span className="text-[8px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">EXPIRED OR NONE LICENSE</span>
                <span className="text-xl font-black font-mono tracking-tight text-rose-600 block mt-1">{expiredSubscriptionsCount} Properties</span>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">Restricted billing snapshot access.</span>
              </div>

              <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-50/80 transition-all">
                <span className="text-[8px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">CONVERSION PREMIUM RATIO</span>
                <span className="text-xl font-black font-mono tracking-tight text-blue-600 block mt-1">
                  {buildings.length > 0 ? Math.round((activeSubscriptionsCount / buildings.length) * 100) : 0}% Premium
                </span>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">Platform-wide premium subscription rate.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: platform units and occupy metrics index */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{language === 'ar' ? 'إحصائيات إشغال عقارات المنصة والوحدات' : 'Platform Property Occupancy & Units Statistics'}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{language === 'ar' ? 'إحصائيات الإشغال المجمعة عبر المباني المسجلة.' : 'Aggregated occupancy stats across registered buildings.'}</p>
                  </div>
                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder={language === 'ar' ? 'تصفية باسم العقار...' : 'Filter by property name...'}
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-widest text-[9px] text-slate-400 font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-start">{language === 'ar' ? 'العقار / المحفظة' : 'Property / Portfolio'}</th>
                        <th className="px-4 py-3 text-center">{language === 'ar' ? 'إجمالي الوحدات' : 'Total Units'}</th>
                        <th className="px-4 py-3 text-center">{language === 'ar' ? 'مشغول (نشط)' : 'Occupied (Active)'}</th>
                        <th className="px-4 py-3 text-center">{language === 'ar' ? 'شاغر' : 'Vacant'}</th>
                        <th className="px-4 py-3 text-center">{language === 'ar' ? 'خطة الترخيص' : 'License Plan'}</th>
                        <th className="px-4 py-3 text-end">{language === 'ar' ? 'متوسط الإيجار' : 'Avg Rent (JOD)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {buildings.filter(b => {
                        const term = tenantSearch.toLowerCase();
                        return b.name?.toLowerCase().includes(term);
                      }).map((b) => {
                        const bTenants = tenants.filter(t => t.buildingId === b.id || (t.ownerId === b.ownerId && t.buildingName === b.name));
                        const totalUnits = bTenants.length;
                        const occupied = bTenants.filter(t => t.status === 'active').length;
                        const vacant = bTenants.filter(t => t.status === 'vacant').length;
                        const avgRent = totalUnits > 0
                          ? Math.round(bTenants.reduce((sum, t) => sum + (t.monthlyRent || 0), 0) / totalUnits)
                          : 0;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-start">
                              <span className="font-extrabold text-slate-800 block">{b.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs">{b.address || (language === 'ar' ? 'العنوان غير محدد' : 'Address unassigned')}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{totalUnits}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-semibold">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                {occupied}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 font-semibold">
                                <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                {vacant}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                b.subscriptionStatus === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : b.subscriptionStatus === 'expired'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {b.subscriptionStatus === 'active' ? (language === 'ar' ? 'نشط' : 'active') : b.subscriptionStatus === 'expired' ? (language === 'ar' ? 'منتهي' : 'expired') : (language === 'ar' ? 'تجريبي' : 'trial')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-end font-mono font-bold text-slate-800">
                              {language === 'ar' ? 'د.أ ' : 'JOD '} {avgRent.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {buildings.length === 0 && (
                    <div className="text-center py-6">
                      <span className="text-xs text-slate-400 italic">{language === 'ar' ? 'لا توجد سجلات أصول عقارية متاحة.' : 'No building assets records available.'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: platform expenses statistics breakdown */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm font-sans">Platform Expenses by Category</h4>
                    <p className="text-[11px] text-slate-400">Consolidated analytics and summation of expenses by category.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {(() => {
                    const groupedMap: Record<string, number> = {};
                    const countMap: Record<string, number> = {};
                    expenses.forEach(e => {
                      const cat = e.category || 'Other';
                      groupedMap[cat] = (groupedMap[cat] || 0) + (e.amount || 0);
                      countMap[cat] = (countMap[cat] || 0) + 1;
                    });

                    const sortedCategories = Object.entries(groupedMap).sort((a, b) => b[1] - a[1]);
                    const grandTotal = sortedCategories.reduce((sum, item) => sum + item[1], 0);

                    if (sortedCategories.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                          No registered expenses on record.
                        </div>
                      );
                    }

                    return sortedCategories.map(([category, amount], idx) => {
                      const percent = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                      const count = countMap[category] || 1;
                      const avgTx = amount / count;
                      const avgBldg = amount / (buildings.length || 1);

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-start text-xs">
                            <div className="min-w-0">
                              <span className="text-slate-800 font-extrabold block truncate">{category}</span>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                Avg: JOD {parseFloat(avgTx.toFixed(2)).toLocaleString()} / tx • JOD {parseFloat(avgBldg.toFixed(2)).toLocaleString()} / property
                              </span>
                            </div>
                            <div className="text-right font-mono text-slate-500 shrink-0">
                              <span className="text-slate-950 font-black block">JOD {amount.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">({percent}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                            <div 
                              className="bg-red-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Types and Categories Registry Inventory list */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-slate-500" />
                    Platform Category & Ledger Types Inventory
                  </h4>
                  <p className="text-[11px] text-slate-400">Breakdown of defaults & usage types configured across properties.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block mb-1">INCOME INCOME_CATEGORIES (Defaults)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Rent portion', 'Guard Salary', 'Service Box'].map((cat, idx) => (
                        <span key={idx} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-emerald-100">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block mb-1">EXPENSES CATEGORIES (Defaults)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Maintenance', 'Utilities', 'Insurance', 'Tax', 'Cleaning', 'Staff Salary', 'Marketing', 'Other'].map((cat, idx) => (
                        <span key={idx} className="bg-red-50 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-red-100">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block mb-1">PAYMENT TRANSACTION METHODS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Bank Transfer', 'Cash', 'Credit Card', 'Check', 'Other'].map((method, idx) => (
                        <span key={idx} className="bg-slate-50 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-slate-100">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'subscriptions' && (
        <div className="space-y-6 animate-fade-in" id="superadmin-subscriptions-console">
          {/* Subscription Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-all duration-200" id="sub-metrics-active-card">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">ACTIVE CONTRACTS</span>
                <span className="text-xl font-black text-slate-800 block mt-1">{activeSubscriptionsCount} Premium</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-all duration-200" id="sub-metrics-trial-card">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">FREE TRIALS</span>
                <span className="text-xl font-black text-slate-800 block mt-1">{trialSubscriptionsCount} Properties</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-all duration-200" id="sub-metrics-expired-card">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <BadgeAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">EXPIRED LICENSES</span>
                <span className="text-xl font-black text-slate-800 block mt-1">{expiredSubscriptionsCount} Out of Service</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-all duration-200" id="sub-metrics-revenue-card">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">TOTAL REVENUE</span>
                <span className="text-xl font-black text-indigo-700 block mt-1">JOD {totalSaaSPaidRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition-all duration-200" id="sub-metrics-mrr-card">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest leading-none">PLATFORM MRR (EST)</span>
                <span className="text-xl font-black text-slate-800 block mt-1">JOD {mrrEstimate.toLocaleString()} / mo</span>
              </div>
            </div>
          </div>

          {/* Pricing Policy Card (Multi-Property Portfolio Discount is ACTIVE/INACTIVE) */}
          <div className="bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/20 border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  multiPropEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {multiPropEnabled ? 'ACTIVE POLICY' : 'INACTIVE POLICY'}
                </span>
                <h4 className="font-extrabold text-slate-800 text-sm font-sans">Multi-Property Portfolio Add-on Pricing Discount</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {multiPropEnabled ? (
                  <>
                    To encourage owners to register their entire portfolio, our subscription policy automatically discounts subsequent properties.
                    The <strong>first building</strong> pays standard package rates ({multiPropCurrency} {multiPropFirstRate}/mo Premium). 
                    Any <strong>additional buildings</strong> added by the same owner only pay a heavily discounted fee of <strong>{multiPropCurrency} {multiPropAdditionalRate}/month</strong>.
                  </>
                ) : (
                  <>
                    The portfolio pricing discount policy is currently disabled. Each property registers and pays the standard package rate independently.
                  </>
                )}
              </p>
            </div>
            {multiPropEnabled && (
              <div className="flex gap-4 shrink-0 font-mono text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
                  <span className="text-[9px] text-slate-400 block font-semibold">1ST PROPERTY</span>
                  <span className="text-md font-black text-slate-800 block mt-0.5">{multiPropCurrency} {multiPropFirstRate}<span className="text-[10px] text-slate-400 font-medium">/mo</span></span>
                </div>
                <div className="bg-white border border-emerald-200 rounded-2xl p-3 shadow-xs ring-2 ring-emerald-500/10">
                  <span className="text-[9px] text-emerald-600 block font-extrabold">ADDITIONAL</span>
                  <span className="text-md font-black text-emerald-600 block mt-0.5">{multiPropCurrency} {multiPropAdditionalRate}<span className="text-[10px] text-slate-400 font-medium">/mo</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Filter & Subscriptions Table Card */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            {/* Header and Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-start">
              <div>
                <h3 className="text-sm font-black text-slate-800">{language === 'ar' ? 'دليل تراخيص المنصة' : 'Platform License Directory'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{language === 'ar' ? 'قائمة بجميع العقارات المسجلة، وخطط الاشتراك الخاصة بها، وتواريخ انتهاء الصلاحية، والرسوم المتراكمة المحصلة.' : 'List of all registered properties, their subscription plans, expiration counts, and cumulative fees collected.'}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'البحث عن مبنى أو مالك...' : 'Search building or owner...'}
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full ps-9 pe-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                    id="saas-sub-search-input"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white transition-colors font-semibold text-slate-700 min-w-[100px]"
                  >
                    <option value="all">{language === 'ar' ? 'جميع الخطط' : 'All Plans'}</option>
                    <option value="trial">{language === 'ar' ? 'فترة تجريبية مجانية' : 'Free Trial'}</option>
                    <option value="monthly">{language === 'ar' ? 'الخطة الشهرية' : 'Monthly Plan'}</option>
                    <option value="annually">{language === 'ar' ? 'الخطة السنوية' : 'Annual Plan'}</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white transition-colors font-semibold text-slate-700 min-w-[120px]"
                  >
                    <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                    <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
                    <option value="near_expiry">{language === 'ar' ? 'قريب الانتهاء' : 'Near Expiry'}</option>
                    <option value="trial">{language === 'ar' ? 'تجريبي' : 'Trial'}</option>
                    <option value="expired">{language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs font-sans" id="saas-subscriptions-table">
                <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-widest text-[9px] text-slate-400 font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-start">{language === 'ar' ? 'تفاصيل العقار / المالك' : 'Property / Owner Details'}</th>
                    <th className="px-5 py-3 text-center">{language === 'ar' ? 'فئة الخطة' : 'Plan Tier'}</th>
                    <th className="px-5 py-3 text-center">{language === 'ar' ? 'مستوى الخصم' : 'Discount Level'}</th>
                    <th className="px-5 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-5 py-3 text-start">{language === 'ar' ? 'انتهاء رخصة التشغيل' : 'License Expiration'}</th>
                    <th className="px-5 py-3 text-end">{language === 'ar' ? 'الرسوم المتراكمة' : 'Cumulative JOD'}</th>
                    <th className="px-5 py-3 text-center">{language === 'ar' ? 'العمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {(() => {
                    const filteredSubBuildings = buildings.filter(b => {
                      const term = subSearch.toLowerCase();
                      const nameMatch = b.name?.toLowerCase().includes(term);
                      const ownerEmail = bNameById(b.ownerId).toLowerCase();
                      const ownerMatch = ownerEmail.includes(term);
                      
                      let planMatch = true;
                      if (planFilter !== 'all') {
                        if (planFilter === 'trial') planMatch = b.subscriptionPlan === 'none' || !b.subscriptionPlan;
                        else planMatch = b.subscriptionPlan === planFilter;
                      }
                      
                      let statusMatch = true;
                      if (statusFilter !== 'all') {
                        if (statusFilter === 'trial') {
                          statusMatch = b.subscriptionStatus === 'trial' || !b.subscriptionStatus;
                        } else if (statusFilter === 'near_expiry') {
                          const remaining = getDaysRemaining(b.subscriptionEndDate);
                          statusMatch = b.subscriptionStatus === 'active' && remaining !== null && remaining <= 7 && remaining >= 0;
                        } else {
                          statusMatch = b.subscriptionStatus === statusFilter;
                        }
                      }
                      
                      return (nameMatch || ownerMatch) && planMatch && statusMatch;
                    });

                    if (filteredSubBuildings.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400 text-xs italic">
                            {language === 'ar' ? 'لا توجد اشتراكات عقارية تطابق الفلاتر المحددة.' : 'No property subscriptions match the selected filters.'}
                          </td>
                        </tr>
                      );
                    }

                    return filteredSubBuildings.map((b) => {
                      const ownerName = bNameById(b.ownerId);
                      const isAddon = isPortfolioAddon(b);
                      const daysRemaining = getDaysRemaining(b.subscriptionEndDate);
                      
                      const dbPlan = saasPlans.find(p => p.id === b.subscriptionPlan);
                      let planLabel = dbPlan 
                        ? (language === 'ar' && dbPlan.name === 'Premium Monthly Plan' ? 'الخطة الشهرية المميزة' : language === 'ar' && dbPlan.name === 'Premium Annual Plan' ? 'الخطة السنوية المميزة' : dbPlan.name) 
                        : (b.subscriptionPlan && b.subscriptionPlan !== 'none' 
                            ? `${b.subscriptionPlan.charAt(0).toUpperCase() + b.subscriptionPlan.slice(1)} Plan` 
                            : (language === 'ar' ? 'رخصة تجريبية' : 'Trial License'));

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-5 py-3.5 text-start">
                            <span className="font-extrabold text-slate-800 block text-xs">{b.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{b.address || (language === 'ar' ? 'بدون عنوان' : 'No Address')}</span>
                            <span className="inline-block mt-1 text-[9px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                              {language === 'ar' ? 'المالك:' : 'Owner:'} {ownerName}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              b.subscriptionPlan === 'annually'
                                ? 'bg-indigo-50 text-indigo-700'
                                : b.subscriptionPlan === 'monthly'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {planLabel}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isAddon ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-700">
                                {language === 'ar' ? `خصم المحفظة (${multiPropCurrency} ${multiPropAdditionalRate})` : `Portfolio Discount (${multiPropCurrency} ${multiPropAdditionalRate})`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-400">
                                {language === 'ar' ? 'سعر المبنى الأساسي' : 'Primary Building Rate'}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                              b.subscriptionStatus === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : b.subscriptionStatus === 'expired'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {b.subscriptionStatus === 'active' ? (language === 'ar' ? 'نشط' : 'active') : b.subscriptionStatus === 'expired' ? (language === 'ar' ? 'منتهي' : 'expired') : (language === 'ar' ? 'تجريبي' : 'trial')}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-start">
                            {b.subscriptionEndDate ? (
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-slate-700 block text-[11px]">
                                  {b.subscriptionEndDate}
                                </span>
                                {daysRemaining !== null && (
                                  <span className={`text-[9px] font-bold block ${
                                    daysRemaining < 0
                                      ? 'text-rose-600'
                                      : daysRemaining <= 7
                                      ? 'text-amber-650 font-extrabold animate-pulse'
                                      : 'text-emerald-600'
                                  }`}>
                                    {daysRemaining < 0
                                      ? (language === 'ar' ? `انتهت الصلاحية منذ ${Math.abs(daysRemaining)} أيام` : `Expired ${Math.abs(daysRemaining)} days ago`)
                                      : daysRemaining === 0
                                      ? (language === 'ar' ? 'تنتهي اليوم!' : 'Expires today!')
                                      : (language === 'ar' ? `متبقي ${daysRemaining} يوم` : `${daysRemaining} days remaining`)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">{language === 'ar' ? 'لم يسجل انتهاء للصلاحية' : 'No expiration recorded'}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-end font-mono font-bold text-slate-800">
                            {language === 'ar' ? 'د.أ ' : 'JOD '} { (b.subscriptionAmountPaid || 0).toLocaleString() }
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenSubscriptionEdit(b)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Manage Package Override"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenManualPayment(b)}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                title="Record Offline Cash/Bank Payment"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Portal Elements */}
      {notification && (
        <div id="super-admin-toast-portal" className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-semibold bg-white ${
            notification.type === 'success' 
              ? 'border-emerald-100 text-emerald-800' 
              : 'border-rose-100 text-rose-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}></span>
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-[10px] ml-1.5 opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteBldConfig}
        title="Permanently Delete Property"
        message={`This will permanently wipe the property "${deleteBldConfig?.name}" along with all associated Tenants, payments history, expenses logs and audit logs database entries. This operation is absolutely IRREVERSIBLE.`}
        confirmLabel="Wipe Property"
        cancelLabel="Discard"
        isDestructive={true}
        onConfirm={executeDeleteBuilding}
        onCancel={() => setDeleteBldConfig(null)}
      />

      {/* MODAL: Manage Subscription Override */}
      {editingSubscriptionBld && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="manage-sub-modal">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-slate-800 text-lg mb-1">Override Subscription Profile</h3>
            <p className="text-xs text-slate-400 mb-4">
              Direct administrative database override for <strong>{editingSubscriptionBld.name}</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Subscription Plan</label>
                <select
                  value={subEditPlan}
                  onChange={(e) => setSubEditPlan(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                >
                  <option value="none">Free Trial (Default)</option>
                  {saasPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.price} {plan.currency || 'JOD'}/{plan.interval})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">License Status</label>
                <select
                  value={subEditStatus}
                  onChange={(e) => setSubEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                >
                  <option value="trial">Free Trial</option>
                  <option value="active">Active Premium</option>
                  <option value="expired">Expired</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Expiration Date</label>
                <input
                  type="date"
                  value={subEditEndDate}
                  onChange={(e) => setSubEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Cumulative Amount Paid ({multiPropCurrency})</label>
                <input
                  type="number"
                  value={subEditAmount}
                  onChange={(e) => setSubEditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => setEditingSubscriptionBld(null)}
                className="px-4 py-2 text-xs border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveSubscriptionOverride}
                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold flex items-center gap-1"
              >
                Save Overrides
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record SaaS Offline Payment */}
      {manualPaymentBld && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="log-offline-payment-modal">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-slate-800 text-lg mb-1">Record Offline Subscription Payment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Log a manual wire transfer, cash transaction, or check payment for <strong>{manualPaymentBld.name}</strong>.
            </p>

            {isPortfolioAddon(manualPaymentBld) && (
              <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs space-y-1">
                <p className="font-bold">✨ Multi-Property Portfolio Discount Eligible!</p>
                <p className="text-[11px] text-emerald-700">
                  This building is owned by an owner with multiple property assets. The suggested monthly payment is discounted to only {multiPropCurrency} {multiPropAdditionalRate}/month!
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Amount Paid ({multiPropCurrency})</label>
                  <input
                    type="number"
                    required
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 text-slate-800 font-mono font-bold text-lg"
                    placeholder="e.g. 20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Method</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 text-slate-800 font-semibold"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Payment</option>
                    <option value="Check">Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">License Renewal Period</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualPeriod('1_month');
                      const discount = isPortfolioAddon(manualPaymentBld) && multiPropEnabled;
                      setManualAmount(discount ? String(multiPropAdditionalRate) : String(multiPropFirstRate));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      manualPeriod === '1_month'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +30 Days (Monthly)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualPeriod('12_months');
                      const discount = isPortfolioAddon(manualPaymentBld) && multiPropEnabled;
                      setManualAmount(discount ? String(multiPropAdditionalRate * 12) : '150');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      manualPeriod === '12_months'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +365 Days (Annual)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Transaction Ref ID / IBAN / Receipt</label>
                <input
                  type="text"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 text-slate-800"
                  placeholder="e.g. Bank Transfer Ref / Receipt #"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Payment Logging Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => setManualPaymentBld(null)}
                className="px-4 py-2 text-xs border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleLogManualPayment}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Record & Renew
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'packages' && (
        <div className="space-y-6">
          {/* Main Top Intro */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Settings className="w-40 h-40" />
            </div>
            <span className="text-[9px] font-mono font-extrabold text-red-400 uppercase tracking-widest block mb-1">STRIPE & SUBSCRIPTION ARCHITECTURE CONSOLE</span>
            <h2 className="text-xl font-extrabold tracking-tight">Subscription Plans & Gateways Control Panel</h2>
            <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Super-administrators can dynamically adjust the billing rates, launch discount promo codes, release value-added modular addons, and modify private Stripe credentials in real-time. This bypasses hard-coded configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMN 1: Stripe Configuration & Webhook Documentation (5 spans) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Stripe Configuration Form Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Stripe Checkout Integration</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Gateway configurations and API key vault</p>
                  </div>
                </div>

                <form onSubmit={handleSaveStripeConfig} className="space-y-4">
                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Stripe Gateway Core</span>
                      <span className="text-[10px] text-slate-400">Process credit card payments in-app</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={stripeEnabled} 
                        onChange={(e) => setStripeEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 font-bold"></div>
                    </label>
                  </div>

                  {/* Mode & Redirect Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Environment Mode</label>
                      <select
                        value={stripeMode}
                        onChange={(e) => setStripeMode(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold"
                      >
                        <option value="test">Test Mode (Sandbox)</option>
                        <option value="live">Live Mode (Production)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Checkout Flow</label>
                      <select
                        value={stripeRedirectType}
                        onChange={(e) => setStripeRedirectType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-semibold"
                      >
                        <option value="simulated">Simulated UI (No Iframe Bugs)</option>
                        <option value="hosted_checkout">Hosted Checkout URL (Real Stripe)</option>
                      </select>
                    </div>
                  </div>

                  {/* Keys */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Stripe Public Key</label>
                    <input 
                      type="text" 
                      value={stripePublicKey}
                      onChange={(e) => setStripePublicKey(e.target.value)}
                      placeholder="pk_test_..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Stripe Secret Key</label>
                    <input 
                      type="password" 
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      placeholder="sk_test_..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Credentials
                  </button>
                </form>
              </div>

              {/* Multi-Property Portfolio Discount Policy Configuration Form */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Multi-Property Discount Policy</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Configure portfolio discount rules for owners</p>
                  </div>
                </div>

                <form onSubmit={handleSaveMultiPropConfig} className="space-y-4">
                  {/* Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-extrabold text-slate-700 block">Enable Policy</span>
                      <p className="text-[9px] text-slate-400">Discount subsequent properties automatically</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMultiPropEnabled(!multiPropEnabled)}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                        multiPropEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          multiPropEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Rates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">1st Property Rate</label>
                      <input 
                        type="number" 
                        value={multiPropFirstRate}
                        onChange={(e) => setMultiPropFirstRate(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Additional Property Rate</label>
                      <input 
                        type="number" 
                        value={multiPropAdditionalRate}
                        onChange={(e) => setMultiPropAdditionalRate(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase">Currency Code</label>
                      <input 
                        type="text" 
                        value={multiPropCurrency}
                        onChange={(e) => setMultiPropCurrency(e.target.value)}
                        placeholder="e.g. JOD"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono uppercase font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Policy Configuration
                  </button>
                </form>
              </div>

              {/* Webhook & stripe instructions block */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3.5">
                <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-widest block">INTEGRATION MAPS GUIDE</span>
                <h4 className="text-xs font-extrabold text-slate-800">Dynamic Stripe Binding Strategy</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  When a property board purchases or upgrades their account inside their property dashboard settings panel, the application queries these custom firestore collections. If <strong>Hosted Checkout URL</strong> is selected, the application calls Stripe API using your secret key and redirects the board safely. 
                </p>
                <div className="bg-slate-900 text-slate-200 font-mono text-[9px] p-3.5 rounded-xl space-y-1 overflow-x-auto">
                  <div className="text-emerald-400">// Checkout redirect parameters payload</div>
                  <div>Collection Path: <span className="text-amber-400">/system_configs/billing</span></div>
                  <div>Plan Document ID: <span className="text-amber-400">monthly / annually</span></div>
                  <div>Addon Document ID: <span className="text-amber-400">whatsapp_premium</span></div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Plans, Coupons, Addons (7 spans) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SECTION A: Subscription Packages */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-slate-800">1. Subscription Pricing Tiers / Packages</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPlanItem(null);
                      setShowAddPlan(!showAddPlan);
                    }}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 cursor-pointer hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddPlan ? 'Collapse Form' : 'New Plan'}
                  </button>
                </div>

                {showAddPlan && (
                  <form onSubmit={handleSavePlan} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[9px] font-mono font-extrabold text-emerald-600 uppercase tracking-wider block">
                      {editingPlanItem ? `Edit Package Tier: ${editingPlanItem.id}` : 'Add / Configure Package Tier'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Document ID / Unique key</label>
                        <input 
                          type="text" 
                          required 
                          disabled={!!editingPlanItem}
                          value={newPlanId} 
                          onChange={(e) => setNewPlanId(e.target.value)}
                          placeholder="e.g. basic_monthly" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Plan Display Name</label>
                        <input 
                          type="text" 
                          required 
                          value={newPlanName} 
                          onChange={(e) => setNewPlanName(e.target.value)}
                          placeholder="e.g. Standard Business" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Price (JOD)</label>
                        <input 
                          type="number" 
                          required 
                          value={newPlanPrice} 
                          onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                          placeholder="15" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Interval</label>
                        <select 
                          value={newPlanInterval} 
                          onChange={(e) => setNewPlanInterval(e.target.value as any)}
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                        >
                          <option value="month">Monthly</option>
                          <option value="year">Annually</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                          <span>Stripe Price ID</span>
                          <span className="text-[9px] text-amber-600 font-extrabold font-sans">Requires price_... NOT prod_...</span>
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={newPlanStripePriceId} 
                          onChange={(e) => setNewPlanStripePriceId(e.target.value)}
                          placeholder="price_1Px..." 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Please enter a valid Stripe Price ID (e.g., price_1Px...). Do not enter a Product ID (starting with prod_).</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Plan Description</label>
                      <input 
                        type="text" 
                        value={newPlanDescription} 
                        onChange={(e) => setNewPlanDescription(e.target.value)}
                        placeholder="Best for active committees needing high-tier document archives..." 
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Features List (Comma separated)</label>
                      <input 
                        type="text" 
                        value={newPlanFeatures} 
                        onChange={(e) => setNewPlanFeatures(e.target.value)}
                        placeholder="Unlimited Tenants, Full Backup Engine, WhatsApp alerts" 
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingPlanItem(null);
                          setNewPlanId('');
                          setNewPlanName('');
                          setNewPlanPrice(0);
                          setNewPlanDescription('');
                          setNewPlanFeatures('');
                          setNewPlanStripePriceId('');
                          setShowAddPlan(false);
                        }} 
                        className="px-3 py-1.5 text-xs text-slate-600 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {editingPlanItem ? 'Save Changes' : 'Register Subscription Package'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Plan list */}
                <div className="space-y-3">
                  {saasPlans.map((plan) => (
                    <div key={plan.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4 relative">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800">{plan.name}</span>
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full font-mono">{plan.id}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{plan.description}</p>
                        
                        {/* Features chips */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.features.map((f, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-slate-600 text-[9px] font-medium px-2 py-0.5 rounded-md">✓ {f}</span>
                          ))}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono pt-1">
                          Stripe ID: <span className="text-slate-600 font-bold">{plan.stripePriceId || 'unassigned'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-2">
                        <div>
                          <span className="text-sm font-black text-slate-800 font-mono">{plan.price} {plan.currency}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold">/ {plan.interval}</span>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingPlanItem(plan);
                              setNewPlanId(plan.id);
                              setNewPlanName(plan.name);
                              setNewPlanPrice(plan.price);
                              setNewPlanInterval(plan.interval as any);
                              setNewPlanDescription(plan.description || '');
                              setNewPlanFeatures((plan.features || []).join(', '));
                              setNewPlanStripePriceId(plan.stripePriceId || '');
                              setShowAddPlan(true);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-bold px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeletePlanItem(plan.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: Discount Promo Coupons */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-extrabold text-slate-800">2. Discount Promo Coupons</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCouponItem(null);
                      setShowAddCoupon(!showAddCoupon);
                    }}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 cursor-pointer hover:underline bg-indigo-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddCoupon ? 'Collapse Form' : 'New Coupon'}
                  </button>
                </div>

                {showAddCoupon && (
                  <form onSubmit={handleSaveCoupon} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[9px] font-mono font-extrabold text-indigo-600 uppercase tracking-wider block">
                      {editingCouponItem ? `Edit Coupon Record: ${editingCouponItem.code}` : 'Issue New Promotional Pass'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Coupon Promo Code</label>
                        <input 
                          type="text" 
                          required 
                          disabled={!!editingCouponItem}
                          value={newCouponId} 
                          onChange={(e) => setNewCouponId(e.target.value)}
                          placeholder="WELCOME50" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none uppercase font-mono font-extrabold text-indigo-600 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Discount Percentage (%)</label>
                        <input 
                          type="number" 
                          required 
                          min="1" 
                          max="100"
                          value={newCouponDiscount} 
                          onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                          placeholder="50" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Campaign / Coupon Description</label>
                      <input 
                        type="text" 
                        value={newCouponDescription} 
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder="50% launch offer discount for active committees" 
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Applicable Plan Package</label>
                        <select
                          value={newCouponValidPlanId}
                          onChange={(e) => setNewCouponValidPlanId(e.target.value)}
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-bold"
                        >
                          <option value="all">Any Premium Package</option>
                          <option value="monthly">Monthly Plan Only</option>
                          <option value="annually">Annual Plan Only</option>
                          {saasPlans.filter(p => p.id !== 'monthly' && p.id !== 'annually').map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.interval}ly)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Max Overall Uses (Empty = Unlimited)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={newCouponMaxUses} 
                          onChange={(e) => setNewCouponMaxUses(e.target.value)}
                          placeholder="Unlimited" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Max Uses Per Customer (Empty = Unlimited)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={newCouponMaxUsesPerUser} 
                          onChange={(e) => setNewCouponMaxUsesPerUser(e.target.value)}
                          placeholder="Unlimited (e.g. 1)" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="newCouponIsActive"
                        checked={newCouponIsActive}
                        onChange={(e) => setNewCouponIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <label htmlFor="newCouponIsActive" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                        Is Active (Available for clients to apply)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingCouponItem(null);
                          setNewCouponId('');
                          setNewCouponDiscount(10);
                          setNewCouponDescription('');
                          setNewCouponIsActive(true);
                          setNewCouponValidPlanId('all');
                          setNewCouponMaxUses('');
                          setNewCouponMaxUsesPerUser('');
                          setShowAddCoupon(false);
                        }} 
                        className="px-3 py-1.5 text-xs text-slate-600 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {editingCouponItem ? 'Save Changes' : 'Issue Promo Code'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Coupon listing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {saasCoupons.map((c) => (
                    <div key={c.id} className={`p-3.5 border rounded-2xl flex items-center justify-between gap-3 relative transition-all ${
                      c.isActive !== false 
                        ? 'bg-indigo-50/40 border-indigo-100/50' 
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-indigo-900 font-mono tracking-wide bg-indigo-100 px-2 py-0.5 rounded-md">{c.code}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded font-mono">-{c.discountPercent}% OFF</span>
                          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase ${
                            c.isActive !== false ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {c.isActive !== false ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-snug">{c.description}</p>
                        
                        {/* Rules specifications summary badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                            Plan: {c.validPlanId ? (c.validPlanId === 'monthly' ? 'Monthly Only' : 'Annual Only') : 'All packages'}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded font-mono">
                            Uses: {c.usedCount ?? 0}/{c.maxUses ?? '∞'}
                          </span>
                          {c.maxUsesPerUser && (
                            <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded font-mono">
                              Limit: {c.maxUsesPerUser}/user
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 items-center shrink-0">
                        <button 
                          type="button" 
                          onClick={() => handleToggleCouponActive(c)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            c.isActive !== false 
                              ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-800' 
                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                          }`}
                          title={c.isActive !== false ? "Deactivate Code" : "Activate Code"}
                        >
                          {c.isActive !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingCouponItem(c);
                            setNewCouponId(c.code);
                            setNewCouponDiscount(c.discountPercent);
                            setNewCouponDescription(c.description || '');
                            setNewCouponIsActive(c.isActive !== false);
                            setNewCouponValidPlanId(c.validPlanId || 'all');
                            setNewCouponMaxUses(c.maxUses !== undefined ? String(c.maxUses) : '');
                            setNewCouponMaxUsesPerUser(c.maxUsesPerUser !== undefined ? String(c.maxUsesPerUser) : '');
                            setShowAddCoupon(true);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Coupon"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteCouponItem(c.id)}
                          className="text-[10px] text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Revoke Code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: Addons Platform Addons */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-extrabold text-slate-800">3. Modular Subscription Addons</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAddonItem(null);
                      setShowAddAddon(!showAddAddon);
                    }}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1.5 cursor-pointer hover:underline bg-amber-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddAddon ? 'Collapse Form' : 'New Addon'}
                  </button>
                </div>

                {showAddAddon && (
                  <form onSubmit={handleSaveAddon} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[9px] font-mono font-extrabold text-amber-600 uppercase tracking-wider block">
                      {editingAddonItem ? `Edit Platform Addon: ${editingAddonItem.id}` : 'Add Platform Addon'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Addon Identifier ID</label>
                        <input 
                          type="text" 
                          required 
                          disabled={!!editingAddonItem}
                          value={newAddonId} 
                          onChange={(e) => setNewAddonId(e.target.value)}
                          placeholder="e.g. storage_expansion" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Addon Feature Name</label>
                        <input 
                          type="text" 
                          required 
                          value={newAddonName} 
                          onChange={(e) => setNewAddonName(e.target.value)}
                          placeholder="e.g. Document Archiver Extension" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Price (JOD)</label>
                        <input 
                          type="number" 
                          required 
                          value={newAddonPrice} 
                          onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                          placeholder="5" 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Charge Period</label>
                        <select 
                          value={newAddonInterval} 
                          onChange={(e) => setNewAddonInterval(e.target.value as any)}
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                        >
                          <option value="month">Monthly Recurring</option>
                          <option value="year">Annually Recurring</option>
                          <option value="one_time">One-time payment</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                          <span>Stripe Price ID</span>
                          <span className="text-[9px] text-amber-600 font-extrabold font-sans">Requires price_... NOT prod_...</span>
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={newAddonStripePriceId} 
                          onChange={(e) => setNewAddonStripePriceId(e.target.value)}
                          placeholder="price_addon_..." 
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Please enter a valid Stripe Price ID (e.g., price_1Px...). Do not enter a Product ID (starting with prod_).</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Addon Feature Description</label>
                      <input 
                        type="text" 
                        value={newAddonDescription} 
                        onChange={(e) => setNewAddonDescription(e.target.value)}
                        placeholder="Direct API pipeline supporting automatic receipt deliveries to tenants..." 
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="newAddonIsActive"
                        checked={newAddonIsActive}
                        onChange={(e) => setNewAddonIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <label htmlFor="newAddonIsActive" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                        Is Active (Visible to clients on property settings)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingAddonItem(null);
                          setNewAddonId('');
                          setNewAddonName('');
                          setNewAddonPrice(0);
                          setNewAddonDescription('');
                          setNewAddonStripePriceId('');
                          setNewAddonIsActive(true);
                          setShowAddAddon(false);
                        }} 
                        className="px-3 py-1.5 text-xs text-slate-600 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {editingAddonItem ? 'Save Changes' : 'Enable Feature Addon'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Addons listing */}
                <div className="space-y-3">
                  {saasAddons.map((addon) => (
                    <div key={addon.id} className={`p-3.5 border rounded-2xl flex items-start justify-between gap-4 transition-all ${
                      addon.isActive !== false 
                        ? 'bg-slate-50 border-slate-100' 
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-800">{addon.name}</span>
                          <span className="bg-amber-50 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-md font-mono">{addon.id}</span>
                          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase ${
                            addon.isActive !== false ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {addon.isActive !== false ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{addon.description}</p>
                        <div className="text-[9px] text-slate-400 font-mono">
                          Stripe ID: <span className="text-slate-600 font-bold">{addon.stripePriceId || 'unassigned'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1.5">
                        <div>
                          <span className="text-xs font-black text-slate-800 font-mono">{addon.price} {addon.currency}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold">{addon.interval === 'one_time' ? 'once' : `/ ${addon.interval}`}</span>
                        </div>
                        <div className="flex gap-1 justify-end items-center">
                          <button 
                            type="button" 
                            onClick={() => handleToggleAddonActive(addon)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              addon.isActive !== false 
                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-800' 
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={addon.isActive !== false ? "Deactivate Addon" : "Activate Addon"}
                          >
                            {addon.isActive !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingAddonItem(addon);
                              setNewAddonId(addon.id);
                              setNewAddonName(addon.name);
                              setNewAddonPrice(addon.price);
                              setNewAddonInterval(addon.interval as any);
                              setNewAddonDescription(addon.description || '');
                              setNewAddonStripePriceId(addon.stripePriceId || '');
                              setNewAddonIsActive(addon.isActive !== false);
                              setShowAddAddon(true);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-bold px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteAddonItem(addon.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold px-2.5 py-0.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Wipe
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'landing_page' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Settings className="w-40 h-40" />
            </div>
            <span className="text-[9px] font-mono font-extrabold text-red-400 uppercase tracking-widest block mb-1">LANDING PAGE CONTENT CONFIGURATION</span>
            <h2 className="text-xl font-extrabold tracking-tight">SuperAdmin Live Site Editor</h2>
            <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Customize the branding, logo, titles, features, and marketing messages of your public landing page. These changes sync instantly to Firestore and reflect in real-time.
            </p>
          </div>

          <form onSubmit={handleSaveLandingConfig} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Branding & Hero Content</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Control the core visual components of your site</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin animate-infinite" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Landing Page Changes
                  </>
                )}
              </button>
            </div>

            {/* Bilingual Editor Switcher Tabs */}
            <div className="flex bg-slate-50 border border-slate-200/60 p-1.5 rounded-2xl max-w-sm gap-1.5">
              <button
                type="button"
                onClick={() => setEditorLang('en')}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  editorLang === 'en'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🇺🇸 English (Default)
              </button>
              <button
                type="button"
                onClick={() => setEditorLang('ar')}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  editorLang === 'ar'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🇯🇴 Arabic (المحتوى العربي)
              </button>
            </div>

            {/* Global Visual Assets (Logo) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Site Logo Image (Optional)</label>
              <p className="text-[10px] text-slate-400 mb-3 font-medium">Upload a custom logo image. If provided, it will replace the text abbreviation on the landing page.</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {landingConfigForm.siteLogoUrl ? (
                  <div className="relative w-16 h-16 bg-slate-900 rounded-xl border border-slate-200 overflow-hidden group shrink-0">
                    <img src={landingConfigForm.siteLogoUrl} className="w-full h-full object-contain" alt="Custom Logo" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setLandingConfigForm({ ...landingConfigForm, siteLogoUrl: "" })}
                      className="absolute inset-0 bg-red-600/90 text-white font-extrabold text-[9px] uppercase flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                    None
                  </div>
                )}
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setLandingConfigForm({ ...landingConfigForm, siteLogoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Or direct logo URL:</span>
                    <input
                      type="text"
                      value={landingConfigForm.siteLogoUrl || ''}
                      onChange={(e) => setLandingConfigForm({ ...landingConfigForm, siteLogoUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden text-slate-600 font-medium"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Site Name & Abbreviation */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Site Name' : 'اسم الموقع (العربية)'}
                </label>
                <input
                  type="text"
                  required
                  value={editorLang === 'en' ? (landingConfigForm.siteName || '') : (landingConfigForm.siteNameAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'siteName' : 'siteNameAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 font-bold"
                  placeholder={editorLang === 'en' ? 'e.g. bProp' : 'مثال: بي بروب'}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Site Logo Abbreviation' : 'اختصار شعار الموقع (العربية)'}
                </label>
                <input
                  type="text"
                  required
                  value={editorLang === 'en' ? (landingConfigForm.siteLogoAbbrev || '') : (landingConfigForm.siteLogoAbbrevAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'siteLogoAbbrev' : 'siteLogoAbbrevAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 font-bold"
                  placeholder={editorLang === 'en' ? 'e.g. bP' : 'مثال: ب ب'}
                />
              </div>

              {/* Hero Badge & Headline */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Hero Badge Text' : 'نص شارة الهيرو (العربية)'}
                </label>
                <input
                  type="text"
                  required
                  value={editorLang === 'en' ? (landingConfigForm.heroBadge || '') : (landingConfigForm.heroBadgeAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'heroBadge' : 'heroBadgeAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                  placeholder={editorLang === 'en' ? 'e.g. Next-Gen Property Ledgers' : 'مثال: سجلات عقارية من الجيل القادم'}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Hero Bold Title' : 'العنوان العريض للهيرو (العربية)'}
                </label>
                <input
                  type="text"
                  required
                  value={editorLang === 'en' ? (landingConfigForm.heroTitle || '') : (landingConfigForm.heroTitleAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'heroTitle' : 'heroTitleAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                  placeholder={editorLang === 'en' ? 'e.g. Ditch the Ledger Chaos.' : 'مثال: تخلص من فوضى الدفاتر الورقية.'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Hero Title Gradient Phrase' : 'عبارة العنوان الملون بالتدريج (العربية)'}
                </label>
                <input
                  type="text"
                  required
                  value={editorLang === 'en' ? (landingConfigForm.heroTitleGradient || '') : (landingConfigForm.heroTitleGradientAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'heroTitleGradient' : 'heroTitleGradientAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 font-semibold"
                  placeholder={editorLang === 'en' ? 'e.g. Automate Property Financials.' : 'مثال: أتمت الحسابات المالية للعقارات.'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                  {editorLang === 'en' ? 'Hero Description Text' : 'نص وصف الهيرو (العربية)'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={editorLang === 'en' ? (landingConfigForm.heroDescription || '') : (landingConfigForm.heroDescriptionAr || '')}
                  onChange={(e) => setLandingConfigForm({ 
                    ...landingConfigForm, 
                    [editorLang === 'en' ? 'heroDescription' : 'heroDescriptionAr']: e.target.value 
                  })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 leading-relaxed"
                  placeholder={editorLang === 'en' ? 'Enter description...' : 'أدخل نص الوصف...'}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">
                {editorLang === 'en' ? 'Features Section Copy' : 'نصوص قسم الميزات (العربية)'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                    {editorLang === 'en' ? 'Features Main Title' : 'العنوان الرئيسي لقسم الميزات (العربية)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editorLang === 'en' ? (landingConfigForm.featuresTitle || '') : (landingConfigForm.featuresTitleAr || '')}
                    onChange={(e) => setLandingConfigForm({ 
                      ...landingConfigForm, 
                      [editorLang === 'en' ? 'featuresTitle' : 'featuresTitleAr']: e.target.value 
                    })}
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                    {editorLang === 'en' ? 'Features Sub-Description' : 'الوصف الفرعي لقسم الميزات (العربية)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editorLang === 'en' ? (landingConfigForm.featuresDescription || '') : (landingConfigForm.featuresDescriptionAr || '')}
                    onChange={(e) => setLandingConfigForm({ 
                      ...landingConfigForm, 
                      [editorLang === 'en' ? 'featuresDescription' : 'featuresDescriptionAr']: e.target.value 
                    })}
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                  />
                </div>

                {/* Feature 1 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[9px] font-extrabold font-mono text-blue-600 uppercase">
                    {editorLang === 'en' ? 'FEATURE CARD #1 (Ledger)' : 'بطاقة الميزة الأولى (سجل الإيرادات)'}
                  </span>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                      {editorLang === 'en' ? 'Title' : 'العنوان'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editorLang === 'en' ? (landingConfigForm.feature1Title || '') : (landingConfigForm.feature1TitleAr || '')}
                      onChange={(e) => setLandingConfigForm({ 
                        ...landingConfigForm, 
                        [editorLang === 'en' ? 'feature1Title' : 'feature1TitleAr']: e.target.value 
                      })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                      {editorLang === 'en' ? 'Description' : 'الوصف'}
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={editorLang === 'en' ? (landingConfigForm.feature1Desc || '') : (landingConfigForm.feature1DescAr || '')}
                      onChange={(e) => setLandingConfigForm({ 
                        ...landingConfigForm, 
                        [editorLang === 'en' ? 'feature1Desc' : 'feature1DescAr']: e.target.value 
                      })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 leading-normal"
                    />
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[9px] font-extrabold font-mono text-indigo-600 uppercase">
                    {editorLang === 'en' ? 'FEATURE CARD #2 (Mobile optimized)' : 'بطاقة الميزة الثانية (الهواتف الذكية)'}
                  </span>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                      {editorLang === 'en' ? 'Title' : 'العنوان'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editorLang === 'en' ? (landingConfigForm.feature2Title || '') : (landingConfigForm.feature2TitleAr || '')}
                      onChange={(e) => setLandingConfigForm({ 
                        ...landingConfigForm, 
                        [editorLang === 'en' ? 'feature2Title' : 'feature2TitleAr']: e.target.value 
                      })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                      {editorLang === 'en' ? 'Description' : 'الوصف'}
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={editorLang === 'en' ? (landingConfigForm.feature2Desc || '') : (landingConfigForm.feature2DescAr || '')}
                      onChange={(e) => setLandingConfigForm({ 
                        ...landingConfigForm, 
                        [editorLang === 'en' ? 'feature2Desc' : 'feature2DescAr']: e.target.value 
                      })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 leading-normal"
                    />
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 md:col-span-2">
                  <span className="text-[9px] font-extrabold font-mono text-emerald-600 uppercase">
                    {editorLang === 'en' ? 'FEATURE CARD #3 (Secure Cloud Sync)' : 'بطاقة الميزة الثالثة (المزامنة السحابية)'}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                        {editorLang === 'en' ? 'Title' : 'العنوان'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editorLang === 'en' ? (landingConfigForm.feature3Title || '') : (landingConfigForm.feature3TitleAr || '')}
                        onChange={(e) => setLandingConfigForm({ 
                          ...landingConfigForm, 
                          [editorLang === 'en' ? 'feature3Title' : 'feature3TitleAr']: e.target.value 
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-extrabold text-slate-400 block mb-1 uppercase">
                        {editorLang === 'en' ? 'Description' : 'الوصف'}
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={editorLang === 'en' ? (landingConfigForm.feature3Desc || '') : (landingConfigForm.feature3DescAr || '')}
                        onChange={(e) => setLandingConfigForm({ 
                          ...landingConfigForm, 
                          [editorLang === 'en' ? 'feature3Desc' : 'feature3DescAr']: e.target.value 
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 leading-normal"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">
                {editorLang === 'en' ? 'Audit & Conversion Copy' : 'سجل المراجعة ونصوص الإجراء (العربية)'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                    {editorLang === 'en' ? 'Audit History Title' : 'عنوان سجل المراجعة (العربية)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editorLang === 'en' ? (landingConfigForm.auditTitle || '') : (landingConfigForm.auditTitleAr || '')}
                    onChange={(e) => setLandingConfigForm({ 
                      ...landingConfigForm, 
                      [editorLang === 'en' ? 'auditTitle' : 'auditTitleAr']: e.target.value 
                    })}
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">
                    {editorLang === 'en' ? 'Audit History Description' : 'وصف سجل المراجعة (العربية)'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editorLang === 'en' ? (landingConfigForm.auditDesc || '') : (landingConfigForm.auditDescAr || '')}
                    onChange={(e) => setLandingConfigForm({ 
                      ...landingConfigForm, 
                      [editorLang === 'en' ? 'auditDesc' : 'auditDescAr']: e.target.value 
                    })}
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-red-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                  <span className="text-[9px] font-extrabold font-mono text-red-700 uppercase">
                    {editorLang === 'en' ? 'Bottom Conversion CTA Card' : 'بطاقة الدعوة للإجراء السفلية (العربية)'}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-extrabold text-slate-500 block mb-1 uppercase">
                        {editorLang === 'en' ? 'CTA Card Title' : 'العنوان'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editorLang === 'en' ? (landingConfigForm.ctaTitle || '') : (landingConfigForm.ctaTitleAr || '')}
                        onChange={(e) => setLandingConfigForm({ 
                          ...landingConfigForm, 
                          [editorLang === 'en' ? 'ctaTitle' : 'ctaTitleAr']: e.target.value 
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-extrabold text-slate-500 block mb-1 uppercase">
                        {editorLang === 'en' ? 'CTA Card Description' : 'الوصف'}
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={editorLang === 'en' ? (landingConfigForm.ctaDesc || '') : (landingConfigForm.ctaDescAr || '')}
                        onChange={(e) => setLandingConfigForm({ 
                          ...landingConfigForm, 
                          [editorLang === 'en' ? 'ctaDesc' : 'ctaDescAr']: e.target.value 
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 leading-normal"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Landing Page Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );

  function bNameById(ownerId: string): string {
    const defaultCust = customers.find(c => c.id === ownerId);
    return defaultCust ? (defaultCust.displayName || defaultCust.email) : 'Owner unassigned';
  }
}
