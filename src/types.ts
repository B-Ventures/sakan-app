/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_INCOME_CATEGORIES = ['Rent portion', 'Guard Salary', 'Service Box'];
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Maintenance',
  'Utilities',
  'Insurance',
  'Tax',
  'Cleaning',
  'Staff Salary',
  'Marketing',
  'Other'
];
export const DEFAULT_PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Credit Card'];

export interface CustomPaymentMethod {
  id: string;
  name: string;
  type: 'Cash' | 'Transfer' | 'Credit Card';
  transferId?: string; // Predefined Bank Transfer reference ID (IBAN/ALIAS)
  paymentLink?: string; // Predefined Stripe Link
}

export function normalizePaymentMethods(methods: (string | CustomPaymentMethod)[] | undefined, buildingDefaultBankId?: string): CustomPaymentMethod[] {
  if (!methods || methods.length === 0) {
    return [
      { id: 'default-transfer', name: 'Bank Transfer', type: 'Transfer', transferId: buildingDefaultBankId || '' },
      { id: 'default-cash', name: 'Cash', type: 'Cash' },
      { id: 'default-card', name: 'Credit Card', type: 'Credit Card', paymentLink: '' }
    ];
  }
  return methods.map((m, idx) => {
    if (typeof m === 'string') {
      const lower = m.toLowerCase();
      let type: 'Cash' | 'Transfer' | 'Credit Card' = 'Cash';
      if (lower.includes('transfer') || lower.includes('wire') || lower.includes('iban')) {
        type = 'Transfer';
      } else if (lower.includes('card') || lower.includes('credit') || lower.includes('stripe')) {
        type = 'Credit Card';
      }
      return {
        id: `pm-${idx}-${Date.now()}`,
        name: m,
        type,
        transferId: type === 'Transfer' ? (buildingDefaultBankId || '') : undefined,
        paymentLink: ''
      };
    }
    // Return typed CustomPaymentMethod
    return m;
  });
}

export interface Tenant {
  id: string;
  name: string;
  unit: string;
  monthlyRent: number;
  guardFee?: number; // e.g. guard salary fee (defaults to 50 or 0)
  maintenanceFee?: number; // e.g. maintenance box fee (defaults to 30 or 0)
  rentDueDateDay: number; // e.g. 5 means 5th of every month
  startDate: string;
  endDate: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'vacant';
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  unit: string;
  amount: number; // Total amount paid (sum of rentPaid, guardPaid, maintenancePaid)
  rentPaid?: number; // Rent portion of payment
  guardPaid?: number; // Guard salary portion of payment
  maintenancePaid?: number; // Maintenance box portion of payment
  splits?: Record<string, number>; // Dynamic splits! Key is the category name, value is the portion amount.
  category?: string; // Designated single category of the payment
  date: string; // YYYY-MM-DD
  monthPaidFor: string; // e.g. "2026-06"
  method: string; // e.g. Bank Transfer, Cash, Check, etc.
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  receiptNumber: string;
  transferId?: string; // Predefined Bank Transfer reference ID (IBAN or ALIAS name or number) for wire payments
  paymentLink?: string; // Auto-generated or custom Stripe Payment Link for Credit Cards
}

export type ExpenseCategory = string; // Made dynamic instead of strict union

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  attachmentName?: string;
  attachmentUrl?: string; // Base64 data-URL or local image URL
  status?: 'Paid' | 'Pending' | 'Overdue';
  dueDate?: string; // YYYY-MM-DD
}

export interface Building {
  id: string;
  name: string;
  address?: string;
  ownerId: string;
  createdAt: string;
  isSandbox?: boolean;
  isDemo?: boolean;
  currency?: string; // e.g. 'JOD', 'USD' (defaults to 'JOD')
  defaultBaseRent?: number; // e.g. 1000
  defaultGuardFee?: number; // e.g. 50
  defaultMaintenanceFee?: number; // e.g. 30
  customIncomeCategories?: string[]; // e.g. ['Rent portion', 'Guard Salary', 'Service Box']
  customExpenseCategories?: string[]; // e.g. ['Maintenance', 'Utilities', 'Insurance', 'Tax', 'Cleaning', 'Staff Salary', 'Marketing', 'Other']
  customPaymentMethods?: (string | CustomPaymentMethod)[]; // Custom payment methods configured by owner
  commonAreaIncomeCategories?: string[]; // Income categories designated for building/common area
  commonAreaExpenseCategories?: string[]; // Expense categories designated for building/common area
  reminderTemplate?: string; // Custom WhatsApp/statement payment reminder template
  receiptTemplate?: string; // Custom WhatsApp payment receipt confirmation template
  bankTransferId?: string; // Predefined Bank Transfer info (IBAN or ALIAS name/number)
  // SaaS Subscription fields
  subscriptionStatus?: 'active' | 'expired' | 'trial' | 'none';
  subscriptionPlan?: string;
  subscriptionStartDate?: string; // YYYY-MM-DD
  subscriptionEndDate?: string; // YYYY-MM-DD
  subscriptionAmountPaid?: number; // Price in JOD
  activeAddons?: string[]; // Array of active addon IDs
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string; // e.g., "CREATE_TENANT", "UPDATE_PAYMENT", "UPDATE_BUILDING_TEMPLATE"
  timestamp: string; // ISO String
  details: string; // Descriptive human readable explanation
  entityId?: string;
  entityType?: 'tenant' | 'payment' | 'expense' | 'building' | 'system';
  meta?: Record<string, any>; // Flexible debugging metadata
}

