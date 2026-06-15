/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tenant, Payment, Expense, Building as BuildingType, UserRecord } from './types';
import { INITIAL_TENANTS, INITIAL_PAYMENTS, INITIAL_EXPENSES } from './mockData';
import DashboardOverview from './components/DashboardOverview';
import TenantList from './components/TenantList';
import PaymentHistory from './components/PaymentHistory';
import ExpenseTracker from './components/ExpenseTracker';
import StatementsGenerator from './components/StatementsGenerator';
import SuperAdminPanel from './components/SuperAdminPanel';
import { 
  Building, 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign, 
  FileText, 
  LogOut, 
  Plus, 
  RefreshCw, 
  ChevronsUpDown,
  Home, 
  Sparkles,
  Lock,
  ArrowRight,
  Settings,
  Upload,
  Shield,
  Smartphone,
  Monitor,
  Activity
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  fetchUserBuildings,
  createBuilding,
  saveBuilding,
  removeBuilding,
  subscribeToTenants,
  saveTenant,
  removeTenant,
  subscribeToPayments,
  savePayment,
  removePayment,
  subscribeToExpenses,
  saveExpense,
  removeExpense,
  logAction,
  subscribeToAuditLogs,
  registerUser,
  fetchAllUsers,
  fetchAllBuildings,
  updateUserProfile,
  deleteBuildingWithSubcollections,
  fetchAllTenants,
  fetchAllPayments,
  fetchAllExpenses
} from './firebaseService';
import PropertySettingsModal from './components/PropertySettingsModal';
import DataImporter from './components/DataImporter';
import ConfirmationDialog from './components/ConfirmationDialog';
import AuditTrail from './components/AuditTrail';
import { motion, AnimatePresence } from 'motion/react';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_METHODS
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoUser, setDemoUser] = useState<{ uid: string; displayName: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // BUILDINGS STATE
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [activeBuilding, setActiveBuilding] = useState<BuildingType | null>(null);
  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);
  const [isNewBuildingModalOpen, setIsNewBuildingModalOpen] = useState(false);
  
  // Real-time loaded entities
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Form states for creating a building
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [creatingBuilding, setCreatingBuilding] = useState(false);
  const [isPropertySettingsOpen, setIsPropertySettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [buildingToDeleteId, setBuildingToDeleteId] = useState<string | null>(null);

  // --- SUPERADMIN STATES ---
  const [impersonatedUser, setImpersonatedUser] = useState<{ uid: string; email: string; displayName?: string } | null>(null);
  const [isAdminFormVisible, setIsAdminFormVisible] = useState<boolean>(false);
  const [adminEmailInput, setAdminEmailInput] = useState<string>('hisham@bosstsc.com');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [allCustomers, setAllCustomers] = useState<UserRecord[]>([]);
  const [allBuildings, setAllBuildings] = useState<BuildingType[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [superAdminLoading, setSuperAdminLoading] = useState<boolean>(false);

  // GLOBAL FLOATING TOAST NOTIFICATION SERVICE
  const [globalToast, setGlobalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showGlobalToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setGlobalToast({ message, type });
    setTimeout(() => {
      setGlobalToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // --- PROGRESSIVE WEB APP (PWA) INSTALL TRIGGER STATES ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      showGlobalToast('✨ Property Payments tracker installed successfully!', 'success');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial standalone display check
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      showGlobalToast('The app is ready! Feel free to add it to your home screen using browser settings.', 'info');
      return;
    }
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showGlobalToast('Installing your Property Management PWA App...', 'success');
      }
    } catch (err) {
      console.warn('Installation prompt error:', err);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const activeUserId = impersonatedUser?.uid || currentUser?.uid || (isDemoMode ? demoUser?.uid : null);
  const activeUserEmail = impersonatedUser?.email || currentUser?.email || (isDemoMode ? demoUser?.email : null);
  const activeUserName = impersonatedUser?.displayName || currentUser?.displayName || (isDemoMode ? demoUser?.displayName : null);

  const isSuperAdminSession = currentUser?.email === 'hisham@bosstsc.com' || currentUser?.email === 'hisham.balatiah@gmail.com' || currentUser?.uid === 'superadmin-hisham';

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsDemoMode(false);
        setDemoUser(null);
        setCurrentUser(user);
        
        // Sync user profile to users collection so SuperAdmin list is fully populated
        await registerUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });

        await refreshBuildingsList(user.uid);
      } else {
        // Prevent clearing custom local superadmin mock login state if actively logged in
        if (currentUser?.uid !== 'superadmin-hisham') {
          setCurrentUser(null);
          setImpersonatedUser(null);
        }
        if (!isDemoMode && currentUser?.uid !== 'superadmin-hisham') {
          setBuildings([]);
          setActiveBuilding(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isDemoMode, currentUser]);

  // Load SuperAdmin datasets on successful session detection
  useEffect(() => {
    if (isSuperAdminSession) {
      loadSuperAdminDashboard();
      setActiveTab('superadmin_analytics');
    } else {
      setAllCustomers([]);
      setAllBuildings([]);
    }
  }, [currentUser, isSuperAdminSession]);

  // Dynamic buildings sync: when the impersonated or active user id changes
  useEffect(() => {
    if (activeUserId && !isDemoMode) {
      refreshBuildingsList(activeUserId);
    }
  }, [activeUserId, isDemoMode]);

  const loadSuperAdminDashboard = async () => {
    try {
      setSuperAdminLoading(true);
      const [usersList, buildingsList] = await Promise.all([
        fetchAllUsers(),
        fetchAllBuildings()
      ]);
      setAllCustomers(usersList);
      setAllBuildings(buildingsList);

      const [tenantsList, paymentsList, expensesList] = await Promise.all([
        fetchAllTenants(buildingsList),
        fetchAllPayments(buildingsList),
        fetchAllExpenses(buildingsList)
      ]);
      setAllTenants(tenantsList);
      setAllPayments(paymentsList);
      setAllExpenses(expensesList);
    } catch (err) {
      console.error('Failed to load SuperAdmin workspace:', err);
    } finally {
      setSuperAdminLoading(false);
    }
  };

  // 2. Fetch/Refetch Buildings
  const refreshBuildingsList = async (userId: string, selectId?: string) => {
    if (isDemoMode) {
      const localBuildingsRaw = localStorage.getItem(`demo_buildings_${userId}`);
      let localBuildings: BuildingType[] = [];
      if (localBuildingsRaw) {
        localBuildings = JSON.parse(localBuildingsRaw);
      } else {
        localBuildings = [{
          id: 'demo-b1',
          name: 'Grandview Heights Apartments',
          address: '401 Grandview Ave, CA',
          ownerId: userId,
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem(`demo_buildings_${userId}`, JSON.stringify(localBuildings));
      }
      setBuildings(localBuildings);
      if (localBuildings.length > 0) {
        if (selectId) {
          const found = localBuildings.find((b) => b.id === selectId);
          setActiveBuilding(found || localBuildings[0]);
        } else {
          const savedId = localStorage.getItem(`demo_active_building_id_${userId}`);
          const foundSaved = localBuildings.find((b) => b.id === savedId);
          setActiveBuilding(foundSaved || localBuildings[0]);
        }
      } else {
        setActiveBuilding(null);
      }
      return;
    }

    const list = await fetchUserBuildings(userId);
    setBuildings(list);
    if (list.length > 0) {
      if (selectId) {
        const found = list.find((b) => b.id === selectId);
        setActiveBuilding(found || list[0]);
      } else {
        const savedId = localStorage.getItem(`active_building_id_${userId}`);
        const foundSaved = list.find((b) => b.id === savedId);
        setActiveBuilding(foundSaved || list[0]);
      }
    } else {
      setActiveBuilding(null);
    }
  };

  // 3. Realtime subcollection listeners
  useEffect(() => {
    if (!activeBuilding) {
      setTenants([]);
      setPayments([]);
      setExpenses([]);
      return;
    }

    // Safeguard: Prevent subscribing to real database with a demo building ID during transition
    if (!isDemoMode && activeBuilding.id.startsWith('demo-')) {
      return;
    }

    if (isDemoMode) {
      setLoadingData(true);
      const bId = activeBuilding.id;
      
      const tenantsKey = `demo_tenants_${bId}`;
      const paymentsKey = `demo_payments_${bId}`;
      const expensesKey = `demo_expenses_${bId}`;

      let loadedTenants: Tenant[] = [];
      let loadedPayments: Payment[] = [];
      let loadedExpenses: Expense[] = [];

      const rawTenants = localStorage.getItem(tenantsKey);
      if (rawTenants) {
        loadedTenants = JSON.parse(rawTenants);
      } else {
        loadedTenants = INITIAL_TENANTS;
        localStorage.setItem(tenantsKey, JSON.stringify(loadedTenants));
      }

      const rawPayments = localStorage.getItem(paymentsKey);
      if (rawPayments) {
        loadedPayments = JSON.parse(rawPayments);
      } else {
        loadedPayments = INITIAL_PAYMENTS;
        localStorage.setItem(paymentsKey, JSON.stringify(loadedPayments));
      }

      const rawExpenses = localStorage.getItem(expensesKey);
      if (rawExpenses) {
        loadedExpenses = JSON.parse(rawExpenses);
      } else {
        loadedExpenses = INITIAL_EXPENSES;
        localStorage.setItem(expensesKey, JSON.stringify(loadedExpenses));
      }

      const sortedPayments = [...loadedPayments].sort((a,b) => b.date.localeCompare(a.date));
      const sortedExpenses = [...loadedExpenses].sort((a,b) => b.date.localeCompare(a.date));

      setTenants(loadedTenants);
      setPayments(sortedPayments);
      setExpenses(sortedExpenses);
      setLoadingData(false);

      if (activeUserId) {
        localStorage.setItem(`demo_active_building_id_${activeUserId}`, activeBuilding.id);
      }
      return;
    }

    setLoadingData(true);

    const unsubTenants = subscribeToTenants(
      activeBuilding.id,
      (list) => {
        setTenants(list);
        setLoadingData(false);
      },
      (err) => {
        console.error(err);
        setLoadingData(false);
      }
    );

    const unsubPayments = subscribeToPayments(
      activeBuilding.id,
      (list) => {
        // Sort payments by date descending
        const sorted = [...list].sort((a,b) => b.date.localeCompare(a.date));
        setPayments(sorted);
      },
      (err) => console.error(err)
    );

    const unsubExpenses = subscribeToExpenses(
      activeBuilding.id,
      (list) => {
        const sorted = [...list].sort((a,b) => b.date.localeCompare(a.date));
        setExpenses(sorted);
      },
      (err) => console.error(err)
    );

    if (activeUserId) {
      localStorage.setItem(`active_building_id_${activeUserId}`, activeBuilding.id);
    }

    return () => {
      unsubTenants();
      unsubPayments();
      unsubExpenses();
    };
  }, [activeBuilding, activeUserId, isDemoMode, triggerRefresh]);

  // Google Authentication Trigger
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign In failed:', error);
      
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      if (errorCode === 'auth/unauthorized-domain') {
        showGlobalToast("Unauthorized Domain! Add 'prop.bventures.me' to Authorized Domains in your Firebase Console (Authentication -> Settings).", 'error');
      } else if (errorCode === 'auth/popup-closed-by-user') {
        showGlobalToast('Sign in popup was closed. Please try again.', 'info');
      } else {
        showGlobalToast(`Sign in failed (${errorCode || 'Error'}): ${errorMessage || 'Unknown error'}. Check developer console.`, 'error');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Sandbox Demo Passcode Trigger
  const handleDemoSignIn = async () => {
    setIsDemoMode(true);
    const mockUid = 'demo-owner-123';
    const mockUser = {
      uid: mockUid,
      displayName: 'Marcus Aurelius (Demo)',
      email: 'demo.manager@propmanage.com',
    };
    setDemoUser(mockUser);
    setAuthLoading(true);
    await refreshBuildingsList(mockUid);
    setAuthLoading(false);
  };

  // SuperAdmin Secure Password Authentication
  const handleSuperAdminPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredEmail = adminEmailInput.trim().toLowerCase();
    if (enteredEmail !== 'hisham@bosstsc.com' && enteredEmail !== 'hisham.balatiah@gmail.com') {
      showGlobalToast('Invalid SuperAdmin email! Access Denied.', 'error');
      return;
    }
    
    const correctPassword = (import.meta as any).env.VITE_SUPERADMIN_PASSWORD || 'bosstsc2026';
    if (adminPasswordInput === correctPassword) {
      setIsDemoMode(false);
      setDemoUser(null);
      const mockAdmin: User = {
        uid: 'superadmin-hisham',
        email: enteredEmail,
        displayName: enteredEmail === 'hisham.balatiah@gmail.com' ? 'Hisham (DevAdmin)' : 'Hisham (SuperAdmin)',
        emailVerified: true,
      } as any;
      setCurrentUser(mockAdmin);
      showGlobalToast('🔑 Logged in successfully as SuperAdmin!', 'success');
      
      // Register or update profile in users database
      await registerUser({
        uid: 'superadmin-hisham',
        email: enteredEmail,
        displayName: enteredEmail === 'hisham.balatiah@gmail.com' ? 'Hisham (DevAdmin)' : 'Hisham (SuperAdmin)',
        photoURL: ''
      });
      
      await refreshBuildingsList('superadmin-hisham');
    } else {
      showGlobalToast('Incorrect SuperAdmin password! Access Denied.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      if (isDemoMode) {
        setIsDemoMode(false);
        setDemoUser(null);
        setBuildings([]);
        setActiveBuilding(null);
      } else if (currentUser?.uid === 'superadmin-hisham') {
        setCurrentUser(null);
        setImpersonatedUser(null);
        setBuildings([]);
        setActiveBuilding(null);
        showGlobalToast('Admin session ended. Signed out.', 'info');
      } else {
        setImpersonatedUser(null);
        await signOut(auth);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Add a new building/property
  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim() || !activeUserId) return;

    setCreatingBuilding(true);
    try {
      if (isDemoMode) {
        const localBuildingsRaw = localStorage.getItem(`demo_buildings_${activeUserId}`);
        let localBuildings = localBuildingsRaw ? JSON.parse(localBuildingsRaw) : [];
        const newId = `demo-b-${Date.now()}`;
        const newB = {
          id: newId,
          name: newBuildingName,
          address: newBuildingAddress,
          ownerId: activeUserId,
          createdAt: new Date().toISOString()
        };
        localBuildings.push(newB);
        localStorage.setItem(`demo_buildings_${activeUserId}`, JSON.stringify(localBuildings));

        if (seedDemoData) {
          localStorage.setItem(`demo_tenants_${newId}`, JSON.stringify(INITIAL_TENANTS));
          localStorage.setItem(`demo_payments_${newId}`, JSON.stringify(INITIAL_PAYMENTS));
          localStorage.setItem(`demo_expenses_${newId}`, JSON.stringify(INITIAL_EXPENSES));
        } else {
          localStorage.setItem(`demo_tenants_${newId}`, JSON.stringify([]));
          localStorage.setItem(`demo_payments_${newId}`, JSON.stringify([]));
          localStorage.setItem(`demo_expenses_${newId}`, JSON.stringify([]));
        }

        await refreshBuildingsList(activeUserId, newId);
        setIsNewBuildingModalOpen(false);
        setNewBuildingName('');
        setNewBuildingAddress('');
        return;
      }

      // 1. Create building record
      const addedBuilding = await createBuilding({
        name: newBuildingName,
        address: newBuildingAddress,
        ownerId: activeUserId,
      });

      // 2. Optional pre-seed sandbox/tour records
      if (seedDemoData) {
        // Tenants
        for (const tenant of INITIAL_TENANTS) {
          const originalId = tenant.id;
          const saved = await saveTenant(addedBuilding.id, {
            name: tenant.name,
            unit: tenant.unit,
            monthlyRent: tenant.monthlyRent,
            rentDueDateDay: tenant.rentDueDateDay,
            startDate: tenant.startDate,
            endDate: tenant.endDate,
            phone: tenant.phone,
            email: tenant.email,
            status: tenant.status,
          });

          // Map payments to the newly generated tenant ID
          const associatedPayments = INITIAL_PAYMENTS.filter(p => p.tenantId === originalId);
          for (const payment of associatedPayments) {
            await savePayment(addedBuilding.id, {
              tenantId: saved.id,
              tenantName: saved.name,
              unit: saved.unit,
              amount: payment.amount,
              date: payment.date,
              monthPaidFor: payment.monthPaidFor,
              method: payment.method,
              status: payment.status,
              notes: payment.notes || '',
              receiptNumber: payment.receiptNumber,
            });
          }
        }

        // Expenses
        for (const expense of INITIAL_EXPENSES) {
          await saveExpense(addedBuilding.id, {
            title: expense.title,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            notes: expense.notes || '',
            attachmentName: expense.attachmentName || '',
            attachmentUrl: expense.attachmentUrl || '',
          });
        }
      }

      // Re-fetch everything and auto-select new building
      await refreshBuildingsList(activeUserId, addedBuilding.id);
      
      // Save audit log
      await logAction(
        addedBuilding.id,
        activeUserId,
        activeUserEmail || '',
        'CREATE_BUILDING',
        `Property building "${addedBuilding.name}" was successfully created.` + (seedDemoData ? ' Pre-seeded with sandbox records.' : ''),
        addedBuilding.id,
        'building'
      );

      setIsNewBuildingModalOpen(false);
      setNewBuildingName('');
      setNewBuildingAddress('');
    } catch (e) {
      console.error('Failed to create building:', e);
    } finally {
      setCreatingBuilding(false);
    }
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!activeUserId) return;
    if (isDemoMode) {
      const localBuildingsRaw = localStorage.getItem(`demo_buildings_${activeUserId}`);
      if (localBuildingsRaw) {
        const localBuildings: BuildingType[] = JSON.parse(localBuildingsRaw);
        const filtered = localBuildings.filter((b) => b.id !== buildingId);
        localStorage.setItem(`demo_buildings_${activeUserId}`, JSON.stringify(filtered));
      }
      localStorage.removeItem(`demo_tenants_${buildingId}`);
      localStorage.removeItem(`demo_payments_${buildingId}`);
      localStorage.removeItem(`demo_expenses_${buildingId}`);
      await refreshBuildingsList(activeUserId);
      return;
    }

    // Save audit log before deletion so record is captured
    await logAction(
      buildingId,
      activeUserId,
      activeUserEmail || '',
      'DELETE_BUILDING',
      `Property building ID "${buildingId}" was requested to be deleted.`,
      buildingId,
      'building'
    );

    await removeBuilding(buildingId);
    await refreshBuildingsList(activeUserId);
  };

  // --- TENANTS METHODS ---
  const handleAddTenant = async (newTenant: Omit<Tenant, 'id'>) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const newId = `demo-t-${Date.now()}`;
      const finalTenant: Tenant = { ...newTenant, id: newId };
      const updatedTenants = [...tenants, finalTenant];
      setTenants(updatedTenants);
      localStorage.setItem(`demo_tenants_${activeBuilding.id}`, JSON.stringify(updatedTenants));

      if (newTenant.status === 'active') {
        const pendingPayment: Payment = {
          id: `demo-p-${Date.now()}`,
          tenantId: finalTenant.id,
          tenantName: finalTenant.name,
          unit: finalTenant.unit,
          amount: finalTenant.monthlyRent,
          date: '',
          monthPaidFor: '2026-06',
          method: 'Bank Transfer' as const,
          status: 'Pending' as const,
          receiptNumber: `REC-2026-${finalTenant.unit.replace(/\s+/g, '')}-06`,
        };
        const updatedPayments = [pendingPayment, ...payments];
        setPayments(updatedPayments);
        localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      }
      return;
    }

    try {
      const added = await saveTenant(activeBuilding.id, newTenant);
      
      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'CREATE_TENANT',
        `Tenant "${added.name}" added to Unit "${added.unit}" with rent ${added.monthlyRent} ${activeBuilding.currency || 'JOD'}.`,
        added.id,
        'tenant'
      );

      if (newTenant.status === 'active') {
        const pendingPayment = {
          tenantId: added.id,
          tenantName: added.name,
          unit: added.unit,
          amount: added.monthlyRent,
          date: '',
          monthPaidFor: '2026-06',
          method: 'Bank Transfer' as const,
          status: 'Pending' as const,
          receiptNumber: `REC-2026-${added.unit.replace(/\s+/g, '')}-06`,
        };
        await savePayment(activeBuilding.id, pendingPayment);
        
        await logAction(
          activeBuilding.id,
          activeUserId || '',
          activeUserEmail || '',
          'CREATE_PAYMENT',
          `Auto-generated rent cycle pending payment of ${added.monthlyRent} ${activeBuilding.currency || 'JOD'} for "${added.name}" (Unit ${added.unit}, Month: 2026-06).`,
          undefined,
          'payment'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditTenant = async (updatedTenant: Tenant) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedTenants = tenants.map((t) => t.id === updatedTenant.id ? updatedTenant : t);
      setTenants(updatedTenants);
      localStorage.setItem(`demo_tenants_${activeBuilding.id}`, JSON.stringify(updatedTenants));

      const updatedPayments = payments.map((p) => {
        if (p.tenantId === updatedTenant.id) {
          return {
            ...p,
            tenantName: updatedTenant.name,
            unit: updatedTenant.unit,
            amount: p.status === 'Pending' || p.status === 'Overdue' ? updatedTenant.monthlyRent : p.amount,
          };
        }
        return p;
      });
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      await saveTenant(activeBuilding.id, updatedTenant);
      
      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'UPDATE_TENANT',
        `Tenant "${updatedTenant.name}" (Unit "${updatedTenant.unit}") profile/leasing details updated.`,
        updatedTenant.id,
        'tenant'
      );

      // Update matching payment metadata if name/unit changes
      const updatedPayments = payments.map((p) => {
        if (p.tenantId === updatedTenant.id) {
          const updatedPRef = {
            ...p,
            tenantName: updatedTenant.name,
            unit: updatedTenant.unit,
            amount: p.status === 'Pending' || p.status === 'Overdue' ? updatedTenant.monthlyRent : p.amount,
          };
          savePayment(activeBuilding!.id, updatedPRef);
          return updatedPRef;
        }
        return p;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedTenants = tenants.filter((t) => t.id !== id);
      setTenants(updatedTenants);
      localStorage.setItem(`demo_tenants_${activeBuilding.id}`, JSON.stringify(updatedTenants));

      const updatedPayments = payments.filter((p) => p.tenantId !== id);
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      const tenantToDel = tenants.find(t => t.id === id);
      const tenantName = tenantToDel ? tenantToDel.name : id;
      const tenantUnit = tenantToDel ? tenantToDel.unit : '';

      await removeTenant(activeBuilding.id, id);
      
      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'DELETE_TENANT',
        `Tenant "${tenantName}" (Unit "${tenantUnit}") was removed. Associated payments deleted.`,
        id,
        'tenant'
      );

      const matched = payments.filter((p) => p.tenantId === id);
      for (const p of matched) {
        await removePayment(activeBuilding.id, p.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- UPDATE BUILDING SETTINGS ---
  const handleUpdateBuildingSettings = async (updatedFields: Partial<BuildingType>) => {
    if (!activeBuilding || !activeUserId) return;
    const newB = { ...activeBuilding, ...updatedFields };
    if (isDemoMode) {
      const localBuildingsRaw = localStorage.getItem(`demo_buildings_${activeUserId}`);
      if (localBuildingsRaw) {
        let localBuildings = JSON.parse(localBuildingsRaw);
        localBuildings = localBuildings.map((b: any) => b.id === activeBuilding.id ? newB : b);
        localStorage.setItem(`demo_buildings_${activeUserId}`, JSON.stringify(localBuildings));
      }
      setBuildings(prev => prev.map(b => b.id === activeBuilding.id ? newB : b));
      setActiveBuilding(newB);
      return;
    }
    try {
      await logAction(
        activeBuilding.id,
        activeUserId,
        activeUserEmail || '',
        'UPDATE_BUILDING_SETTINGS',
        `Building configuration updated: ${Object.keys(updatedFields).join(', ')}.`,
        activeBuilding.id,
        'building',
        { fields: updatedFields }
      );

      await saveBuilding(newB);
      setBuildings(prev => prev.map(b => b.id === activeBuilding.id ? newB : b));
      setActiveBuilding(newB);
    } catch (error) {
      console.error('Failed to update building settings:', error);
    }
  };

  // --- RESTORE BACKUP SNAPSHOT ---
  const handleRestoreBackup = async (backupData: { tenants: Tenant[], payments: Payment[], expenses: Expense[] }) => {
    if (!activeBuilding || !activeUserId) return;

    if (isDemoMode) {
      const bId = activeBuilding.id;
      localStorage.setItem(`demo_tenants_${bId}`, JSON.stringify(backupData.tenants));
      localStorage.setItem(`demo_payments_${bId}`, JSON.stringify(backupData.payments));
      localStorage.setItem(`demo_expenses_${bId}`, JSON.stringify(backupData.expenses));

      setTenants(backupData.tenants);
      setPayments(backupData.payments);
      setExpenses(backupData.expenses);
      showGlobalToast('Backup restored successfully to local demo session!', 'success');
      return;
    }

    try {
      showGlobalToast('Syncing backup database records to Cloud...', 'info');

      // 1. Log Action
      await logAction(
        activeBuilding.id,
        activeUserId,
        activeUserEmail || '',
        'RESTORE_BACKUP',
        `Restored property workspace containing ${backupData.tenants.length} tenants, ${backupData.payments.length} payments, and ${backupData.expenses.length} expenses.`,
        activeBuilding.id,
        'building'
      );

      // 2. Iterate and write records using cloud APIs.
      for (const tenant of backupData.tenants) {
        await saveTenant(activeBuilding.id, {
          name: tenant.name,
          unit: tenant.unit,
          monthlyRent: tenant.monthlyRent,
          rentDueDateDay: tenant.rentDueDateDay,
          startDate: tenant.startDate,
          endDate: tenant.endDate,
          phone: tenant.phone || '',
          email: tenant.email || '',
          status: tenant.status,
        });
      }

      for (const payment of backupData.payments) {
        await savePayment(activeBuilding.id, {
          tenantId: payment.tenantId,
          tenantName: payment.tenantName,
          unit: payment.unit,
          amount: payment.amount,
          date: payment.date,
          monthPaidFor: payment.monthPaidFor,
          method: payment.method,
          status: payment.status,
          notes: payment.notes || '',
          receiptNumber: payment.receiptNumber || '',
        });
      }

      for (const expense of backupData.expenses) {
        await saveExpense(activeBuilding.id, {
          title: expense.title,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          notes: expense.notes || '',
          attachmentName: expense.attachmentName || '',
          attachmentUrl: expense.attachmentUrl || '',
        });
      }

      setTriggerRefresh(prev => prev + 1);
      showGlobalToast('Restored backup completely into Firestore collection!', 'success');
    } catch (err) {
      console.error('Core dump recovery failed:', err);
      showGlobalToast('Disaster Recovery write failed. Verify cloud permission limits.', 'error');
    }
  };

  // --- PAYMENTS METHODS ---
  const handleEditPayment = async (updatedPayment: Payment) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedPayments = payments.map((p) => p.id === updatedPayment.id ? updatedPayment : p);
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'UPDATE_PAYMENT',
        `Rent payment record updated for "${updatedPayment.tenantName}" (Unit "${updatedPayment.unit}") for Month ${updatedPayment.monthPaidFor} of ${updatedPayment.amount} ${activeBuilding.currency || 'JOD'}.`,
        updatedPayment.id,
        'payment',
        { payment: updatedPayment }
      );

      await savePayment(activeBuilding.id, updatedPayment);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (newPaymentArgs: Omit<Payment, 'id' | 'receiptNumber'>) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const receiptCode = `REC-${newPaymentArgs.monthPaidFor.replace('-', '')}-${newPaymentArgs.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const payload: Payment = {
        ...newPaymentArgs,
        id: `demo-p-${Date.now()}`,
        receiptNumber: receiptCode,
      };
      const updatedPayments = [payload, ...payments];
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      const receiptCode = `REC-${newPaymentArgs.monthPaidFor.replace('-', '')}-${newPaymentArgs.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const payload = {
        ...newPaymentArgs,
        receiptNumber: receiptCode,
      };
      await savePayment(activeBuilding.id, payload);

      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'CREATE_PAYMENT',
        `Rent payment manually logged for "${newPaymentArgs.tenantName}" (Unit "${newPaymentArgs.unit}") for Month ${newPaymentArgs.monthPaidFor} of amount ${newPaymentArgs.amount} ${activeBuilding.currency || 'JOD'}.`,
        undefined,
        'payment'
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePaymentStatus = async (id: string, status: Payment['status'], datePaid?: string) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedPayments = payments.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            status,
            date: datePaid || p.date,
          };
        }
        return p;
      });
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      const p = payments.find((x) => x.id === id);
      if (p) {
        const updated = {
          ...p,
          status,
          date: datePaid || p.date,
        };
        await savePayment(activeBuilding.id, updated);

        await logAction(
          activeBuilding.id,
          activeUserId || '',
          activeUserEmail || '',
          'UPDATE_PAYMENT',
          `Payment status marked as "${status}" for "${p.tenantName}" (Unit "${p.unit}", Month ${p.monthPaidFor}).`,
          id,
          'payment'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedPayments = payments.filter((p) => p.id !== id);
      setPayments(updatedPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(updatedPayments));
      return;
    }

    try {
      const p = payments.find((x) => x.id === id);
      await removePayment(activeBuilding.id, id);

      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'DELETE_PAYMENT',
        `Payment record of ${p ? p.amount : ''} for "${p ? p.tenantName : ''}" (Month ${p ? p.monthPaidFor : ''}) was deleted.`,
        id,
        'payment'
      );
    } catch (e) {
      console.error(e);
    }
  };

  // --- AUTOMATED AUTOPILOT SYNCHRONIZER ENGINE ---
  const handleAutopilotSync = async (
    paymentsToCreate: Omit<Payment, 'id'>[],
    paymentsToUpdate: { id: string; status: Payment['status'] }[]
  ) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      let currentPayments = [...payments];

      // 1. Process status updates
      currentPayments = currentPayments.map(p => {
        const update = paymentsToUpdate.find(u => u.id === p.id);
        if (update) {
          return { ...p, status: update.status };
        }
        return p;
      });

      // 2. Process new bill postings
      const created: Payment[] = paymentsToCreate.map((newP, idx) => ({
        ...newP,
        id: `demo-p-auto-${Date.now()}-${idx}`,
      }));

      const finalPayments = [...created, ...currentPayments];
      setPayments(finalPayments);
      localStorage.setItem(`demo_payments_${activeBuilding.id}`, JSON.stringify(finalPayments));
      showGlobalToast(`Autopilot pipeline: Posted ${created.length} new bill cycles, updated ${paymentsToUpdate.length} accounts to Overdue!`, 'success');
      return;
    }

    try {
      showGlobalToast('Autopilot pipeline: executing Cloud transactions...', 'info');

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Process updates
      for (const update of paymentsToUpdate) {
        const p = payments.find(x => x.id === update.id);
        if (p) {
          const updated = { ...p, status: update.status };
          await delay(600);
          await savePayment(activeBuilding.id, updated);
          await delay(400);
          await logAction(
            activeBuilding.id,
            activeUserId || '',
            activeUserEmail || '',
            'UPDATE_PAYMENT',
            `Autopilot promoted status to "${update.status}" (overdue) for occupant "${p.tenantName}" (Unit "${p.unit}").`,
            p.id,
            'payment'
          );
        }
      }

      // Process creations
      for (const newP of paymentsToCreate) {
        await delay(600);
        await savePayment(activeBuilding.id, newP);
        await delay(400);
        await logAction(
          activeBuilding.id,
          activeUserId || '',
          activeUserEmail || '',
          'CREATE_PAYMENT',
          `Autopilot auto-generated pending/overdue cycle posting of amount ${newP.amount} ${activeBuilding.currency || 'JOD'} for occupant "${newP.tenantName}" (Unit "${newP.unit}", Month 2026-06).`,
          undefined,
          'payment'
        );
      }

      setTriggerRefresh(prev => prev + 1);
      showGlobalToast(`Autopilot Sync complete! Posted ${paymentsToCreate.length} billing cycles, promoted ${paymentsToUpdate.length} to Overdue.`, 'success');
    } catch (err: any) {
      console.error('Autopilot write transaction failed:', err);
      showGlobalToast('Autopilot pipeline encountered write limits or permission blocks.', 'error');
    }
  };

  // --- EXPENSES METHODS ---
  const handleEditExpense = async (updatedExpense: Expense) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedExpenses = expenses.map((e) => e.id === updatedExpense.id ? updatedExpense : e);
      setExpenses(updatedExpenses);
      localStorage.setItem(`demo_expenses_${activeBuilding.id}`, JSON.stringify(updatedExpenses));
      return;
    }

    try {
      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'UPDATE_EXPENSE',
        `Maintenance expense record updated: "${updatedExpense.title}" (Amount: ${updatedExpense.amount} ${activeBuilding.currency || 'JOD'}, Category: "${updatedExpense.category}").`,
        updatedExpense.id,
        'expense'
      );

      await saveExpense(activeBuilding.id, updatedExpense);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddExpense = async (newExpenseArgs: Omit<Expense, 'id'>) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const newExp: Expense = {
        ...newExpenseArgs,
        id: `demo-e-${Date.now()}`,
      };
      const updatedExpenses = [newExp, ...expenses];
      setExpenses(updatedExpenses);
      localStorage.setItem(`demo_expenses_${activeBuilding.id}`, JSON.stringify(updatedExpenses));
      return;
    }

    try {
      await saveExpense(activeBuilding.id, newExpenseArgs);

      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'CREATE_EXPENSE',
        `New expense logged: "${newExpenseArgs.title}" (Amount: ${newExpenseArgs.amount} ${activeBuilding.currency || 'JOD'}, Category: "${newExpenseArgs.category}").`,
        undefined,
        'expense'
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!activeBuilding) return;

    if (isDemoMode) {
      const updatedExpenses = expenses.filter((e) => e.id !== id);
      setExpenses(updatedExpenses);
      localStorage.setItem(`demo_expenses_${activeBuilding.id}`, JSON.stringify(updatedExpenses));
      return;
    }

    try {
      const exp = expenses.find((x) => x.id === id);
      await removeExpense(activeBuilding.id, id);

      await logAction(
        activeBuilding.id,
        activeUserId || '',
        activeUserEmail || '',
        'DELETE_EXPENSE',
        `Expense logged for "${exp ? exp.title : ''}" of amount ${exp ? exp.amount : ''} ${activeBuilding.currency || 'JOD'} was deleted.`,
        id,
        'expense'
      );
    } catch (e) {
      console.error(e);
    }
  };

  // RENDER LOADING SCREEN
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs font-bold font-mono tracking-widest text-slate-400">LOADING PROPMANAGE WORKSPACE...</span>
        </div>
      </div>
    );
  }

  // RENDER SECURITY SIGN-IN PAGE
  if (!activeUserId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">bP</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">bProp</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Real-time property portal to track rent payouts, tenant ledger, and building outflow expenses.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-4.5 px-6 rounded-2xl shadow-sm transition-all text-center hover:shadow-md cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Sign In with Google Account
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-slate-300 text-[10px] tracking-wider uppercase font-extrabold font-mono">Sandbox Sandbox</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              onClick={handleDemoSignIn}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-4 px-6 rounded-2xl border border-slate-200/60 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Test Drive (Local Demo Mode)
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400 font-medium">
              A secure, installable PWA designed for mobile with offline-first tracking.
            </p>
          </div>

          {/* Collapsible SuperAdmin Password entryway */}
          <div className="border-t border-slate-100/80 pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsAdminFormVisible(!isAdminFormVisible)}
              className="text-slate-400 hover:text-slate-600 transition-colors text-[10px] font-extrabold tracking-wider uppercase font-mono inline-flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3 h-3 text-slate-400" />
              {isAdminFormVisible ? 'Hide Admin access' : 'SuperAdmin Entrance'}
            </button>

            {isAdminFormVisible && (
              <form onSubmit={handleSuperAdminPasswordSignIn} className="mt-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-left space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">SuperAdmin Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="hisham@bosstsc.com"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Secret Passcode</label>
                  <input
                    type="password"
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center uppercase tracking-wider font-mono"
                >
                  Verify Access
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER PROPERTY MANAGEMENT ONBOARDING (IF REGISTERS ZERO BUILDINGS)
  if (buildings.length === 0 && !(isSuperAdminSession && !impersonatedUser)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <form onSubmit={handleCreateBuilding} className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">🏢</div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">No properties initialized yet</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Welcome, <span className="font-bold text-slate-600">{activeUserName}</span>! Let's register your first real estate building property.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Building Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Grandview Heights Apartments"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Street Address</label>
              <input
                type="text"
                placeholder="e.g., 401 Grandview Ave, CA"
                value={newBuildingAddress}
                onChange={(e) => setNewBuildingAddress(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-50">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedDemoData}
                  onChange={(e) => setSeedDemoData(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-700 block">Pre-populate property tour data</span>
                  <span className="text-[10px] text-slate-400 block font-normal leading-normal mt-0.5">
                    Recommended. Automatically adds active tenant profiles, expenses, and pending rent ledger logs so your dashboard feels immediately alive.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 px-4 rounded-xl transition-colors text-center"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={creatingBuilding}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
            >
              {creatingBuilding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Register Property
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // MAIN SECURE DASHBOARD FRAME
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden" id="application-container">
      {impersonatedUser && (
        <div className="bg-red-600 text-white text-[11px] font-black tracking-wide py-2 px-4 shadow-md flex items-center justify-between shrink-0 select-none animate-in fade-in-50 slide-in-from-top-1 duration-200" id="impersonation-support-ribbon">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>⚠️ ACTIVE SUPPORT SESSION: WORKING UNDER OWNER CLIENT CONTEXT ({impersonatedUser.email})</span>
          </div>
          <button
            onClick={() => {
              setImpersonatedUser(null);
              showGlobalToast('Diagnostic support tunnel ended.', 'success');
            }}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-red-600 text-[9px] font-extrabold uppercase rounded transition-colors tracking-widest cursor-pointer"
          >
            End and Return
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col shrink-0" id="desktop-sidebar">
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          
          {/* Building Selector Dropdown or SuperAdmin System Control Header */}
          {isSuperAdminSession && !impersonatedUser ? (
            <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800">
              <span className="text-[9px] font-mono font-extrabold text-red-400 block tracking-widest uppercase">SYSTEM CONTROL CORE</span>
              <span className="text-sm font-black block mt-1 tracking-tight">Master Console</span>
            </div>
          ) : (
            <div className="relative mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBuildingMenuOpen(!isBuildingMenuOpen)}
                  className="flex-1 flex items-center justify-between gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all text-left min-w-0"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">SELECTED PROPERTY</span>
                    <span className="text-xs font-bold text-slate-800 block truncate">{activeBuilding?.name}</span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
                <button
                  onClick={() => setIsPropertySettingsOpen(true)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/80 rounded-xl p-3 shrink-0 flex items-center justify-center transition-colors font-semibold"
                  title="Property Configurations & Lists"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {isBuildingMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden divide-y divide-slate-50">
                  <div className="max-h-48 overflow-y-auto">
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBuilding(b);
                          setIsBuildingMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors truncate block ${
                          b.id === activeBuilding?.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 bg-slate-50">
                    <button
                      onClick={() => {
                        setIsBuildingMenuOpen(false);
                        setIsNewBuildingModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Property
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <nav className="space-y-1 flex-1">
            {!(isSuperAdminSession && !impersonatedUser) && (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('tenants')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'tenants'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  id="tab-btn-tenants"
                >
                  <Users className="w-4 h-4" />
                  Units & Beneficiaries
                </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="tab-btn-payments"
            >
              <CreditCard className="w-4 h-4" />
              Income Collections
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="tab-btn-expenses"
            >
              <DollarSign className="w-4 h-4" />
              Expense Ledger
            </button>

            <button
              onClick={() => setActiveTab('reminders')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'reminders'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="tab-btn-reminders"
            >
              <FileText className="w-4 h-4" />
              Statements & Alerts
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="tab-btn-audit"
            >
              <Shield className="w-4 h-4" />
              Security Audit Trail
            </button>
              </>
            )}

            {isSuperAdminSession && (
              <>
                <button
                  onClick={() => setActiveTab('superadmin_analytics')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'superadmin_analytics'
                      ? 'bg-red-50 text-red-700 font-bold border-l-2 border-red-600 pl-[14px]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  id="tab-btn-superadmin-analytics"
                >
                  <Activity className="w-4 h-4 text-red-600" />
                  Global Platform Analytics
                </button>

                <button
                  onClick={() => setActiveTab('superadmin_directory')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'superadmin_directory'
                      ? 'bg-red-50 text-red-700 font-bold border-l-2 border-red-600 pl-[14px]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  id="tab-btn-superadmin-directory"
                >
                  <Shield className="w-4 h-4 text-red-600" />
                  SuperAdmin Directory
                </button>
              </>
            )}
          </nav>

          {/* PWA Promotion Card / Installed Badge */}
          {isInstallable && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl space-y-3 shrink-0" id="pwa-install-sidebar-card">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-extrabold text-blue-900 tracking-tight">Run as Native App</h4>
                  <p className="text-[9px] font-medium text-blue-600 leading-snug mt-0.5">Launches from deck with high speed, offline cache & native overlays.</p>
                </div>
              </div>
              <button
                onClick={handleInstallPWA}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                Install Local App
              </button>
            </div>
          )}

          {isAppInstalled && (
            <div className="mt-4 px-3 py-2 bg-emerald-50/40 border border-emerald-100/60 rounded-xl shrink-0 flex items-center gap-2" id="pwa-installed-sidebar-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-[9px] font-bold text-emerald-800 tracking-wider uppercase font-mono">PWA App Active</span>
            </div>
          )}

          {/* Connected Profile Details */}
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold uppercase shrink-0 text-xs">
                  {activeUserName?.substring(0, 2) || 'MA'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate" title={activeUserName || 'Marcus Aurelius'}>{activeUserName || 'Property Owner'}</span>
                  <span className="text-[9px] font-medium text-slate-400 truncate">{activeUserEmail}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer shrink-0"
                title="Disconnect Account / Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
            
            {/* Mobile Property Switcher */}
            <div className="flex items-center gap-2 md:hidden min-w-0 w-full justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <button
                    onClick={() => setIsBuildingMenuOpen(!isBuildingMenuOpen)}
                    className="flex items-center gap-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-extrabold text-slate-700 border border-slate-200/80 leading-none max-w-[140px]"
                  >
                    <Home className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{activeBuilding?.name}</span>
                    <ChevronsUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {isBuildingMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden divide-y divide-slate-50 w-52">
                      <div className="max-h-48 overflow-y-auto">
                        {buildings.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setActiveBuilding(b);
                              setIsBuildingMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors truncate block ${
                              b.id === activeBuilding?.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 bg-slate-50">
                        <button
                          onClick={() => {
                            setIsBuildingMenuOpen(false);
                            setIsNewBuildingModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Property
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsPropertySettingsOpen(true)}
                  className="bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-500 p-2 rounded-lg leading-none shrink-0"
                  title="Configure Property & Lists"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* PWA Mobile quick action */}
              {isInstallable && (
                <button
                  onClick={handleInstallPWA}
                  className="bg-blue-600 border border-blue-500 text-white px-2 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 text-[10px] font-extrabold cursor-pointer hover:bg-blue-700 transition-colors animate-pulse"
                  title="Install Mobile App"
                >
                  <Smartphone className="w-3.5 h-3.5 animate-bounce" />
                  Install App
                </button>
              )}

              {/* Quick LogOut for mobile */}
              <button
                onClick={handleSignOut}
                className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <h1 className="text-lg font-bold text-slate-800 hidden md:block">
              {activeTab === 'overview' && `${activeBuilding?.name || 'Dashboard'} Overview`}
              {activeTab === 'tenants' && 'Units & Beneficiaries Registry'}
              {activeTab === 'payments' && 'Income Collections Ledger'}
              {activeTab === 'expenses' && 'Building Outflow Expenses'}
              {activeTab === 'reminders' && 'Statements & Alerts'}
              {activeTab === 'audit' && 'System Audit Trail Ledger'}
              {activeTab === 'superadmin_analytics' && '📈 Global Platform Analytics'}
              {activeTab === 'superadmin_directory' && '🛡️ System SuperAdmin Customer Directory'}
              {activeTab === 'superadmin' && '🛡️ System SuperAdmin Customer Directory'}
            </h1>
          </div>
          
          <div className="hidden md:flex gap-2">
            {activeTab === 'overview' && (
              <>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded transition-colors font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import CSV Ledger
                </button>
                <button 
                  onClick={() => setActiveTab('reminders')}
                  className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded bg-white hover:bg-slate-50 transition-colors font-semibold"
                >
                  Export Statement
                </button>
              </>
            )}
            {activeTab === 'payments' && (
              <button 
                onClick={() => setActiveTab('reminders')}
                className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded bg-white hover:bg-slate-50 transition-colors font-semibold"
              >
                Send Reminders
              </button>
            )}
            {isSuperAdminSession && (activeTab === 'superadmin' || activeTab === 'superadmin_analytics' || activeTab === 'superadmin_directory') && (
              <button
                onClick={loadSuperAdminDashboard}
                disabled={superAdminLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition-colors text-xs font-bold font-mono text-slate-200 rounded-lg flex items-center gap-2 border border-slate-700 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${superAdminLoading ? 'animate-spin' : ''}`} />
                SYNC ENVIRONMENT
              </button>
            )}
          </div>
        </header>

        {/* Inner Scrollable View Containers */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 pb-24 md:pb-8">
          {loadingData ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-mono">LOADING PROPERTY DATABASE RECORDS...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <DashboardOverview 
                  tenants={tenants} 
                  payments={payments} 
                  expenses={expenses} 
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onOpenImportModal={() => setIsImportModalOpen(true)}
                  activeBuilding={activeBuilding}
                />
              )}

              {activeTab === 'tenants' && (
                <TenantList 
                  tenants={tenants} 
                  onAddTenant={handleAddTenant} 
                  onEditTenant={handleEditTenant} 
                  onDeleteTenant={handleDeleteTenant}
                  activeBuilding={activeBuilding}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentHistory 
                  payments={payments} 
                  tenants={tenants} 
                  onAddPayment={handleAddPayment} 
                  onEditPayment={handleEditPayment}
                  onUpdatePaymentStatus={handleUpdatePaymentStatus} 
                  onDeletePayment={handleDeletePayment}
                  customPaymentMethods={activeBuilding?.customPaymentMethods || DEFAULT_PAYMENT_METHODS}
                  customIncomeCategories={activeBuilding?.customIncomeCategories || DEFAULT_INCOME_CATEGORIES}
                  activeBuilding={activeBuilding}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpenseTracker 
                  expenses={expenses} 
                  onAddExpense={handleAddExpense} 
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                  customExpenseCategories={activeBuilding?.customExpenseCategories || DEFAULT_EXPENSE_CATEGORIES}
                  activeBuilding={activeBuilding}
                />
              )}

              {activeTab === 'reminders' && (
                <StatementsGenerator 
                  tenants={tenants} 
                  payments={payments} 
                  expenses={expenses} 
                  building={activeBuilding}
                  onUpdateBuildingSettings={handleUpdateBuildingSettings}
                  onAutopilotSync={handleAutopilotSync}
                />
              )}

              {activeTab === 'audit' && (
                <AuditTrail 
                  activeBuilding={activeBuilding}
                  isDemoMode={isDemoMode}
                />
              )}

              {(activeTab === 'superadmin' || activeTab === 'superadmin_analytics' || activeTab === 'superadmin_directory') && isSuperAdminSession && (
                <SuperAdminPanel
                  customers={allCustomers}
                  buildings={allBuildings}
                  tenants={allTenants}
                  payments={allPayments}
                  expenses={allExpenses}
                  loading={superAdminLoading}
                  impersonatedUser={impersonatedUser}
                  activeSubTab={activeTab === 'superadmin_directory' ? 'directory' : 'analytics'}
                  onChangeSubTab={(tab) => setActiveTab(tab === 'directory' ? 'superadmin_directory' : 'superadmin_analytics')}
                  onImpersonate={(user) => {
                    setImpersonatedUser(user);
                    setActiveTab('overview');
                    showGlobalToast(`⚠️ Impersonation mode active: Viewing as owner ${user.email}`, 'warning');
                  }}
                  onEndImpersonation={() => {
                    setImpersonatedUser(null);
                    showGlobalToast('Impersonation mode ended. Back to Admin area.', 'success');
                  }}
                  onRefresh={loadSuperAdminDashboard}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>

      {/* Mobile Footer Tab Bar */}
      {!(isSuperAdminSession && !impersonatedUser) ? (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 grid ${isSuperAdminSession ? 'grid-cols-6' : 'grid-cols-5'} p-2 z-40 text-center text-[9px] font-bold text-slate-500`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'overview' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'tenants' ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}
          >
            <Users className="w-4 h-4" />
            Units
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'payments' ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}
          >
            <CreditCard className="w-4 h-4" />
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'expenses' ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}
          >
            <DollarSign className="w-4 h-4" />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'reminders' ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}
          >
            <FileText className="w-4 h-4" />
            Alerts
          </button>
          {isSuperAdminSession && (
            <button
              onClick={() => setActiveTab('superadmin_analytics')}
              className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${(activeTab === 'superadmin' || activeTab === 'superadmin_analytics' || activeTab === 'superadmin_directory') ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}
            >
              <Shield className="w-4 h-4 text-red-500" />
              Admin
            </button>
          )}
        </div>
      ) : (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 grid grid-cols-2 p-2 z-40 text-center text-[9px] font-bold text-slate-500">
          <button
            onClick={() => setActiveTab('superadmin_analytics')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'superadmin_analytics' ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}
          >
            <Activity className="w-5 h-5 text-red-500" />
            Global Analytics
          </button>
          <button
            onClick={() => setActiveTab('superadmin_directory')}
            className={`flex flex-col items-center gap-1 py-1 cursor-pointer select-none ${activeTab === 'superadmin_directory' ? 'text-red-650 font-extrabold' : 'text-slate-400'}`}
          >
            <Shield className="w-5 h-5 text-red-500" />
            SuperAdmin Registry
          </button>
        </div>
      )}

      {/* POPUP MODAL: Add New Property Building */}
      {isNewBuildingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateBuilding} className="bg-white rounded-2xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 text-lg mb-2">Initialize Property</h3>
            <p className="text-xs text-slate-400 mb-4">Add and manage an additional real estate asset or building portfolio.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Property Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Summit Hill Court"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Property Address</label>
                <input
                  type="text"
                  placeholder="e.g., 704 Summit Dr, Seattle WA"
                  value={newBuildingAddress}
                  onChange={(e) => setNewBuildingAddress(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedDemoData}
                    onChange={(e) => setSeedDemoData(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Pre-seed starting stats</span>
                    <span className="text-[9px] text-slate-400 block leading-normal mt-0.5">Loads demo active profiles to start evaluating features.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewBuildingModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBuilding}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                {creatingBuilding ? 'Initializing...' : 'Add Property'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Property settings overlay overlay popup */}
      {isPropertySettingsOpen && activeBuilding && (
        <PropertySettingsModal
          isOpen={isPropertySettingsOpen}
          onClose={() => setIsPropertySettingsOpen(false)}
          building={activeBuilding}
          onUpdateSettings={handleUpdateBuildingSettings}
          tenants={tenants}
          payments={payments}
          expenses={expenses}
          isDemoMode={isDemoMode}
          onRestoreBackup={handleRestoreBackup}
        />
      )}

      {/* CSV ledger direct bulk importer popup */}
      {isImportModalOpen && activeBuilding && (
        <DataImporter
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          activeBuilding={activeBuilding}
          tenants={tenants}
          isDemoMode={isDemoMode}
          onImportComplete={() => setTriggerRefresh(prev => prev + 1)}
        />
      )}

      {/* Property Deletion Confirmation */}
      <ConfirmationDialog
        isOpen={buildingToDeleteId !== null}
        title="Delete Entire Property?"
        message="Are you sure you want to permanently delete this property and all associated tenant profiles, payments, and expense logs? This action is absolutely destructive and cannot be undone."
        confirmLabel="Permanently Delete Property"
        cancelLabel="Discard"
        onConfirm={() => {
          if (buildingToDeleteId) {
            handleDeleteBuilding(buildingToDeleteId);
          }
        }}
        onCancel={() => setBuildingToDeleteId(null)}
      />

      {/* GLOBAL TOAST FLIGHT PANEL */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 p-4 rounded-2xl shadow-xl border select-none max-w-sm font-sans"
            style={{
              backgroundColor:
                globalToast.type === 'success' ? '#ECFDF5' :
                globalToast.type === 'error' ? '#FEF2F2' :
                globalToast.type === 'warning' ? '#FFFBEB' : '#EFF6FF',
              borderColor:
                globalToast.type === 'success' ? '#A7F3D0' :
                globalToast.type === 'error' ? '#FCA5A5' :
                globalToast.type === 'warning' ? '#FDE68A' : '#BFDBFE',
              color:
                globalToast.type === 'success' ? '#065F46' :
                globalToast.type === 'error' ? '#991B1B' :
                globalToast.type === 'warning' ? '#92400E' : '#1E40AF',
            }}
          >
            <span className="font-extrabold text-sm md:text-md">
              {globalToast.type === 'success' && '✅'}
              {globalToast.type === 'error' && '❌'}
              {globalToast.type === 'warning' && '⚠️'}
              {globalToast.type === 'info' && '💡'}
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold leading-normal">{globalToast.message}</p>
            </div>
            <button
              onClick={() => setGlobalToast(null)}
              className="text-[10px] font-extrabold hover:opacity-80 px-1 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
