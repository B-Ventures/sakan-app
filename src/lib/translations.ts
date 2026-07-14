export interface TranslationKeys {
  // Navigation & Sidebars
  overview: string;
  unitsAndBeneficiaries: string;
  incomeCollections: string;
  expenseLedger: string;
  statementsAndAlerts: string;
  securityAudit: string;
  systemAdminTools: string;
  globalAnalytics: string;
  superAdminDirectory: string;
  subscriptionsAndLicenses: string;
  subscriptionPlansAndStripe: string;

  // Widgets & Key Metrics
  netBalance: string;
  projectedAfterBills: string;
  collectedIncome: string;
  uncollectedDue: string;
  expensesLogged: string;
  unpaidDue: string;
  occupancyRate: string;
  occupiedTotal: string;

  // Performance Charts & Labels
  financialPerformance: string;
  collectedIncomeVsCosts: string;
  received: string;
  costs: string;
  netFlow: string;
  performanceStatus: string;
  surplus: string;
  deficit: string;

  // Distribution Panels
  incomeDistribution: string;
  breakdownOfIncomeComponents: string;
  baseShare: string;
  guardShare: string;
  svcBoxShare: string;
  noIncomeRegistered: string;
  collectedRealized: string;
  expenseDistribution: string;
  breakdownOfOperationalCategories: string;
  noExpensesLogged: string;
  totalOperationalOut: string;

  // General Actions
  importLedger: string;
  exportStatement: string;
  activeSupportSession: string;
  workingUnderContext: string;
  logout: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  add: string;
  languageSelect: string;
  
  // Plan Names Map (dynamic translations)
  "Premium Monthly Plan": string;
  "Premium Annual Plan": string;

  // Landing Page Elements
  painPoint: string;
  interactiveDemo: string;
  coreFeatures: string;
  bankLevelAudits: string;
  signIn: string;
  tryLiveDemo: string;
  portal: string;
  getStarted: string;
  exploreLiveDemo: string;
  activeSimulations: string;
  totalTenantsHoused: string;
  financialFlowOptimized: string;
  interactivePreview: string;
  noSignInRequired: string;
  rentLedger: string;
  expensesOutflow: string;
  billingAlerts: string;
  interactiveRentReceipts: string;
  clickStatusBadges: string;
  paid: string;
  overdue: string;
  pending: string;
  widgetsRepresent: string;
  enterFullWorkspace: string;
  rentCollectedOnTime: string;
  savedPerMonth: string;
  taxAuditCompliant: string;
  theCoreProblems: string;
  weUnderstandFriction: string;
  // Reminders & Dashboard Dues
  remindersCenter: string;
  tenantDues: string;
  expenseBills: string;
  tenantDuesSub: string;
  expenseBillsSub: string;
  searchUnitOrTenant: string;
  searchCategoryOrCost: string;
  clear: string;
  noExpensesMatch: string;
  allCostsSettled: string;
  out: string;
  logDate: string;
  dueDate: string;
  noDeadline: string;
  memo: string;
  noNotes: string;
  updateStatus: string;
  noDuesMatch: string;
  noDuesMatchSub: string;
  unpaid: string;
  dueDay: string;
  ofMonth: string;
  sendReminder: string;
  noContactAttached: string;
  goToReminderSettings: string;
  unionLedgerOverview: string;
  unionLedgerOverviewSub: string;
  fullTrail: string;
  noTransactions: string;
  recentLedgerEntries: string;
  items: string;
  tenantListTitle: string;
  tenantListSub: string;
  registerUnitBeneficiary: string;
  allPortfolios: string;
  occupied: string;
  baseMonthlyShare: string;
  dueCycle: string;
  guardSalary: string;
  maintenanceBox: string;
  termStart: string;
  to: string;
  ongoing: string;
  editUnitProfile: string;
  noUnitsMatched: string;
  noUnitsMatchedSub: string;
  editInformationUnit: string;
  unitNumberLabel: string;
  occupancyStatus: string;
  occupiedActive: string;
  vacantOpen: string;
  inactiveStatus: string;
  beneficiaryNameLabel: string;
  countryPhoneLabel: string;
  countryPhoneHelp: string;
  emailAddressLabel: string;
  baseShareLabel: string;
  dueCycleDayLabel: string;
  guardSalaryLabel: string;
  maintenanceBoxLabel: string;
  termStartDateLabel: string;
  termEndDateLabel: string;
  deleteUnitConfirmTitle: string;
  deleteUnitConfirmMessage: string;
  permanentlyDelete: string;
  keepRecord: string;
  active: string;
  inactive: string;
  unit: string;
  vacant: string;
  saveChanges: string;
  createRecord: string;
  outflowExpensesTitle: string;
  outflowExpensesSub: string;
  logMaintenanceExpense: string;
  categoryFilterLabel: string;
  allCategories: string;
  statusFilterLabel: string;
  allStatuses: string;
  monthFilterLabel: string;
  allMonths: string;
  expenseDetailsCol: string;
  statusCol: string;
  logDueDateCol: string;
  additionalNotesCol: string;
  invoiceReceiptCol: string;
  outflowCostCol: string;
  actionsCol: string;
  noExpensesRecorded: string;
  noExpensesRecordedSub: string;
  showingRows: string;
  toPage: string;
  ofPage: string;
  expensesLabel: string;
  editMaintenanceTitle: string;
  logMaintenanceTitle: string;
  expenseTitleLabel: string;
  outflowCategoryLabel: string;
  costAmountLabel: string;
  expenseLogDateLabel: string;
  dueDateOptionalLabel: string;
  paymentStatusLabel: string;
  attachInvoiceLabel: string;
  attachmentLoaded: string;
  removeLabel: string;
  dragDropHelp: string;
  fileSupportHelp: string;
  additionalNotesLabel: string;
  saveExpenseChanges: string;
  deleteExpenseConfirmTitle: string;
  deleteExpenseConfirmMessage: string;
  noNotesPlaceholder: string;
  noAttachmentPlaceholder: string;
  receiptVerifiedLabel: string;
  rowsLabel: string;
}

