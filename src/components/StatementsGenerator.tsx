/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tenant, Payment, Expense, Building, isMonthCovered, formatCurrency, getMonthCount, getYearMonthFromDateStr } from '../types';
import { FileText, Calendar, Send, Mail, CheckCircle, RefreshCw, Eye, Printer, Bot, AlertTriangle, MessageSquare, Copy, ShieldAlert, ArrowDownCircle, ArrowUpCircle, AlertCircle, Edit2 } from 'lucide-react';
import { getReminderWhatsAppLink } from '../utils/whatsapp';
import { checkAndSyncPayments } from '../utils/billingSync';
import { useLanguage } from '../context/LanguageContext';

interface StatementsGeneratorProps {
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  building: Building | null;
  onTriggerStatusRefresh?: () => void;
  onUpdateBuildingSettings?: (fields: Partial<Building>) => Promise<void>;
  onAutopilotSync?: (
    paymentsToCreate: Omit<Payment, 'id'>[],
    paymentsToUpdate: { id: string; status: Payment['status'] }[]
  ) => Promise<void>;
  onAddPayment?: (payment: Omit<Payment, 'id' | 'receiptNumber'>) => Promise<void> | void;
  onEditPayment?: (payment: Payment) => Promise<void> | void;
  onEditExpense?: (expense: Expense) => Promise<void> | void;
  isReadOnly?: boolean;
}

