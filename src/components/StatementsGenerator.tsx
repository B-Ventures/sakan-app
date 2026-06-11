/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tenant, Payment, Expense, Building, isMonthCovered, formatCurrency } from '../types';
import { FileText, Calendar, Send, Mail, CheckCircle, RefreshCw, Eye, Printer, Bot, AlertTriangle, MessageSquare, Copy, ShieldAlert, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { getReminderWhatsAppLink } from '../utils/whatsapp';

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
}

export default function StatementsGenerator({
  tenants,
  payments,
  expenses,
  building,
  onUpdateBuildingSettings,
  onAutopilotSync,
}: StatementsGeneratorProps) {
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

  // AUTOMATION STATE & SAVE STATUS
  const [reminderTemplate, setReminderTemplate] = useState(
    building?.reminderTemplate || "Hello {BeneficiaryName} 👋,\n\nFriendly reminder that monthly share dues for Unit {Unit} of {ShareAmount} is due by Day {DueDay} for the month of {Month}.\n\nPlease remit via bank wire and send us a confirmation receipt. Thank you!"
  );
  const [receiptTemplate, setReceiptTemplate] = useState(
    building?.receiptTemplate || "Hello {BeneficiaryName} 👋,\n\nThank you for your rent payment! Here is your official payment receipt:\n\n🏢 *Unit:* {Unit}\n🛢️ *Amount Paid:* {AmountPaid}\n📅 *Billing Month:* {BillingMonth}\n💳 *Payment Method:* {PaymentMethod}\n📅 *Date Paid:* {DatePaid}\n🧾 *Receipt No:* {ReceiptNo}\n\n*Status:* ✅ Fully Paid & Settled\n\nIf you have any questions, please feel free to reach out. Thank you for being a wonderful tenant!"
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
    { id: 'init-1', time: new Date().toLocaleTimeString(), msg: 'Autopilot Share Analyzer daemon initialized. Waiting for cycle check execution...', type: 'info' },
  ]);

  const activeTenant = tenants.find(t => t.id === selectedTenantId);
  const tenantPaymentsForMonth = payments.filter(p => p.tenantId === selectedTenantId && isMonthCovered(p.monthPaidFor, statementMonth));
  const tenantAllPayments = payments.filter(p => p.tenantId === selectedTenantId);

  // Calculate Statements totals
  const tenantRent = activeTenant ? activeTenant.monthlyRent : 0;
  const tenantGuard = activeTenant ? (activeTenant.guardFee ?? 50) : 0;
  const tenantMaint = activeTenant ? (activeTenant.maintenanceFee ?? 30) : 0;
  const totalAmountDue = tenantRent + tenantGuard + tenantMaint;
  const totalAmountPaid = tenantPaymentsForMonth
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = Math.max(totalAmountDue - totalAmountPaid, 0);

  // --- SEGMENTED MASTER SPREADSHEET SETUP ---
  const yearMonths = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const mStr = `${statementYear}-${monthNum}`;
      const mName = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][i];
      return { mStr, mName };
    });
  }, [statementYear]);

  // --- COMMON AREA COMPUTATIONS ---
  const commonIncomesList = building?.commonAreaIncomeCategories || ['Guard Salary', 'Service Box'];
  const commonExpensesList = building?.commonAreaExpenseCategories || ['Staff Salary', 'Cleaning', 'Utilities'];

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
      .filter(e => e.date && e.date.substring(0, 7) === monthStr && (e.category.toLowerCase().trim() === normCategory))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getTenantPaidAmount = React.useCallback((tenantId: string, monthStr: string) => {
    const tenantPayments = payments.filter(
      p => p.tenantId === tenantId && isMonthCovered(p.monthPaidFor, monthStr) && p.status === 'Paid'
    );
    
    let sum = 0;
    tenantPayments.forEach(p => {
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
            sum += val;
          }
        });
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const rentVal = splits['Rent portion'] || splits['Rent'] || 0;
          if (rentVal > 0) {
            sum += rentVal;
          }
        }
      } else {
        // Fallback for ultimate legacy records with no metadata
        const defaultG = building?.defaultGuardFee ?? 50;
        const defaultM = building?.defaultMaintenanceFee ?? 30;
        if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
          sum += p.guardPaid ?? Math.min(p.amount, defaultG);
        }
        if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
          sum += p.maintenancePaid ?? Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM);
        }
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const defaultGVal = p.guardPaid ?? defaultG;
          const defaultMVal = p.maintenancePaid ?? defaultM;
          const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - defaultGVal - defaultMVal);
          if (calculatedRent > 0) {
            sum += calculatedRent;
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
            sum += val;
          }
        });
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const rentVal = splits['Rent portion'] || splits['Rent'] || 0;
          if (rentVal > 0) {
            sum += rentVal;
          }
        }
      } else {
        const defaultG = building?.defaultGuardFee ?? 50;
        const defaultM = building?.defaultMaintenanceFee ?? 30;
        if (isCategoryInListVal(commonIncomesList, 'Guard Salary')) {
          sum += p.guardPaid ?? Math.min(p.amount, defaultG);
        }
        if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
          sum += p.maintenancePaid ?? Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM);
        }
        if (isCategoryInListVal(commonIncomesList, 'Rent portion')) {
          const defaultGVal = p.guardPaid ?? defaultG;
          const defaultMVal = p.maintenancePaid ?? defaultM;
          const calculatedRent = p.rentPaid ?? Math.max(0, p.amount - defaultGVal - defaultMVal);
          if (calculatedRent > 0) {
            sum += calculatedRent;
          }
        }
      }
    });
    return sum;
  };

  // Helper: Common Expenses sum for a given month
  const getCommonExpenseForMonth = (targetMonth: string) => {
    return expenses
      .filter(e => e.date && e.date.substring(0, 7) === targetMonth && isCategoryInListVal(commonExpensesList, e.category))
      .reduce((sum, e) => sum + e.amount, 0);
  };

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
            reference: `${p.tenantName} (Unit ${p.unit}) - ${cat} Contribution`,
            category: cat,
            method: p.method,
            type: 'income',
            amount: val,
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
            reference: `${p.tenantName} (Unit ${p.unit}) - Guard Salary Fee`,
            category: 'Guard Salary',
            method: p.method,
            type: 'income',
            amount: amt,
          });
        }
      }
      if (isCategoryInListVal(commonIncomesList, 'Service Box')) {
        const amt = p.maintenancePaid ?? Math.min(Math.max(0, p.amount - (p.guardPaid ?? defaultG)), defaultM);
        if (amt > 0) {
          commonIncomePostings.push({
            id: `${p.id}-maint`,
            date: p.date,
            reference: `${p.tenantName} (Unit ${p.unit}) - Service Box Levy`,
            category: 'Service Box',
            method: p.method,
            type: 'income',
            amount: amt,
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
          reference: `${p.tenantName} (Unit ${p.unit}) - Rent portion contribution`,
          category: 'Rent portion',
          method: p.method,
          type: 'income',
          amount: calculatedRent,
        });
      }
    }
  });

  // 2. Common Expenses filtering and postings (for Single Month view)
  const expensesInMonth = expenses.filter(e => e.date && e.date.substring(0, 7) === statementMonth);
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
    if (commonExpensesList.includes(e.category)) {
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

    const dueAmount = isActive ? (rentVal + guardVal + maintVal) : 0;
    const paidAmount = payments
      .filter(p => p.tenantId === selectedTenantId && p.status === 'Paid' && isMonthCovered(p.monthPaidFor, mStr))
      .reduce((sum, p) => sum + p.amount, 0);

    const outstanding = isActive ? Math.max(dueAmount - paidAmount, 0) : 0;

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

  // Parse custom template reminder text
  const getParsedTemplate = (t: Tenant, pMonth: string, customAmount?: number) => {
    const finalAmount = customAmount !== undefined ? customAmount : t.monthlyRent;
    return reminderTemplate
      .replace(/{TenantName}/g, t.name)
      .replace(/{BeneficiaryName}/g, t.name)
      .replace(/{Unit}/g, t.unit)
      .replace(/{RentAmount}/g, formatVal(finalAmount))
      .replace(/{ShareAmount}/g, formatVal(finalAmount))
      .replace(/{DueDay}/g, t.rentDueDateDay.toString())
      .replace(/{Month}/g, pMonth);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(id);
    setTimeout(() => setCopiedSuccess(null), 2000);
  };

  const runAutopilotScan = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const targetMonth = '2026-06';
    const currentDay = 9; // System active cycle reference date (June 9th, 2026)

    let logsToAdd: Array<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'warn' }> = [
      { id: Date.now().toString() + '-start', time: timestamp, msg: `Autopilot initiated occupant scan for period ${targetMonth}.`, type: 'info' },
    ];

    const paymentsToCreate: Omit<Payment, 'id'>[] = [];
    const paymentsToUpdate: { id: string; status: Payment['status'] }[] = [];

    // Filter active tenants
    const activeTenants = tenants.filter(t => t.status === 'active');
    logsToAdd.push({
      id: Date.now().toString() + '-scan-count',
      time: timestamp,
      msg: `Scanning ${activeTenants.length} active occupant agreements...`,
      type: 'info'
    });

    activeTenants.forEach(tenant => {
      // Find June 2026 payment reference
      const existingPayment = payments.find(
        p => p.tenantId === tenant.id && isMonthCovered(p.monthPaidFor, targetMonth)
      );

      const isPastDueDate = tenant.rentDueDateDay <= currentDay;
      const expectedStatus: Payment['status'] = isPastDueDate ? 'Overdue' : 'Pending';

      if (!existingPayment) {
        // Missing billing cycle
        const receiptCode = `REC-${targetMonth.replace('-', '')}-${tenant.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const guardFee = tenant.guardFee ?? building?.defaultGuardFee ?? 0;
        const maintenanceFee = tenant.maintenanceFee ?? building?.defaultMaintenanceFee ?? 0;
        const totalAmount = tenant.monthlyRent + guardFee + maintenanceFee;

        const rec: Omit<Payment, 'id'> & { rentPaid: number; guardPaid: number; maintenancePaid: number } = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          unit: tenant.unit,
          amount: totalAmount,
          rentPaid: tenant.monthlyRent,
          guardPaid: guardFee,
          maintenancePaid: maintenanceFee,
          date: '',
          monthPaidFor: targetMonth,
          method: 'Bank Transfer',
          status: expectedStatus,
          notes: 'Auto-posted by Autopilot Scheduler',
          receiptNumber: receiptCode
        };
        paymentsToCreate.push(rec as any);

        logsToAdd.push({
          id: Date.now().toString() + `-create-${tenant.id}`,
          time: timestamp,
          msg: `Unit ${tenant.unit} (${tenant.name}) has no billing registry. Auto-posting new ${expectedStatus} rent record (${formatVal(totalAmount)}).`,
          type: isPastDueDate ? 'warn' : 'info'
        });
      } else if (existingPayment.status === 'Pending' && isPastDueDate) {
        // Exceeded configured due date
        paymentsToUpdate.push({ id: existingPayment.id, status: 'Overdue' });

        logsToAdd.push({
          id: Date.now().toString() + `-promote-${tenant.id}`,
          time: timestamp,
          msg: `Unit ${tenant.unit} (${tenant.name}) passed its due day (Day ${tenant.rentDueDateDay}). Auto-promoting status to OVERDUE.`,
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
            msg: `Scheduler processed ${paymentsToCreate.length} postings and promoted ${paymentsToUpdate.length} accounts to database cleanly.`,
            type: 'success'
          });
        } catch (err) {
          logsToAdd.push({
            id: Date.now().toString() + '-sync-err',
            time: timestamp,
            msg: `Scheduler write pipeline encountered transaction write limits.`,
            type: 'warn'
          });
        }
      } else {
        logsToAdd.push({
          id: Date.now().toString() + '-sync-missing-cb',
          time: timestamp,
          msg: `Local state synchronized. Verify cloud parameters configuration.`,
          type: 'warn'
        });
      }
    } else {
      logsToAdd.push({
        id: Date.now().toString() + '-clean',
        time: timestamp,
        msg: `General Ledger status is healthy. All active occupants check out correct.`,
        type: 'success'
      });
    }

    // Load prepared reminders for unpaid ones
    const updatedUnpaid = payments.filter(p => p.status !== 'Paid' && isMonthCovered(p.monthPaidFor, targetMonth));
    
    paymentsToCreate.forEach(c => {
      logsToAdd.push({
        id: Date.now().toString() + `-remind-${c.tenantId}`,
        time: timestamp,
        msg: `Reminder prepared for ${c.tenantName} (Unit ${c.unit}) - Balance outstanding: ${formatVal(c.amount)}`,
        type: 'warn'
      });
    });

    updatedUnpaid.forEach((p, idx) => {
      const isAlreadyLogged = paymentsToCreate.some(c => c.tenantId === p.tenantId) || paymentsToUpdate.some(u => u.id === p.id);
      if (!isAlreadyLogged) {
        logsToAdd.push({
          id: Date.now().toString() + `-exist-remind-${idx}`,
          time: timestamp,
          msg: `Reminder prepared for ${p.tenantName} (Unit ${p.unit}) - Balance outstanding: ${formatVal(p.amount)} [Status: ${p.status}]`,
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
          Account Statements
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
          Reminders & Automations Setup
        </button>
      </div>

      {/* RENDER STATEMENT GENERATOR SUBTAB */}
      {activeSubTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit no-print">
            <h3 className="font-bold text-slate-800 text-lg">Statement Filters</h3>
            <p className="text-xs text-slate-400">Generate professional unit or building-wide statements</p>

            {/* Statement Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Statement Type</label>
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
                  👤 Unit Ledger
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
                  🏢 Common Area
                </button>
              </div>
            </div>

            {/* Statement Scope Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Statement Scope</label>
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
                  📅 Month Cycle
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
                  🗓️ Full Year
                </button>
              </div>
            </div>

            {/* Tenant dropdown */}
            {statementType === 'unit' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Filter Unit / Resident</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Choose Resident --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      Unit {t.unit} - {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Billing month / Billing year selection */}
            {statementScope === 'month' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Statement Cycle Month</label>
                <input
                  type="month"
                  value={statementMonth}
                  onChange={(e) => setStatementMonth(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Statement Cycle Year</label>
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
                Print Statement Ledger
              </button>
            </div>
          </div>

          {/* Statement Document View */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6" id="printable-statement-document">
            {statementScope === 'year' ? (
              // ============================================
              // RENDER ANNUAL VIEW (COMMON AREA OR UNIT LEDGER)
              // ============================================
              statementType === 'commonArea' ? (
                <>
                  {/* Common Area Annual Statement Headings */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">ANNUAL TREASURY STATEMENT</h4>
                      <p className="text-xs text-slate-400 font-medium font-mono mt-1">STATEMENT PERIOD: FULL YEAR {statementYear}</p>
                    </div>
                    <div className="text-left sm:text-right font-sans">
                      <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || 'Grandview Residences'}</h5>
                      <p className="text-xs text-slate-400">{building?.address || '100 Luxury Heights Boulevard'}</p>
                    </div>
                  </div>

                  {/* Common Area Metadata info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">PREPARED FOR</span>
                      <div className="font-bold text-slate-800 text-sm mt-1">Property Owners Association Committee</div>
                      <div className="text-slate-500 mt-1 font-mono">Registry: Annual Common Area Chest Ledger</div>
                      <div className="text-slate-500">Active Residents Count: {tenants.length} occupied units</div>
                    </div>
                    <div className="text-left md:text-right font-sans">
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">DESIGNATED COMMON ALLOCATIONS</span>
                      <div className="text-slate-500 mt-1 font-mono text-[11px] leading-relaxed">
                        Incomes: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                        Expenses: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Common Area Financial overview boxes */}
                  <div className="grid grid-cols-3 gap-3 font-sans">
                    <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">Annual Income</span>
                      <span className="font-bold text-emerald-800 text-md font-mono font-sans">+{formatVal(totalCommonYearIncome)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Annual Expenses</span>
                      <span className="font-bold text-slate-700 text-md font-mono font-sans">-{formatVal(totalCommonYearExpense)}</span>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${
                      totalCommonYearBalance >= 0 ? 'bg-sky-50 border-sky-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <span className={`text-[10px] font-bold block uppercase ${
                        totalCommonYearBalance >= 0 ? 'text-sky-600' : 'text-rose-600'
                      }`}>
                        {totalCommonYearBalance >= 0 ? 'Annual Surplus' : 'Annual Deficit'}
                      </span>
                      <span className={`font-bold text-md font-mono font-sans ${
                        totalCommonYearBalance >= 0 ? 'text-sky-700' : 'text-rose-700'
                      }`}>
                        {formatVal(totalCommonYearBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Month Range Filter for full-year spreadsheet */}
                  <div className="space-y-2 font-sans no-print">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Spreadsheet Range View</h5>
                        <p className="text-[11px] text-slate-400 font-medium">Toggle segments to view or print specific months comfortably</p>
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
                          📅 Full Year
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
                          🌸 Q1 (Jan-Mar)
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
                          ☀️ Q2 (Apr-Jun)
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
                          🍁 Q3 (Jul-Sep)
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
                          ❄️ Q4 (Oct-Dec)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fully Comprehensive Master Spreadsheet Matrix Table */}
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        📂 Annual Ledger Sheet & Unit Payments Detail
                      </h5>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded font-mono">
                        {monthViewRange === 'all' ? 'All Months' : `Segment: ${monthViewRange.toUpperCase()}`}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto scrollbar-thin shadow-xs bg-white">
                      <table className="w-full text-left text-xs text-slate-600 border-collapse table-fixed min-w-[800px]">
                        <thead>
                          {/* Single Clean Month header group without split Amount/Paid */}
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10.5px] uppercase font-sans">
                            <th className="p-3 font-extrabold text-slate-700 align-middle border-r border-slate-200 w-52 sticky left-0 bg-slate-100 z-10">
                              Bill / Residents
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
                              🏢 Building Costs (Shared Expenses)
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
                              Building Expenses Total
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
                              👤 Tenants Payments (Incomes Collected)
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
                              Tenant Payments Total
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
                              Net Surplus / Deficit
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
                  <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans font-sans">
                    This Common Area Annual Statement reflects the combined 12-month treasury accounts matching active tenant split registries and general building expense allocations for the year {statementYear}.
                  </div>
                </>
              ) : activeTenant ? (
                <>
                  {/* Tenant Unit Annual Statement Headings */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">ANNUAL STATEMENT OF ACCOUNT</h4>
                      <p className="text-xs text-slate-400 font-medium font-mono mt-1">STATEMENT PERIOD: FULL YEAR {statementYear}</p>
                    </div>
                    <div className="text-left sm:text-right font-sans col">
                      <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || 'Grandview Residences'}</h5>
                      <p className="text-xs text-slate-400">{building?.address || '100 Luxury Heights Boulevard'}</p>
                    </div>
                  </div>

                  {/* Tenant Metadata info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">PREPARED FOR</span>
                      <div className="font-bold text-slate-800 text-sm mt-1">{activeTenant.name}</div>
                      <div className="text-slate-500 mt-1 font-mono">{activeTenant.phone || 'No phone verified'}</div>
                      <div className="text-slate-500">{activeTenant.email || 'No email verified'}</div>
                    </div>
                    <div className="text-left md:text-right font-sans">
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">UNIT DETAILS</span>
                      <div className="font-extrabold text-blue-600 text-sm mt-1">Unit : {activeTenant.unit}</div>
                      <div className="text-slate-500 mt-1">Term Start: {activeTenant.startDate || '—'}</div>
                      <div className="text-slate-500 font-mono">Dues Due Cycle: Day {activeTenant.rentDueDateDay}</div>
                    </div>
                  </div>

                  {/* Financial overview boxes */}
                  <div className="grid grid-cols-3 gap-3 font-sans">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Annual Share Invoiced</span>
                      <span className="font-bold text-slate-850 text-md font-mono">{formatVal(totalUnitYearDue)}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center font-sans">
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">Annual Amount Paid</span>
                      <span className="font-bold text-emerald-700 text-md font-mono">{formatVal(totalUnitYearPaid)}</span>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${
                      totalUnitYearOutstanding > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className={`text-[10px] font-bold block uppercase ${
                        totalUnitYearOutstanding > 0 ? 'text-rose-600 font-sans' : 'text-slate-400'
                      }`}>
                        Outstanding Due
                      </span>
                      <span className={`font-bold text-md font-mono ${
                        totalUnitYearOutstanding > 0 ? 'text-rose-700' : 'text-slate-705'
                      }`}>
                        {formatVal(totalUnitYearOutstanding)}
                      </span>
                    </div>
                  </div>

                  {/* Month to Month Individual Table */}
                  <div className="space-y-3 font-sans font-sans">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Month-to-Month Statement Ledger</h5>
                    <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                      <table className="w-full min-w-[640px] text-left text-xs text-slate-605">
                        <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 pl-4 whitespace-nowrap">Month</th>
                            <th className="p-3 whitespace-nowrap">Occupancy Status</th>
                            <th className="p-3 text-right whitespace-nowrap">Invoiced Share Dues</th>
                            <th className="p-3 text-right whitespace-nowrap">Receipt Payments</th>
                            <th className="p-3 text-right whitespace-nowrap">Outstanding Balance</th>
                            <th className="p-3 whitespace-nowrap pr-4">Receipt References</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {unitYearRows.map((row) => (
                            <tr key={row.mStr} className="hover:bg-slate-50/10 transition-colors">
                              <td className="p-3 pl-4 font-semibold text-slate-700 font-sans whitespace-nowrap">
                                {row.mName} {statementYear}
                              </td>
                              <td className="p-3 font-sans whitespace-nowrap">
                                {row.isActive ? (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                                    Occupied
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                                    Vacant / Inactive
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right text-slate-850 whitespace-nowrap">
                                {row.dueAmount > 0 ? formatVal(row.dueAmount) : '—'}
                              </td>
                              <td className="p-3 text-right text-emerald-600 font-bold whitespace-nowrap">
                                {row.paidAmount > 0 ? formatVal(row.paidAmount) : formatVal(0)}
                              </td>
                              <td className={`p-3 text-right font-bold whitespace-nowrap ${
                                row.outstanding > 0 ? 'text-rose-600 font-sans' : 'text-slate-400'
                              }`}>
                                {row.outstanding > 0 ? formatVal(row.outstanding) : formatVal(0)}
                              </td>
                              <td className="p-3 text-slate-500 max-w-[150px] truncate pr-4 whitespace-nowrap font-sans font-sans">
                                {row.receiptRefs}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                            <td colSpan={2} className="p-3 pl-4 font-sans whitespace-nowrap">ANNUAL TOTALS</td>
                            <td className="p-3 text-right text-slate-850 whitespace-nowrap">{formatVal(totalUnitYearDue)}</td>
                            <td className="p-3 text-right text-emerald-700 whitespace-nowrap">{formatVal(totalUnitYearPaid)}</td>
                            <td className={`p-3 text-right whitespace-nowrap ${
                              totalUnitYearOutstanding > 0 ? 'text-rose-700' : 'text-slate-720'
                            }`}>
                              {formatVal(totalUnitYearOutstanding)}
                            </td>
                            <td className="p-3 font-sans text-right font-bold pr-4 whitespace-nowrap">
                              <span className={`text-[10px] uppercase px-2.5 py-1 rounded-full ${
                                totalUnitYearOutstanding === 0 ? 'bg-emerald-100 text-emerald-800 font-sans' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {totalUnitYearOutstanding === 0 ? 'Fully Settled' : `${Math.round((totalUnitYearPaid / (totalUnitYearDue || 1)) * 100)}% Settled`}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans font-sans">
                    Thank you for your active residency at {building?.name || 'Grandview Residences'}. This account summary displays official payments and billing invoices matching cycle registries for the year {statementYear}. Please settle any outstanding fees on time.
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-400 font-sans font-sans">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold font-sans">Generate Account Statement Summary</p>
                  <p className="text-xs mt-1">Please select an active resident reference in the filters left.</p>
                </div>
              )
            ) : statementType === 'commonArea' ? (
              <>
                {/* Common Area Statement Headings */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">COMMON AREA TREASURY STATEMENT</h4>
                    <p className="text-xs text-slate-400 font-medium font-mono mt-1">STATEMENT PERIOD: {statementMonth}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || 'Grandview Residences'}</h5>
                    <p className="text-xs text-slate-400">{building?.address || '100 Luxury Heights Boulevard'}</p>
                  </div>
                </div>

                {/* Common Area Metadata info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">PREPARED FOR</span>
                    <div className="font-bold text-slate-800 text-sm mt-1">Property Owners Association Committee</div>
                    <div className="text-slate-500 mt-1 font-mono">Registry: Full Common Area Chest Ledger</div>
                    <div className="text-slate-500">Active Residents Count: {tenants.length} occupied units</div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">DESIGNATED COMMON ALLOCATIONS</span>
                    <div className="text-slate-500 mt-1 font-mono text-[11px] leading-relaxed">
                      Incomes: <span className="font-bold text-slate-700">{commonIncomesList.join(', ')}</span><br />
                      Expenses: <span className="font-bold text-slate-700">{commonExpensesList.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Common Area Financial overview boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Common Incomes</span>
                    <span className="font-bold text-emerald-800 text-md font-mono">+{formatVal(totalCommonIncome)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Common Expenses</span>
                    <span className="font-bold text-slate-700 text-md font-mono">-{formatVal(totalCommonExpense)}</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    netCommonBalance >= 0 ? 'bg-sky-50 border-sky-100' : 'bg-rose-50 border-rose-100'
                  }`}>
                    <span className={`text-[10px] font-bold block uppercase ${
                      netCommonBalance >= 0 ? 'text-sky-600' : 'text-rose-600'
                    }`}>
                      {netCommonBalance >= 0 ? 'Treasury Surplus' : 'Treasury Deficit'}
                    </span>
                    <span className={`font-bold text-md font-mono ${
                      netCommonBalance >= 0 ? 'text-sky-700' : 'text-rose-700'
                    }`}>
                      {formatVal(netCommonBalance)}
                    </span>
                  </div>
                </div>

                {/* Combined dynamic treasury ledger postings */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Statement Ledger Postings</h5>
                  <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4 whitespace-nowrap">Posting Date</th>
                          <th className="p-3 whitespace-nowrap">Receipt / Reference Details</th>
                          <th className="p-3 whitespace-nowrap">Category</th>
                          <th className="p-3 text-right whitespace-nowrap">Debit (Out)</th>
                          <th className="p-3 text-right pr-4 whitespace-nowrap">Credit (In)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {combinedCommonLedger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/10 transition-colors">
                            <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{item.date}</td>
                            <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                              {item.reference}
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Method: {item.method}
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
                              No common area income collections or utilities expense records noted for {statementMonth}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center">
                  This Common Area Financial Summary reflects the collective building treasury accounts matching active tenant split registries and general expense allocations for {statementMonth}.
                </div>
              </>
            ) : activeTenant ? (
              <>
                {/* Statement Headings */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">STATEMENT OF ACCOUNT</h4>
                    <p className="text-xs text-slate-400 font-medium font-mono mt-1">CYCLE PERIOD: {statementMonth}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h5 className="font-extrabold text-slate-800 text-sm">{building?.name || 'Grandview Residences'}</h5>
                    <p className="text-xs text-slate-400">{building?.address || '100 Luxury Heights Boulevard'}</p>
                  </div>
                </div>

                {/* Tenant Metadata info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">PREPARED FOR</span>
                    <div className="font-bold text-slate-800 text-sm mt-1">{activeTenant.name}</div>
                    <div className="text-slate-500 mt-1 font-mono">{activeTenant.phone || 'No phone verified'}</div>
                    <div className="text-slate-500">{activeTenant.email || 'No email verified'}</div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">UNIT DETAILS</span>
                    <div className="font-extrabold text-blue-600 text-sm mt-1">Unit : {activeTenant.unit}</div>
                    <div className="text-slate-500 mt-1">Term Start: {activeTenant.startDate || '—'}</div>
                    <div className="text-slate-500">Dues Due Cycle: Day {activeTenant.rentDueDateDay}</div>
                  </div>
                </div>

                {/* Financial overview boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Invoiced</span>
                    <span className="font-bold text-slate-800 text-md font-mono">{formatVal(totalAmountDue)}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center font-sans">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Amount Paid</span>
                    <span className="font-bold text-emerald-700 text-md font-mono">{formatVal(totalAmountPaid)}</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    outstandingBalance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-bold block uppercase ${
                      outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      Outstanding Due
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
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Statement Ledger Postings</h5>
                  <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4 whitespace-nowrap">Posting Date</th>
                          <th className="p-3 whitespace-nowrap">Reference / Period</th>
                          <th className="p-3 whitespace-nowrap">Method</th>
                          <th className="p-3 text-right whitespace-nowrap">Debit</th>
                          <th className="p-3 text-right pr-4 whitespace-nowrap">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Monthly Base Invoice Debit entry */}
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{statementMonth}-01</td>
                          <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">Base Monthly Share Bill - Cycle {statementMonth}</td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantRent)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{statementMonth}-01</td>
                          <td className="p-3 font-bold text-slate-700 whitespace-nowrap">Guard Salary Contribution</td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantGuard)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{statementMonth}-01</td>
                          <td className="p-3 font-bold text-slate-700 whitespace-nowrap">Maintenance Shared Box Levy</td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">—</td>
                          <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">{formatVal(tenantMaint)}</td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        </tr>
 
                        {/* Paid Credit ledger items */}
                        {tenantPaymentsForMonth.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 pl-4 font-mono text-slate-400 whitespace-nowrap">{p.date || 'TBD'}</td>
                            <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                              Payment cleared ({p.receiptNumber}) - {p.status === 'Paid' ? 'Cleared' : p.status}
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap" title="This shows how your single combined payment is distributed toward your monthly balance allocations">
                                Payment Allocation Breakdown — Share Portion: {formatVal(p.rentPaid ?? Math.max(0, p.amount - (p.guardPaid ?? (building?.defaultGuardFee ?? 50)) - (p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))))} | Guard Salary: {formatVal(p.guardPaid ?? (building?.defaultGuardFee ?? 50))} | Service Box: {formatVal(p.maintenancePaid ?? (building?.defaultMaintenanceFee ?? 30))}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">{p.method}</td>
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
                              No payment credits applied for this cycle month.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
 
                {/* Footer notes */}
                <div className="border-t border-slate-100 pt-5 text-[10px] text-slate-400 leading-relaxed text-center font-sans">
                  Thank you for your active residence at {building?.name || 'Grandview Residences'}. This account summary displays official payments and billing invoices matching cycle registries. Please settle any outstanding fees on time.
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold">Generate Account Statement Summary</p>
                <p className="text-xs mt-1">Please select an active resident reference in the filters left.</p>
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* RENDER REMINDERS & AUTOMATIONS SUBTAB */}
      {activeSubTab === 'automation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="reminders-automation-center">
          {/* Form setup template */}
          <div className="lg:col-span-2 space-y-6">
            {/* Automation text template */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                <Bot className="w-5 h-5 text-blue-500" />
                Monthly Dues Reminder Template
              </h3>
              <p className="text-xs text-slate-400">
                Configure template codes used to automate monthly payment notifications sent via WhatsApp and copy panels.
              </p>

               <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Message Layout</label>
                <textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-blue-500 h-32 leading-relaxed font-sans"
                  placeholder="Enter custom template text here..."
                />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Resident name">{'{BeneficiaryName}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Resident Unit number">{'{Unit}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Rent/Shares balance amount due">{'{ShareAmount}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as Rent due day in the month">{'{DueDay}'}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold" title="Injected as billing month (e.g. June 2026)">{'{Month}'}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    {saveStatus === 'success' && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                        <CheckCircle className="w-4 h-4" />
                        Saved Successfully!
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Failed to Save Settings
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                        isSavingTemplate
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      }`}
                    >
                      {isSavingTemplate ? 'Saving...' : 'Save Templates'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Receipt Template */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-emerald-500" />
                Payment Receipt Template
              </h3>
              <p className="text-xs text-slate-400">
                Configure template codes used to pre-fill rent payment receipt text sent via WhatsApp links.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">Message Layout</label>
                <textarea
                  value={receiptTemplate}
                  onChange={(e) => setReceiptTemplate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border focus:outline-none focus:border-emerald-500 h-40 leading-relaxed font-sans"
                  placeholder="Enter custom template text here..."
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
                        Saved Successfully!
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Failed to Save Settings
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                        isSavingTemplate
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      {isSavingTemplate ? 'Saving...' : 'Save Templates'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* List outstanding tenants needing reminders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-slate-800 text-md">Outstanding Collections (Current Cycle)</h3>
                   <p className="text-xs text-slate-400">Residents currently requiring cycle notifications</p>
                </div>
                <button
                  onClick={runAutopilotScan}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Run Cycle Check
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {payments
                  .filter(p => p.status !== 'Paid' && isMonthCovered(p.monthPaidFor, '2026-06'))
                  .map(p => {
                    const tenant = tenants.find(t => t.id === p.tenantId);
                    
                    const dueAmount = p.amount > 0
                      ? p.amount
                      : (tenant
                          ? (tenant.monthlyRent + (tenant.guardFee ?? building?.defaultGuardFee ?? 0) + (tenant.maintenanceFee ?? building?.defaultMaintenanceFee ?? 0))
                          : 0
                        );

                    const parsedMsg = tenant ? getParsedTemplate(tenant, p.monthPaidFor, dueAmount) : '';
                    const customWaLink = tenant ? getReminderWhatsAppLink(
                      tenant.phone,
                      tenant.name,
                      tenant.unit,
                      dueAmount,
                      `Day ${tenant.rentDueDateDay}`,
                      p.monthPaidFor,
                      reminderTemplate,
                      building?.currency || 'JOD'
                    ) : '#';

                    return (
                      <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{p.tenantName}</span>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                              Unit {p.unit}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <span>Balance Outstanding:</span>
                            <span className="font-semibold text-slate-700 font-mono">{formatVal(dueAmount)}</span>
                            <span>• Due Day: Day {tenant?.rentDueDateDay}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button
                            onClick={() => copyToClipboard(parsedMsg, p.id)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 transition-colors animate-none"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedSuccess === p.id ? 'Copied!' : 'Copy Template'}
                          </button>
                          
                          {tenant?.phone ? (
                            <a
                              href={customWaLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 md:flex-none flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-3 py-2 transition-colors animate-none"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Send Reminder
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No phone attached</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {payments.filter(p => p.status !== 'Paid' && isMonthCovered(p.monthPaidFor, '2026-06')).length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">All balances are currently clear</p>
                    <p className="text-[11px] text-slate-400 mt-1">Excellent collections compliance this month!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logs of automations system */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl flex flex-col h-fit">
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h3 className="font-mono text-sm uppercase tracking-widest font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Autopilot System Console
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Real-time automation scheduler status & audits</p>
            </div>

            <div className="font-mono text-xs space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {automationLog.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-500 hover:text-slate-400 cursor-default shrink-0">[{log.time}]</span>
                  <p className={
                    log.type === 'warn' ? 'text-amber-400 font-semibold' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
                  }>
                    {log.msg}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setAutomationLog([
                  { id: Date.now().toString(), time: new Date().toLocaleTimeString(), msg: 'Cleaning up console buffers...', type: 'info' },
                ]);
              }}
              className="mt-6 border border-slate-700 text-[10px] font-mono hover:bg-slate-800 font-bold py-1.5 px-3 rounded-lg text-slate-400 text-center"
            >
              Clear Console Output
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