export const languages = {
  en: { dir: "ltr" as const, font: "font-sans", name: "English" },
  ar: { dir: "rtl" as const, font: "font-arabic", name: "العربية" }
};

export const translations: Record<"en" | "ar", TranslationKeys> = {
  en: {
    overview: "Overview",
    unitsAndBeneficiaries: "Units & Beneficiaries",
    incomeCollections: "Income Collections",
    expenseLedger: "Expense Ledger",
    statementsAndAlerts: "Statements & Alerts",
    securityAudit: "Security Audit Trail",
    systemAdminTools: "System Admin Tools",
    globalAnalytics: "Global Platform Analytics",
    superAdminDirectory: "SuperAdmin Directory",
    subscriptionsAndLicenses: "Subscriptions & Licenses",
    subscriptionPlansAndStripe: "Subscription Plans & Stripe",
    netBalance: "Net Balance",
    projectedAfterBills: "Projected (After Bills)",
    collectedIncome: "Collected Income",
    uncollectedDue: "Uncollected (Due)",
    expensesLogged: "Expenses Logged",
    unpaidDue: "Unpaid (Due)",
    occupancyRate: "Occupancy Rate",
    occupiedTotal: "Occupied / Total",
    financialPerformance: "Financial Performance",
    collectedIncomeVsCosts: "Collected income vs costs",
    received: "Received",
    costs: "Costs",
    netFlow: "Net Flow",
    performanceStatus: "Performance Status",
    surplus: "Surplus",
    deficit: "Deficit",
    incomeDistribution: "Income Distribution",
    breakdownOfIncomeComponents: "Breakdown of collected income components",
    baseShare: "Base Share",
    guardShare: "Guard Share",
    svcBoxShare: "Svc Box Share",
    noIncomeRegistered: "No collected income registered yet.",
    collectedRealized: "Collected Realized",
    expenseDistribution: "Expense Distribution",
    breakdownOfOperationalCategories: "Breakdown of operational categories",
    noExpensesLogged: "No operational expenses logged.",
    totalOperationalOut: "Total Operational Out",
    importLedger: "Import CSV Ledger",
    exportStatement: "Export Statement",
    activeSupportSession: "ACTIVE SUPPORT SESSION",
    workingUnderContext: "WORKING UNDER OWNER CLIENT CONTEXT",
    logout: "Logout",
    save: "Save Changes",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    languageSelect: "Language / اللغة",
    "Premium Monthly Plan": "Premium Monthly Plan",
    "Premium Annual Plan": "Premium Annual Plan",
    painPoint: "The Pain Point",
    interactiveDemo: "Interactive Demo",
    coreFeatures: "Core Features",
    bankLevelAudits: "Bank-Level Audits",
    signIn: "Sign In",
    tryLiveDemo: "Try Live Demo",
    portal: "Portal",
    getStarted: "Get Started Now",
    exploreLiveDemo: "Explore Live Demo",
    activeSimulations: "Active Simulations Running",
    totalTenantsHoused: "Total Tenants Housed",
    financialFlowOptimized: "Financial Flow Optimized",
    interactivePreview: "BPROP INTERACTIVE PREVIEW",
    noSignInRequired: "NO SIGN-IN REQUIRED",
    rentLedger: "Rent Ledger",
    expensesOutflow: "Expenses & Outflow",
    billingAlerts: "Billing Alerts",
    interactiveRentReceipts: "INTERACTIVE RENT RECEIPTS",
    clickStatusBadges: "Click status badges below to toggle payment states!",
    paid: "Paid",
    overdue: "Overdue",
    pending: "Pending",
    widgetsRepresent: "These interactive widgets represent the real app interface.",
    enterFullWorkspace: "Enter full workspace (Read-only view)",
    rentCollectedOnTime: "Rent Collected On-Time",
    savedPerMonth: "Saved per Month",
    taxAuditCompliant: "Tax & Audit Compliant",
    theCoreProblems: "The Core Problems We Solve",
    weUnderstandFriction: "We understand the direct friction points of managing residential buildings.",
    // Reminders & Dashboard Dues
    remindersCenter: "Reminders Center",
    tenantDues: "Tenant Dues",
    expenseBills: "Expense Bills",
    tenantDuesSub: "Contact outstanding rent accounts & send customized billing statements",
    expenseBillsSub: "Track and update payment status for pending contractor or maintenance vendor costs",
    searchUnitOrTenant: "Search unit or tenant...",
    searchCategoryOrCost: "Search category or cost...",
    clear: "Clear",
    noExpensesMatch: "No outstanding expenses match your filter",
    allCostsSettled: "All recorded costs are settled!",
    out: "OUT",
    logDate: "Log Date:",
    dueDate: "Due Date:",
    noDeadline: "No deadline",
    memo: "Memo:",
    noNotes: "No notes",
    updateStatus: "Update Status",
    noDuesMatch: "No outstanding dues match your filter",
    noDuesMatchSub: "Try searching a different unit code or tenant name",
    unpaid: "Unpaid:",
    dueDay: "Due: Day",
    ofMonth: "of month",
    sendReminder: "Send Reminder",
    noContactAttached: "No contact attached",
    goToReminderSettings: "Go to Reminder Settings & System Automations \u2192",
    unionLedgerOverview: "Union Ledger Overview",
    unionLedgerOverviewSub: "Chronological record of building cashflow",
    fullTrail: "Full Trail",
    noTransactions: "No recorded audit transactions yet.",
    recentLedgerEntries: "Recent ledger entries:",
    items: "items",
    tenantListTitle: "Unit & Beneficiary Administration",
    tenantListSub: "Manage unit owners, monthly dues, and active occupants / beneficiaries",
    registerUnitBeneficiary: "Register Unit / Beneficiary",
    allPortfolios: "All Portfolios",
    occupied: "Occupied",
    baseMonthlyShare: "Base Monthly Share",
    dueCycle: "Due Cycle",
    guardSalary: "Guard Salary",
    maintenanceBox: "Maintenance Box",
    termStart: "Term Start:",
    to: "to",
    ongoing: "Ongoing",
    editUnitProfile: "Edit Unit Profile",
    noUnitsMatched: "No units or beneficiaries matched filters",
    noUnitsMatchedSub: "Try resetting search parameters or register a new unit.",
    editInformationUnit: "Edit Information - Unit",
    unitNumberLabel: "Unit Number *",
    occupancyStatus: "Occupancy Status",
    occupiedActive: "Occupied (Active)",
    vacantOpen: "Vacant / Open",
    inactiveStatus: "Inactive",
    beneficiaryNameLabel: "Beneficiary Name (Owner / Resident) *",
    countryPhoneLabel: "Country Phone / WhatsApp *",
    countryPhoneHelp: "Include country code for WhatsApp link automation.",
    emailAddressLabel: "Email Address",
    baseShareLabel: "Base Monthly Share",
    dueCycleDayLabel: "Due Cycle Day *",
    guardSalaryLabel: "Guard Salary Fee",
    maintenanceBoxLabel: "Maintenance Box Fee",
    termStartDateLabel: "Term Start Date",
    termEndDateLabel: "Term End Date",
    deleteUnitConfirmTitle: "Delete Unit Occupant?",
    deleteUnitConfirmMessage: "Are you sure you want to permanently delete this unit occupant and their direct record? This action will untie historical calculations and cannot be undone.",
    permanentlyDelete: "Permanently Delete",
    keepRecord: "Keep Record",
    active: "active",
    inactive: "inactive",
    unit: "Unit",
    vacant: "Vacant",
    saveChanges: "Save Changes",
    createRecord: "Create Record",
    outflowExpensesTitle: "Building Outflow & Expenses",
    outflowExpensesSub: "Track structural repairs, cleanouts, insurance and tax with receipt logs",
    logMaintenanceExpense: "Log Maintenance/Expense",
    categoryFilterLabel: "Category:",
    allCategories: "All Categories",
    statusFilterLabel: "Status:",
    allStatuses: "All Statuses",
    monthFilterLabel: "Month:",
    allMonths: "All Months",
    expenseDetailsCol: "Expense Details & Category",
    statusCol: "Status",
    logDueDateCol: "Log / Due Date",
    additionalNotesCol: "Additional Notes",
    invoiceReceiptCol: "Invoice / Receipt",
    outflowCostCol: "Outflow Cost",
    actionsCol: "Actions",
    noExpensesRecorded: "No expenses recorded for filters",
    noExpensesRecordedSub: "Try resetting parameters or log a new building cost breakdown.",
    showingRows: "Showing",
    toPage: "to",
    ofPage: "of",
    expensesLabel: "expenses",
    editMaintenanceTitle: "Edit Maintenance / Building Expense",
    logMaintenanceTitle: "Log Maintenance / Building Expense",
    expenseTitleLabel: "Expense Title / Item Name *",
    outflowCategoryLabel: "Outflow Category *",
    costAmountLabel: "Cost Amount",
    expenseLogDateLabel: "Expense Log Date *",
    dueDateOptionalLabel: "Due Date (Optional)",
    paymentStatusLabel: "Payment Status *",
    attachInvoiceLabel: "Attach Original Invoice / Receipt (Optional)",
    attachmentLoaded: "Attachment Loaded",
    removeLabel: "Remove",
    dragDropHelp: "Drag & drop invoice here, or browse",
    fileSupportHelp: "Supports images or PDF up to 5MB",
    additionalNotesLabel: "Additional description & Notes",
    saveExpenseChanges: "Save Expense Changes",
    deleteExpenseConfirmTitle: "Delete Expense Record?",
    deleteExpenseConfirmMessage: "Are you sure you want to permanently delete this expense log? This will adjust your overall building expense balances and cash calculation accordingly.",
    noNotesPlaceholder: "No notes",
    noAttachmentPlaceholder: "No attachment",
    receiptVerifiedLabel: "Receipt Verified",
    rowsLabel: "rows"
  },
  ar: {
    overview: "نظرة عامة",
    unitsAndBeneficiaries: "الوحدات والمستفيدين",
    incomeCollections: "تحصيل الإيرادات",
    expenseLedger: "سجل المصروفات",
    statementsAndAlerts: "الكشوفات والتنبيهات",
    securityAudit: "سجل المراجعة الأمنية",
    systemAdminTools: "أدوات مدير النظام",
    globalAnalytics: "تحليلات المنصة العالمية",
    superAdminDirectory: "دليل المشرفين العام",
    subscriptionsAndLicenses: "الاشتراكات والتراخيص",
    subscriptionPlansAndStripe: "خطط الاشتراك وبوابة Stripe",
    netBalance: "صافي الرصيد",
    projectedAfterBills: "المتوقع (بعد الفواتير)",
    collectedIncome: "الإيرادات المحصلة",
    uncollectedDue: "غير محصل (مستحق)",
    expensesLogged: "المصروفات المسجلة",
    unpaidDue: "غير مدفوع (مستحق)",
    occupancyRate: "نسبة الإشغال",
    occupiedTotal: "مشغول / إجمالي",
    financialPerformance: "الأداء المالي",
    collectedIncomeVsCosts: "الإيرادات المحصلة مقابل التكاليف",
    received: "المستلم",
    costs: "التكاليف",
    netFlow: "صافي التدفق",
    performanceStatus: "حالة الأداء",
    surplus: "فائض",
    deficit: "عجز",
    incomeDistribution: "توزيع الإيرادات",
    breakdownOfIncomeComponents: "تفصيل مكونات الإيرادات المحصلة",
    baseShare: "الحصة الأساسية",
    guardShare: "حصة الحارس",
    svcBoxShare: "حصة صندوق الخدمات",
    noIncomeRegistered: "لم يتم تسجيل إيرادات محصلة بعد.",
    collectedRealized: "المحصل الفعلي",
    expenseDistribution: "توزيع المصروفات",
    breakdownOfOperationalCategories: "تفصيل الفئات التشغيلية",
    noExpensesLogged: "لا يوجد مصروفات تشغيلية مسجلة.",
    totalOperationalOut: "إجمالي المصروفات التشغيلية",
    importLedger: "استيراد دفتر الأستاذ (CSV)",
    exportStatement: "تصدير كشف حساب",
    activeSupportSession: "جلسة دعم نشطة",
    workingUnderContext: "العمل تحت سياق حساب العميل",
    logout: "تسجيل الخروج",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    add: "إضافة",
    languageSelect: "اللغة / Language",
    "Premium Monthly Plan": "الباقة المميزة الشهرية",
    "Premium Annual Plan": "الباقة المميزة السنوية",
    painPoint: "نقاط الألم",
    interactiveDemo: "عرض تفاعلي مباشر",
    coreFeatures: "الميزات الأساسية",
    bankLevelAudits: "أمان مالي متقدم",
    signIn: "تسجيل الدخول",
    tryLiveDemo: "جرب العرض المباشر",
    portal: "بوابة",
    getStarted: "ابدأ الأتمتة الآن",
    exploreLiveDemo: "استكشف العرض التفاعلي",
    activeSimulations: "عمليات محاكاة نشطة",
    totalTenantsHoused: "إجمالي السكان المستضافين",
    financialFlowOptimized: "تدفقات مالية محسنة وموثقة",
    interactivePreview: "معاينة تفاعلية لمنصة bProp",
    noSignInRequired: "لا يتطلب تسجيل الدخول",
    rentLedger: "دفتر الإيجار",
    expensesOutflow: "المصروفات والتدفقات الخارجة",
    billingAlerts: "تنبيهات الفواتير والتحصيل",
    interactiveRentReceipts: "إيصالات إيجار تفاعلية",
    clickStatusBadges: "انقر على شارات الحالة أدناه لتغيير حالة الدفع!",
    paid: "مدفوع",
    overdue: "متأخر",
    pending: "قيد الانتظار",
    widgetsRepresent: "هذه الأدوات التفاعلية تمثل الواجهة الحقيقية للتطبيق.",
    enterFullWorkspace: "دخول مساحة العمل الكاملة (عرض القراءة فقط)",
    rentCollectedOnTime: "إيجارات محصلة في وقتها",
    savedPerMonth: "مبالغ تم توفيرها شهرياً",
    taxAuditCompliant: "متوافق مع التدقيق والضرائب",
    theCoreProblems: "المشاكل الأساسية التي نحلها",
    weUnderstandFriction: "نحن نتفهم نقاط الاحتكاك والصعوبات المباشرة في إدارة المباني السكنية.",
    // Reminders & Dashboard Dues
    remindersCenter: "مركز التنبيهات",
    tenantDues: "مستحقات المستأجرين",
    expenseBills: "فواتير المصروفات",
    tenantDuesSub: "التواصل مع الحسابات المتأخرة وإرسال كشوفات المطالبات المخصصة",
    expenseBillsSub: "تتبع وتحديث حالة الدفع للمقاولين ومزودي خدمات الصيانة المعلقين",
    searchUnitOrTenant: "البحث عن شقة أو مستأجر...",
    searchCategoryOrCost: "البحث عن فئة أو تكلفة...",
    clear: "مسح",
    noExpensesMatch: "لا توجد مصروفات مستحقة تطابق معايير البحث",
    allCostsSettled: "تمت تسوية جميع التكاليف المسجلة بنجاح!",
    out: "صادر",
    logDate: "تاريخ التسجيل:",
    dueDate: "تاريخ الاستحقاق:",
    noDeadline: "بدون موعد نهائي",
    memo: "ملاحظة:",
    noNotes: "لا توجد ملاحظات",
    updateStatus: "تحديث الحالة",
    noDuesMatch: "لا توجد مستحقات معلقة تطابق معايير البحث",
    noDuesMatchSub: "جرّب البحث برمز شقة مختلف أو اسم مستأجر آخر",
    unpaid: "غير مدفوع:",
    dueDay: "الاستحقاق: يوم",
    ofMonth: "من الشهر",
    sendReminder: "إرسال تذكير",
    noContactAttached: "لا يوجد رقم تواصل",
    goToReminderSettings: "الانتقال إلى إعدادات التنبيهات والأتمتة ←",
    unionLedgerOverview: "ملخص دفتر الأستاذ المشترك",
    unionLedgerOverviewSub: "سجل زمني للتدفقات النقدية للمبنى",
    fullTrail: "السجل الكامل",
    noTransactions: "لا توجد عمليات مسجلة حتى الآن.",
    recentLedgerEntries: "قيود دفتر الأستاذ الأخيرة:",
    items: "عناصر",
    tenantListTitle: "إدارة الوحدات والمستفيدين",
    tenantListSub: "إدارة ملاك الوحدات، المستحقات الشهرية، والسكان النشطين / المستفيدين من الخدمات",
    registerUnitBeneficiary: "تسجيل وحدة / مستفيد جديد",
    allPortfolios: "كل المحافظ العقارية",
    occupied: "مشغول",
    baseMonthlyShare: "الحصة الشهرية الأساسية",
    dueCycle: "دورة الاستحقاق",
    guardSalary: "راتب الحارس",
    maintenanceBox: "صندوق الصيانة",
    termStart: "بداية العقد:",
    to: "إلى",
    ongoing: "مستمر",
    editUnitProfile: "تعديل ملف الوحدة",
    noUnitsMatched: "لا توجد وحدات أو مستفيدين يطابقون معايير البحث",
    noUnitsMatchedSub: "يرجى إعادة تعيين معايير البحث أو تسجيل وحدة جديدة.",
    editInformationUnit: "تعديل معلومات - الوحدة",
    unitNumberLabel: "رقم الوحدة *",
    occupancyStatus: "حالة الإشغال",
    occupiedActive: "مشغول (نشط)",
    vacantOpen: "شاغر / متاح",
    inactiveStatus: "غير نشط",
    beneficiaryNameLabel: "اسم المستفيد (المالك / المقيم) *",
    countryPhoneLabel: "رقم الهاتف / واتساب مع رمز الدولة *",
    countryPhoneHelp: "يرجى إدخال رمز الدولة لتفعيل ميزة توليد روابط تذكير واتساب التلقائية.",
    emailAddressLabel: "البريد الإلكتروني",
    baseShareLabel: "الحصة الأساسية الشهرية",
    dueCycleDayLabel: "يوم دورة الاستحقاق *",
    guardSalaryLabel: "رسوم راتب الحارس",
    maintenanceBoxLabel: "رسوم صندوق الصيانة",
    termStartDateLabel: "تاريخ بدء التعاقد",
    termEndDateLabel: "تاريخ انتهاء التعاقد",
    deleteUnitConfirmTitle: "حذف المقيم من الوحدة؟",
    deleteUnitConfirmMessage: "هل أنت متأكد من رغبتك في حذف المقيم بشكل نهائي؟ هذا الإجراء سيؤدي إلى إلغاء ربط الحسابات السابقة ولا يمكن الرجوع عنه.",
    permanentlyDelete: "حذف نهائي",
    keepRecord: "الاحتفاظ بالسجل",
    active: "نشط",
    inactive: "غير نشط",
    unit: "الشقة",
    vacant: "شاغر",
    saveChanges: "حفظ التغييرات",
    createRecord: "إنشاء السجل",
    outflowExpensesTitle: "مصروفات ونفقات المبنى",
    outflowExpensesSub: "تتبع الإصلاحات الهيكلية، الصيانة، الفواتير، والضرائب مع إمكانية أرشفة الإيصالات وفواتير الدفع",
    logMaintenanceExpense: "تسجيل مصروف صيانة",
    categoryFilterLabel: "الفئة:",
    allCategories: "جميع الفئات",
    statusFilterLabel: "الحالة:",
    allStatuses: "جميع الحالات",
    monthFilterLabel: "الشهر:",
    allMonths: "جميع الأشهر",
    expenseDetailsCol: "تفاصيل البند وفئة المصروف",
    statusCol: "الحالة",
    logDueDateCol: "تاريخ التسجيل / الاستحقاق",
    additionalNotesCol: "ملاحظات إضافية",
    invoiceReceiptCol: "الإيصال / الفاتورة",
    outflowCostCol: "التكلفة المصروفة",
    actionsCol: "الإجراءات",
    noExpensesRecorded: "لا توجد مصروفات تطابق معايير البحث",
    noExpensesRecordedSub: "يرجى تعديل معايير التصفية أو تسجيل تكلفة صيانة جديدة للمبنى.",
    showingRows: "عرض من",
    toPage: "إلى",
    ofPage: "من إجمالي",
    expensesLabel: "مصروفات",
    editMaintenanceTitle: "تعديل مصروفات الصيانة للمبنى",
    logMaintenanceTitle: "تسجيل مصروف صيانة للمبنى",
    expenseTitleLabel: "عنوان المصروف / اسم البند *",
    outflowCategoryLabel: "فئة الصرف والإنفاق *",
    costAmountLabel: "قيمة التكلفة",
    expenseLogDateLabel: "تاريخ تسجيل المصروف *",
    dueDateOptionalLabel: "تاريخ الاستحقاق (اختياري)",
    paymentStatusLabel: "حالة الدفع والتسوية *",
    attachInvoiceLabel: "إرفاق الفاتورة أو الإيصال الأصلي (اختياري)",
    attachmentLoaded: "تم تحميل الملف بنجاح",
    removeLabel: "إزالة",
    dragDropHelp: "اسحب وأفلت الفاتورة هنا، أو تصفح ملفاتك",
    fileSupportHelp: "يدعم صيغ الصور وملفات PDF حتى حجم 5 ميجابايت",
    additionalNotesLabel: "تفاصيل إضافية وملاحظات توضيحية",
    saveExpenseChanges: "حفظ تغييرات المصروف",
    deleteExpenseConfirmTitle: "حذف سجل المصروف؟",
    deleteExpenseConfirmMessage: "هل أنت متأكد من رغبتك في حذف سجل المصروف هذا نهائيًا؟ سيؤدي ذلك لتحديث ميزانية وحسابات المبنى الإجمالية وتعديل الرصيد.",
    noNotesPlaceholder: "لا توجد ملاحظات",
    noAttachmentPlaceholder: "لا يوجد مرفق",
    receiptVerifiedLabel: "تم التحقق من الفاتورة",
    rowsLabel: "صفوف"
  }
};
