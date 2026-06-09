/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Tenant, Payment, Expense, formatCurrency } from '../types';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Info, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Building,
  Check,
  Sparkles
} from 'lucide-react';
import { saveTenant, savePayment, saveExpense } from '../firebaseService';

interface DataImporterProps {
  isOpen: boolean;
  onClose: () => void;
  activeBuilding: any;
  tenants: Tenant[];
  isDemoMode: boolean;
  onImportComplete: () => void;
}

interface ParsedRecord {
  type: 'income' | 'expense';
  date: string;
  titleOrTenantName: string;
  unit: string;
  category: string;
  amount: number;
  monthPaidFor: string;
  paymentMethod: string;
  notes: string;
  statusText: string;
  statusType: 'success' | 'warning' | 'info';
}

export default function DataImporter({
  isOpen,
  onClose,
  activeBuilding,
  tenants,
  isDemoMode,
  onImportComplete
}: DataImporterProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
  
  const formatVal = (amount: number) => {
    return formatCurrency(amount, activeBuilding?.currency || 'JOD');
  };
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [autoCreateTenants, setAutoCreateTenants] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>('');
  
  // Results summary
  const [importSummary, setImportSummary] = useState({
    tenantsCreated: 0,
    paymentsAdded: 0,
    expensesAdded: 0,
    totalRecords: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download CSV Helper
  const downloadCSVTemplate = () => {
    const headers = "Type,Date,Name_or_Title,Unit,Category,Amount,Month_Paid_For,Payment_Method,Notes";
    const rows = [
      "Income,2026-06-01,John Doe,101,Rent portion,1200.00,2026-06,Bank Transfer,Clean receipt for June rent",
      "Income,2026-06-01,John Doe,101,Guard Salary,50.00,2026-06,Bank Transfer,Guard service portion",
      "Expense,2026-06-03,Elevator Maintenance,,Maintenance,300.00,,,Monthly elevator service checklist",
      "Expense,2026-06-04,Water Utilities,,Utilities,150.00,,,Water invoice Ref #4552"
    ];
    
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.id = 'download-template-link';
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeBuilding?.name || 'PropManage'}_Bookkeeping_Template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Custom robust CSV Quotes-Aware Parser
  const parseCSVData = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // Skip escape quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
        if (row.some(val => val !== '')) {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF in CRLF
        }
      } else {
        currentValue += char;
      }
    }

    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      if (row.some(val => val !== '')) {
        lines.push(row);
      }
    }

    return lines;
  };

  // 3. Process parsed CSV into validated record objects
  const handleCSVFileContent = (content: string) => {
    try {
      const parsedLines = parseCSVData(content);
      if (parsedLines.length <= 1) {
        setErrorText('The uploaded CSV file is empty or contains no record rows.');
        return;
      }

      const headers = parsedLines[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      
      // Let's inspect column positions
      const typeIdx = headers.indexOf('type');
      const dateIdx = headers.indexOf('date');
      const nameIdx = headers.indexOf('name_or_title') !== -1 ? headers.indexOf('name_or_title') : headers.indexOf('title_or_name');
      const unitIdx = headers.indexOf('unit');
      const catIdx = headers.indexOf('category');
      const amtIdx = headers.indexOf('amount');
      const monthIdx = headers.indexOf('month_paid_for') !== -1 ? headers.indexOf('month_paid_for') : headers.indexOf('month');
      const methodIdx = headers.indexOf('payment_method') !== -1 ? headers.indexOf('payment_method') : headers.indexOf('method');
      const notesIdx = headers.indexOf('notes');

      if (typeIdx === -1 || amtIdx === -1 || nameIdx === -1) {
        setErrorText('Invalid file format. Make sure the CSV contains Type, Name_or_Title, and Amount columns.');
        return;
      }

      const records: ParsedRecord[] = [];

      for (let i = 1; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        if (row.length < 3) continue; // Skip lines that are too short

        const rawType = row[typeIdx]?.trim() || '';
        const rawAmt = row[amtIdx]?.trim() || '0';
        const rawName = row[nameIdx]?.trim() || '';
        const rawDate = dateIdx !== -1 ? (row[dateIdx]?.trim() || '') : '';
        const rawUnit = unitIdx !== -1 ? (row[unitIdx]?.trim() || '') : '';
        const rawCat = catIdx !== -1 ? (row[catIdx]?.trim() || '') : '';
        const rawMonth = monthIdx !== -1 ? (row[monthIdx]?.trim() || '') : '';
        const rawMethod = methodIdx !== -1 ? (row[methodIdx]?.trim() || '') : '';
        const rawNotes = notesIdx !== -1 ? (row[notesIdx]?.trim() || '') : '';

        // Validation & Type matching
        const cleanType = rawType.toLowerCase().startsWith('inc') ? 'income' : 'expense';
        const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''));
        if (isNaN(amount) || amount <= 0) continue; // Ignore zero/negative amount lines

        const date = rawDate || new Date().toISOString().split('T')[0];
        const monthPaidFor = rawMonth || date.substring(0, 7);

        // Analyze matching tenant or category validation
        let statusText = '';
        let statusType: 'success' | 'warning' | 'info' = 'info';

        if (cleanType === 'income') {
          // Check if tenant exist
          const matchedByName = tenants.find(t => t.name.toLowerCase().trim() === rawName.toLowerCase().trim());
          const matchedByUnit = tenants.find(t => t.unit.toLowerCase().trim() === rawUnit.toLowerCase().trim());

          if (matchedByName) {
            statusText = `Tenant matched: "${rawName}" (Unit ${matchedByName.unit})`;
            statusType = 'success';
          } else if (matchedByUnit) {
            statusText = `Unit match: Tenant found on Unit ${rawUnit} (will associate automatically)`;
            statusType = 'success';
          } else {
            statusText = `New tenant: Will create active unit profile for Unit "${rawUnit || 'TBD'}"`;
            statusType = 'warning';
          }
        } else {
          statusText = `Expense logged under category "${rawCat || 'Other'}"`;
          statusType = 'info';
        }

        records.push({
          type: cleanType as 'income' | 'expense',
          date,
          titleOrTenantName: rawName || (cleanType === 'income' ? 'Tenant Name' : 'Expense Title'),
          unit: rawUnit,
          category: rawCat || (cleanType === 'income' ? 'Rent portion' : 'Other'),
          amount,
          monthPaidFor,
          paymentMethod: rawMethod || 'Bank Transfer',
          notes: rawNotes,
          statusText,
          statusType
        });
      }

      setParsedRecords(records);
      setErrorText('');
      setStep('preview');
    } catch (e: any) {
      console.error(e);
      setErrorText(`Failed to read the file correctly. Error: ${e.message || e}`);
    }
  };

  // 4. Drag & Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            handleCSVFileContent(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        setErrorText('Invalid file format. Only spreadsheet .csv exports are accepted.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleCSVFileContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // 5. Execute import write database (Firebase or demo mode)
  const executeDataImport = async () => {
    setStep('importing');
    const bId = activeBuilding.id;

    let tenantsCreatedCount = 0;
    let paymentsAddedCount = 0;
    let expensesAddedCount = 0;

    // Cache existing list to minimize multiple reads
    const localTenants = [...tenants];
    const tenantMap = new Map<string, Tenant>();
    
    localTenants.forEach(t => {
      tenantMap.set(t.name.toLowerCase().trim(), t);
      tenantMap.set(t.unit.toLowerCase().trim(), t);
    });

    const newlyCreatedTenantsLocal = new Map<string, Tenant>();

    try {
      for (const row of parsedRecords) {
        if (row.type === 'expense') {
          const expPayload: Omit<Expense, 'id'> = {
            title: row.titleOrTenantName,
            category: row.category,
            amount: row.amount,
            date: row.date,
            notes: row.notes,
          };

          if (isDemoMode) {
            const demoExpensesRaw = localStorage.getItem(`demo_expenses_${bId}`);
            const demoExpenses: Expense[] = demoExpensesRaw ? JSON.parse(demoExpensesRaw) : [];
            const newExp: Expense = {
              ...expPayload,
              id: `demo-e-${Date.now()}-${Math.random()}`,
            };
            demoExpenses.unshift(newExp);
            localStorage.setItem(`demo_expenses_${bId}`, JSON.stringify(demoExpenses));
          } else {
            await saveExpense(bId, expPayload);
          }
          expensesAddedCount++;
        } else {
          // It's income/payment!
          // Match tenant
          const cleanName = row.titleOrTenantName.toLowerCase().trim();
          const cleanUnit = row.unit.toLowerCase().trim();

          let tenant = tenantMap.get(cleanName) || tenantMap.get(cleanUnit);
          if (!tenant) {
            tenant = newlyCreatedTenantsLocal.get(cleanName) || newlyCreatedTenantsLocal.get(cleanUnit);
          }

          if (!tenant) {
            // Check if user allowed auto-creation
            if (!autoCreateTenants) {
              // Skip or fall back to mock placeholder
              continue;
            }

            const isRentRow = row.category?.toLowerCase().includes('rent');
            const defaultBase = activeBuilding?.defaultBaseRent !== undefined ? Number(activeBuilding.defaultBaseRent) : 1000;
            const defaultGuard = activeBuilding?.defaultGuardFee !== undefined ? Number(activeBuilding.defaultGuardFee) : 50;
            const defaultMaint = activeBuilding?.defaultMaintenanceFee !== undefined ? Number(activeBuilding.defaultMaintenanceFee) : 30;

            const tenantPayload: Omit<Tenant, 'id'> = {
              name: row.titleOrTenantName || `Unit ${row.unit} Tenant`,
              unit: row.unit || 'TBD',
              monthlyRent: isRentRow ? row.amount : defaultBase,
              guardFee: defaultGuard,
              maintenanceFee: defaultMaint,
              rentDueDateDay: 5,
              startDate: row.date || new Date().toISOString().split('T')[0],
              endDate: '',
              phone: '',
              email: '',
              status: 'active',
            };

            if (isDemoMode) {
              const demoTenantsRaw = localStorage.getItem(`demo_tenants_${bId}`);
              const demoTenants: Tenant[] = demoTenantsRaw ? JSON.parse(demoTenantsRaw) : [];
              const newId = `demo-t-${Date.now()}-${Math.random()}`;
              const newT: Tenant = { ...tenantPayload, id: newId };
              demoTenants.push(newT);
              localStorage.setItem(`demo_tenants_${bId}`, JSON.stringify(demoTenants));
              
              tenant = newT;
              newlyCreatedTenantsLocal.set(cleanName, newT);
              if (cleanUnit) newlyCreatedTenantsLocal.set(cleanUnit, newT);
            } else {
              const added = await saveTenant(bId, tenantPayload);
              tenant = added;
              newlyCreatedTenantsLocal.set(cleanName, added);
              if (cleanUnit) newlyCreatedTenantsLocal.set(cleanUnit, added);
            }
            tenantsCreatedCount++;
          }

          // Determine splits and explicit fields based on Category
          const splits: Record<string, number> = {};
          let rentPaid = 0;
          let guardPaid = 0;
          let maintenancePaid = 0;

          const rowCategory = row.category || 'Rent portion';
          const catLower = rowCategory.toLowerCase().trim();
          
          if (catLower.includes('guard')) {
            guardPaid = row.amount;
            splits['Guard Salary'] = row.amount;
          } else if (catLower.includes('service') || catLower.includes('maint')) {
            maintenancePaid = row.amount;
            splits['Service Box'] = row.amount;
          } else if (catLower.includes('rent')) {
            rentPaid = row.amount;
            splits['Rent portion'] = row.amount;
          } else {
            // General or other category specified in the CSV
            splits[rowCategory] = row.amount;
            if (rowCategory.includes('Rent')) {
              rentPaid = row.amount;
            } else if (rowCategory.includes('Guard')) {
              guardPaid = row.amount;
            } else if (rowCategory.includes('Service') || rowCategory.includes('Maint')) {
              maintenancePaid = row.amount;
            } else {
              rentPaid = row.amount; // default fallback
            }
          }

          // Build payment
          const payPayload: Omit<Payment, 'id' | 'receiptNumber'> = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            unit: tenant.unit,
            amount: row.amount,
            category: rowCategory,
            splits,
            rentPaid,
            guardPaid,
            maintenancePaid,
            date: row.date,
            monthPaidFor: row.monthPaidFor || row.date.substring(0, 7),
            method: row.paymentMethod || 'Bank Transfer',
            status: 'Paid',
            notes: row.notes,
          };

          if (isDemoMode) {
            const demoPaymentsRaw = localStorage.getItem(`demo_payments_${bId}`);
            const demoPayments: Payment[] = demoPaymentsRaw ? JSON.parse(demoPaymentsRaw) : [];
            const receiptCode = `REC-${payPayload.monthPaidFor.replace('-', '')}-${payPayload.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
            const newPay: Payment = {
              ...payPayload,
              id: `demo-p-${Date.now()}-${Math.random()}`,
              receiptNumber: receiptCode,
            };
            demoPayments.unshift(newPay);
            localStorage.setItem(`demo_payments_${bId}`, JSON.stringify(demoPayments));
          } else {
            const receiptCode = `REC-${payPayload.monthPaidFor.replace('-', '')}-${payPayload.unit.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
            await savePayment(bId, {
              ...payPayload,
              receiptNumber: receiptCode,
            });
          }
          paymentsAddedCount++;
        }
      }

      setImportSummary({
        tenantsCreated: tenantsCreatedCount,
        paymentsAdded: paymentsAddedCount,
        expensesAdded: expensesAddedCount,
        totalRecords: parsedRecords.length
      });
      setStep('success');
      onImportComplete();
    } catch (e) {
      console.error(e);
      setErrorText('Error writing some database records. Please double check permissions.');
      setStep('preview');
    }
  };

  const handleCloseAndReset = () => {
    setStep('upload');
    setFileName('');
    setParsedRecords([]);
    setErrorText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans" id="data-importer-container">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Ledger CSV Account Import</h4>
              <p className="text-[10px] text-slate-400">Initialize property historical bookkeeping at once</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleCloseAndReset} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: UPLOAD & TEMPLATE DOWNLOAD */}
        {step === 'upload' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="text-center space-y-2">
              <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                {activeBuilding?.name}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Prepare your calculations in Google Sheets, Apple Numbers or Microsoft Excel, download as standard <b>CSV</b> format, and upload to load all files at once.
              </p>
            </div>

            {/* Template Download Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center font-bold font-sans shrink-0">
                  CSV
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate">PropManage_Bookkeeping_Template.csv</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Includes columns mapping and 4 beautiful demo row entries</span>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadCSVTemplate}
                id="btn-download-csv-template"
                className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[10.5px] border border-slate-200 px-3 py-2 rounded-xl shrink-0 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                Template
              </button>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/40 text-blue-800' 
                  : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <Upload className={`w-8 h-8 ${dragActive ? 'text-blue-500 animate-bounce' : 'text-slate-300'}`} />
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer inline-block"
                >
                  Browse your local files
                </button>
                <span className="text-xs text-slate-400 block mt-1.5">or drag & drop historical CSV file here</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {errorText && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-800 font-bold flex gap-2 items-start leading-snug">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PREVIEW & VERIFY */}
        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Split statistics */}
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-around items-center shrink-0">
              <div className="text-center">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-mono">Incomes Found</span>
                <span className="text-sm font-bold text-emerald-600 font-mono mt-0.5 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {parsedRecords.filter(r => r.type === 'income').length} items
                </span>
              </div>
              <div className="border-r border-slate-200 h-6"></div>
              <div className="text-center">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-mono">Expenses Found</span>
                <span className="text-sm font-bold text-rose-600 font-mono mt-0.5 flex items-center justify-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {parsedRecords.filter(r => r.type === 'expense').length} items
                </span>
              </div>
            </div>

            {/* Scrollable validation checklist */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono pl-1">
                Parsed Transaction Ledger Preview
              </h5>
              
              <div className="space-y-2">
                {parsedRecords.map((rec, i) => (
                  <div 
                    key={i} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      rec.type === 'income' ? 'bg-emerald-50/20 border-emerald-100/60' : 'bg-red-50/20 border-rose-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        rec.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {rec.type === 'income' ? 'IN' : 'EX'}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate leading-tight">
                          {rec.titleOrTenantName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                          <span className="text-[9px] font-mono text-slate-400 shrink-0 font-medium">{rec.date}</span>
                          {rec.unit && (
                            <span className="text-[8px] bg-slate-150 text-slate-600 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
                              Unit {rec.unit}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 italic truncate max-w-[150px]">{rec.statusText}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-[13px] ${
                        rec.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {rec.type === 'income' ? '+' : '-'}{formatVal(rec.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Configurations parameters */}
              <div className="pt-3 border-t border-slate-100 space-y-2 pl-1 font-sans">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateTenants}
                    onChange={(e) => setAutoCreateTenants(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    id="chk-auto-create-tenants"
                  />
                  <span>Auto-create tenant profiles if they do not exist in Unit list</span>
                </label>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition-colors"
                id="btn-import-back"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={executeDataImport}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                id="btn-import-confirm"
              >
                Confirm & Import Records
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING WRITER SPINNER */}
        {step === 'importing' && (
          <div className="p-12 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <div>
              <h5 className="font-bold text-slate-800 text-sm">Synchronizing ledger...</h5>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
                Connecting to Property database and instantiating secure lease entities. Under Standard tier limits.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="p-6 text-center space-y-5 flex-1 overflow-y-auto">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-md">Import Completed Successfully!</h4>
              <p className="text-xs text-slate-400">Everything has been validated and safely synced down.</p>
            </div>

            {/* Results distribution metadata */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase font-mono">Tenants Built</span>
                <span className="text-md font-bold text-slate-850 mt-1 block font-mono">{importSummary.tenantsCreated}</span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase font-mono">Paid Receipts</span>
                <span className="text-md font-bold text-emerald-600 mt-1 block font-mono">+{importSummary.paymentsAdded}</span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase font-mono">Expenses</span>
                <span className="text-md font-bold text-rose-500 mt-1 block font-mono">-{importSummary.expensesAdded}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Your overall Operating Margin and cash balances on the main dashboard have updated in real-time.
            </p>

            <button
              type="button"
              onClick={handleCloseAndReset}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              id="btn-import-success-done"
            >
              Done, Return to Workspace
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
