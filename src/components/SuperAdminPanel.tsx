import React, { useState } from 'react';
import { UserRecord, Building, Tenant, Payment, Expense } from '../types';
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
  FileText,
  Landmark,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import { 
  updateUserProfile, 
  deleteBuildingWithSubcollections, 
  createBuilding, 
  saveTenant, 
  savePayment, 
  saveExpense 
} from '../firebaseService';
import ConfirmationDialog from './ConfirmationDialog';

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
  activeSubTab?: 'directory' | 'analytics';
  onChangeSubTab?: (tab: 'directory' | 'analytics') => void;
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
  onChangeSubTab
}: SuperAdminPanelProps) {
  const [localSubTab, setLocalSubTab] = useState<'directory' | 'analytics'>('analytics');
  
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : localSubTab;
  const setActiveSubTab = (tab: 'directory' | 'analytics') => {
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
        const bTenants = tenants.filter(t => t.ownerId === ownerId || t.buildingName === b.name);
        const bPayments = payments.filter(p => p.ownerId === ownerId || p.buildingName === b.name);
        const bExpenses = expenses.filter(e => e.ownerId === ownerId || e.buildingName === b.name);

        return {
          building: b,
          tenants: bTenants,
          payments: bPayments,
          expenses: bExpenses
        };
      });

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
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

  // PLATFORM METRIC ACCUMULATORS
  const platformRent = payments.reduce((sum, p) => sum + (p.rentPaid || p.amount || 0), 0);
  const platformGuard = payments.reduce((sum, p) => sum + (p.guardPaid || 0), 0);
  const platformMaintenance = payments.reduce((sum, p) => sum + (p.maintenancePaid || 0), 0);
  const platformPaymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const platformExpensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const platformBalance = platformPaymentsTotal - platformExpensesTotal;

  // Tenants breakdown
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const vacantTenants = tenants.filter(t => t.status === 'vacant').length;
  const inactiveTenants = tenants.filter(t => t.status === 'inactive').length;

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
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">Master Directory Index</h3>
                <p className="text-xs text-slate-400">Click on any user row to update profile details, inject assets, or download/restore snapshot backups.</p>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter customers or buildings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
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
                                        <span className="font-extrabold text-slate-800 text-[11px] block truncate">{b.name}</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: platform units and occupy metrics index */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Platform Property Occupancy & Units Statistics</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Aggregated occupancy stats across registered buildings.</p>
                  </div>
                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Filter by property name..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-widest text-[9px] text-slate-400 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Property / Portfolio</th>
                        <th className="px-4 py-3 text-center">Total Units</th>
                        <th className="px-4 py-3 text-center">Occupied (Active)</th>
                        <th className="px-4 py-3 text-center">Vacant</th>
                        <th className="px-4 py-3 text-right">Avg Rent (JOD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {buildings.filter(b => {
                        const term = tenantSearch.toLowerCase();
                        return b.name?.toLowerCase().includes(term);
                      }).map((b) => {
                        const bTenants = tenants.filter(t => t.ownerId === b.ownerId || t.buildingName === b.name);
                        const totalUnits = bTenants.length;
                        const occupied = bTenants.filter(t => t.status === 'active').length;
                        const vacant = bTenants.filter(t => t.status === 'vacant').length;
                        const avgRent = totalUnits > 0
                          ? Math.round(bTenants.reduce((sum, t) => sum + (t.monthlyRent || 0), 0) / totalUnits)
                          : 0;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <span className="font-extrabold text-slate-800 block">{b.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs">{b.address || 'Address unassigned'}</span>
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
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                              JOD {avgRent.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {buildings.length === 0 && (
                    <div className="text-center py-6">
                      <span className="text-xs text-slate-400 italic">No building assets records available.</span>
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

    </div>
  );

  function bNameById(ownerId: string): string {
    const defaultCust = customers.find(c => c.id === ownerId);
    return defaultCust ? (defaultCust.displayName || defaultCust.email) : 'Owner unassigned';
  }
}
