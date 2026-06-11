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
import { Building, Tenant, Payment, Expense, AuditLog } from './types';
import { clientRateLimiter } from './utils/rateLimiter';

// satisfaction of Layer 9: Rate limiting validation gate before cloud writes
function enforceRateLimit(actionKey: string = 'cloud_write') {
  const result = clientRateLimiter.attemptAction(actionKey);
  if (!result.allowed) {
    throw new Error(`RATE_LIMIT: Client throttle activated. Please wait ${result.resetSec} seconds before sending more requests.`);
  }
}

// Clean helper to strip any field set to undefined so setDoc doesn't fail with "Unsupported field value: undefined"
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = cleanUndefined(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
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
      buildings.push({ id: docSnap.id, ...docSnap.data() } as Building);
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
    const newBuilding: Building = {
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
      tenants.push({ id: docSnap.id, ...docSnap.data() } as Tenant);
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
      payments.push({ id: docSnap.id, ...docSnap.data() } as Payment);
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
      expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
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
      logs.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
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

