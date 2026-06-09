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
import { Building, Tenant, Payment, Expense } from './types';

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
    const buildingsRef = collection(db, path);
    const newDocRef = building.id ? doc(buildingsRef, building.id) : doc(buildingsRef);
    const id = newDocRef.id;
    const createdAt = new Date().toISOString();
    const newBuilding: Building = {
      ...building,
      id,
      createdAt,
    };
    await setDoc(newDocRef, newBuilding);
    return newBuilding;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveBuilding(building: Building): Promise<Building> {
  const path = `buildings/${building.id}`;
  try {
    await setDoc(doc(db, 'buildings', building.id), building, { merge: true });
    return building;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeBuilding(buildingId: string): Promise<void> {
  const path = `buildings/${buildingId}`;
  try {
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
    const tenantsRef = collection(db, 'buildings', buildingId, 'tenants');
    const docRef = tenant.id ? doc(tenantsRef, tenant.id) : doc(tenantsRef);
    const finalTenant: Tenant = {
      ...tenant,
      id: docRef.id,
    };
    await setDoc(docRef, finalTenant);
    return finalTenant;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeTenant(buildingId: string, tenantId: string): Promise<void> {
  const path = `buildings/${buildingId}/tenants/${tenantId}`;
  try {
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
    const paymentsRef = collection(db, 'buildings', buildingId, 'payments');
    const docRef = payment.id ? doc(paymentsRef, payment.id) : doc(paymentsRef);
    const finalPayment: Payment = {
      ...payment,
      id: docRef.id,
    };
    await setDoc(docRef, finalPayment);
    return finalPayment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function changePaymentStatus(buildingId: string, paymentId: string, status: 'Paid' | 'Pending' | 'Overdue'): Promise<void> {
  const path = `buildings/${buildingId}/payments/${paymentId}`;
  try {
    const docRef = doc(db, 'buildings', buildingId, 'payments', paymentId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removePayment(buildingId: string, paymentId: string): Promise<void> {
  const path = `buildings/${buildingId}/payments/${paymentId}`;
  try {
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
    const expensesRef = collection(db, 'buildings', buildingId, 'expenses');
    const docRef = expense.id ? doc(expensesRef, expense.id) : doc(expensesRef);
    const finalExpense: Expense = {
      ...expense,
      id: docRef.id,
    };
    await setDoc(docRef, finalExpense);
    return finalExpense;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeExpense(buildingId: string, expenseId: string): Promise<void> {
  const path = `buildings/${buildingId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'buildings', buildingId, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
