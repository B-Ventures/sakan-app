import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Building, Tenant, Payment, Expense, AuditLog, UserRecord, SaaSPlan, SaaSAddon, SaASCoupon, StripeConfig, MultiPropertyConfig, LandingPageConfig } from './types';
import { clientRateLimiter } from './utils/rateLimiter';

// satisfaction of Layer 9: Rate limiting validation gate before cloud writes
function enforceRateLimit(actionKey: string = 'cloud_write') {
  const result = clientRateLimiter.attemptAction(actionKey);
  if (!result.allowed) {
    throw new Error(`RATE_LIMIT: Client throttle activated. Please wait ${result.resetSec} seconds before sending more requests.`);
  }
}

// Clean helper to strip any field set to undefined (including inside nested arrays/objects) so Firestore doesn't fail with "Unsupported field value: undefined"
function cleanUndefined<T>(value: T): T {
  if (value === undefined) {
    return undefined as any;
  }
  if (value === null) {
    return null as any;
  }
  if (Array.isArray(value)) {
    return value
      .map(item => cleanUndefined(item))
      .filter(item => item !== undefined) as any;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString() as any;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto && proto !== Object.prototype) {
      return value;
    }
    const clean: any = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        const cleanedVal = cleanUndefined(val);
        if (cleanedVal !== undefined) {
          clean[key] = cleanedVal;
        }
      }
    }
    return clean as any;
  }
  return value;
}

// Deeply sanitize and serialize data retrieved from Firestore to ensure clean serializability
export function sanitizeFirestoreData(val: any): any {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (val.path && typeof val.path === 'string' && val.firestore) {
    return val.path;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeFirestoreData);
  }
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val.toISOString();
    }
    const proto = Object.getPrototypeOf(val);
    if (proto && proto !== Object.prototype) {
      return String(val);
    }
    const sanitized: any = {};
    for (const [k, v] of Object.entries(val)) {
      sanitized[k] = sanitizeFirestoreData(v);
    }
    return sanitized;
  }
  return val;
}

// ==========================================
// Building Operations
// ==========================================