export function formatCurrency(amount: number, currency: string = 'JOD'): string {
  const rounded = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (currency === 'USD') {
    return `$${rounded}`;
  }
  return `${rounded} ${currency}`;
}

export function normalizeMonthStr(m: string): string {
  if (!m) return '';
  const clean = m.trim().replace(/\//g, '-'); // replace slashes with dashes
  const parts = clean.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}`;
  }
  return clean;
}

export function isMonthCovered(monthPaidFor: string, targetMonth: string): boolean {
  if (!monthPaidFor || !targetMonth) return false;
  
  const normTarget = normalizeMonthStr(targetMonth);
  
  if (monthPaidFor.includes(' to ')) {
    const [start, end] = monthPaidFor.trim().split(/\s*to\s*/);
    const normStart = normalizeMonthStr(start);
    const normEnd = normalizeMonthStr(end);
    return normTarget >= normStart && normTarget <= normEnd;
  }
  
  return normalizeMonthStr(monthPaidFor) === normTarget;
}

export function getMonthCount(start: string, end: string): number {
  if (!start || !end) return 1;
  const [startY, startM] = start.split('-').map(Number);
  const [endY, endM] = end.split('-').map(Number);
  if (isNaN(startY) || isNaN(startM) || isNaN(endY) || isNaN(endM)) return 1;
  const m1 = startY * 12 + startM;
  const m2 = endY * 12 + endM;
  return Math.max(1, m2 - m1 + 1);
}

export function getYearMonthFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Case 1: YYYY-MM-DD or YYYY-MM
  if (/^\d{4}-\d{2}/.test(clean)) {
    return clean.substring(0, 7);
  }
  
  // Case 2: M/D/YYYY or D/M/YYYY or M-D-YYYY
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      return `${year}-${month}`;
    }
    
    if (parts[2].length === 4) {
      const year = parts[2];
      const jsDate = new Date(clean);
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getFullYear();
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }
      
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let monthVal = 1;
      if (p0 <= 12) {
        monthVal = p0;
      } else if (p1 <= 12) {
        monthVal = p1;
      }
      const month = String(monthVal).padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  
  const jsDate = new Date(clean);
  if (!isNaN(jsDate.getTime())) {
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  
  return clean.substring(0, 7);
}

export interface UserRecord {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
}

export interface SaaSPlan {
  id: string; // e.g. 'monthly' | 'annually'
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  stripePriceId?: string;
  isActive: boolean;
}

export interface SaaSAddon {
  id: string; // e.g. 'whatsapp_premium', 'extended_analytics'
  name: string;
  price: number;
  currency: string;
  interval: 'one_time' | 'month' | 'year';
  description: string;
  stripePriceId?: string;
  isActive: boolean;
}

export interface SaASCoupon {
  id: string; // code
  code: string;
  discountPercent: number; // e.g., 50
  description: string;
  isActive: boolean;
  validPlanId?: string; // e.g., 'all' | 'monthly' | 'annually'
  maxUses?: number; // total overall usage limit
  maxUsesPerUser?: number; // usage limit per customer
  usedCount?: number; // total number of times used
  userUsage?: Record<string, number>; // tracks user ID -> usage count
}

export interface StripeConfig {
  isEnabled: boolean;
  publicKey: string;
  secretKey: string;
  mode: 'test' | 'live';
  checkoutRedirectType: 'simulated' | 'hosted_checkout';
}

export interface MultiPropertyConfig {
  isEnabled: boolean;
  firstPropertyRatePremium: number;
  additionalPropertyRate: number;
  currency: string;
}

export interface LandingPageConfig {
  siteName: string;
  siteLogoAbbrev: string;
  siteLogoUrl?: string;
  heroBadge: string;
  heroTitle: string;
  heroTitleGradient: string;
  heroDescription: string;
  featuresTitle: string;
  featuresDescription: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  auditTitle: string;
  auditDesc: string;
  ctaTitle: string;
  ctaDesc: string;
  // Arabic fields
  siteNameAr?: string;
  siteLogoAbbrevAr?: string;
  heroBadgeAr?: string;
  heroTitleAr?: string;
  heroTitleGradientAr?: string;
  heroDescriptionAr?: string;
  featuresTitleAr?: string;
  featuresDescriptionAr?: string;
  feature1TitleAr?: string;
  feature1DescAr?: string;
  feature2TitleAr?: string;
  feature2DescAr?: string;
  feature3TitleAr?: string;
  feature3DescAr?: string;
  auditTitleAr?: string;
  auditDescAr?: string;
  ctaTitleAr?: string;
  ctaDescAr?: string;
}

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  siteName: "bProp",
  siteLogoAbbrev: "bP",
  siteLogoUrl: "",
  heroBadge: "Next-Gen Property Ledgers",
  heroTitle: "Ditch the Ledger Chaos.",
  heroTitleGradient: "Automate Property Financials.",
  heroDescription: "The absolute simplest way for property owners to record rent collections, log utility repair expenses, and track splits—with zero spreadsheets or manual tracking math required.",
  featuresTitle: "Built strictly for the realities of modern building management.",
  featuresDescription: "Every utility tool we've crafted solves real on-the-ground problems, eliminating double entries, missing receipts, and human calculator errors.",
  feature1Title: "Dynamic Income ledger & Auto-Splits",
  feature1Desc: "Define rent profiles with customizable sub-portions (e.g., base rent portions, guard fees, cleaning fees). When a payment is recorded, bProp automatically splits the ledger so you know exactly which pool has been funded.",
  feature2Title: "Seamless Mobile Experience",
  feature2Desc: "Access bProp smoothly on any smartphone, tablet, or laptop. Record payments or log maintenance expenses during building walks with a layout custom-fit for touch interaction.",
  feature3Title: "Automated Secure Sync",
  feature3Desc: "Your records are securely saved to the cloud and instantly up to date across all devices. Your ledgers remain private, encrypted, and backed up with zero manual effort.",
  auditTitle: "A chronological history log keeps your portfolio accountable.",
  auditDesc: "Every rent transaction registered, utility payment made, or tenant ledger edit is tracked inside our built-in history trail. Maintain absolute clarity between owners, accountants, and on-site staff.",
  ctaTitle: "Stop losing yield. Reclaim your weekends.",
  ctaDesc: "Join portfolio owners who trust bProp. Start with a risk-free 1-click dashboard test drive, or log in with your Google Account instantly.",
  // Arabic defaults
  siteNameAr: "بي بروب",
  siteLogoAbbrevAr: "ب ب",
  heroBadgeAr: "سجلات عقارية من الجيل القادم",
  heroTitleAr: "تخلص من فوضى الدفاتر الورقية.",
  heroTitleGradientAr: "أتمت الحسابات المالية للعقارات.",
  heroDescriptionAr: "الطريقة الأبسط على الإطلاق لمالكي العقارات لتسجيل الإيجارات المحصلة، وإدخال فواتير الصيانة والخدمات، وتتبع الأقسام - دون الحاجة لجداول بيانات أو حسابات يدوية معقدة.",
  featuresTitleAr: "مصمم خصيصاً ليناسب واقع إدارة المباني الحديثة.",
  featuresDescriptionAr: "كل أداة قمنا بتطويرها تحل مشكلة حقيقية على أرض الواقع، مما يلغي تكرار المدخلات، وفقدان الإيصالات، وأخطاء الحساب اليدوي.",
  feature1TitleAr: "سجل إيرادات ديناميكي وتقسيم تلقائي",
  feature1DescAr: "حدد ملفات الإيجار مع أجزاء مخصصة (مثل الإيجار الأساسي، وراتب الحارس، وصندوق الصيانة). عند تسجيل أي دفعة، تقوم منصة bProp بتقسيم الدفعة تلقائياً في السجل حتى تعرف بالضبط المبلغ المتوفر لكل غرض.",
  feature2TitleAr: "تجربة استخدام سلسة على الهواتف الذكية",
  feature2DescAr: "تصفح bProp بسلاسة تامة من أي هاتف أو جهاز لوحي أو حاسوب محمول. قم بتسجيل الدفعات أو المصروفات أثناء تفقد العقار بواجهة مستخدم مهيأة بالكامل للمس.",
  feature3TitleAr: "مزامنة سحابية تلقائية وآمنة",
  feature3DescAr: "تُحفظ سجلاتك بأمان تام في السحابة وتكون محدثة فوراً عبر جميع أجهزتك. تظل دفاتر الأستاذ الخاصة بك خاصة ومشفرة ومحفوظة احتياطياً بدون أي مجهود يدوي.",
  auditTitleAr: "سجل مراجعة متكامل يحافظ على الشفافية والمسؤولية.",
  auditDescAr: "يتم تتبع كل معاملة إيجار مسجلة، أو مصروف صيانة مدفوع، أو تعديل في سجلات السكان داخل سجل المراجعة المدمج. حافظ على وضوح مطلق بين الملاك، والمحاسبين، وموظفي الموقع.",
  ctaTitleAr: "توقف عن خسارة أرباحك وعائداتك. استعد عطلات نهاية الأسبوع.",
  ctaDescAr: "انضم إلى المئات من ملاك العقارات الذين يثقون في منصة bProp. ابدأ بتجربة لوحة التحكم التجريبية بنقرة واحدة، أو سجل دخولك باستخدام حساب جوجل فوراً."
};



