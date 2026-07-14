import React, { useState } from 'react';
import { 
  Building, 
  ShieldCheck, 
  TrendingUp, 
  Smartphone, 
  Send, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  Sparkles, 
  Plus, 
  CreditCard, 
  FileText, 
  LayoutDashboard, 
  Activity,
  Heart,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPageConfig, DEFAULT_LANDING_CONFIG } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface LandingPageProps {
  onOpenAuth: () => void;
  onLaunchDemo: () => void;
  config?: LandingPageConfig;
}

export default function LandingPage({ onOpenAuth, onLaunchDemo, config }: LandingPageProps) {
  const { t, language, setLanguage, isRtl, dir } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const baseConfig = config || DEFAULT_LANDING_CONFIG;
  
  // Dynamically translate default config values to high-quality Arabic when language is 'ar'
  const arDefaultConfig = {
    heroBadge: "سجلات عقارية من الجيل القادم",
    heroTitle: "تخلص من فوضى الدفاتر الورقية.",
    heroTitleGradient: "أتمت الحسابات المالية للعقارات.",
    heroDescription: "الطريقة الأبسط على الإطلاق لمالكي العقارات لتسجيل الإيجارات المحصلة، وإدخال فواتير الصيانة والخدمات، وتتبع الأقسام - دون الحاجة لجداول بيانات أو حسابات يدوية معقدة.",
    featuresTitle: "مصمم خصيصاً ليناسب واقع إدارة المباني الحديثة.",
    featuresDescription: "كل أداة قمنا بتطويرها تحل مشكلة حقيقية على أرض الواقع، مما يلغي تكرار المدخلات، وفقدان الإيصالات، وأخطاء الحساب اليدوي.",
    feature1Title: "سجل إيرادات ديناميكي وتقسيم تلقائي",
    feature1Desc: "حدد ملفات الإيجار مع أجزاء مخصصة (مثل الإيجار الأساسي، وراتب الحارس، وصندوق الصيانة). عند تسجيل أي دفعة، تقوم منصة bProp بتقسيم الدفعة تلقائياً في السجل حتى تعرف بالضبط المبلغ المتوفر لكل غرض.",
    feature2Title: "تجربة استخدام سلسة على الهواتف الذكية",
    feature2Desc: "تصفح bProp بسلاسة تامة من أي هاتف أو جهاز لوحي أو حاسوب محمول. قم بتسجيل الدفعات أو المصروفات أثناء تفقد العقار بواجهة مستخدم مهيأة بالكامل للمس.",
    feature3Title: "مزامنة سحابية تلقائية وآمنة",
    feature3Desc: "تُحفظ سجلاتك بأمان تام في السحابة وتكون محدثة فوراً عبر جميع أجهزتك. تظل دفاتر الأستاذ الخاصة بك خاصة ومشفرة ومحفوظة احتياطياً بدون أي مجهود يدوي.",
    auditTitle: "سجل مراجعة متكامل يحافظ على الشفافية والمسؤولية.",
    auditDesc: "يتم تتبع كل معاملة إيجار مسجلة، أو مصروف صيانة مدفوع، أو تعديل في سجلات السكان داخل سجل المراجعة المدمج. حافظ على وضوح مطلق بين الملاك، والمحاسبين، وموظفي الموقع.",
    ctaTitle: "توقف عن خسارة أرباحك وعائداتك. استعد عطلات نهاية الأسبوع.",
    ctaDesc: "انضم إلى المئات من ملاك العقارات الذين يثقون في منصة bProp. ابدأ بتجربة لوحة التحكم التجريبية بنقرة واحدة، أو سجل دخولك باستخدام حساب جوجل فوراً."
  };

  const activeConfig = language === 'ar' ? {
    ...baseConfig,
    siteName: baseConfig.siteNameAr || "بي بروب",
    siteLogoAbbrev: baseConfig.siteLogoAbbrevAr || "ب ب",
    heroBadge: baseConfig.heroBadgeAr || arDefaultConfig.heroBadge,
    heroTitle: baseConfig.heroTitleAr || arDefaultConfig.heroTitle,
    heroTitleGradient: baseConfig.heroTitleGradientAr || arDefaultConfig.heroTitleGradient,
    heroDescription: baseConfig.heroDescriptionAr || arDefaultConfig.heroDescription,
    featuresTitle: baseConfig.featuresTitleAr || arDefaultConfig.featuresTitle,
    featuresDescription: baseConfig.featuresDescriptionAr || arDefaultConfig.featuresDescription,
    feature1Title: baseConfig.feature1TitleAr || arDefaultConfig.feature1Title,
    feature1Desc: baseConfig.feature1DescAr || arDefaultConfig.feature1Desc,
    feature2Title: baseConfig.feature2TitleAr || arDefaultConfig.feature2Title,
    feature2Desc: baseConfig.feature2DescAr || arDefaultConfig.feature2Desc,
    feature3Title: baseConfig.feature3TitleAr || arDefaultConfig.feature3Title,
    feature3Desc: baseConfig.feature3DescAr || arDefaultConfig.feature3Desc,
    auditTitle: baseConfig.auditTitleAr || arDefaultConfig.auditTitle,
    auditDesc: baseConfig.auditDescAr || arDefaultConfig.auditDesc,
    ctaTitle: baseConfig.ctaTitleAr || arDefaultConfig.ctaTitle,
    ctaDesc: baseConfig.ctaDescAr || arDefaultConfig.ctaDesc,
  } : baseConfig;
  // Simulator states to allow users to interactively "drive" a mockup on the landing page!
  const [simulatorTab, setSimulatorTab] = useState<'ledger' | 'expenses' | 'alerts'>('ledger');
  const [mockPayments, setMockPayments] = useState([
    { id: '1', tenant: 'Alex Rivera', unit: 'Apt 104', amount: 850, status: 'Paid', date: '2026-07-01' },
    { id: '2', tenant: 'Sarah Jenkins', unit: 'Apt 202', amount: 920, status: 'Overdue', date: '2026-07-05' },
    { id: '3', tenant: 'David Chen', unit: 'Apt 101', amount: 800, status: 'Pending', date: '2026-07-08' },
  ]);
  const [mockExpenses, setMockExpenses] = useState([
    { id: '1', title: 'Elevator Maintenance', category: 'Maintenance', amount: 350, date: '2026-07-02' },
    { id: '2', title: 'Common Area Cleaning', category: 'Cleaning', amount: 120, date: '2026-07-04' },
  ]);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // Handle adding custom expense in simulator
  const handleAddSimulatorExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseTitle || !newExpenseAmount) return;
    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount)) return;

    setMockExpenses([
      {
        id: String(Date.now()),
        title: newExpenseTitle,
        category: 'Maintenance',
        amount,
        date: new Date().toISOString().slice(0, 10),
      },
      ...mockExpenses,
    ]);
    setNewExpenseTitle('');
    setNewExpenseAmount('');
  };

  // Toggle status in simulator
  const handleToggleSimulatorPayment = (id: string) => {
    setMockPayments(prev => prev.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'Paid' ? 'Pending' : p.status === 'Pending' ? 'Overdue' : 'Paid';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  const totalMockIncome = mockPayments.reduce((acc, curr) => acc + (curr.status === 'Paid' ? curr.amount : 0), 0);
  const totalMockOutflow = mockExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netMockProfit = totalMockIncome - totalMockOutflow;

  return (
    <div className={`min-h-screen bg-[#0B0F19] text-slate-100 ${language === 'ar' ? 'font-arabic' : 'font-sans'} selection:bg-blue-500/30 selection:text-blue-200 overflow-x-clip relative w-full`} dir={dir}>
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[600px] right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Landing Navigation Header */}
      <header className="sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-800/60 h-16 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-md shadow-md shadow-blue-600/20 overflow-hidden">
              {activeConfig.siteLogoUrl ? (
                <img
                  src={activeConfig.siteLogoUrl}
                  className="w-full h-full object-cover"
                  alt="logo"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{activeConfig.siteLogoAbbrev}</span>
              )}
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white font-sans">
              {activeConfig.siteName}
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#problem" className="hover:text-white transition-colors">{t('painPoint')}</a>
            <a href="#simulator" className="hover:text-white transition-colors">{t('interactiveDemo')}</a>
            <a href="#features" className="hover:text-white transition-colors">{t('coreFeatures')}</a>
            <a href="#security" className="hover:text-white transition-colors">{t('bankLevelAudits')}</a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex bg-slate-800/60 p-0.5 rounded-lg border border-slate-750/80 text-[10px] font-bold shrink-0">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  language === 'ar'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                عربي
              </button>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer"
            >
              {t('signIn')}
            </button>
            <button
              onClick={onLaunchDemo}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/15 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('tryLiveDemo')}
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white focus:outline-hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur-lg overflow-hidden absolute left-0 right-0 z-30"
            >
              <div className="px-4 pt-3 pb-6 space-y-4 flex flex-col font-semibold text-slate-300 text-sm">
                <a 
                  href="#problem" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  {t('painPoint')}
                </a>
                <a 
                  href="#simulator" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  {t('interactiveDemo')}
                </a>
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  {t('coreFeatures')}
                </a>
                <a 
                  href="#security" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  {t('bankLevelAudits')}
                </a>

                {/* Mobile Language Selector */}
                <div className="px-3 py-2 flex items-center justify-between border-t border-b border-slate-800/40 my-1">
                  <span className="text-xs text-slate-500">{t('languageSelect')}</span>
                  <div className="flex bg-slate-800/60 p-0.5 rounded-lg border border-slate-750/80 text-[10px] font-bold">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        language === 'ar'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      عربي
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 text-center text-xs font-extrabold bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 cursor-pointer"
                  >
                    {t('signIn')}
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLaunchDemo();
                    }}
                    className="w-full py-2.5 text-center text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('tryLiveDemo')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto overflow-hidden text-center">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-wider font-mono">
            <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
            {activeConfig.heroBadge}
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            {activeConfig.heroTitle} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
              {activeConfig.heroTitleGradient}
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            {activeConfig.heroDescription}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {t('getStarted')}
              <ArrowRight className={`w-4 h-4 transform ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            
            <button
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              {t('exploreLiveDemo')}
            </button>
          </div>

          {/* Micro Stats Row */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-800/80 max-w-xl mx-auto">
            <div>
              <span className="block text-2xl font-extrabold text-white">98%</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t('rentCollectedOnTime')}</span>
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-white">12h+</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t('savedPerMonth')}</span>
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-white">100%</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t('taxAuditCompliant')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Preview Section */}
      <section className="relative py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden" id="simulator">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">{t('interactiveDemo')}</h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            {language === 'ar' ? 'شاهد آلية العمل في الوقت الفعلي' : 'See how it works in real-time'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {language === 'ar' 
              ? 'تفاعل مع سجل الإيجارات التجريبي أدناه لاختبار تقسيم الحساب المباشر، وتسجيل مصروفات الخدمات، وإصدار التنبيهات المؤتمتة.'
              : 'Interact with the simulated ledger below to test live calculation splits, log utility expenses, and compile automated alerts.'}
          </p>
        </div>

        <div className="relative w-full flex justify-center">
          <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl -z-10 pointer-events-none transform translate-y-12" />
          
          {/* Desktop UI Frame */}
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-auto min-h-[500px] lg:h-[590px]">
            
            {/* Desktop Titlebar Controls */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/40" />
                <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                <span className="text-[10px] font-mono text-slate-500 ml-3 uppercase tracking-widest font-bold">{t('interactivePreview')}</span>
              </div>
              <div className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/25 rounded text-[8px] font-mono text-blue-400 font-extrabold uppercase">
                {t('noSignInRequired')}
              </div>
            </div>

            {/* Mockup Navigation Tabs */}
            <div className="bg-slate-900/60 border-b border-slate-800/40 grid grid-cols-3 text-center shrink-0">
              <button
                onClick={() => setSimulatorTab('ledger')}
                className={`py-3 text-[10px] sm:text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  simulatorTab === 'ledger' 
                    ? 'border-blue-500 text-white bg-slate-800/30' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{t('rentLedger')}</span>
              </button>
              <button
                onClick={() => setSimulatorTab('expenses')}
                className={`py-3 text-[10px] sm:text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  simulatorTab === 'expenses' 
                    ? 'border-emerald-500 text-white bg-slate-800/30' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{t('expensesOutflow')}</span>
              </button>
              <button
                onClick={() => setSimulatorTab('alerts')}
                className={`py-3 text-[10px] sm:text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  simulatorTab === 'alerts' 
                    ? 'border-indigo-500 text-white bg-slate-800/30' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{t('billingAlerts')}</span>
              </button>
            </div>

            {/* Interactive Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-900/40">
              <AnimatePresence mode="wait">
                {simulatorTab === 'ledger' && (
                  <motion.div
                    key="ledger-sim"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800/50 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t('interactiveRentReceipts')}</span>
                        <span className="block text-base font-extrabold text-blue-400">${totalMockIncome} JOD</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-medium">
                        {t('clickStatusBadges')}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {mockPayments.map(p => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between bg-slate-900 border border-slate-800/70 p-3 rounded-xl hover:border-slate-700 transition-all"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block">{p.tenant}</span>
                            <span className="text-[10px] text-slate-500">{p.unit} • Due: {p.date}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black font-mono text-slate-300">${p.amount} JOD</span>
                            <button
                              onClick={() => handleToggleSimulatorPayment(p.id)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase select-none tracking-wider cursor-pointer ${
                                p.status === 'Paid' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                                p.status === 'Overdue' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' :
                                'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              }`}
                            >
                              {p.status === 'Paid' ? t('paid') : p.status === 'Overdue' ? t('overdue') : t('pending')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {simulatorTab === 'expenses' && (
                  <motion.div
                    key="expenses-sim"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-center sm:text-left">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">{language === 'ar' ? 'الإيجار المقدر' : 'Est. Rent'}</span>
                        <span className="text-xs sm:text-sm font-extrabold text-blue-400">+ ${totalMockIncome} JOD</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-center sm:text-left">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">{language === 'ar' ? 'المصروفات' : 'Outflows'}</span>
                        <span className="text-xs sm:text-sm font-extrabold text-rose-400">- ${totalMockOutflow} JOD</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-center sm:text-left">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">{language === 'ar' ? 'صافي العائد' : 'Net Yield'}</span>
                        <span className={`text-xs sm:text-sm font-extrabold ${netMockProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${netMockProfit} JOD
                        </span>
                      </div>
                    </div>

                    {/* Log custom maintenance cost form */}
                    <form onSubmit={handleAddSimulatorExpense} className="flex flex-col sm:flex-row gap-2 bg-slate-900 border border-slate-800/70 p-3 rounded-xl">
                      <input
                        type="text"
                        required
                        placeholder={language === 'ar' ? 'مثال: إصلاح مضخة المياه' : 'e.g., Water Pump Repair'}
                        value={newExpenseTitle}
                        onChange={(e) => setNewExpenseTitle(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="number"
                        required
                        placeholder={language === 'ar' ? 'المبلغ ($ دينار)' : 'Amount ($ JOD)'}
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        className="w-full sm:w-28 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 sm:py-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center cursor-pointer font-bold text-xs shrink-0"
                      >
                        <Plus className="w-4 h-4 mr-1 sm:mr-0" />
                        <span className="sm:hidden">{language === 'ar' ? 'إضافة مصروف' : 'Add Outflow'}</span>
                      </button>
                    </form>

                    {/* Expense Outflow List */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {mockExpenses.map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{e.title}</span>
                            <span className="text-[9px] text-slate-500">{e.date} • {e.category}</span>
                          </div>
                          <span className="text-xs font-bold text-rose-400">-${e.amount} JOD</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {simulatorTab === 'alerts' && (
                  <motion.div
                    key="alerts-sim"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/50 space-y-1">
                      <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider font-mono">
                        {language === 'ar' ? '⚠️ كشف حساب فواتير المستأجرين الصادر' : '⚠️ Outbound Tenant Billing Statement'}
                      </span>
                      <p className="text-xs text-slate-400 leading-normal">
                        {language === 'ar'
                          ? 'عندما تنتهي دورة الفوترة، تقوم منصة bProp بإنشاء كشوفات حساب واضحة وجاهزة للإرسال عبر واتساب تتضمن تفاصيل الدفع والآيبان ورابط الدفع. وداعاً للمطاردة الهاتفية!'
                          : 'Whenever a billing cycle settles, bProp generates clean, WhatsApp-ready statements with payment details, IBAN, and payment links. No more phone-chasing!'}
                      </p>
                    </div>

                    {/* Mock WhatsApp Notification Panel */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 font-mono text-[11px] leading-relaxed text-slate-300">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                        <Send className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold text-slate-400">
                          {language === 'ar' ? 'معاينة التذكير الصادر:' : 'Preview Outbound Reminder:'}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] space-y-1 whitespace-pre-wrap select-all">
                        {language === 'ar'
                          ? "عزيزي/عزيزتي سارة جينكينز (شقة 202)،\n\nهذا تنبيه ودي بشأن رصيدك الشهري لشهر 2026-07:\n\n• الإيجار: 920 دينار\n• حصة الحارس: 50 دينار\n• الحالة: متأخر\n\nيرجى تحويل المبلغ الإجمالي إلى الآيبان: JO89BOSSTSC202600104\n\nأو الدفع عبر الإنترنت هنا: https://amra.bventures.me/pay?r=apt202"
                          : "Dear Sarah Jenkins (Apt 202),\n\nThis is a friendly statement alert regarding your monthly balance for 2026-07:\n\n• Rent Portion: $920 JOD\n• Guard Fee: $50 JOD\n• Status: Overdue\n\nPlease transfer total amount to Bank IBAN: JO89BOSSTSC202600104\n\nOr pay online here: https://amra.bventures.me/pay?r=apt202"}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSent(true);
                            setTimeout(() => setIsSent(false), 3000);
                          }}
                          disabled={isSent}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          {isSent 
                            ? (language === 'ar' ? 'تم إرسال المحاكاة بنجاح! 🎉' : 'Simulation Sent! 🎉') 
                            : (language === 'ar' ? 'إرسال كشف حساب تجريبي' : 'Send Simulated Statement')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulator Action Banner */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800/60 text-center space-y-2 shrink-0">
              <span className="text-[10px] text-slate-500 font-bold block">{t('widgetsRepresent')}</span>
              <button
                onClick={onLaunchDemo}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-extrabold transition-all"
              >
                {t('enterFullWorkspace')}
                <ArrowRight className={`w-3.5 h-3.5 transform ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* The Core Problems We Solve Section */}
      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-t border-b border-slate-900" id="problem">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">
              {language === 'ar' ? 'كابوس مدير المبنى' : "The Building Manager's Nightmare"}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {language === 'ar' ? 'جداول البيانات والإيصالات الورقية تهدر وقتك وتسبب تسربات مالية.' : 'Spreadsheets and paper receipts are costing you hours and leaking cash.'}
            </h3>
            <p className="text-slate-400 text-sm font-medium max-w-2xl mx-auto leading-relaxed">
              {language === 'ar' 
                ? 'تتضمن إدارة عقار متعدد الوحدات شبكة من المعاملات الصغيرة. حساب تقسيم الإيجار يدوياً، ومتابعة مقاولي الصيانة، وإرسال تنبيهات نصية يدوية يمهد الطريق للأخطاء.' 
                : 'Managing a multi-unit property involves a web of tiny transactions. Hand-calculating rent splits, tracking maintenance contractors, and sending manual SMS alerts is a recipe for error.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pain point 1 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                📊
              </div>
              <h4 className="text-md font-bold text-white">
                {language === 'ar' ? 'دوامة جداول البيانات' : 'The Spreadsheet Sinkhole'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {language === 'ar' 
                  ? 'خطأ إملائي واحد في حسابات الخلايا قد يفسد سجل مدفوعاتك الشهري بالكامل. عندما يطلب مستأجر كشف حساب سنوي، يستغرق الأمر ساعات من البحث في الملفات القديمة لتجميعه.' 
                  : 'One typo in your cell calculations can derail your entire monthly ledger. When a tenant requests their yearly statement, it takes hours of digging through old files to assemble.'}
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                {language === 'ar' ? '✓ منصة bProp تقوم بمزامنة السجل تلقائياً' : '✓ bProp auto-synchronizes ledger logs'}
              </div>
            </div>

            {/* Pain point 2 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                💸
              </div>
              <h4 className="text-md font-bold text-white">
                {language === 'ar' ? 'تسرب ميزانية الصيانة' : 'Outflow Maintenance Leakage'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {language === 'ar' 
                  ? 'ينجز المقاولون أعمال الإصلاح، وتُدفع فواتير الخدمات نقداً، وتضيع الإيصالات الورقية داخل السيارة. في نهاية العام، لا تجد سجلاً واضحاً لصافي العائدات.' 
                  : 'Contractors complete repairs, utility bills are paid in cash, and paper receipts get lost inside glove compartments. At the end of the year, you have no clear record of your net yields.'}
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                {language === 'ar' ? '✓ تتبع المصروفات مع المرفقات' : '✓ bProp outflow tracker with attachments'}
              </div>
            </div>

            {/* Pain point 3 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                💬
              </div>
              <h4 className="text-md font-bold text-white">
                {language === 'ar' ? 'عناء ملاحقة الدفعات' : 'The Chasing Friction'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {language === 'ar' 
                  ? 'مطالبة السكان بالإيجار المتأخر أمر محرج ومجهد. كتابة تذكير مخصص لكل ساكن تستغرق ساعات. تحدد المنصة تلقائياً المتأخرات وتنشئ قوالب جاهزة للمشاركة الفورية عبر واتساب.' 
                  : 'Chasing late rent is awkward and stressful. Typing custom reminders for each tenant takes hours. bProp auto-identifies late tenants and constructs instantly shareable WhatsApp statement templates.'}
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                {language === 'ar' ? '✓ تنبيهات وفواتير عبر واتساب بنقرة واحدة' : '✓ 1-click WhatsApp alerts & invoices'}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12" id="features">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">
            {language === 'ar' ? 'مجموعة الحلول الشاملة' : 'Comprehensive Solution Suite'}
          </h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            {activeConfig.featuresTitle}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {activeConfig.featuresDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Rent Portion splits */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 sm:p-8 rounded-2xl md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">{activeConfig.feature1Title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-xl">
                {activeConfig.feature1Desc}
              </p>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-400">{language === 'ar' ? 'الإيجار الأساسي: 850 دينار' : 'Base Rent: $850 JOD'}</span>
              </div>
              <div className="text-slate-400">{language === 'ar' ? 'الحارس: 50 دينار' : 'Guard: $50 JOD'}</div>
              <div className="text-emerald-400 font-extrabold">{language === 'ar' ? 'التسوية التلقائية: ناجحة' : 'Auto-Settle: Succeeded'}</div>
            </div>
          </div>

          {/* Card 2: Fully Responsive */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 sm:p-8 rounded-2xl md:col-span-4 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">{activeConfig.feature2Title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {activeConfig.feature2Desc}
              </p>
            </div>
            <div className="text-[10px] font-bold font-sans text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? '📱 مهيأ للهواتف والأجهزة اللوحية' : '📱 MOBILE & TABLET OPTIMIZED'}
            </div>
          </div>

          {/* Card 3: Secure Cloud Sync */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 sm:p-8 rounded-2xl md:col-span-4 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">{activeConfig.feature3Title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {activeConfig.feature3Desc}
              </p>
            </div>
            <div className="text-[10px] font-bold font-sans text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? '☁️ تخزين سحابي آمن' : '☁️ SECURE CLOUD STORAGE'}
            </div>
          </div>

          {/* Card 4: Statements & alerts */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 sm:p-8 rounded-2xl md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">
                {language === 'ar' ? 'مولدات كشوفات الحساب التفاعلية' : 'Interactive Statement Generators'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-xl">
                {language === 'ar'
                  ? 'هل تحتاج إلى إثبات دفعة، أو إرسال سجل تدقيق لنهاية العام؟ نقوم بإنشاء كشوفات حساب ضريبية بصيغة PDF وقوالب قابلة للمشاركة بنقرة واحدة. يحصل السكان على فواتير عالية الوضوح لتقليل الاستفسارات.'
                  : 'Need to prove a payment, or send an end-of-year audit trail? Generates PDF tax statements and shareable templates with single-tap clipboard copies. Your occupants get high-clarity bills, reducing support ticket rates.'}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                {language === 'ar' ? 'سجل البيانات وتدقيق الضرائب' : 'Tax Audits & Statements Log'}
              </span>
              <span className="text-blue-400 font-extrabold hover:underline cursor-pointer">
                {language === 'ar' ? 'تصدير PDF بنقرة واحدة ←' : '1-Click PDF export →'}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Security and Audits section */}
      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-900" id="security">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-sans">
              {language === 'ar' ? 'سجل العمليات الموثوق' : 'Reliable History Log'}
            </h2>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              {activeConfig.auditTitle}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {activeConfig.auditDesc}
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                <p className="text-xs font-semibold text-slate-300">
                  {language === 'ar' ? 'يتتبع بدقة من قام بالتعديل، وما هو السطر الذي تم تعديله، ووقت حدوث ذلك.' : 'Tracks exactly who made which edit, what line was modified, and when.'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                <p className="text-xs font-semibold text-slate-300">
                  {language === 'ar' ? 'يمنع التعديلات غير المصرح بها على السجل باستخدام كتل نشطة تعتمد على الأدوار.' : 'Prevents unauthorized ledger modifications with active role-based blocks.'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  {language === 'ar' ? 'سجل المراجعة الأمنية المباشر (لقطة حقيقية من التطبيق)' : 'Live Security Audit Ledger (Actual App Snippet)'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                {language === 'ar' ? 'للقراءة فقط' : 'ReadOnly'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-[10px]">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-emerald-400 block">[UPDATE_PAYMENT] {language === 'ar' ? 'نجح' : 'Succeeded'}</span>
                  <p className="text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'تم تمييز الساكنة "سارة جينكينز" الشقة 202 كـ مدفوع. تم تسجيل جزء تقسيم الإيجار الأساسي بقيمة 920$.'
                      : 'Tenant "Sarah Jenkins" Apt 202 marked Paid. Base rent split portion $920 recorded.'}
                  </p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">
                  {language === 'ar' ? 'الآن' : 'Just now'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-blue-400 block">[CREATE_EXPENSE] {language === 'ar' ? 'نجح' : 'Succeeded'}</span>
                  <p className="text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'إصلاح صيانة: تم تسجيل "مضخة صندوق خدمات المصعد" بمبلغ 350$.'
                      : 'Maintenance repair: "Elevator Service Box Pump" logged amount of $350.'}
                  </p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">
                  {language === 'ar' ? 'منذ 12 دقيقة' : '12 min ago'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-amber-400 block">[RESTORE_BACKUP] {language === 'ar' ? 'تحذير' : 'Warning'}</span>
                  <p className="text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'بدأ المدير هشام تراجعاً يدوياً لقوائم السكان إلى الإصدار 2.4.'
                      : 'Admin Hisham initiated manual rollback of tenant listings to version 2.4.'}
                  </p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">
                  {language === 'ar' ? 'منذ ساعتين' : '2 hours ago'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust & Testimonial Callout */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
          <Heart className="w-6 h-6 animate-pulse" />
        </div>
        <blockquote className="max-w-3xl mx-auto text-lg sm:text-xl font-bold italic leading-relaxed text-slate-200">
          {language === 'ar'
            ? '"قبل bProp، كنت أقضي عطلة نهاية الأسبوع الأولى من كل شهر في حل المسائل الحسابية، ونسخ التذكيرات بالمتأخرات ولصقها في واتساب، والبحث عن فواتير المصعد. الآن تستغرق العملية أقل من 5 دقائق. يحب سكاني وضوح السجل، وأنا أحب استعادة عطلة نهاية الأسبوع لي."'
            : '"Before bProp, I spent my first weekend of every month doing math, copy-pasting late notifications into WhatsApp, and searching for elevator bills. bProp takes under 5 minutes now. My tenants love the clear ledger, and I love having my weekends back."'}
        </blockquote>
        <div>
          <span className="block font-extrabold text-white text-sm">
            {language === 'ar' ? 'هشام بلاطية' : 'Hisham Balatiah'}
          </span>
          <span className="block text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-widest">
            {language === 'ar' ? 'مالك محفظة عقارية • عمان، الأردن' : 'Building Portfolio Owner • Amman, Jordan'}
          </span>
        </div>
      </section>

      {/* CTA Conversion Banner */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-2xl -z-10" />
        
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/20 p-8 sm:p-12 rounded-3xl text-center space-y-6">
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            {activeConfig.ctaTitle}
          </h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed font-medium">
            {activeConfig.ctaDesc}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {language === 'ar' ? 'سجل مجاناً' : 'Sign Up For Free'}
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-2xl border border-slate-800 transition-all cursor-pointer"
            >
              {language === 'ar' ? 'جرب العرض المباشر' : 'Try Live Demo'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-xs overflow-hidden">
              {activeConfig.siteLogoUrl ? (
                <img
                  src={activeConfig.siteLogoUrl}
                  className="w-full h-full object-cover"
                  alt="logo"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{activeConfig.siteLogoAbbrev}</span>
              )}
            </div>
            <span className="font-bold text-slate-300 tracking-tight">
              {activeConfig.siteName} {language === 'ar' ? 'بوابة' : 'Portal'}
            </span>
          </div>
          <p className="font-medium">
            © 2026 {activeConfig.siteName}. {language === 'ar' ? 'صُنع للعقارات بكل شغف. جميع الحقوق محفوظة.' : 'Made for properties with passion. All rights reserved.'}
          </p>
          <div className="flex gap-4 font-mono text-[10px]">
            <a href="#problem" className="hover:underline">
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
            <a href="#simulator" className="hover:underline">
              {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