export async function fetchUserBuildings(userId: string): Promise<Building[]> {
  const path = 'buildings';
  try {
    const q = query(collection(db, path), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const buildings: Building[] = [];
    snapshot.forEach((docSnap) => {
      buildings.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as Building);
    });
    return buildings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createBuilding(building: Omit<Building, 'id' | 'createdAt'> & { id?: string }): Promise<Building> {
  const path = 'buildings';
  try {
    enforceRateLimit('building_write');
    const buildingsRef = collection(db, path);
    const newDocRef = building.id ? doc(buildingsRef, building.id) : doc(buildingsRef);
    const id = newDocRef.id;
    const createdAt = new Date().toISOString();
    
    const defaultTrialEnd = new Date();
    defaultTrialEnd.setDate(defaultTrialEnd.getDate() + 30);
    const defaultTrialEndStr = defaultTrialEnd.toISOString().slice(0, 10);

    const newBuilding: Building = {
      subscriptionStatus: 'trial',
      subscriptionPlan: 'none',
      subscriptionStartDate: new Date().toISOString().slice(0, 10),
      subscriptionEndDate: defaultTrialEndStr,
      subscriptionAmountPaid: 0,
      ...building,
      id,
      createdAt,
    };
    await setDoc(newDocRef, cleanUndefined(newBuilding));
    return newBuilding;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveBuilding(building: Building): Promise<Building> {
  const path = `buildings/${building.id}`;
  try {
    enforceRateLimit('building_write');
    await setDoc(doc(db, 'buildings', building.id), cleanUndefined(building), { merge: true });
    return building;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeBuilding(buildingId: string): Promise<void> {
  const path = `buildings/${buildingId}`;
  try {
    enforceRateLimit('building_write');
    await deleteDoc(doc(db, 'buildings', buildingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Tenant Operations (Realtime & Mutation)
// ==========================================

export function subscribeToTenants(buildingId: string, onUpdate: (tenants: Tenant[]) => void, onError: (err: any) => void) {
  const path = `buildings/${buildingId}/tenants`;
  const q = collection(db, 'buildings', buildingId, 'tenants');
  
  return onSnapshot(q, (snapshot) => {
    const tenants: Tenant[] = [];
    snapshot.forEach((docSnap) => {
      tenants.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as Tenant);
    });
    onUpdate(tenants);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    onError(error);
  });
}

export async function saveTenant(buildingId: string, tenant: Omit<Tenant, 'id'> & { id?: string }): Promise<Tenant> {
  const path = `buildings/${buildingId}/tenants`;
  try {
    enforceRateLimit('tenant_write');
    const tenantsRef = collection(db, 'buildings', buildingId, 'tenants');
    const docRef = tenant.id ? doc(tenantsRef, tenant.id) : doc(tenantsRef);
    const finalTenant: Tenant = {
      ...tenant,
      id: docRef.id,
    };
    await setDoc(docRef, cleanUndefined(finalTenant));
    return finalTenant;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeTenant(buildingId: string, tenantId: string): Promise<void> {
  const path = `buildings/${buildingId}/tenants/${tenantId}`;
  try {
    enforceRateLimit('tenant_write');
    await deleteDoc(doc(db, 'buildings', buildingId, 'tenants', tenantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Payment Operations (Realtime & Mutation)
// ==========================================

export function subscribeToPayments(buildingId: string, onUpdate: (payments: Payment[]) => void, onError: (err: any) => void) {
  const path = `buildings/${buildingId}/payments`;
  const q = collection(db, 'buildings', buildingId, 'payments');
  
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = [];
    snapshot.forEach((docSnap) => {
      payments.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as Payment);
    });
    onUpdate(payments);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    onError(error);
  });
}

export async function savePayment(buildingId: string, payment: Omit<Payment, 'id'> & { id?: string }): Promise<Payment> {
  const path = `buildings/${buildingId}/payments`;
  try {
    enforceRateLimit('payment_write');
    const paymentsRef = collection(db, 'buildings', buildingId, 'payments');
    const docRef = payment.id ? doc(paymentsRef, payment.id) : doc(paymentsRef);
    const finalPayment: Payment = {
      ...payment,
      id: docRef.id,
    };
    await setDoc(docRef, cleanUndefined(finalPayment));
    return finalPayment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function changePaymentStatus(buildingId: string, paymentId: string, status: 'Paid' | 'Pending' | 'Overdue'): Promise<void> {
  const path = `buildings/${buildingId}/payments/${paymentId}`;
  try {
    enforceRateLimit('payment_write');
    const docRef = doc(db, 'buildings', buildingId, 'payments', paymentId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removePayment(buildingId: string, paymentId: string): Promise<void> {
  const path = `buildings/${buildingId}/payments/${paymentId}`;
  try {
    enforceRateLimit('payment_write');
    await deleteDoc(doc(db, 'buildings', buildingId, 'payments', paymentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Expense Operations (Realtime & Mutation)
// ==========================================

export function subscribeToExpenses(buildingId: string, onUpdate: (expenses: Expense[]) => void, onError: (err: any) => void) {
  const path = `buildings/${buildingId}/expenses`;
  const q = collection(db, 'buildings', buildingId, 'expenses');
  
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((docSnap) => {
      expenses.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as Expense);
    });
    onUpdate(expenses);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    onError(error);
  });
}

export async function saveExpense(buildingId: string, expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> {
  const path = `buildings/${buildingId}/expenses`;
  try {
    enforceRateLimit('expense_write');
    const expensesRef = collection(db, 'buildings', buildingId, 'expenses');
    const docRef = expense.id ? doc(expensesRef, expense.id) : doc(expensesRef);
    const finalExpense: Expense = {
      ...expense,
      id: docRef.id,
    };
    await setDoc(docRef, cleanUndefined(finalExpense));
    return finalExpense;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeExpense(buildingId: string, expenseId: string): Promise<void> {
  const path = `buildings/${buildingId}/expenses/${expenseId}`;
  try {
    enforceRateLimit('expense_write');
    await deleteDoc(doc(db, 'buildings', buildingId, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// System Audit Log Operations
// ==========================================

export async function logAction(
  buildingId: string,
  userId: string,
  userEmail: string,
  action: string,
  details: string,
  entityId?: string,
  entityType?: 'tenant' | 'payment' | 'expense' | 'building' | 'system',
  meta?: Record<string, any>
): Promise<AuditLog | null> {
  const path = `buildings/${buildingId}/auditLogs`;
  try {
    const logsRef = collection(db, 'buildings', buildingId, 'auditLogs');
    const docRef = doc(logsRef);
    const finalLog: AuditLog = {
      id: docRef.id,
      userId,
      userEmail,
      action,
      timestamp: new Date().toISOString(),
      details,
      entityId,
      entityType,
      meta,
    };
    await setDoc(docRef, cleanUndefined(finalLog));
    return finalLog;
  } catch (error) {
    console.error("Failed to write system audit log:", error);
    return null;
  }
}

export function subscribeToAuditLogs(
  buildingId: string,
  onUpdate: (logs: AuditLog[]) => void,
  onError: (err: any) => void
) {
  const path = `buildings/${buildingId}/auditLogs`;
  const q = collection(db, 'buildings', buildingId, 'auditLogs');
  
  return onSnapshot(q, (snapshot) => {
    const logs: AuditLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as AuditLog);
    });
    // Sort client-side descending by timestamp to ensure consistent chronological order
    const sortedLogs = [...logs].sort((a, b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      return timeB.localeCompare(timeA);
    });
    onUpdate(sortedLogs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    onError(error);
  });
}

// ==========================================
// SuperAdmin Database Operations
// ==========================================

export async function registerUser(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, cleanUndefined({
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'No Name',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
    }), { merge: true });
  } catch (error) {
    console.error('Failed to sync user profile:', error);
  }
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const users: UserRecord[] = [];
    snapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as UserRecord);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAllBuildings(): Promise<Building[]> {
  const path = 'buildings';
  try {
    const snapshot = await getDocs(collection(db, path));
    const buildings: Building[] = [];
    snapshot.forEach((docSnap) => {
      buildings.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as Building);
    });
    return buildings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserRecord>): Promise<void> {
  const path = `users/${userId}`;
  try {
    enforceRateLimit('profile_write');
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, cleanUndefined(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteBuildingWithSubcollections(buildingId: string): Promise<void> {
  const path = `buildings/${buildingId}`;
  try {
    enforceRateLimit('building_write');

    // Fetch and delete all subcollection documents
    const subcollections = ['tenants', 'payments', 'expenses', 'auditLogs'];
    for (const sub of subcollections) {
      const q = collection(db, 'buildings', buildingId, sub);
      const snap = await getDocs(q);
      const batchPromises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        batchPromises.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(batchPromises);
    }

    // Finally delete the building itself
    await deleteDoc(doc(db, 'buildings', buildingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function fetchAllTenants(buildings: Building[]): Promise<(Tenant & { buildingId: string; buildingName: string; ownerId: string })[]> {
  const tenants: (Tenant & { buildingId: string; buildingName: string; ownerId: string })[] = [];
  try {
    await Promise.all(buildings.map(async (b) => {
      const q = collection(db, 'buildings', b.id, 'tenants');
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        tenants.push({
          id: docSnap.id,
          buildingId: b.id,
          buildingName: b.name,
          ownerId: b.ownerId,
          ...sanitizeFirestoreData(docSnap.data())
        } as Tenant & { buildingId: string; buildingName: string; ownerId: string });
      });
    }));
  } catch (error) {
    console.error("Failed to fetch all tenants for superadmin:", error);
  }
  return tenants;
}

export async function fetchAllPayments(buildings: Building[]): Promise<(Payment & { buildingId: string; buildingName: string; ownerId: string })[]> {
  const payments: (Payment & { buildingId: string; buildingName: string; ownerId: string })[] = [];
  try {
    await Promise.all(buildings.map(async (b) => {
      const q = collection(db, 'buildings', b.id, 'payments');
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        payments.push({
          id: docSnap.id,
          buildingId: b.id,
          buildingName: b.name,
          ownerId: b.ownerId,
          ...sanitizeFirestoreData(docSnap.data())
        } as Payment & { buildingId: string; buildingName: string; ownerId: string });
      });
    }));
  } catch (error) {
    console.error("Failed to fetch all payments for superadmin:", error);
  }
  return payments;
}

export async function fetchAllExpenses(buildings: Building[]): Promise<(Expense & { buildingId: string; buildingName: string; ownerId: string })[]> {
  const expenses: (Expense & { buildingId: string; buildingName: string; ownerId: string })[] = [];
  try {
    await Promise.all(buildings.map(async (b) => {
      const q = collection(db, 'buildings', b.id, 'expenses');
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        expenses.push({
          id: docSnap.id,
          buildingId: b.id,
          buildingName: b.name,
          ownerId: b.ownerId,
          ...sanitizeFirestoreData(docSnap.data())
        } as Expense & { buildingId: string; buildingName: string; ownerId: string });
      });
    }));
  } catch (error) {
    console.error("Failed to fetch all expenses for superadmin:", error);
  }
  return expenses;
}

// ==========================================
// SaaS Packages & Billing Config Operations
// ==========================================

async function isBillingSeeded(type: 'plans' | 'coupons' | 'addons'): Promise<boolean> {
  try {
    const docRef = doc(db, 'system_configs', 'billing_meta');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return !!data[type];
    }
    return false;
  } catch (error) {
    console.error(`Failed to check billing meta for ${type}:`, error);
    return false;
  }
}

async function markBillingAsSeeded(type: 'plans' | 'coupons' | 'addons'): Promise<void> {
  try {
    const docRef = doc(db, 'system_configs', 'billing_meta');
    await setDoc(docRef, { [type]: true }, { merge: true });
  } catch (error) {
    console.error(`Failed to mark billing meta for ${type}:`, error);
  }
}

export async function fetchSaaSPlans(): Promise<SaaSPlan[]> {
  const LOCAL_STORAGE_KEY = 'saas_plans_fallback';
  try {
    const q = collection(db, 'system_configs', 'billing', 'saas_plans');
    const snap = await getDocs(q);
    const plans: SaaSPlan[] = [];
    snap.forEach((docSnap) => {
      plans.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as SaaSPlan);
    });
    
    if (plans.length === 0) {
      const seeded = await isBillingSeeded('plans');
      if (!seeded) {
        // Seed default plans
        const defaults: SaaSPlan[] = [
          {
            id: 'monthly',
            name: 'Premium Monthly Plan',
            price: 10,
            currency: 'JOD',
            interval: 'month',
            description: 'Best for small committees starting off with single-building accounting.',
            features: ['Unlimited Tenants', 'Standard Analytics', 'WhatsApp Reminders', 'Basic Reports', 'Common Area Expenses'],
            stripePriceId: 'price_123_monthly_test',
            isActive: true
          },
          {
            id: 'annually',
            name: 'Premium Annual Plan',
            price: 96,
            currency: 'JOD',
            interval: 'year',
            description: 'Equivalent to 8 JOD/month. Perfect for long-term committee property boards.',
            features: ['All Premium Monthly Features', 'Save 20% on Cumulative Cost', 'Priority Cloud Support', 'Unlimited Statements Export', 'Advanced Data Importer'],
            stripePriceId: 'price_123_annually_test',
            isActive: true
          }
        ];
        for (const p of defaults) {
          try {
            await setDoc(doc(db, 'system_configs', 'billing', 'saas_plans', p.id), p);
          } catch (e) {
            console.warn("Could not seed plan in Firestore:", e);
          }
          plans.push(p);
        }
        try {
          await markBillingAsSeeded('plans');
        } catch (e) {}
      }
    }
    
    if (plans.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
    }
    return plans;
  } catch (error) {
    console.error("Failed to fetch saas plans from Firestore, using local fallback:", error);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [
      {
        id: 'monthly',
        name: 'Premium Monthly Plan',
        price: 10,
        currency: 'JOD',
        interval: 'month',
        description: 'Best for small committees starting off with single-building accounting.',
        features: ['Unlimited Tenants', 'Standard Analytics', 'WhatsApp Reminders', 'Basic Reports', 'Common Area Expenses'],
        stripePriceId: 'price_123_monthly_test',
        isActive: true
      },
      {
        id: 'annually',
        name: 'Premium Annual Plan',
        price: 96,
        currency: 'JOD',
        interval: 'year',
        description: 'Equivalent to 8 JOD/month. Perfect for long-term committee property boards.',
        features: ['All Premium Monthly Features', 'Save 20% on Cumulative Cost', 'Priority Cloud Support', 'Unlimited Statements Export', 'Advanced Data Importer'],
        stripePriceId: 'price_123_annually_test',
        isActive: true
      }
    ];
  }
}

export async function saveSaaSPlan(plan: SaaSPlan): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_plans_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: SaaSPlan[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch (e) {}
    }
    const idx = list.findIndex(item => item.id === plan.id);
    if (idx >= 0) {
      list[idx] = plan;
    } else {
      list.push(plan);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}

  const path = `system_configs/billing/saas_plans/${plan.id}`;
  try {
    await setDoc(doc(db, 'system_configs', 'billing', 'saas_plans', plan.id), plan);
  } catch (error) {
    console.warn("Firestore save failed, changes preserved in local storage:", error);
  }
}

export async function deleteSaaSPlan(id: string): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_plans_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      let list: SaaSPlan[] = JSON.parse(cached);
      list = list.filter(item => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {}

  const path = `system_configs/billing/saas_plans/${id}`;
  try {
    await deleteDoc(doc(db, 'system_configs', 'billing', 'saas_plans', id));
  } catch (error) {
    console.warn("Firestore delete failed, changes preserved in local storage:", error);
  }
}

export async function fetchSaaSCoupons(): Promise<SaASCoupon[]> {
  const LOCAL_STORAGE_KEY = 'saas_coupons_fallback';
  try {
    const q = collection(db, 'system_configs', 'billing', 'saas_coupons');
    const snap = await getDocs(q);
    const coupons: SaASCoupon[] = [];
    snap.forEach((docSnap) => {
      coupons.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as SaASCoupon);
    });
    
    if (coupons.length === 0) {
      const seeded = await isBillingSeeded('coupons');
      if (!seeded) {
        // Seed default coupons
        const defaults: SaASCoupon[] = [
          { id: 'BOSSTSC26', code: 'BOSSTSC26', discountPercent: 50, description: 'Exclusive Partner Launch discount coupon.', isActive: true },
          { id: 'WELCOME50', code: 'WELCOME50', discountPercent: 50, description: 'Standard 50% discount for first-time premium upgraders.', isActive: true },
          { id: 'SAASFREE', code: 'SAASFREE', discountPercent: 100, description: '100% discount sandbox trial pass.', isActive: true },
          { id: 'FREE30', code: 'FREE30', discountPercent: 100, description: '30 days 100% off full premium pass.', isActive: true }
        ];
        for (const c of defaults) {
          try {
            await setDoc(doc(db, 'system_configs', 'billing', 'saas_coupons', c.id), c);
          } catch (e) {}
          coupons.push(c);
        }
        try {
          await markBillingAsSeeded('coupons');
        } catch (e) {}
      }
    }
    
    if (coupons.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(coupons));
    }
    return coupons;
  } catch (error) {
    console.error("Failed to fetch saas coupons from Firestore, using local fallback:", error);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [
      { id: 'BOSSTSC26', code: 'BOSSTSC26', discountPercent: 50, description: 'Exclusive Partner Launch discount coupon.', isActive: true },
      { id: 'WELCOME50', code: 'WELCOME50', discountPercent: 50, description: 'Standard 50% discount for first-time premium upgraders.', isActive: true },
      { id: 'SAASFREE', code: 'SAASFREE', discountPercent: 100, description: '100% discount sandbox trial pass.', isActive: true },
      { id: 'FREE30', code: 'FREE30', discountPercent: 100, description: '30 days 100% off full premium pass.', isActive: true }
    ];
  }
}

export async function saveSaaSCoupon(coupon: SaASCoupon): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_coupons_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: SaASCoupon[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch (e) {}
    }
    const idx = list.findIndex(item => item.id === coupon.id);
    if (idx >= 0) {
      list[idx] = coupon;
    } else {
      list.push(coupon);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}

  const path = `system_configs/billing/saas_coupons/${coupon.id}`;
  try {
    await setDoc(doc(db, 'system_configs', 'billing', 'saas_coupons', coupon.id), coupon);
  } catch (error) {
    console.warn("Firestore save failed, changes preserved in local storage:", error);
  }
}

export async function deleteSaaSCoupon(id: string): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_coupons_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      let list: SaASCoupon[] = JSON.parse(cached);
      list = list.filter(item => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {}

  const path = `system_configs/billing/saas_coupons/${id}`;
  try {
    await deleteDoc(doc(db, 'system_configs', 'billing', 'saas_coupons', id));
  } catch (error) {
    console.warn("Firestore delete failed, changes preserved in local storage:", error);
  }
}

export async function fetchSaaSAddons(): Promise<SaaSAddon[]> {
  const LOCAL_STORAGE_KEY = 'saas_addons_fallback';
  try {
    const q = collection(db, 'system_configs', 'billing', 'saas_addons');
    const snap = await getDocs(q);
    const addons: SaaSAddon[] = [];
    snap.forEach((docSnap) => {
      addons.push({ id: docSnap.id, ...sanitizeFirestoreData(docSnap.data()) } as SaaSAddon);
    });
    
    if (addons.length === 0) {
      const seeded = await isBillingSeeded('addons');
      if (!seeded) {
        // Seed default addons
        const defaults: SaaSAddon[] = [
          { id: 'whatsapp_premium', name: 'Automated WhatsApp API Hub', price: 5, currency: 'JOD', interval: 'month', description: 'Direct headless SMS & WhatsApp API gateway integration to auto-deliver receipts & reminders.', stripePriceId: 'price_addon_wa_test', isActive: true },
          { id: 'extended_analytics', name: 'AI Financial Forecaster', price: 3, currency: 'JOD', interval: 'month', description: 'Predictive tenant payment trends, dynamic rent collections risk dashboard, and smart budgeting.', stripePriceId: 'price_addon_ai_test', isActive: true },
          { id: 'extra_storage_pack', name: '10GB Document Storage Vault', price: 15, currency: 'JOD', interval: 'one_time', description: 'Expand your cloud bucket to host up to 10GB of tenant identity files, contracts, and expense receipt scans.', stripePriceId: 'price_addon_storage_test', isActive: true }
        ];
        for (const a of defaults) {
          try {
            await setDoc(doc(db, 'system_configs', 'billing', 'saas_addons', a.id), a);
          } catch (e) {}
          addons.push(a);
        }
        try {
          await markBillingAsSeeded('addons');
        } catch (e) {}
      }
    }
    
    if (addons.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(addons));
    }
    return addons;
  } catch (error) {
    console.error("Failed to fetch saas addons from Firestore, using local fallback:", error);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [
      { id: 'whatsapp_premium', name: 'Automated WhatsApp API Hub', price: 5, currency: 'JOD', interval: 'month', description: 'Direct headless SMS & WhatsApp API gateway integration to auto-deliver receipts & reminders.', stripePriceId: 'price_addon_wa_test', isActive: true },
      { id: 'extended_analytics', name: 'AI Financial Forecaster', price: 3, currency: 'JOD', interval: 'month', description: 'Predictive tenant payment trends, dynamic rent collections risk dashboard, and smart budgeting.', stripePriceId: 'price_addon_ai_test', isActive: true },
      { id: 'extra_storage_pack', name: '10GB Document Storage Vault', price: 15, currency: 'JOD', interval: 'one_time', description: 'Expand your cloud bucket to host up to 10GB of tenant identity files, contracts, and expense receipt scans.', stripePriceId: 'price_addon_storage_test', isActive: true }
    ];
  }
}

export async function saveSaaSAddon(addon: SaaSAddon): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_addons_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: SaaSAddon[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch (e) {}
    }
    const idx = list.findIndex(item => item.id === addon.id);
    if (idx >= 0) {
      list[idx] = addon;
    } else {
      list.push(addon);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}

  const path = `system_configs/billing/saas_addons/${addon.id}`;
  try {
    await setDoc(doc(db, 'system_configs', 'billing', 'saas_addons', addon.id), addon);
  } catch (error) {
    console.warn("Firestore save failed, changes preserved in local storage:", error);
  }
}

export async function deleteSaaSAddon(id: string): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'saas_addons_fallback';
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      let list: SaaSAddon[] = JSON.parse(cached);
      list = list.filter(item => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {}

  const path = `system_configs/billing/saas_addons/${id}`;
  try {
    await deleteDoc(doc(db, 'system_configs', 'billing', 'saas_addons', id));
  } catch (error) {
    console.warn("Firestore delete failed, changes preserved in local storage:", error);
  }
}

export async function fetchStripeConfig(): Promise<StripeConfig> {
  const LOCAL_STORAGE_KEY = 'stripe_config_fallback';
  try {
    const docRef = doc(db, 'system_configs', 'stripe_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = sanitizeFirestoreData(docSnap.data()) as StripeConfig;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    } else {
      const defaultConfig: StripeConfig = {
        isEnabled: true,
        publicKey: 'pk_test_51Pxabc123xyzStripePublicKeyPlaceholderForDemoMode',
        secretKey: 'sk_test_51Pxabc123xyzStripeSecretKeyPlaceholderForDemoMode',
        mode: 'test',
        checkoutRedirectType: 'simulated'
      };
      try {
        await setDoc(docRef, defaultConfig);
      } catch (e) {}
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultConfig));
      return defaultConfig;
    }
  } catch (error) {
    console.error("Failed to fetch Stripe config from Firestore, using local fallback:", error);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      isEnabled: true,
      publicKey: 'pk_test_51Pxabc123xyzStripePublicKeyPlaceholderForDemoMode',
      secretKey: 'sk_test_51Pxabc123xyzStripeSecretKeyPlaceholderForDemoMode',
      mode: 'test',
      checkoutRedirectType: 'simulated'
    };
  }
}

export async function saveStripeConfig(config: StripeConfig): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'stripe_config_fallback';
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}

  const path = 'system_configs/stripe_config';
  try {
    await setDoc(doc(db, 'system_configs', 'stripe_config'), config);
  } catch (error) {
    console.warn("Firestore save failed, changes preserved in local storage:", error);
  }
}

export async function fetchMultiPropertyConfig(): Promise<MultiPropertyConfig> {
  const LOCAL_STORAGE_KEY = 'multi_property_config_fallback';
  try {
    const docRef = doc(db, 'system_configs', 'multi_property_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = sanitizeFirestoreData(docSnap.data()) as MultiPropertyConfig;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    } else {
      const defaultConfig: MultiPropertyConfig = {
        isEnabled: true,
        firstPropertyRatePremium: 20,
        additionalPropertyRate: 5,
        currency: 'JOD'
      };
      try {
        await setDoc(docRef, defaultConfig);
      } catch (e) {}
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultConfig));
      return defaultConfig;
    }
  } catch (error) {
    console.error("Failed to fetch multi-property config from Firestore, using local fallback:", error);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      isEnabled: true,
      firstPropertyRatePremium: 20,
      additionalPropertyRate: 5,
      currency: 'JOD'
    };
  }
}

export async function saveMultiPropertyConfig(config: MultiPropertyConfig): Promise<void> {
  enforceRateLimit();
  const LOCAL_STORAGE_KEY = 'multi_property_config_fallback';
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}

  const path = 'system_configs/multi_property_config';
  try {
    await setDoc(doc(db, 'system_configs', 'multi_property_config'), config);
  } catch (error) {
    console.warn("Firestore save failed, changes preserved in local storage:", error);
  }
}

export async function fetchLandingPageConfig(): Promise<LandingPageConfig | null> {
  try {
    const docRef = doc(db, 'system_configs', 'landing_page_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return sanitizeFirestoreData(docSnap.data()) as LandingPageConfig;
    }
  } catch (error) {
    console.error("Failed to fetch landing page config from Firestore:", error);
  }
  return null;
}

export async function saveLandingPageConfig(config: LandingPageConfig): Promise<void> {
  enforceRateLimit('landing_page_config_write');
  try {
    await setDoc(doc(db, 'system_configs', 'landing_page_config'), cleanUndefined(config));
  } catch (error) {
    console.error("Failed to save landing page config to Firestore:", error);
    throw error;
  }
}