export default function StatementsGenerator({
  tenants,
  payments,
  expenses,
  building,
  onUpdateBuildingSettings,
  onAutopilotSync,
  onAddPayment,
  onEditPayment,
  onEditExpense,
  isReadOnly = false,
}: StatementsGeneratorProps) {
  const { t, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'statement' | 'automation'>('statement');
  
  const formatVal = (amount: number) => {
    return formatCurrency(amount, building?.currency || 'JOD');
  };

  // STATEMENT GENERATOR STATE
  const [statementType, setStatementType] = useState<'unit' | 'commonArea'>('unit');
  const [statementScope, setStatementScope] = useState<'month' | 'year'>('month');
  const [statementYear, setStatementYear] = useState<string>('2026');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [statementMonth, setStatementMonth] = useState<string>('2026-06');
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null);
  const [monthViewRange, setMonthViewRange] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');

  // REMINDER GROUPING & LOGGING PAYMENT MODAL STATES
  const [logPaymentModalOpen, setLogPaymentModalOpen] = useState(false);
  const [loggingUnitGroup, setLoggingUnitGroup] = useState<{
    unit: string;
    tenant: Tenant | undefined;
    payments: Payment[];
    totalDueAmount: number;
  } | null>(null);
  
  const [selectedPaymentToLog, setSelectedPaymentToLog] = useState<Payment | null>(null);
  const [logAmount, setLogAmount] = useState<number>(0);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logMethod, setLogMethod] = useState<string>('Bank Transfer');
  const [logNotes, setLogNotes] = useState<string>('Logged via Statements & Alerts Tab');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // AUTOMATION STATE & SAVE STATUS
  const [reminderTemplate, setReminderTemplate] = useState(
    building?.reminderTemplate || "Hello {BeneficiaryName} 👋,\n\nFriendly reminder that monthly share dues for Unit {Unit} of {DueAmount} is due by Day {DueDay} for the month of {Month}.\n\nPlease remit via bank wire and send us a confirmation receipt. Thank you!"
  );
  const [receiptTemplate, setReceiptTemplate] = useState(
    building?.receiptTemplate || "Hello {BeneficiaryName} 👋,\n\nThank you for your rent payment! Here is your official payment receipt:\n\n🏢 *Unit:* {Unit}\n🛢️ *Amount Paid:* {AmountPaid}\n📅 *Billing Month:* {BillingMonth}\n💳 *Payment Method:* {PaymentMethod}\n📅 *Date Paid:* {DatePaid}\n🧾 *Receipt No:* {ReceiptNo}\n\n*Status:* ✅ Fully Paid & Settled\n\nIf you have any questions, please feel free to reach out. Thank you for being a wonderful tenant!"
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // EXPENSE EDITING & ATTACHMENT ZOOM STATES
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseStatus, setExpenseStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Paid');
  const [expenseDueDate, setExpenseDueDate] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseAttachmentName, setExpenseAttachmentName] = useState('');
  const [expenseAttachmentUrl, setExpenseAttachmentUrl] = useState('');
  const [zoomedAttachment, setZoomedAttachment] = useState<{ url: string; title: string } | null>(null);
  const [dragOverExpense, setDragOverExpense] = useState(false);
  const fileInputExpenseRef = React.useRef<HTMLInputElement>(null);

  const handleExpenseFileChange = (file: File) => {
    if (!file) return;
    setExpenseAttachmentName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setExpenseAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseTitle(exp.title);
    setExpenseCategory(exp.category);
    setExpenseAmount(exp.amount);
    setExpenseDate(exp.date);
    setExpenseStatus(exp.status || 'Paid');
    setExpenseDueDate(exp.dueDate || '');
    setExpenseNotes(exp.notes || '');
    setExpenseAttachmentName(exp.attachmentName || '');
    setExpenseAttachmentUrl(exp.attachmentUrl || '');
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !onEditExpense) return;
    
    await onEditExpense({
      ...editingExpense,
      title: expenseTitle,
      category: expenseCategory as any,
      amount: Number(expenseAmount),
      date: expenseDate,
      status: expenseStatus,
      dueDate: expenseDueDate || undefined,
      notes: expenseNotes,
      attachmentName: expenseAttachmentUrl ? (expenseAttachmentName || 'Invoice_Attachment') : '',
      attachmentUrl: expenseAttachmentUrl || '',
    });
    setEditingExpense(null);
  };

  const handleQuickMarkPaid = async (exp: Expense) => {
    if (!onEditExpense) return;
    await onEditExpense({
      ...exp,
      status: 'Paid',
    });
  };

  React.useEffect(() => {
    if (building?.reminderTemplate) {
      setReminderTemplate(building.reminderTemplate);
    }
    if (building?.receiptTemplate) {
      setReceiptTemplate(building.receiptTemplate);
    }
  }, [building?.reminderTemplate, building?.receiptTemplate]);

  const handleSaveTemplate = async () => {
    if (!onUpdateBuildingSettings) return;
    setIsSavingTemplate(true);
    setSaveStatus('idle');
    try {
      await onUpdateBuildingSettings({ reminderTemplate, receiptTemplate });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSavingTemplate(false);
    }
  };
  const [automationLog, setAutomationLog] = useState<Array<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'warn' }>>([
    { id: 'init-1', time: new Date().toLocaleTimeString(), msg: 'Billing scheduler standing by. Run Cycle Check to audit occupant invoices and identify overdue balances.', type: 'info' },
  ]);

  const activeTenant = tenants.find(t => t.id === selectedTenantId);
  const tenantPaymentsForMonth = payments.filter(p => p.tenantId === selectedTenantId && isMonthCovered(p.monthPaidFor, statementMonth));
  const tenantAllPayments = payments.filter(p => p.tenantId === selectedTenantId);

  // Group outstanding payments across all cycles by unit (matching the dashboard's Reminders Center)
  const outstandingPayments = React.useMemo(() => {
    return payments.filter(p => {
      if (p.status === 'Paid') return false;
      
      // Exclude if there is any 'Paid' payment for this tenant covering this specific month (direct or range-covered)
      const isAlreadyPaid = payments.some(other => 
        other.status === 'Paid' && 
        other.tenantId === p.tenantId && 
        isMonthCovered(other.monthPaidFor, p.monthPaidFor)
      );
      return !isAlreadyPaid;
    });
  }, [payments]);

  const outstandingExpenses = React.useMemo(() => {
    return expenses.filter(e => e.status === 'Pending' || e.status === 'Overdue');
  }, [expenses]);

  interface UnitReminderGroup {
    unit: string;
    tenant: Tenant | undefined;
    payments: Payment[];
    totalDueAmount: number;
  }

  const groupedReminders = React.useMemo(() => {
    const groupsMap = new Map<string, Payment[]>();
    outstandingPayments.forEach(p => {
      const key = p.unit || 'Unknown';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(p);
    });

    const list: UnitReminderGroup[] = [];
    groupsMap.forEach((pList, unit) => {
      const firstP = pList[0];
      const tenant = tenants.find(t => t.id === firstP.tenantId) || tenants.find(t => t.unit === unit);
      
      const totalDueAmount = pList.reduce((sum, p) => {
        const pAmount = p.amount > 0
          ? p.amount
          : (tenant
              ? (tenant.monthlyRent + (tenant.guardFee ?? building?.defaultGuardFee ?? 0) + (tenant.maintenanceFee ?? building?.defaultMaintenanceFee ?? 0))
              : 0
            );
        return sum + pAmount;
      }, 0);

      list.push({
        unit,
        tenant,
        payments: pList,
        totalDueAmount
      });
    });

    // Sort by unit number/name
    return list.sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' }));
  }, [outstandingPayments, tenants, building]);

  // Calculate Statements totals
  const tenantRent = activeTenant ? Number(activeTenant.monthlyRent || 0) : 0;
  const tenantGuard = activeTenant ? Number(activeTenant.guardFee ?? 50) : 0;
  const tenantMaint = activeTenant ? Number(activeTenant.maintenanceFee ?? 30) : 0;
  
  // Current month's dues
  const currentMonthDue = tenantRent + tenantGuard + tenantMaint;

  // Unpaid balance from all prior months (prior to statementMonth)
  const previousOutstandingBalance = React.useMemo(() => {
    if (!selectedTenantId) return 0;
    return payments
      .filter(p => 
        p.tenantId === selectedTenantId && 
        p.status !== 'Paid' && 
        p.monthPaidFor < statementMonth
      )
      .reduce((sum, p) => {
        const pAmount = p.amount > 0 
          ? p.amount 
          : (activeTenant 
              ? (activeTenant.monthlyRent + (activeTenant.guardFee ?? building?.defaultGuardFee ?? 50) + (activeTenant.maintenanceFee ?? building?.defaultMaintenanceFee ?? 30))
              : 0
            );
        return sum + pAmount;
      }, 0);
  }, [payments, selectedTenantId, statementMonth, activeTenant, building]);

  const totalAmountDue = currentMonthDue + previousOutstandingBalance;
  const totalAmountPaid = tenantPaymentsForMonth
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstandingBalance = Math.max(totalAmountDue - totalAmountPaid, 0);

  // --- SEGMENTED MASTER SPREADSHEET SETUP ---
  const yearMonths = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const mStr = `${statementYear}-${monthNum}`;
      const mName = language === 'ar' ? [
        'كانون الثاني / يناير', 'شباط / فبراير', 'آذار / مارس', 'نيسان / أبريل', 'أيار / مايو', 'حزيران / يونيو',
        'تموز / يوليو', 'آب / أغسطس', 'أيلول / سبتمبر', 'تشرين الأول / أكتوبر', 'تشرين الثاني / نوفمبر', 'كانون الأول / ديسمبر'
      ][i] : [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][i];
      return { mStr, mName };
    });
  }, [statementYear, language]);

  // --- COMMON AREA COMPUTATIONS ---
  const commonIncomesList = building?.commonAreaIncomeCategories || ['Guard Salary', 'Service Box'];
  const commonExpensesList = building?.commonAreaExpenseCategories || [
    'Guard Salary',
    'Electricity Bill',
    'Gas Maintenance',
    'Water Bill',
    'Alarm/security system',
    'Elevator Maintenance',
    'Cleaning',
    'Other',
    'Maintenance',
    'Utilities',
    'Insurance',
    'Tax',
    'Staff Salary'
  ];

  // --- SEGMENTED MASTER SPREADSHEET DATA HELPERS ---
  const filteredMonths = React.useMemo(() => {
    if (monthViewRange === 'q1') return yearMonths.slice(0, 3);
    if (monthViewRange === 'q2') return yearMonths.slice(3, 6);
    if (monthViewRange === 'q3') return yearMonths.slice(6, 9);
    if (monthViewRange === 'q4') return yearMonths.slice(9, 12);
    return yearMonths;
  }, [monthViewRange, yearMonths]);

  const expenseCategoriesToRender = React.useMemo(() => {
    const customList = building?.commonAreaExpenseCategories || [];
    if (customList.length > 0) return customList;
    return ['Guard Salary', 'Electricity Bill', 'Gas Maintenance', 'Water Bill', 'Alarm/security system', 'Elevator Maintenance', 'Cleaning', 'Other'];
  }, [building?.commonAreaExpenseCategories]);

  const sortedTenants = React.useMemo(() => {
    return [...tenants].sort((a, b) => {
      const uA = parseInt(a.unit.replace(/\D/g, ''), 10) || 0;
      const uB = parseInt(b.unit.replace(/\D/g, ''), 10) || 0;
      return uA - uB;
    });
  }, [tenants]);

  const isCategoryInListVal = React.useCallback((catList: string[], catName: string): boolean => {
    const norm = (catName || '').toLowerCase().trim();
    return catList.some(item => (item || '').toLowerCase().trim() === norm);
  }, []);

  const getExpenseAmount = React.useCallback((category: string, monthStr: string) => {
    const normCategory = category.toLowerCase().trim();
    return expenses
      .filter(e => e.date && getYearMonthFromDateStr(e.date) === monthStr && (e.category.toLowerCase().trim() === normCategory))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const getTenantPaidAmount = React.useCallback((tenantId: string, monthStr: string) => {
    const tenantPayments = payments.filter(
      p => p.tenantId === tenantId && isMonthCovered(p.monthPaidFor, monthStr) && p.status === 'Paid'
    );
    
    let sum = 0;
    tenantPayments.forEach(p => {
      let divisor = 1;
      if (p.monthPaidFor && p.monthPaidFor.includes(' to ')) {
        const parts = p.monthPaidFor.split(/\s*to\s*/);
        divisor = getMonthCount(parts[0], parts[1]);
      }

      // Reconstruct splits dynamically if missing but single category or fields are present
      let splits = p.splits;
      if (!splits) {
        if (p.category) {
          splits = { [p.category]: p.amount };
        } else if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
          splits = {};
          if (p.rentPaid !== undefined) splits['Rent portion'] = p.rentPaid;
          if (p.guardPaid !== undefined) splits['Guard Salary'] = p.guardPaid;
          if (p.maintenancePaid !== undefined) splits['Service Box'] = p.maintenancePaid;
        }
      }

      if (splits) {
        Object.entries(splits).forEach(([cat, val]) => {
          if (isCategoryInListVal(commonIncomesList, cat) && val > 0) {
            sum += Number(val || 0) / divisor;
          }
        });
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const rentVal = splits['Rent portion'] || splits['Rent'] || 0;
          if (rentVal > 0) {
            sum += Number(rentVal) / divisor;
          }
        }
      } else {
        // Fallback for ultimate legacy records with no metadata
        const defaultG = building?.defaultGuardFee ?? 50;
        const defaultM = building?.defaultMaintenanceFee ?? 30;
        if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
          sum += (p.guardPaid !== undefined ? Number(p.guardPaid) : Math.min(p.amount, defaultG)) / divisor;
        }
        if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
          sum += (p.maintenancePaid !== undefined ? Number(p.maintenancePaid) : Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM)) / divisor;
        }
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const defaultGVal = p.guardPaid ?? defaultG;
          const defaultMVal = p.maintenancePaid ?? defaultM;
          const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - defaultGVal - defaultMVal);
          if (calculatedRent > 0) {
            sum += Number(calculatedRent) / divisor;
          }
        }
      }
    });
    return sum;
  }, [payments, commonIncomesList, building, isCategoryInListVal]);

  // Helper: Common Incomes sum for a given month
  const getCommonIncomeForMonth = (targetMonth: string) => {
    const pMonth = payments.filter(p => p.status === 'Paid' && isMonthCovered(p.monthPaidFor, targetMonth));
    let sum = 0;
    pMonth.forEach(p => {
      let divisor = 1;
      if (p.monthPaidFor && p.monthPaidFor.includes(' to ')) {
        const parts = p.monthPaidFor.split(/\s*to\s*/);
        divisor = getMonthCount(parts[0], parts[1]);
      }

      let splits = p.splits;
      if (!splits) {
        if (p.category) {
          splits = { [p.category]: p.amount };
        } else if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
          splits = {};
          if (p.rentPaid !== undefined) splits['Rent portion'] = p.rentPaid;
          if (p.guardPaid !== undefined) splits['Guard Salary'] = p.guardPaid;
          if (p.maintenancePaid !== undefined) splits['Service Box'] = p.maintenancePaid;
        }
      }

      if (splits) {
        Object.entries(splits).forEach(([cat, val]) => {
          if (isCategoryInListVal(commonIncomesList, cat) && val > 0) {
            sum += Number(val || 0) / divisor;
          }
        });
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const rentVal = splits['Rent portion'] || splits['Rent'] || 0;
          if (rentVal > 0) {
            sum += Number(rentVal) / divisor;
          }
        }
      } else {
        const defaultG = building?.defaultGuardFee ?? 50;
        const defaultM = building?.defaultMaintenanceFee ?? 30;
        if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
          sum += (p.guardPaid !== undefined ? Number(p.guardPaid) : Math.min(p.amount, defaultG)) / divisor;
        }
        if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
          sum += (p.maintenancePaid !== undefined ? Number(p.maintenancePaid) : Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM)) / divisor;
        }
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const defaultGVal = p.guardPaid ?? defaultG;
          const defaultMVal = p.maintenancePaid ?? defaultM;
          const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - defaultGVal - defaultMVal);
          if (calculatedRent > 0) {
            sum += Number(calculatedRent) / divisor;
          }
        }
      }
    });
    return sum;
  };

  // Helper: Common Expenses sum for a given month
  const getCommonExpenseForMonth = (targetMonth: string) => {
    return expenses
      .filter(e => e.date && getYearMonthFromDateStr(e.date) === targetMonth && isCategoryInListVal(commonExpensesList, e.category))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  };

  // Helper: Prior Common Balance accumulator before a given targetMonth OR targetYear
  const getPriorCommonBalance = React.useCallback((targetMonth: string | null, targetYear: string | null) => {
    const limitMonthStr = targetMonth ? targetMonth : `${targetYear}-01`;
    
    // Incomes
    let priorIncomeSum = 0;
    payments.filter(p => p.status === 'Paid').forEach(p => {
      let divisor = 1;
      let monthsCovered: string[] = [];
      if (p.monthPaidFor && p.monthPaidFor.includes(' to ')) {
        const [start, end] = p.monthPaidFor.split(/\s*to\s*/);
        divisor = getMonthCount(start, end);
        const [startY, startM] = start.split('-').map(Number);
        const [endY, endM] = end.split('-').map(Number);
        if (!isNaN(startY) && !isNaN(startM) && !isNaN(endY) && !isNaN(endM)) {
          const m1 = startY * 12 + startM - 1;
          const m2 = endY * 12 + endM - 1;
          for (let i = m1; i <= m2; i++) {
            const y = Math.floor(i / 12);
            const m = (i % 12) + 1;
            monthsCovered.push(`${y}-${String(m).padStart(2, '0')}`);
          }
        }
      } else {
        monthsCovered = [p.monthPaidFor];
      }

      monthsCovered.forEach(mStr => {
        if (mStr < limitMonthStr) {
          let splits = p.splits;
          if (!splits) {
            if (p.category) {
              splits = { [p.category]: p.amount };
            } else if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
              splits = {};
              if (p.rentPaid !== undefined) splits['Rent portion'] = p.rentPaid;
              if (p.guardPaid !== undefined) splits['Guard Salary'] = p.guardPaid;
              if (p.maintenancePaid !== undefined) splits['Service Box'] = p.maintenancePaid;
            }
          }

          if (splits) {
            Object.entries(splits).forEach(([cat, val]) => {
              if (isCategoryInListVal(commonIncomesList, cat) && val > 0) {
                priorIncomeSum += Number(val || 0) / divisor;
              }
            });
            if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
              const rentVal = splits['Rent portion'] || splits['Rent'] || 0;
              if (rentVal > 0) {
                priorIncomeSum += Number(rentVal) / divisor;
              }
            }
          } else {
            const defaultG = building?.defaultGuardFee ?? 50;
            const defaultM = building?.defaultMaintenanceFee ?? 30;
            if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
              priorIncomeSum += (p.guardPaid !== undefined ? Number(p.guardPaid) : Math.min(p.amount, defaultG)) / divisor;
            }
            if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
              priorIncomeSum += (p.maintenancePaid !== undefined ? Number(p.maintenancePaid) : Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM)) / divisor;
            }
            if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
              const defaultGVal = p.guardPaid ?? defaultG;
              const defaultMVal = p.maintenancePaid ?? defaultM;
              const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - defaultGVal - defaultMVal);
              if (calculatedRent > 0) {
                priorIncomeSum += Number(calculatedRent) / divisor;
              }
            }
          }
        }
      });
    });

    // Expenses
    const priorExpenseSum = expenses
      .filter(e => e.date && getYearMonthFromDateStr(e.date) < limitMonthStr && isCategoryInListVal(commonExpensesList, e.category))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return {
      income: priorIncomeSum,
      expense: priorExpenseSum,
      balance: priorIncomeSum - priorExpenseSum,
    };
  }, [payments, expenses, commonIncomesList, commonExpensesList, building, isCategoryInListVal]);

  // 1. Common Incomes filtering and postings (for Single Month view)
  const paymentsInMonth = payments.filter(p => p.status === 'Paid' && isMonthCovered(p.monthPaidFor, statementMonth));
  const totalCommonIncome = getCommonIncomeForMonth(statementMonth);
  const commonIncomePostings: Array<{
    id: string;
    date: string;
    reference: string;
    category: string;
    method: string;
    type: 'income';
    amount: number;
  }> = [];

  paymentsInMonth.forEach(p => {
    let divisor = 1;
    if (p.monthPaidFor && p.monthPaidFor.includes(' to ')) {
      const parts = p.monthPaidFor.split(/\s*to\s*/);
      divisor = getMonthCount(parts[0], parts[1]);
    }

    let splits = p.splits;
    if (!splits) {
      if (p.category) {
        splits = { [p.category]: p.amount };
      } else if (p.rentPaid !== undefined || p.guardPaid !== undefined || p.maintenancePaid !== undefined) {
        splits = {};
        if (p.rentPaid !== undefined) splits['Rent portion'] = p.rentPaid;
        if (p.guardPaid !== undefined) splits['Guard Salary'] = p.guardPaid;
        if (p.maintenancePaid !== undefined) splits['Service Box'] = p.maintenancePaid;
      }
    }

    if (splits) {
      Object.entries(splits).forEach(([cat, val]) => {
        if (isCategoryInListVal(commonIncomesList, cat) && val > 0) {
          commonIncomePostings.push({
            id: `${p.id}-${cat}`,
            date: p.date,
            reference: `${p.tenantName} (Unit ${p.unit}) - ${cat} Contribution${divisor > 1 ? ` (Split 1/${divisor})` : ''}`,
            category: cat,
            method: p.method,
            type: 'income',
            amount: val / divisor,
          });
        }
      });
    } else {
      const defaultG = building?.defaultGuardFee ?? 50;
      const defaultM = building?.defaultMaintenanceFee ?? 30;
      if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
        const amt = p.guardPaid ?? Math.min(p.amount, defaultG);
        if (amt > 0) {
          commonIncomePostings.push({
            id: `${p.id}-guard`,
            date: p.date,
            reference: `${p.tenantName} (Unit ${p.unit}) - Guard Salary Fee${divisor > 1 ? ` (Split 1/${divisor})` : ''}`,
            category: 'Guard Salary',
            method: p.method,
            type: 'income',
            amount: amt / divisor,
          });
        }
      }
      if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
        const amt = p.maintenancePaid ?? Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM);
        if (amt > 0) {
          commonIncomePostings.push({
            id: `${p.id}-maint`,
            date: p.date,
            reference: `${p.tenantName} (Unit ${p.unit}) - Service Box Levy${divisor > 1 ? ` (Split 1/${divisor})` : ''}`,
            category: 'Service Box',
            method: p.method,
            type: 'income',
            amount: amt / divisor,
          });
        }
      }
    }
    
    if (isCategoryInListVal(commonIncomesList, 'Rent portion') && !p.splits) {
      const defaultG = building?.defaultGuardFee ?? 50;
      const defaultM = building?.defaultMaintenanceFee ?? 30;
      const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - (p.guardPaid ?? defaultG) - (p.maintenancePaid ?? defaultM));
      if (calculatedRent > 0) {
        commonIncomePostings.push({
          id: `${p.id}-rent`,
          date: p.date,
          reference: `${p.tenantName} (Unit ${p.unit}) - Rent portion contribution${divisor > 1 ? ` (Split 1/${divisor})` : ''}`,
          category: 'Rent portion',
          method: p.method,
          type: 'income',
          amount: calculatedRent / divisor,
        });
      }
    }
  });

  // 2. Common Expenses filtering and postings (for Single Month view)
  const expensesInMonth = expenses.filter(e => e.date && getYearMonthFromDateStr(e.date) === statementMonth);
  const totalCommonExpense = getCommonExpenseForMonth(statementMonth);
  const commonExpensePostings: Array<{
    id: string;
    date: string;
    reference: string;
    category: string;
    method: string;
    type: 'expense';
    amount: number;
  }> = [];

  expensesInMonth.forEach(e => {
    if (isCategoryInListVal(commonExpensesList, e.category)) {
      commonExpensePostings.push({
        id: e.id,
        date: e.date,
        reference: e.title,
        category: e.category,
        method: 'Expense Invoice',
        type: 'expense',
        amount: e.amount,
      });
    }
  });

  // 3. Combined ledger items sorted by date (for Single Month view)
  const combinedCommonLedger = [...commonIncomePostings, ...commonExpensePostings].sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  const netCommonBalance = totalCommonIncome - totalCommonExpense;

  const priorCommonMonth = React.useMemo(() => {
    return getPriorCommonBalance(statementMonth, null);
  }, [getPriorCommonBalance, statementMonth]);

  const endingCommonMonthBalance = priorCommonMonth.balance + netCommonBalance;

  // --- FULL YEAR CALCULATIONS ---

  // Unit rows for full year
  const unitYearRows = yearMonths.map(({ mStr, mName }) => {
    const rentVal = activeTenant?.monthlyRent || 0;
    const guardVal = activeTenant?.guardFee ?? 50;
    const maintVal = activeTenant?.maintenanceFee ?? 30;

    let isActive = true;
    if (activeTenant?.startDate && mStr < activeTenant.startDate.substring(0, 7)) {
      isActive = false;
    }
    if (activeTenant?.endDate && mStr > activeTenant.endDate.substring(0, 7)) {
      isActive = false;
    }

    const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-06"
    const dueAmount = isActive ? (Number(rentVal) + Number(guardVal) + Number(maintVal)) : 0;
    
    const paidAmount = payments
      .filter(p => p.tenantId === selectedTenantId && p.status === 'Paid' && isMonthCovered(p.monthPaidFor, mStr))
      .reduce((sum, p) => {
        let divisor = 1;
        if (p.monthPaidFor && p.monthPaidFor.includes(' to ')) {
          const parts = p.monthPaidFor.split(/\s*to\s*/);
          divisor = getMonthCount(parts[0], parts[1]);
        }
        return sum + (Number(p.amount || 0) / divisor);
      }, 0);

    const outstanding = (isActive && mStr <= currentYearMonth) ? Math.max(dueAmount - paidAmount, 0) : 0;

    const matchedPayments = payments.filter(
      p => p.tenantId === selectedTenantId && p.status === 'Paid' && isMonthCovered(p.monthPaidFor, mStr)
    );
    const receiptRefs = matchedPayments.length > 0 
      ? matchedPayments.map(p => p.receiptNumber || 'Cleared').join(', ')
      : '—';

    return {
      mName,
      mStr,
      isActive,
      dueAmount,
      paidAmount,
      outstanding,
      receiptRefs,
    };
  });

  const totalUnitYearDue = unitYearRows.reduce((sum, r) => sum + r.dueAmount, 0);
  const totalUnitYearPaid = unitYearRows.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalUnitYearOutstanding = unitYearRows.reduce((sum, r) => sum + r.outstanding, 0);

  // Common area rows for full year
  const commonYearRows = yearMonths.map(({ mStr, mName }) => {
    const commonIncome = getCommonIncomeForMonth(mStr);
    const commonExpense = getCommonExpenseForMonth(mStr);
    const balance = commonIncome - commonExpense;

    return {
      mName,
      mStr,
      commonIncome,
      commonExpense,
      balance,
    };
  });

  const totalCommonYearIncome = commonYearRows.reduce((sum, r) => sum + r.commonIncome, 0);
  const totalCommonYearExpense = commonYearRows.reduce((sum, r) => sum + r.commonExpense, 0);
  const totalCommonYearBalance = totalCommonYearIncome - totalCommonYearExpense;

  const priorCommonYear = React.useMemo(() => {
    return getPriorCommonBalance(null, statementYear);
  }, [getPriorCommonBalance, statementYear]);

  const endingCommonYearBalance = priorCommonYear.balance + totalCommonYearBalance;

  // Parse custom template reminder text
  const getParsedTemplate = (t: Tenant, pMonth: string, customAmount?: number) => {
    const finalAmount = customAmount !== undefined ? customAmount : t.monthlyRent;
    return reminderTemplate
      .replace(/{TenantName}/g, t.name)
      .replace(/{BeneficiaryName}/g, t.name)
      .replace(/{Unit}/g, t.unit)
      .replace(/{RentAmount}/g, formatVal(finalAmount))
      .replace(/{ShareAmount}/g, formatVal(finalAmount))
      .replace(/{DueAmount}/g, formatVal(finalAmount))
      .replace(/{DueDay}/g, t.rentDueDateDay.toString())
      .replace(/{Month}/g, pMonth)
      .replace(/{transfer_ID}/g, building?.bankTransferId || '');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(id);
    setTimeout(() => setCopiedSuccess(null), 2000);
  };

  const handleOpenLogPayment = (group: any) => {
    setLoggingUnitGroup(group);
    if (group.payments.length > 0) {
      const p = group.payments[0];
      setSelectedPaymentToLog(p);
      setLogAmount(p.amount);
    } else {
      setSelectedPaymentToLog(null);
      setLogAmount(group.totalDueAmount);
    }
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogMethod('Bank Transfer');
    setLogNotes('Logged via Statements & Alerts Tab');
    setLogSuccessMessage(null);
    setLogPaymentModalOpen(true);
  };

  const handleConfirmLogPayment = async () => {
    if (!selectedPaymentToLog || !onEditPayment) return;
    setIsLoggingPayment(true);
    setLogSuccessMessage(null);
    try {
      const updated: Payment = {
        ...selectedPaymentToLog,
        status: 'Paid',
        date: logDate,
        method: logMethod,
        amount: logAmount,
        notes: logNotes,
      };
      await onEditPayment(updated);
      setLogSuccessMessage('Payment logged successfully as PAID!');
      setTimeout(() => {
        setLogPaymentModalOpen(false);
        setLogSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Error logging payment:', err);
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const runAutopilotScan = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const referenceDate = new Date();
    const currentMonthStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;

    let logsToAdd: Array<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'warn' }> = [
      { id: Date.now().toString() + '-start', time: timestamp, msg: `Billing integrity audit initiated. Current month: ${currentMonthStr}.`, type: 'info' },
    ];

    // Filter active tenants
    const activeTenants = tenants.filter(t => t.status === 'active');
    logsToAdd.push({
      id: Date.now().toString() + '-scan-count',
      time: timestamp,
      msg: `Auditing agreements for ${activeTenants.length} active residents...`,
      type: 'info'
    });

    const { paymentsToCreate, paymentsToUpdate } = checkAndSyncPayments(
      tenants,
      payments,
      building,
      referenceDate
    );

    paymentsToCreate.forEach(c => {
      logsToAdd.push({
        id: Date.now().toString() + `-create-log-${c.tenantId}-${c.monthPaidFor}`,
        time: timestamp,
        msg: `Unit ${c.unit} (${c.tenantName}) is missing billing for ${c.monthPaidFor}. Auto-generating new ${c.status} invoice (${formatVal(c.amount)}).`,
        type: c.status === 'Overdue' ? 'warn' : 'info'
      });
    });

    paymentsToUpdate.forEach(u => {
      const p = payments.find(x => x.id === u.id);
      if (p) {
        logsToAdd.push({
          id: Date.now().toString() + `-promote-log-${u.id}`,
          time: timestamp,
          msg: `Unit ${p.unit} (${p.tenantName}) for month ${p.monthPaidFor} has exceeded due day. Status updated to ${u.status}.`,
          type: 'warn'
        });
      }
    });

    if (paymentsToCreate.length > 0 || paymentsToUpdate.length > 0) {
      if (onAutopilotSync) {
        try {
          await onAutopilotSync(paymentsToCreate, paymentsToUpdate);
          logsToAdd.push({
            id: Date.now().toString() + '-sync-success',
            time: timestamp,
            msg: `Billing audit complete. Created ${paymentsToCreate.length} new invoices and marked ${paymentsToUpdate.length} accounts as overdue.`,
            type: 'success'
          });
        } catch (err) {
          logsToAdd.push({
            id: Date.now().toString() + '-sync-err',
            time: timestamp,
            msg: `Unable to commit automated postings to database.`,
            type: 'warn'
          });
        }
      } else {
        logsToAdd.push({
          id: Date.now().toString() + '-sync-missing-cb',
          time: timestamp,
          msg: `Local system state updated with scanned cycle values.`,
          type: 'warn'
        });
      }
    } else {
      logsToAdd.push({
        id: Date.now().toString() + '-clean',
        time: timestamp,
        msg: `Billing ledger audit healthy. No missing entries or overdue changes needed.`,
        type: 'success'
      });
    }

    // Load prepared reminders for remaining unpaid ones matching statementMonth
    const updatedUnpaid = payments.filter(p => {
      if (p.status === 'Paid') return false;
      if (!isMonthCovered(p.monthPaidFor, statementMonth)) return false;
      const isAlreadyPaid = payments.some(other => 
        other.status === 'Paid' && 
        other.tenantId === p.tenantId && 
        isMonthCovered(other.monthPaidFor, statementMonth)
      );
      return !isAlreadyPaid;
    });
    
    paymentsToCreate.filter(c => isMonthCovered(c.monthPaidFor, statementMonth)).forEach(c => {
      logsToAdd.push({
        id: Date.now().toString() + `-remind-${c.tenantId}`,
        time: timestamp,
        msg: `Notification draft ready for ${c.tenantName} (Unit ${c.unit}) for ${statementMonth} — Balance: ${formatVal(c.amount)}`,
        type: 'warn'
      });
    });

    updatedUnpaid.forEach((p, idx) => {
      const isAlreadyLogged = paymentsToCreate.some(c => c.tenantId === p.tenantId && isMonthCovered(c.monthPaidFor, statementMonth)) || paymentsToUpdate.some(u => u.id === p.id);
      if (!isAlreadyLogged) {
        logsToAdd.push({
          id: Date.now().toString() + `-exist-remind-${idx}`,
          time: timestamp,
          msg: `Active dues reminder for ${p.tenantName} (Unit ${p.unit}) for ${statementMonth} — Balance: ${formatVal(p.amount)} [Status: ${p.status}]`,
          type: 'warn'
        });
      }
    });

    setAutomationLog(prev => [...logsToAdd, ...prev].slice(0, 25));
  };

  return (
    <div className="space-y-6" id="statements-generator-module">
      {/* Sub Tabs Selection */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveSubTab('statement')}
          className={`pb-3 font-bold text-sm px-4 relative transition-colors ${
            activeSubTab === 'statement' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {activeSubTab === 'statement' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
          )}
          {language === 'ar' ? 'كشوفات الحسابات' : 'Account Statements'}
        </button>
        <button
          onClick={() => setActiveSubTab('automation')}
          className={`pb-3 font-bold text-sm px-4 relative transition-colors ${
            activeSubTab === 'automation' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {activeSubTab === 'automation' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
          )}
          {language === 'ar' ? 'التنبيهات والأتمتة' : 'Reminders & Automations Setup'}
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

      {/* RENDER STATEMENT GENERATOR SUBTAB */}
      {activeSubTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit no-print">
            <h3 className="font-bold text-slate-800 text-lg">
              {language === 'ar' ? 'تصفية كشف الحساب' : 'Statement Filters'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'أصدر كشوفات حساب احترافية للوحدة أو لعموم البناية' : 'Generate professional unit or building-wide statements'}
            </p>

            {/* Statement Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {language === 'ar' ? 'نوع كشف الحساب' : 'Statement Type'}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatementType('unit')}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statementType === 'unit'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50'
                      : 'text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  👤 {language === 'ar' ? 'كشف حساب الوحدة' : 'Unit Ledger'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatementType('commonArea')}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statementType === 'commonArea'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50'
                      : 'text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  🏢 {language === 'ar' ? 'حسابات الصندوق المشترك' : 'Common Area'}
                </button>
              </div>
            </div>

            {/* Statement Scope Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {language === 'ar' ? 'نطاق الكشف' : 'Statement Scope'}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatementScope('month')}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statementScope === 'month'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50'
                      : 'text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  📅 {language === 'ar' ? 'دورة شهرية' : 'Month Cycle'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatementScope('year')}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statementScope === 'year'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50'
                      : 'text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  🗓️ {language === 'ar' ? 'سنة كاملة' : 'Full Year'}
                </button>
              </div>
            </div>

            {/* Tenant dropdown */}
            {statementType === 'unit' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {language === 'ar' ? 'تصفية حسب الوحدة / الساكن' : 'Filter Unit / Resident'}
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">
                    {language === 'ar' ? '-- اختر الساكن --' : '-- Choose Resident --'}
                  </option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {language === 'ar' ? `وحدة ${t.unit} - ${t.name}` : `Unit ${t.unit} - ${t.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Billing month / Billing year selection */}
            {statementScope === 'month' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {language === 'ar' ? 'شهر دورة الكشف' : 'Statement Cycle Month'}
                </label>
                <input
                  type="month"
                  value={statementMonth}
                  onChange={(e) => setStatementMonth(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {language === 'ar' ? 'سنة دورة الكشف' : 'Statement Cycle Year'}
                </label>
                <select
                  value={statementYear}
                  onChange={(e) => setStatementYear(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white font-mono"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors"
               >
                <Printer className="w-4 h-4" />
                {language === 'ar' ? 'طباعة كشف الحساب' : 'Print Statement Ledger'}
              </button>
            </div>
          </div>

          {/* Statement Document View */}
          <div className={`lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 ${
            statementType === 'commonArea' && statementScope === 'year' ? 'print-landscape' : 'print-portrait'
          }`} id="printable-statement-document">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: ${statementType === 'commonArea' && statementScope === 'year' ? 'landscape' : 'portrait'} !important;
                  margin: ${statementType === 'commonArea' && statementScope === 'year' ? '10mm 12mm' : '12mm 15mm'} !important;
                }
              }
            `}} />
            {statementScope === 'year' ? (
              // ============================================
              // RENDER ANNUAL VIEW (COMMON AREA OR UNIT LEDGER)
              // ============================================
              statementType === 'commonArea' ? (
                <>
                  {/* Common Area Annual Statement Headings */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'ar' ? 'كشف الحساب السنوي للخزينة المشتركة' : 'ANNUAL TREASURY STATEMENT'}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium font-mono mt-1">
                        {language === 'ar' ? `فترة الكشف: سنة كاملة ${statementYear}` : `STATEMENT PERIOD: FULL YEAR ${statementYear}`}
                      </p>
                    </div>
                    <div className="text-left sm:text-right font-sans">
                      <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || (language === 'ar' ? 'أبراج المجمع السكني' : 'Grandview Residences')}</h5>
                      <p className="text-xs text-slate-400">{building?.address || (language === 'ar' ? 'إدارة العقارات المتميزة' : '100 Luxury Heights Boulevard')}</p>
                    </div>
                  </div>

                  {/* Common Area Metadata info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        {language === 'ar' ? 'معد لصالح' : 'PREPARED FOR'}
                      </span>
                      <div className="font-bold text-slate-800 text-sm mt-1">
                        {language === 'ar' ? 'لجنة جمعية اتحاد الملاك والساكنين' : 'Property Owners Association Committee'}
                      </div>
                      <div className="text-slate-500 mt-1 font-mono">
                        {language === 'ar' ? 'السجل: دفتر القيود السنوي للصندوق المشترك' : 'Registry: Annual Common Area Chest Ledger'}
                      </div>
                      <div className="text-slate-500">
                        {language === 'ar' ? `عدد الساكنين النشطين: ${tenants.length} شقة مأهولة` : `Active Residents Count: ${tenants.length} occupied units`}
                      </div>
                    </div>
                    <div className="text-left md:text-right font-sans">
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        {language === 'ar' ? 'التخصيصات المشتركة المحددة' : 'DESIGNATED COMMON ALLOCATIONS'}
                      </span>
                      <div className="text-slate-500 mt-1 font-mono text-[11px] leading-relaxed">
                        {language === 'ar' ? (
                          <>
                            الإيرادات: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                            المصروفات: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                          </>
                        ) : (
                          <>
                            Incomes: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                            Expenses: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Common Area Financial overview boxes */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        {language === 'ar' ? 'الرصيد الافتتاحي' : 'Beginning Balance'}
                      </span>
                      <span className={`font-bold text-base font-mono ${priorCommonYear.balance >= 0 ? 'text-slate-700' : 'text-rose-700'}`}>
                        {priorCommonYear.balance >= 0 ? '+' : ''}{formatVal(priorCommonYear.balance)}
                      </span>
                    </div>
                    <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                        {language === 'ar' ? 'الإيرادات السنوية' : 'Annual Income'}
                      </span>
                      <span className="font-bold text-emerald-800 text-base font-mono">+{formatVal(totalCommonYearIncome)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        {language === 'ar' ? 'المصروفات السنوية' : 'Annual Expenses'}
                      </span>
                      <span className="font-bold text-slate-700 text-base font-mono">-{formatVal(totalCommonYearExpense)}</span>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${
                      endingCommonYearBalance >= 0 ? 'bg-sky-50 border-sky-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <span className={`text-[10px] font-bold block uppercase ${
                        endingCommonYearBalance >= 0 ? 'text-sky-600' : 'text-rose-600'
                      }`}>
                        {language === 'ar' ? 'الرصيد الختامي' : 'Ending Balance'}
                      </span>
                      <span className={`font-bold text-base font-mono ${
                        endingCommonYearBalance >= 0 ? 'text-sky-700' : 'text-rose-700'
                      }`}>
                        {endingCommonYearBalance >= 0 ? '+' : ''}{formatVal(endingCommonYearBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Month Range Filter for full-year spreadsheet */}
                  <div className="space-y-2 font-sans no-print">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          {language === 'ar' ? 'معاينة نطاق الجدول' : 'Spreadsheet Range View'}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {language === 'ar' ? 'تبديل الأقسام لعرض أو طباعة أشهر معينة بشكل منسق ومريح' : 'Toggle segments to view or print specific months comfortably'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setMonthViewRange('all')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            monthViewRange === 'all'
                              ? 'bg-slate-800 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          📅 {language === 'ar' ? 'سنة كاملة' : 'Full Year'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonthViewRange('q1')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            monthViewRange === 'q1'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          🌸 {language === 'ar' ? 'الربع الأول (1-3)' : 'Q1 (Jan-Mar)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonthViewRange('q2')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            monthViewRange === 'q2'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          ☀️ {language === 'ar' ? 'الربع الثاني (4-6)' : 'Q2 (Apr-Jun)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonthViewRange('q3')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            monthViewRange === 'q3'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          🍁 {language === 'ar' ? 'الربع الثالث (7-9)' : 'Q3 (Jul-Sep)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonthViewRange('q4')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            monthViewRange === 'q4'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          ❄️ {language === 'ar' ? 'الربع الرابع (10-12)' : 'Q4 (Oct-Dec)'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fully Comprehensive Master Spreadsheet Matrix Table */}
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        📂 {language === 'ar' ? 'صحيفة الأستاذ السنوية وتفاصيل دفعات الوحدات' : 'Annual Ledger Sheet & Unit Payments Detail'}
                      </h5>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded font-mono">
                        {monthViewRange === 'all' 
                          ? (language === 'ar' ? 'جميع الأشهر' : 'All Months') 
                          : `${language === 'ar' ? 'القسم:' : 'Segment:'} ${monthViewRange.toUpperCase()}`}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto scrollbar-thin shadow-xs bg-white">
                      <table className="w-full text-left text-xs text-slate-600 border-collapse table-fixed min-w-[800px]">
                        <thead>
                          {/* Single Clean Month header group without split Amount/Paid */}
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10.5px] uppercase font-sans">
                            <th className="p-3 font-extrabold text-slate-700 align-middle border-r border-slate-200 w-52 sticky left-0 bg-slate-100 z-10">
                              {language === 'ar' ? 'الفاتورة / الساكنين' : 'Bill / Residents'}
                            </th>
                            {filteredMonths.map((m) => (
                              <th
                                key={m.mStr}
                                className="p-3 text-right border-r border-slate-200 tracking-wider font-extrabold text-slate-800 bg-slate-100/95 font-sans w-32 min-w-[120px]"
                              >
                                {m.mName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {/* ========================================================
                              SECTION 1: BUILDING COSTS (EXPENSES)
                              ======================================================== */}
                          <tr className="bg-slate-100/50 font-black text-slate-700">
                            <td 
                              colSpan={filteredMonths.length + 1} 
                              className="p-2.5 border-b border-slate-200 sticky left-0 bg-slate-100/80 z-10 text-[11px] uppercase font-sans font-black text-left"
                            >
                              🏢 {language === 'ar' ? 'تكاليف المبنى (المصروفات المشتركة)' : 'Building Costs (Shared Expenses)'}
                            </td>
                          </tr>

                          {expenseCategoriesToRender.map((category) => {
                            return (
                              <tr key={category} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-2 border-r border-slate-200 sticky left-0 bg-white font-bold text-slate-700 z-10 font-sans truncate text-[11px]">
                                  {category}
                                </td>
                                {filteredMonths.map((m) => {
                                  const amount = getExpenseAmount(category, m.mStr);
                                  const hasExpense = amount > 0;
                                  return (
                                    <td key={m.mStr} className={`p-2 border-r border-slate-200 text-right text-[11px] font-bold ${hasExpense ? 'text-rose-600 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                                      {hasExpense ? `-${formatVal(amount)}` : formatVal(0)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}

                          {/* Section 1 Total */}
                          <tr className="bg-rose-50/30 text-rose-900 border-y border-slate-200 font-sans">
                            <td className="p-2.5 border-r border-slate-200 sticky left-0 bg-rose-50/40 z-10 font-bold text-[11px] text-rose-900 font-sans">
                              {language === 'ar' ? 'إجمالي مصروفات المبنى' : 'Building Expenses Total'}
                            </td>
                            {filteredMonths.map((m) => {
                              const totalMonthExpense = getCommonExpenseForMonth(m.mStr);
                              return (
                                <td key={m.mStr} className="p-2.5 text-right font-mono font-extrabold text-[11.5px] border-r border-slate-200 text-rose-800 bg-rose-50/10">
                                  {totalMonthExpense > 0 ? `-${formatVal(totalMonthExpense)}` : formatVal(0)}
                                </td>
                              );
                            })}
                          </tr>

                          {/* ========================================================
                              SECTION 2: TENANTS PAYMENTS (INCOME)
                              ======================================================== */}
                          <tr className="bg-slate-100/50 font-black text-slate-700 border-t-2 border-slate-200">
                            <td 
                              colSpan={filteredMonths.length + 1} 
                              className="p-2.5 border-b border-slate-200 sticky left-0 bg-slate-100/80 z-10 text-[11px] uppercase font-sans font-black text-left"
                            >
                              👤 {language === 'ar' ? 'دفعات الساكنين (الإيرادات المحصلة)' : 'Tenants Payments (Incomes Collected)'}
                            </td>
                          </tr>

                          {sortedTenants.map((tenant) => {
                            return (
                              <tr key={tenant.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-2 border-r border-slate-200 sticky left-0 bg-white font-bold text-slate-700 z-10 font-sans truncate text-[11px]">
                                  Apt #{tenant.unit} - {tenant.name}
                                </td>
                                {filteredMonths.map((m) => {
                                  const amountPaid = getTenantPaidAmount(tenant.id, m.mStr);
                                  const hasPaid = amountPaid > 0;
                                  return (
                                    <td key={m.mStr} className={`p-2 border-r border-slate-200 text-right text-[11px] font-bold ${hasPaid ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                                      {hasPaid ? `+${formatVal(amountPaid)}` : formatVal(0)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}

                          {/* Section 2 Total */}
                          <tr className="bg-emerald-50/30 text-emerald-950 border-y border-slate-200 font-sans">
                            <td className="p-2.5 border-r border-slate-200 sticky left-0 bg-emerald-50/40 z-10 font-bold text-[11px] text-emerald-900 font-sans">
                              {language === 'ar' ? 'إجمالي دفعات الساكنين' : 'Tenant Payments Total'}
                            </td>
                            {filteredMonths.map((m) => {
                              const totalMonthIncome = getCommonIncomeForMonth(m.mStr);
                              return (
                                <td key={m.mStr} className="p-2.5 text-right font-mono font-extrabold text-[11.5px] border-r border-slate-200 text-emerald-700 bg-emerald-50/10">
                                  {totalMonthIncome > 0 ? `+${formatVal(totalMonthIncome)}` : formatVal(0)}
                                </td>
                              );
                            })}
                          </tr>

                          {/* ========================================================
                              SECTION 3: METRIC GRAND TOTAL SURPLUS/DEFICIT (MATCHES PDF)
                              ======================================================== */}
                          <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-800 font-sans">
                            <td className="p-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-10 font-black text-[11px] text-slate-800 font-sans uppercase">
                              {language === 'ar' ? 'صافي الفائض / العجز' : 'Net Surplus / Deficit'}
                            </td>
                            {filteredMonths.map((m) => {
                              const totalMonthIncome = getCommonIncomeForMonth(m.mStr);
                              const totalMonthExpense = getCommonExpenseForMonth(m.mStr);
                              const netBalance = totalMonthIncome - totalMonthExpense;
                              return (
                                <td key={m.mStr} className={`p-3 text-right font-mono font-black text-[11.5px] border-r border-slate-200 ${
                                  netBalance > 0 ? 'text-emerald-700' : netBalance < 0 ? 'text-rose-700' : 'text-slate-500'
                                }`}>
                                  {netBalance > 0 ? `+${formatVal(netBalance)}` : netBalance < 0 ? `-${formatVal(Math.abs(netBalance))}` : formatVal(0)}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans">
                    {language === 'ar' 
                      ? `يعكس بيان الصندوق المشترك السنوي هذا الحسابات المدمجة لمدة 12 شهراً ومطابقة سجلات تقسيم دفعات الساكنين النشطين ومخصصات مصروفات المبنى العامة لعام ${statementYear}.`
                      : `This Common Area Annual Statement reflects the combined 12-month treasury accounts matching active tenant split registries and general building expense allocations for the year ${statementYear}.`}
                  </div>
                </>
              ) : activeTenant ? (
                <>
                  {/* Tenant Unit Annual Statement Headings */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5 text-start">
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'ar' ? 'كشف الحساب السنوي' : 'ANNUAL STATEMENT OF ACCOUNT'}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium font-mono mt-1">
                        {language === 'ar' ? `فترة الكشف: سنة كاملة ${statementYear}` : `STATEMENT PERIOD: FULL YEAR ${statementYear}`}
                      </p>
                    </div>
                    <div className="text-start sm:text-end font-sans col">
                      <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || (language === 'ar' ? 'أبراج المجمع السكني' : 'Grandview Residences')}</h5>
                      <p className="text-xs text-slate-400">{building?.address || (language === 'ar' ? 'شارع مجمع الفخامة الرئيسي' : '100 Luxury Heights Boulevard')}</p>
                    </div>
                  </div>

                  {/* Tenant Metadata info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-start">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">{language === 'ar' ? 'أُعد لصالح السيد/ة' : 'PREPARED FOR'}</span>
                      <div className="font-bold text-slate-800 text-sm mt-1">{activeTenant.name}</div>
                      <div className="text-slate-500 mt-1 font-mono">{activeTenant.phone || (language === 'ar' ? 'لا يوجد هاتف مؤكد' : 'No phone verified')}</div>
                      <div className="text-slate-500">{activeTenant.email || (language === 'ar' ? 'لا يوجد بريد إلكتروني مؤكد' : 'No email verified')}</div>
                    </div>
                    <div className="text-start md:text-end font-sans">
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">{language === 'ar' ? 'تفاصيل الوحدة' : 'UNIT DETAILS'}</span>
                      <div className="font-extrabold text-blue-600 text-sm mt-1">{language === 'ar' ? 'وحدة:' : 'Unit :'} {activeTenant.unit}</div>
                      <div className="text-slate-500 mt-1">{language === 'ar' ? 'بداية العقد:' : 'Term Start:'} {activeTenant.startDate || '—'}</div>
                      <div className="text-slate-500 font-mono">{language === 'ar' ? 'تاريخ الاستحقاق: يوم' : 'Dues Due Cycle: Day'} {activeTenant.rentDueDateDay}</div>
                    </div>
                  </div>

                  {/* Financial overview boxes */}
                  <div className="grid grid-cols-3 gap-3 font-sans">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        {language === 'ar' ? 'المستحق السنوي المطلوب' : 'Annual Share Invoiced'}
                      </span>
                      <span className="font-bold text-slate-850 text-md font-mono">{formatVal(totalUnitYearDue)}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center font-sans">
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                        {language === 'ar' ? 'المبلغ السنوي المدفوع' : 'Annual Amount Paid'}
                      </span>
                      <span className="font-bold text-emerald-700 text-md font-mono">{formatVal(totalUnitYearPaid)}</span>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${
                      totalUnitYearOutstanding > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className={`text-[10px] font-bold block uppercase ${
                        totalUnitYearOutstanding > 0 ? 'text-rose-600 font-sans' : 'text-slate-400'
                      }`}>
                        {language === 'ar' ? 'الرصيد المستحق القائم' : 'Outstanding Due'}
                      </span>
                      <span className={`font-bold text-md font-mono ${
                        totalUnitYearOutstanding > 0 ? 'text-rose-700' : 'text-slate-705'
                      }`}>
                        {formatVal(totalUnitYearOutstanding)}
                      </span>
                    </div>
                  </div>

                  {/* Month to Month Individual Table */}
                  <div className="space-y-3 font-sans text-start">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      {language === 'ar' ? 'دفتر الأستاذ الشهري المفصل' : 'Month-to-Month Statement Ledger'}
                    </h5>
                    <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                      <table className="w-full min-w-[640px] text-start text-xs text-slate-605">
                        <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 ps-4 whitespace-nowrap text-start">{language === 'ar' ? 'الشهر' : 'Month'}</th>
                            <th className="p-3 whitespace-nowrap text-start">{language === 'ar' ? 'حالة الإشغال' : 'Occupancy Status'}</th>
                            <th className="p-3 text-end whitespace-nowrap">{language === 'ar' ? 'المطالبات المستحقة' : 'Invoiced Share Dues'}</th>
                            <th className="p-3 text-end whitespace-nowrap">{language === 'ar' ? 'الدفعات المقبوضة' : 'Receipt Payments'}</th>
                            <th className="p-3 text-end whitespace-nowrap">{language === 'ar' ? 'الرصيد المتبقي' : 'Outstanding Balance'}</th>
                            <th className="p-3 whitespace-nowrap pe-4 text-start">{language === 'ar' ? 'مراجع الإيصالات' : 'Receipt References'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-start">
                          {unitYearRows.map((row) => (
                            <tr key={row.mStr} className="hover:bg-slate-50/10 transition-colors">
                              <td className="p-3 ps-4 font-semibold text-slate-700 font-sans whitespace-nowrap text-start">
                                {language === 'ar' ? (row.mStr === '01' ? 'كانون الثاني' : row.mStr === '02' ? 'شباط' : row.mStr === '03' ? 'آذار' : row.mStr === '04' ? 'نيسان' : row.mStr === '05' ? 'أيار' : row.mStr === '06' ? 'حزيران' : row.mStr === '07' ? 'تموز' : row.mStr === '08' ? 'آب' : row.mStr === '09' ? 'أيلول' : row.mStr === '10' ? 'تشرين الأول' : row.mStr === '11' ? 'تشرين الثاني' : 'كانون الأول') : row.mName} {statementYear}
                              </td>
                              <td className="p-3 font-sans whitespace-nowrap text-start">
                                {row.isActive ? (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                                    {language === 'ar' ? 'مشغول' : 'Occupied'}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                                    {language === 'ar' ? 'شاغر / غير نشط' : 'Vacant / Inactive'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-end text-slate-850 whitespace-nowrap">
                                {row.dueAmount > 0 ? formatVal(row.dueAmount) : '—'}
                              </td>
                              <td className="p-3 text-end text-emerald-600 font-bold whitespace-nowrap">
                                {row.paidAmount > 0 ? formatVal(row.paidAmount) : formatVal(0)}
                              </td>
                              <td className={`p-3 text-end font-bold whitespace-nowrap ${
                                row.outstanding > 0 ? 'text-rose-600 font-sans' : 'text-slate-400'
                              }`}>
                                {row.outstanding > 0 ? formatVal(row.outstanding) : formatVal(0)}
                              </td>
                              <td className="p-3 text-slate-500 max-w-[150px] truncate pe-4 whitespace-nowrap font-sans text-start">
                                {row.receiptRefs || '—'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                            <td colSpan={2} className="p-3 ps-4 font-sans whitespace-nowrap text-start">
                              {language === 'ar' ? 'المجاميع السنوية' : 'ANNUAL TOTALS'}
                            </td>
                            <td className="p-3 text-end text-slate-850 whitespace-nowrap">{formatVal(totalUnitYearDue)}</td>
                            <td className="p-3 text-end text-emerald-700 whitespace-nowrap">{formatVal(totalUnitYearPaid)}</td>
                            <td className={`p-3 text-end whitespace-nowrap ${
                              totalUnitYearOutstanding > 0 ? 'text-rose-700' : 'text-slate-720'
                            }`}>
                              {formatVal(totalUnitYearOutstanding)}
                            </td>
                            <td className="p-3 font-sans text-end font-bold pe-4 whitespace-nowrap">
                              <span className={`text-[10px] uppercase px-2.5 py-1 rounded-full ${
                                totalUnitYearOutstanding === 0 ? 'bg-emerald-100 text-emerald-800 font-sans' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {totalUnitYearOutstanding === 0 ? (language === 'ar' ? 'مسدد بالكامل' : 'Fully Settled') : (language === 'ar' ? `مسدد بنسبة ${Math.round((totalUnitYearPaid / (totalUnitYearDue || 1)) * 100)}%` : `${Math.round((totalUnitYearPaid / (totalUnitYearDue || 1)) * 100)}% Settled`)}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans">
                    {language === 'ar' ? `نشكركم على إقامتكم النشطة في ${building?.name || 'أبراج المجمع السكني'}. يعرض ملخص الحساب هذا الدفعات الرسمية وفواتير الرسوم المطابقة لسجلات الدورات لعام ${statementYear}. يرجى تسوية أي رسوم مستحقة في الوقت المحدد.` : `Thank you for your active residency at ${building?.name || 'Grandview Residences'}. This account summary displays official payments and billing invoices matching cycle registries for the year ${statementYear}. Please settle any outstanding fees on time.`}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-400 font-sans">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold font-sans">
                    {language === 'ar' ? 'إصدار ملخص كشف الحساب' : 'Generate Account Statement Summary'}
                  </p>
                  <p className="text-xs mt-1">
                    {language === 'ar' ? 'يرجى تحديد ساكن نشط من مصفاة التصفية الجانبية.' : 'Please select an active resident reference in the filters left.'}
                  </p>
                </div>
              )
            ) : statementType === 'commonArea' ? (
              <>
                {/* Common Area Statement Headings */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'ar' ? 'كشف حساب الصندوق المشترك' : 'COMMON AREA TREASURY STATEMENT'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium font-mono mt-1">
                      {language === 'ar' ? `فترة الكشف: ${statementMonth}` : `STATEMENT PERIOD: ${statementMonth}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || (language === 'ar' ? 'أبراج المجمع السكني' : 'Grandview Residences')}</h5>
                    <p className="text-xs text-slate-400">{building?.address || (language === 'ar' ? 'شارع مجمع الفخامة الرئيسي' : '100 Luxury Heights Boulevard')}</p>
                  </div>
                </div>

                {/* Common Area Metadata info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      {language === 'ar' ? 'معد لصالح' : 'PREPARED FOR'}
                    </span>
                    <div className="font-bold text-slate-800 text-sm mt-1">
                      {language === 'ar' ? 'لجنة جمعية اتحاد الملاك والساكنين' : 'Property Owners Association Committee'}
                    </div>
                    <div className="text-slate-500 mt-1 font-mono">
                      {language === 'ar' ? 'السجل: دفتر القيود الكامل للصندوق المشترك' : 'Registry: Full Common Area Chest Ledger'}
                    </div>
                    <div className="text-slate-500">
                      {language === 'ar' ? `عدد الساكنين النشطين: ${tenants.length} شقة مأهولة` : `Active Residents Count: ${tenants.length} occupied units`}
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      {language === 'ar' ? 'التخصيصات المشتركة المحددة' : 'DESIGNATED COMMON ALLOCATIONS'}
                    </span>
                    <div className="text-slate-500 mt-1 font-mono text-[11px] leading-relaxed">
                      {language === 'ar' ? (
                        <>
                          الإيرادات: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                          المصروفات: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                        </>
                      ) : (
                        <>
                          Incomes: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                          Expenses: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Common Area Financial overview boxes */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      {language === 'ar' ? 'الرصيد الافتتاحي' : 'Beginning Balance'}
                    </span>
                    <span className={`font-bold text-md font-mono ${priorCommonMonth.balance >= 0 ? 'text-slate-700' : 'text-rose-600 font-extrabold'}`}>
                      {priorCommonMonth.balance >= 0 ? '+' : ''}{formatVal(priorCommonMonth.balance)}
                    </span>
                  </div>
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                      {language === 'ar' ? 'الإيرادات المشتركة' : 'Common Incomes'}
                    </span>
                    <span className="font-bold text-emerald-800 text-md font-mono">+{formatVal(totalCommonIncome)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                      {language === 'ar' ? 'المصروفات المشتركة' : 'Common Expenses'}
                    </span>
                    <span className="font-bold text-slate-700 text-md font-mono">-{formatVal(totalCommonExpense)}</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    endingCommonMonthBalance >= 0 ? 'bg-sky-50 border-sky-100' : 'bg-rose-50 border-rose-100'
                  }`}>
                    <span className={`text-[10px] font-bold block uppercase ${
                      endingCommonMonthBalance >= 0 ? 'text-sky-600' : 'text-rose-600'
                    }`}>
                      {language === 'ar' ? 'الرصيد الختامي' : 'Ending Balance'}
                    </span>
                    <span className={`font-bold text-md font-mono ${
                      endingCommonMonthBalance >= 0 ? 'text-sky-700' : 'text-rose-700'
                    }`}>
                      {endingCommonMonthBalance >= 0 ? '+' : ''}{formatVal(endingCommonMonthBalance)}
                    </span>
                  </div>
                </div>

                {/* Combined dynamic treasury ledger postings */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    {language === 'ar' ? 'قيود دفتر الأستاذ للحسابات' : 'Statement Ledger Postings'}
                  </h5>
                  <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4 whitespace-nowrap">{language === 'ar' ? 'تاريخ القيد' : 'Posting Date'}</th>
                          <th className="p-3 whitespace-nowrap">{language === 'ar' ? 'تفاصيل الإيصال / المرجع' : 'Receipt / Reference Details'}</th>
                          <th className="p-3 whitespace-nowrap">{language === 'ar' ? 'الفئة' : 'Category'}</th>
                          <th className="p-3 text-right whitespace-nowrap">{language === 'ar' ? 'مدين (خارج)' : 'Debit (Out)'}</th>
                          <th className="p-3 text-right pr-4 whitespace-nowrap">{language === 'ar' ? 'دائن (داخل)' : 'Credit (In)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {combinedCommonLedger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/10 transition-colors">
                            <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{item.date}</td>
                            <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                              {item.reference}
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {language === 'ar' ? 'طريقة الدفع:' : 'Method:'} {item.method}
                              </div>
                            </td>
                            <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{item.category}</td>
                            <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                              {item.type === 'expense' ? `-${formatVal(item.amount)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-bold whitespace-nowrap pr-4">
                              {item.type === 'income' ? `+${formatVal(item.amount)}` : '—'}
                            </td>
                          </tr>
                        ))}

                        {combinedCommonLedger.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center italic text-slate-400 bg-slate-50/20">
                              {language === 'ar' 
                                ? `لم يتم تسجيل أي تحصيلات إيرادات للصندوق المشترك أو قيود مصروفات منافع لشهر ${statementMonth}.`
                                : `No common area income collections or utilities expense records noted for ${statementMonth}.`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center">
                  {language === 'ar' 
                    ? `يعكس ملخص الصندوق المشترك المالي هذا حسابات خزينة المبنى المجمعة ومطابقة سجلات تقسيم دفعات الساكنين ومخصصات المصروفات العامة لشهر ${statementMonth}.`
                    : `This Common Area Financial Summary reflects the collective building treasury accounts matching active tenant split registries and general expense allocations for ${statementMonth}.`}
                </div>
              </>
            ) : activeTenant ? (
              <>
                {/* Statement Headings */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'ar' ? 'كشف الحساب الشهري للوحدة' : 'STATEMENT OF ACCOUNT'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium font-mono mt-1">
                      {language === 'ar' ? `دورة كشف الحساب: ${statementMonth}` : `CYCLE PERIOD: ${statementMonth}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || (language === 'ar' ? 'أبراج المجمع السكني' : 'Grandview Residences')}</h5>
                    <p className="text-xs text-slate-400">{building?.address || (language === 'ar' ? 'شارع مجمع الفخامة الرئيسي' : '100 Luxury Heights Boulevard')}</p>
                  </div>
                </div>

                {/* Tenant Metadata info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      {language === 'ar' ? 'أُعد لصالح السيد/ة' : 'PREPARED FOR'}
                    </span>
                    <div className="font-bold text-slate-800 text-sm mt-1">{activeTenant.name}</div>
                    <div className="text-slate-500 mt-1 font-mono">{activeTenant.phone || (language === 'ar' ? 'لا يوجد هاتف مؤكد' : 'No phone verified')}</div>
                    <div className="text-slate-500">{activeTenant.email || (language === 'ar' ? 'لا يوجد بريد إلكتروني مؤكد' : 'No email verified')}</div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      {language === 'ar' ? 'تفاصيل الوحدة' : 'UNIT DETAILS'}
                    </span>
                    <div className="font-extrabold text-blue-600 text-sm mt-1">
                      {language === 'ar' ? `الوحدة: ${activeTenant.unit}` : `Unit : ${activeTenant.unit}`}
                    </div>
                    <div className="text-slate-500 mt-1">
                      {language === 'ar' ? `بداية العقد: ${activeTenant.startDate || '—'}` : `Term Start: ${activeTenant.startDate || '—'}`}
                    </div>
                    <div className="text-slate-500">
                      {language === 'ar' ? `يوم الاستحقاق: يوم ${activeTenant.rentDueDateDay}` : `Dues Due Cycle: Day ${activeTenant.rentDueDateDay}`}
                    </div>
                  </div>
                </div>

                {/* Financial overview boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      {language === 'ar' ? 'إجمالي المطلوب بالفاتورة' : 'Total Invoiced'}
                    </span>
                    <span className="font-bold text-slate-800 text-md font-mono">{formatVal(totalAmountDue)}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center font-sans">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                      {language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
                    </span>
                    <span className="font-bold text-emerald-700 text-md font-mono">{formatVal(totalAmountPaid)}</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    outstandingBalance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-bold block uppercase ${
                      outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {language === 'ar' ? 'الرصيد المستحق القائم' : 'Outstanding Due'}
                    </span>
                    <span className={`font-bold text-md font-mono ${
                      outstandingBalance > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}>
                      {formatVal(outstandingBalance)}
                    </span>
                  </div>
                </div>

                {/* General transaction history matching tenant */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    {language === 'ar' ? 'قيود دفتر الأستاذ للحسابات' : 'Statement Ledger Postings'}
                  </h5>
                  <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4 whitespace-nowrap text-start">{language === 'ar' ? 'تاريخ القيد' : 'Posting Date'}</th>
                          <th className="p-3 whitespace-nowrap text-start">{language === 'ar' ? 'البيان / الفترة' : 'Reference / Period'}</th>
                          <th className="p-3 whitespace-nowrap text-start">{language === 'ar' ? 'طريقة الدفع' : 'Method'}</th>
                          <th className="p-3 text-right whitespace-nowrap">{language === 'ar' ? 'مدين' : 'Debit'}</th>
                          <th className="p-3 text-right pr-4 whitespace-nowrap">{language === 'ar' ? 'دائن' : 'Credit'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Balance Brought Forward Debit entry */}
                        {previousOutstandingBalance > 0 && (
                          <tr className="bg-amber-50/25">
                            <td className="p-3 pl-4 font-mono text-amber-700 font-semibold whitespace-nowrap">—</td>
                            <td className="p-3 font-bold text-amber-800 whitespace-nowrap text-start">
                              {language === 'ar' ? 'رصيد مرحّل من أشهر سابقة' : 'Balance Brought Forward (Prior Unpaid Months)'}
                              <div className="text-[10px] text-amber-600 font-mono mt-0.5 text-start">
                                {language === 'ar' ? `تراكم الدورات غير المسددة قبل شهر ${statementMonth}` : `Accumulation of unpaid cycles before ${statementMonth}`}
                              </div>
                            </td>
                            <td className="p-3 text-slate-400 whitespace-nowrap text-start">—</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">{formatVal(previousOutstandingBalance)}</td>
                            <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                          </tr>
                        )}

                        {/* Monthly Base Invoice Debit entry */}
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap text-start">{statementMonth}-01</td>
                          <td className="p-3 font-semibold text-slate-700 whitespace-nowrap text-start">
                            {language === 'ar' ? `فاتورة الرسوم الشهرية الأساسية - دورة ${statementMonth}` : `Base Monthly Share Bill - Cycle ${statementMonth}`}
                          </td>
                          <td className="p-3 text-slate-400 whitespace-nowrap text-start">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantRent)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap text-start">{statementMonth}-01</td>
                          <td className="p-3 font-bold text-slate-700 whitespace-nowrap text-start">
                            {language === 'ar' ? 'مساهمة راتب الحارس' : 'Guard Salary Contribution'}
                          </td>
                          <td className="p-3 text-slate-400 whitespace-nowrap text-start">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantGuard)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap text-start">{statementMonth}-01</td>
                          <td className="p-3 font-bold text-slate-700 whitespace-nowrap text-start">
                            {language === 'ar' ? 'رسم صندوق الصيانة المشترك' : 'Maintenance Shared Box Levy'}
                          </td>
                          <td className="p-3 text-slate-400 whitespace-nowrap text-start">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantMaint)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
 
                        {/* Paid Credit ledger items */}
                        {tenantPaymentsForMonth.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap text-start">{p.date || 'TBD'}</td>
                            <td className="p-3 font-medium text-slate-600 whitespace-nowrap text-start">
                              {language === 'ar' ? `تم استلام الدفعة وإقرارها (${p.receiptNumber}) - ${p.status === 'Paid' ? 'مقبوضة' : p.status}` : `Payment cleared (${p.receiptNumber}) - ${p.status === 'Paid' ? 'Cleared' : p.status}`}
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap text-start" title="This shows how your single combined payment is distributed toward your monthly balance allocations">
                                {language === 'ar' ? (
                                  <>
                                    تفصيل توزيع الدفعة — الحصة العقارية: {formatVal(p.rentPaid ?? Math.max(0, p.amount - (p.guardPaid ?? (building?.defaultGuardFee ?? 50)) - (p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))))} | راتب الحارس: {formatVal(p.guardPaid ?? (building?.defaultGuardFee ?? 50))} | خدمات الصيانة: {formatVal(p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))}
                                  </>
                                ) : (
                                  <>
                                    Payment Allocation Breakdown — Share Portion: {formatVal(p.rentPaid ?? Math.max(0, p.amount - (p.guardPaid ?? (building?.defaultGuardFee ?? 50)) - (p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))))} | Guard Salary: {formatVal(p.guardPaid ?? (building?.defaultGuardFee ?? 50))} | Service Box: {formatVal(p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap text-start">{p.method}</td>
                            <td className="p-3 text-right text-slate-400 whitespace-nowrap">—</td>
                            <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                              p.status === 'Paid' ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {p.status === 'Paid' ? formatVal(p.amount) : '—'}
                            </td>
                          </tr>
                        ))}
 
                        {tenantPaymentsForMonth.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 pl-4 text-center italic text-rose-500 font-semibold bg-rose-50/20 whitespace-nowrap">
                              {language === 'ar' ? 'لم يتم تقييد أي دفعات سداد لهذه الدورة الشهرية.' : 'No payment credits applied for this cycle month.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
 
                {/* Footer notes */}
                <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans">
                  {language === 'ar' 
                    ? `نشكركم على إقامتكم النشطة في ${building?.name || 'أبراج المجمع السكني'}. يعرض ملخص الحساب هذا الدفعات الرسمية وفواتير الرسوم المطابقة لسجلات الدورات. يرجى تسوية أي رسوم مستحقة في الوقت المحدد.`
                    : `Thank you for your active residency at ${building?.name || 'Grandview Residences'}. This account summary displays official payments and billing invoices matching cycle registries. Please settle any outstanding fees on time.`}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold">
                  {language === 'ar' ? 'إصدار ملخص كشف الحساب' : 'Generate Account Statement Summary'}
                </p>
                <p className="text-xs mt-1">
                  {language === 'ar' ? 'يرجى تحديد ساكن نشط من مصفاة التصفية الجانبية.' : 'Please select an active resident reference in the filters left.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* RENDER REMINDERS & AUTOMATIONS SUBTAB */}
      {activeSubTab === 'automation' && (
        <div className="space-y-6" id="reminders-automation-center">
          
          {/* 1. Outstanding Collections (Current Cycle) - Dynamic Outstanding Invoices at the Top */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                 <h3 className="font-bold text-slate-800 text-md">
                   {language === 'ar' ? 'التحصيلات المستحقة (الدورة الحالية)' : 'Outstanding Collections (Current Cycle)'}
                 </h3>
                 <p className="text-xs text-slate-400">
                   {language === 'ar' ? 'الساكنون المطالبون حالياً بإشعارات سداد المستحقات' : 'Residents currently requiring cycle notifications'}
                 </p>
              </div>
              <button
                onClick={runAutopilotScan}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تشغيل فحص الدورة' : 'Run Cycle Check'}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {groupedReminders.map(group => {
                const tenant = group.tenant;
                const combinedMonths = group.payments.map(x => x.monthPaidFor).join(', ');
                const dueAmount = group.totalDueAmount;

                const parsedMsg = tenant ? getParsedTemplate(tenant, combinedMonths, dueAmount) : '';
                const customWaLink = tenant ? getReminderWhatsAppLink(
                  tenant.phone,
                  tenant.name,
                  tenant.unit,
                  dueAmount,
                  `Day ${tenant.rentDueDateDay}`,
                  combinedMonths,
                  reminderTemplate,
                  building?.currency || 'JOD',
                  building?.bankTransferId
                ) : '#';

                return (
                  <div key={group.unit} className="py-5 first:pt-0 last:pb-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-1 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-sm">
                          {language === 'ar' ? `وحدة ${group.unit}` : `Unit ${group.unit}`}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {tenant ? tenant.name : (group.payments[0]?.tenantName || (language === 'ar' ? 'ساكن مجهول' : 'Unknown Occupant'))}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 grid grid-cols-1 md:grid-cols-[190px_1fr_120px] gap-x-4 gap-y-1 mt-1.5 items-baseline">
                        <span className="flex items-center gap-1 font-sans whitespace-nowrap">
                          {language === 'ar' ? 'الرصيد المستحق:' : 'Balance Outstanding:'} 
                          <span className="font-bold text-slate-800 font-mono text-xs">{formatVal(dueAmount)}</span>
                        </span>
                        <span className="text-slate-500 font-sans break-words">
                          {language === 'ar' ? 'الشهر (الأشهر) غير المدفوعة:' : 'Unpaid Month(s):'} <span className="font-semibold text-slate-700 font-mono text-[11px]">{group.payments.map(p => p.monthPaidFor).join(', ')}</span>
                        </span>
                        <span className="whitespace-nowrap text-slate-500 font-sans">
                          {tenant ? (language === 'ar' ? `يوم الاستحقاق: يوم ${tenant.rentDueDateDay}` : `Due Day: Day ${tenant.rentDueDateDay}`) : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      {/* Log Payment Button */}
                      <button
                        onClick={() => handleOpenLogPayment(group)}
                        disabled={isReadOnly}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-xl px-3.5 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-blue-600 disabled:hover:bg-blue-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                        {language === 'ar' ? 'تسجيل الدفع' : 'Log Payment'}
                      </button>

                      {/* Copy Template Button */}
                      <button
                        onClick={() => copyToClipboard(parsedMsg, group.unit)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedSuccess === group.unit ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ الرسالة' : 'Copy Template')}
                      </button>
                      
                      {tenant?.phone ? (
                        <a
                          href={customWaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-none flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-3 py-2 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'إرسال تذكير' : 'Send Reminder'}
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic shrink-0 px-2 py-1 bg-slate-50 rounded-lg">
                          {language === 'ar' ? 'لا يوجد رقم هاتف' : 'No phone attached'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {groupedReminders.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    {language === 'ar' ? 'جميع الأرصدة والذمم مسواة وصافية حالياً' : 'All balances are currently clear'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {language === 'ar' ? 'امتثال ومطابقة ممتازة في التحصيلات لهذا الشهر!' : 'Excellent collections compliance this month!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Outstanding Expenses & Maintenance Bills */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-md">
                {language === 'ar' ? 'المصروفات المستحقة وفواتير الصيانة المعلقة' : 'Outstanding Expenses & Maintenance Bills'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'تكاليف الصيانة أو الإصلاحات الهيكلية غير المدفوعة، والتي تتطلب تسوية أو تحديث للسجلات' : 'Costs or structural repair items currently unpaid, requiring log updates or payment settlement'}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {outstandingExpenses.map(exp => {
                const isOverdue = exp.status === 'Overdue' || (exp.dueDate && new Date(exp.dueDate) < new Date() && exp.status !== 'Paid');
                
                return (
                  <div key={exp.id} className="py-5 first:pt-0 last:pb-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-1 flex-1 min-w-0 w-full font-sans">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-orange-50 text-orange-600 font-extrabold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono">
                          {language === 'ar' ? (
                            exp.category === 'Repairs & Spares' ? 'إصلاحات وقطع غيار' :
                            exp.category === 'Contractors & Services' ? 'مقاولي الخدمات والصيانة' :
                            exp.category === 'Utilities & Water' ? 'مياه وكهرباء وخدمات' :
                            exp.category === 'Salaries & Wages' ? 'رواتب وأجور حراسة' :
                            exp.category === 'Taxes & Levies' ? 'ضرائب ورسوم حكومية' :
                            exp.category === 'Cleanouts & Gardening' ? 'تنظيف وزراعة تجميلية' :
                            exp.category === 'Insurance Pool' ? 'صندوق تأمين مشترك' :
                            exp.category === 'Other' ? 'مصاريف عامة أخرى' :
                            exp.category
                          ) : exp.category}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {exp.title}
                        </span>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exp.status === 'Overdue' || isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {isOverdue 
                            ? (language === 'ar' ? 'متأخر' : 'Overdue') 
                            : (exp.status === 'Paid' ? (language === 'ar' ? 'مدفوع' : 'Paid') : (language === 'ar' ? 'قيد الانتظار' : 'Pending'))}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mt-1.5 items-baseline font-sans">
                        <span className="flex items-center gap-1">
                          {language === 'ar' ? 'التكلفة:' : 'Cost:'} <span className="font-bold text-slate-800 font-mono text-xs">{formatVal(exp.amount)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {language === 'ar' ? 'تاريخ التسجيل:' : 'Log Date:'} <span className="font-semibold text-slate-700 font-mono text-xs">{exp.date}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {exp.dueDate ? (
                            <>
                              {language === 'ar' ? 'تاريخ الاستحقاق:' : 'Due Date:'} <span className={`font-semibold font-mono text-xs ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{exp.dueDate}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic font-sans">{language === 'ar' ? 'لم يتم تحديد تاريخ' : 'No deadline set'}</span>
                          )}
                        </span>
                      </div>

                      {exp.notes && (
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-2xl font-sans" title={exp.notes}>
                          {language === 'ar' ? 'ملاحظة:' : 'Memo:'} {exp.notes}
                        </p>
                      )}

                      {/* Attached Invoice preview indicator if existed */}
                      {exp.attachmentUrl && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setZoomedAttachment({ url: exp.attachmentUrl!, title: exp.title })}
                            className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1 font-sans"
                          >
                            <Eye className="w-3 h-3" />
                            {language === 'ar' ? `عرض الفاتورة المرفقة: ${exp.attachmentName || 'ملف_الفاتورة'}` : `View Attached Invoice: ${exp.attachmentName || 'Invoice_File'}`}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      {/* Mark as Paid Button */}
                      <button
                        onClick={() => handleQuickMarkPaid(exp)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl px-3.5 py-2 transition-colors duration-150 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        {language === 'ar' ? 'تحديد كمدفوع' : 'Mark as Paid'}
                      </button>

                      {/* Edit Expense Button */}
                      <button
                        onClick={() => openEditExpense(exp)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'تعديل المصروف/الصيانة' : 'Log Maintenance/Expense'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {outstandingExpenses.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 font-sans">
                    {language === 'ar' ? 'لا توجد مصروفات أو فواتير صيانة معلقة' : 'No outstanding expenses'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-sans">
                    {language === 'ar' ? 'جميع فواتير الصيانة وتكاليف الموردين المسجلة قد تمت تسويتها وبشكل كامل!' : 'All recorded maintenance and vendor costs are settled!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Log Payment Modal Overlay */}
          {logPaymentModalOpen && loggingUnitGroup && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 duration-200">
                <div className="bg-slate-50 border-b p-5 flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    {language === 'ar' 
                      ? `تسجيل دفعة — وحدة ${loggingUnitGroup.unit}` 
                      : `Log Payment — Unit ${loggingUnitGroup.unit}`}
                  </h3>
                  <button
                    onClick={() => setLogPaymentModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm animate-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  {logSuccessMessage ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                      <p className="text-sm font-bold text-emerald-800">{logSuccessMessage}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {language === 'ar' ? 'الوحدة والمستأجر' : 'Unit & Resident'}
                        </label>
                        <div className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 text-slate-700 font-medium">
                          {language === 'ar' 
                            ? `وحدة ${loggingUnitGroup.unit} — ${loggingUnitGroup.tenant?.name || loggingUnitGroup.payments[0]?.tenantName}`
                            : `Unit ${loggingUnitGroup.unit} — ${loggingUnitGroup.tenant?.name || loggingUnitGroup.payments[0]?.tenantName}`}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {language === 'ar' ? 'اختر الشهر المعلق لتسجيله *' : 'Select Outstanding Month to Log *'}
                        </label>
                        <select
                          required
                          value={selectedPaymentToLog?.id || ''}
                          onChange={(e) => {
                            const p = loggingUnitGroup.payments.find(x => x.id === e.target.value);
                            if (p) {
                              setSelectedPaymentToLog(p);
                              setLogAmount(p.amount);
                            }
                          }}
                          className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                        >
                          {loggingUnitGroup.payments.map(p => (
                            <option key={p.id} value={p.id}>
                              {language === 'ar'
                                ? `الشهر: ${p.monthPaidFor} — الرصيد المعلق: ${formatVal(p.amount)} (${p.status === 'Paid' ? 'مدفوع' : p.status === 'Overdue' ? 'متأخر' : 'قيد الانتظار'})`
                                : `Month: ${p.monthPaidFor} — Outstanding Balance: ${formatVal(p.amount)} (${p.status})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {language === 'ar' ? 'تاريخ الدفع *' : 'Date Paid *'}
                          </label>
                          <input
                            type="date"
                            required
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {language === 'ar' ? 'طريقة الدفع *' : 'Payment Method *'}
                          </label>
                          <select
                            required
                            value={logMethod}
                            onChange={(e) => setLogMethod(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="Bank Transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                            <option value="Cash">{language === 'ar' ? 'نقداً' : 'Cash'}</option>
                            <option value="Check">{language === 'ar' ? 'شيك' : 'Check'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {language === 'ar' ? 'مبلغ الدفعة *' : 'Log Amount *'}
                        </label>
                        <input
                          type="number"
                          required
                          min={0.01}
                          step={0.01}
                          value={logAmount}
                          onChange={(e) => setLogAmount(Number(e.target.value))}
                          className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {language === 'ar' ? 'ملاحظات' : 'Notes'}
                        </label>
                        <textarea
                          value={logNotes}
                          onChange={(e) => setLogNotes(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 h-20 font-sans"
                          placeholder={language === 'ar' ? 'ملاحظات اختيارية حول هذه المعاملة...' : 'Optional notes about this transaction...'}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setLogPaymentModalOpen(false)}
                          className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border transition-colors animate-none"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={isLoggingPayment || !selectedPaymentToLog}
                          onClick={handleConfirmLogPayment}
                          className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-colors shadow-sm animate-none"
                        >
                          {isLoggingPayment 
                            ? (language === 'ar' ? 'جاري التسجيل...' : 'Logging...') 
                            : (language === 'ar' ? 'تأكيد الدفع' : 'Confirm Paid')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Middle Row: Two message template widgets side-by-side inside a 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Dues Reminder Template */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                <Bot className="w-5 h-5 text-blue-500" />
                {language === 'ar' ? 'قالب التذكير بالرسوم الشهرية' : 'Monthly Dues Reminder Template'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'قم بتكوين قالب التذكير التلقائي برغبتك لإرسال الإشعارات عبر واتساب ونسخها بسهولة.' : 'Configure template codes used to automate monthly payment notifications sent via WhatsApp and copy panels.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">
                  {language === 'ar' ? 'هيكل رسالة التذكير' : 'Message Layout'}
                </label>
                <textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-blue-500 h-32 leading-relaxed font-sans"
                  placeholder={language === 'ar' ? 'أدخل نص القالب المخصص هنا...' : 'Enter custom template text here...'}
                />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Resident name">{'{BeneficiaryName}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Resident Unit number">{'{Unit}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Rent/Shares balance amount due">{'{DueAmount}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Rent due day in the month">{'{DueDay}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as billing month (e.g. June 2026)">{'{Month}'}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    {saveStatus === 'success' && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                        <CheckCircle className="w-4 h-4" />
                        {language === 'ar' ? 'تم حفظ القالب بنجاح!' : 'Saved Successfully!'}
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {language === 'ar' ? 'فشل في حفظ الإعدادات' : 'Failed to Save Settings'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate || isReadOnly}
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                        isSavingTemplate || isReadOnly
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      }`}
                    >
                      {isSavingTemplate ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ القوالب' : 'Save Templates')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Receipt Template */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-emerald-500" />
                {language === 'ar' ? 'قالب إيصال استلام الدفعات' : 'Payment Receipt Template'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'قم بتكوين وتصميم قالب الإيصال التلقائي لإرسال تأكيدات الدفع وسندات القبض المخصصة للساكنين عبر الواتساب.' : 'Configure template codes used to pre-fill rent payment receipt text sent via WhatsApp links.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">
                  {language === 'ar' ? 'تصميم رسالة الإيصال' : 'Message Layout'}
                </label>
                <textarea
                  value={receiptTemplate}
                  onChange={(e) => setReceiptTemplate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-emerald-500 h-32 leading-relaxed font-sans"
                  placeholder={language === 'ar' ? 'أدخل نص القالب المخصص هنا...' : 'Enter custom template text here...'}
                />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Tenant Name">{'{TenantName}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Unit">{'{Unit}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Rent portion/amount paid">{'{AmountPaid}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Billing Month">{'{BillingMonth}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Payment Method">{'{PaymentMethod}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Date">{'{DatePaid}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Receipt Doc Number">{'{ReceiptNo}'}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    {saveStatus === 'success' && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                        <CheckCircle className="w-4 h-4" />
                        {language === 'ar' ? 'تم حفظ القالب بنجاح!' : 'Saved Successfully!'}
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {language === 'ar' ? 'فشل في حفظ الإعدادات' : 'Failed to Save Settings'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate || isReadOnly}
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                        isSavingTemplate || isReadOnly
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      {isSavingTemplate ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ القوالب' : 'Save Templates')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bottom Row: Billing Cycle Audit Assistant (Full Width with a beautiful responsive layout) */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-slate-800 text-sm font-bold flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                {language === 'ar' ? 'مساعد ومستشار تدقيق الدورة المالية للبناية' : 'Billing Cycle Audit Assistant'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {language === 'ar' ? 'الأتمتة اللحظية ومطابقة كشوفات الأستاذ المالية' : 'Real-time automation status & ledger synchronization'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Explainer / Business Value */}
              <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-xl space-y-3 flex flex-col justify-center">
                <span className="font-bold text-blue-700 block uppercase tracking-wider text-[10px]">
                  {language === 'ar' ? 'ما هي هذه الأداة؟' : 'What is this tool?'}
                </span>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {language === 'ar' 
                    ? 'فوترة وتثبيت قيود الاستحقاق يدوياً لكل ساكن شهرياً أمر مجهد. مساعد الفحص التلقائي للدورة يقوم بأتمتة ذلك:'
                    : 'Manually billing every resident each month is tedious. The Run Cycle Check scanner automates this:'}
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-500 text-xs pl-1">
                  <li>
                    {language === 'ar' 
                      ? 'يكتشف الشقق والوحدات التي تفتقر لقيود فوترة مخصصة للشهر الحالي.' 
                      : 'Detects which units are missing billing entries for the current month.'}
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'ينشئ تلقائياً قيود ذمم (قيد الانتظار) بناءً على إيجار الساكن والرسوم المحددة له.' 
                      : 'Auto-generates Pending ledger items based on tenant rent and fees.'}
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'يحدد الأرصدة المتأخرة والذمم السابقة ويرقيها إلى (متأخر) لتمكين تنبيهات الواتساب بنقرة واحدة.' 
                      : 'Identifies past-due balances and updates status to Overdue to enable one-click WhatsApp reminders.'}
                  </li>
                </ul>
              </div>

              {/* Right Column: Feed and Operations */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9.5px] mb-2.5">
                    {language === 'ar' ? 'سجل المتابعة والتزامن الفوري' : 'Audit & Sync Feed'}
                  </span>
                  <div className="font-mono text-[11px] space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                    {automationLog.map(log => {
                      // Dynamically translate standard logs to Arabic if language is 'ar'
                      let displayMsg = log.msg;
                      if (language === 'ar') {
                        if (log.msg.startsWith('Billing scheduler standing by.')) {
                          displayMsg = 'نظام جدولة الفواتير والتحصيلات مستعد للبدء. قم بتشغيل فحص الدورة لتدقيق حسابات الساكنين وتحديد المتأخرات.';
                        } else if (log.msg.startsWith('Billing integrity audit initiated.')) {
                          const monthPart = log.msg.split('Current month: ')[1] || '';
                          displayMsg = `بدأ التدقيق المالي ومطابقة تكامل الدورة المالية. الشهر المرجعي الحالي: ${monthPart}`;
                        } else if (log.msg.includes('Auditing agreements for')) {
                          const countPart = log.msg.match(/\d+/) || [0];
                          displayMsg = `جاري التحقق من عقود واتفاقيات ${countPart[0]} ساكن نشط...`;
                        } else if (log.msg.includes('is missing billing for')) {
                          const matchUnit = log.msg.match(/Unit (\w+)/) || ['', ''];
                          const matchMonth = log.msg.match(/for ([\d-]+)/) || ['', ''];
                          const matchName = log.msg.match(/\((.*?)\)/) || ['', ''];
                          displayMsg = `الوحدة ${matchUnit[1]} (${matchName[1]}) تفتقد لقيود دورة الفوترة لشهر ${matchMonth[1]}. تم توليد قيد استحقاق تلقائي.`;
                        } else if (log.msg.includes('has exceeded due day.')) {
                          const matchUnit = log.msg.match(/Unit (\w+)/) || ['', ''];
                          const matchMonth = log.msg.match(/month ([\d-]+)/) || ['', ''];
                          const matchName = log.msg.match(/\((.*?)\)/) || ['', ''];
                          displayMsg = `الوحدة ${matchUnit[1]} (${matchName[1]}) لشهر ${matchMonth[1]} قد تجاوزت يوم الاستحقاق المحدد. تم ترقية حالة الحساب لمتأخر.`;
                        } else if (log.msg.startsWith('Billing audit complete.')) {
                          const matchCreated = log.msg.match(/Created (\d+)/) || ['', '0'];
                          const matchOverdue = log.msg.match(/marked (\d+)/) || ['', '0'];
                          displayMsg = `اكتمل تدقيق الدورة المالية. تم توليد ${matchCreated[1]} فاتورة دورية جديدة، وترقية ${matchOverdue[1]} حسابات إلى متأخرة.`;
                        } else if (log.msg.startsWith('Billing ledger audit healthy.')) {
                          displayMsg = 'سجلات الحسابات مطابقة وسليمة تماماً. لا توجد مطالبات مفقودة أو متأخرات معلقة تتطلب الترقية.';
                        } else if (log.msg.includes('Notification draft ready for')) {
                          const matchUnit = log.msg.match(/Unit (\w+)/) || ['', ''];
                          const matchName = log.msg.match(/for (.*?) \(/) || ['', ''];
                          displayMsg = `قالب الإشعار جاهز للوحدة ${matchUnit[1]} (${matchName[1]}) لدورة الاستحقاق الحالية.`;
                        } else if (log.msg.includes('Active dues reminder for')) {
                          const matchUnit = log.msg.match(/Unit (\w+)/) || ['', ''];
                          const matchName = log.msg.match(/for (.*?) \(/) || ['', ''];
                          displayMsg = `تذكير استحقاق قائم للوحدة ${matchUnit[1]} (${matchName[1]}) لدورة الاستحقاق الحالية.`;
                        } else if (log.msg.includes('Cleared audit logs cache.')) {
                          displayMsg = 'تم مسح سجل المتابعة المالي بالكامل.';
                        }
                      }
                      return (
                        <div key={log.id} className="flex gap-2 items-start border-l-2 pl-2 border-slate-100">
                          <span className="text-slate-400 shrink-0 text-[10px]">[{log.time}]</span>
                          <p className={
                            log.type === 'warn' ? 'text-amber-600 font-medium' : log.type === 'success' ? 'text-emerald-600 font-medium' : 'text-slate-600'
                          }>
                            {displayMsg}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAutomationLog([
                      { id: Date.now().toString(), time: new Date().toLocaleTimeString(), msg: 'Cleared audit logs cache.', type: 'info' },
                    ]);
                  }}
                  className="w-full border border-slate-200 text-[10.5px] hover:bg-slate-50 font-bold py-2 px-3 rounded-xl text-slate-500 text-center transition-all cursor-pointer"
                >
                  {language === 'ar' ? 'مسح سجل المتابعة' : 'Clear Audit Log'}
                </button>
              </div>
            </div>
          </div>

          {/* Zoomed Attachment Viewer Modal */}
          {zoomedAttachment && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full border shadow-2xl overflow-hidden animate-zoom-in font-sans">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-sm">
                    {language === 'ar' ? `الفاتورة المرفقة: ${zoomedAttachment.title}` : `Attached Invoice: ${zoomedAttachment.title}`}
                  </span>
                  <button onClick={() => setZoomedAttachment(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>
                
                <div className="p-4 bg-white flex items-center justify-center min-h-[300px]">
                  {zoomedAttachment.url.startsWith('data:application/pdf') ? (
                    <iframe src={zoomedAttachment.url} className="w-full h-[400px] border rounded" title="Attached Invoice PDF Preview" />
                  ) : (
                    <img referrerPolicy="no-referrer" src={zoomedAttachment.url} alt="Expanded preview attached invoice" className="max-w-full max-h-[450px] object-contain rounded-xl border" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Expense Modal */}
          {editingExpense && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in font-sans">
                <div className="bg-slate-50 border-b p-5 flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    {language === 'ar' ? 'تسجيل وتعديل المصروف/الصيانة' : 'Log Maintenance/Expense'}
                  </h3>
                  <button
                    onClick={() => setEditingExpense(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {language === 'ar' ? 'عنوان المصروف/الصيانة *' : 'Expense Title *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                      placeholder={language === 'ar' ? 'مثال: تنظيف بئر المصعد أو صيانة مضخة المياه' : 'e.g. Clean elevator pits or water pump'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {language === 'ar' ? 'الفئة *' : 'Category *'}
                      </label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                      >
                        {(building?.customExpenseCategories || ['Repairs & Spares', 'Contractors & Services', 'Utilities & Water', 'Salaries & Wages', 'Taxes & Levies', 'Cleanouts & Gardening', 'Insurance Pool', 'Other']).map(cat => {
                          let catDisplay = cat;
                          if (language === 'ar') {
                            catDisplay = 
                              cat === 'Repairs & Spares' ? 'إصلاحات وقطع غيار' :
                              cat === 'Contractors & Services' ? 'مقاولي الخدمات والصيانة' :
                              cat === 'Utilities & Water' ? 'مياه وكهرباء وخدمات' :
                              cat === 'Salaries & Wages' ? 'رواتب وأجور حراسة' :
                              cat === 'Taxes & Levies' ? 'ضرائب ورسوم حكومية' :
                              cat === 'Cleanouts & Gardening' ? 'تنظيف وزراعة تجميلية' :
                              cat === 'Insurance Pool' ? 'صندوق تأمين مشترك' :
                              cat === 'Other' ? 'مصاريف عامة أخرى' :
                              cat;
                          }
                          return (
                            <option key={cat} value={cat}>{catDisplay}</option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {language === 'ar' ? `قيمة التكلفة (${building?.currency || 'JOD'}) *` : `Cost Amount (${building?.currency || 'JOD'}) *`}
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(Number(e.target.value))}
                        className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {language === 'ar' ? 'تاريخ التسجيل *' : 'Log Date *'}
                      </label>
                      <input
                        type="date"
                        required
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {language === 'ar' ? 'تاريخ الاستحقاق (اختياري)' : 'Due Date (Optional)'}
                      </label>
                      <input
                        type="date"
                        value={expenseDueDate}
                        onChange={(e) => setExpenseDueDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {language === 'ar' ? 'حالة الدفع *' : 'Payment Status *'}
                    </label>
                    <select
                      value={expenseStatus}
                      onChange={(e) => setExpenseStatus(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="Paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
                      <option value="Pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                      <option value="Overdue">{language === 'ar' ? 'متأخر' : 'Overdue'}</option>
                    </select>
                  </div>

                  {/* Attachment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {language === 'ar' ? 'إرفاق الفاتورة أو الإيصال الأصلي (اختياري)' : 'Attach Original Invoice / Receipt (Optional)'}
                    </label>
                    {expenseAttachmentUrl ? (
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs uppercase text-slate-500 font-mono">
                            {expenseAttachmentUrl.startsWith('data:application/pdf') ? 'PDF' : <img referrerPolicy="no-referrer" src={expenseAttachmentUrl} className="w-full h-full object-cover" />}
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-semibold text-slate-700 block truncate">{expenseAttachmentName || 'invoice_file.png'}</span>
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              {language === 'ar' ? '✓ تم تحميل الفاتورة بنجاح' : '✓ Invoice Loaded'}
                            </span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setExpenseAttachmentName(''); setExpenseAttachmentUrl(''); }} 
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-white border px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                        >
                          {language === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setDragOverExpense(true); }}
                        onDragLeave={() => setDragOverExpense(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverExpense(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleExpenseFileChange(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => fileInputExpenseRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                          dragOverExpense ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-600">
                          {language === 'ar' ? <>اسحب الفاتورة وأسقطها هنا، أو <span className="text-blue-500 font-bold">تصفّح ملفاتك</span></> : <>Drag & drop invoice, or <span className="text-blue-500 font-bold">browse</span></>}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {language === 'ar' ? 'يدعم الصور وملفات PDF' : 'Supports image or PDF files'}
                        </p>
                        <input 
                          type="file" 
                          ref={fileInputExpenseRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleExpenseFileChange(e.target.files[0]);
                            }
                          }}
                          accept="image/*,application/pdf"
                          className="hidden" 
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {language === 'ar' ? 'ملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      placeholder={language === 'ar' ? 'أدخل ملاحظات أو تفاصيل اختيارية...' : 'Enter optional description...'}
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 h-16 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      {language === 'ar' ? 'حفظ التعديلات' : 'Save Expense Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
