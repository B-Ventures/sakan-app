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

interface LandingPageProps {
  onOpenAuth: () => void;
  onLaunchDemo: () => void;
  config?: LandingPageConfig;
}

export default function LandingPage({ onOpenAuth, onLaunchDemo, config }: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeConfig = config || DEFAULT_LANDING_CONFIG;
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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative w-full">
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[600px] right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Landing Navigation Header */}
      <header className="sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-800/60 h-16 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-md shadow-md shadow-blue-600/20 uppercase">
              {activeConfig.siteLogoAbbrev}
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white font-sans">
              {activeConfig.siteName}<span className="text-blue-500 text-xs ml-1 uppercase tracking-widest font-mono font-black">Financials</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#problem" className="hover:text-white transition-colors">The Pain Point</a>
            <a href="#simulator" className="hover:text-white transition-colors">Live Interactive Demo</a>
            <a href="#features" className="hover:text-white transition-colors">Core Features</a>
            <a href="#security" className="hover:text-white transition-colors">Bank-Level Audits</a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onLaunchDemo}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/15 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Try Live Demo
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
                  The Pain Point
                </a>
                <a 
                  href="#simulator" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  Live Interactive Demo
                </a>
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  Core Features
                </a>
                <a 
                  href="#security" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  Bank-Level Audits
                </a>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 text-center text-xs font-extrabold bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLaunchDemo();
                    }}
                    className="w-full py-2.5 text-center text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Live Demo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
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
            
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              {activeConfig.heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Automating Now
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={onLaunchDemo}
                className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                Explore Live Demo
              </button>
            </div>

            {/* Micro Stats Row */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80 max-w-md mx-auto lg:mx-0">
              <div>
                <span className="block text-2xl font-extrabold text-white">98%</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Rent Collected On-Time</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-white">12h+</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Saved per Month</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-white">100%</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Tax & Audit Compliant</span>
              </div>
            </div>
          </div>

          {/* Right Column: Beautiful Custom Live simulator (Mocking UI elements in a desktop screen) */}
          <div className="lg:col-span-7 relative w-full flex justify-center" id="simulator">
            <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl -z-10 pointer-events-none transform translate-y-12" />
            
            {/* Desktop UI Frame */}
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-auto min-h-[460px] lg:h-[480px]">
              
              {/* Desktop Titlebar Controls */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/40" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                  <span className="text-[10px] font-mono text-slate-500 ml-3 uppercase tracking-widest font-bold">bProp INTERACTIVE PREVIEW</span>
                </div>
                <div className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/25 rounded text-[8px] font-mono text-blue-400 font-extrabold uppercase">
                  No Sign-In Required
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
                  <span className="truncate">Rent Ledger</span>
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
                  <span className="truncate">Expenses & Outflow</span>
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
                  <span className="truncate">Billing Alerts</span>
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
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Interactive Rent Receipts</span>
                          <span className="block text-base font-extrabold text-blue-400">${totalMockIncome} JOD</span>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 font-medium">
                          Click status badges below to toggle payment states!
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
                                {p.status}
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
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Est. Rent</span>
                          <span className="text-xs sm:text-sm font-extrabold text-blue-400">+ ${totalMockIncome}</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-center sm:text-left">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Outflows</span>
                          <span className="text-xs sm:text-sm font-extrabold text-rose-400">- ${totalMockOutflow}</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-center sm:text-left">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Net Yield</span>
                          <span className={`text-xs sm:text-sm font-extrabold ${netMockProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${netMockProfit}
                          </span>
                        </div>
                      </div>

                      {/* Log custom maintenance cost form */}
                      <form onSubmit={handleAddSimulatorExpense} className="flex flex-col sm:flex-row gap-2 bg-slate-900 border border-slate-800/70 p-3 rounded-xl">
                        <input
                          type="text"
                          required
                          placeholder="e.g., Water Pump Repair"
                          value={newExpenseTitle}
                          onChange={(e) => setNewExpenseTitle(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          required
                          placeholder="Amount ($ JOD)"
                          value={newExpenseAmount}
                          onChange={(e) => setNewExpenseAmount(e.target.value)}
                          className="w-full sm:w-28 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 sm:py-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center cursor-pointer font-bold text-xs shrink-0"
                        >
                          <Plus className="w-4 h-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">Add Outflow</span>
                        </button>
                      </form>

                      {/* Expense Outflow List */}
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider font-mono">⚠️ Outbound Tenant Billing Statement</span>
                        <p className="text-xs text-slate-400 leading-normal">
                          Whenever a billing cycle settles, bProp generates clean, WhatsApp-ready statements with payment details, IBAN, and payment links. No more phone-chasing!
                        </p>
                      </div>

                      {/* Mock WhatsApp Notification Panel */}
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 font-mono text-[11px] leading-relaxed text-slate-300">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                          <Send className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-bold text-slate-400">Preview Outbound Reminder:</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] space-y-1 whitespace-pre-wrap select-all">
                          {"Dear Sarah Jenkins (Apt 202),\n\nThis is a friendly statement alert regarding your monthly balance for 2026-07:\n\n• Rent Portion: $920 JOD\n• Guard Fee: $50 JOD\n• Status: Overdue\n\nPlease transfer total amount to Bank IBAN: JO89BOSSTSC202600104\n\nOr pay online here: https://prop.bventures.me/pay?r=apt202"}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => alert("Simulation sent! Sign up to enable real WhatsApp/SMS sync.")}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Send Simulated Statement
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Simulator Action Banner */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800/60 text-center space-y-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-bold block">These interactive widgets represent the real app interface.</span>
                <button
                  onClick={onLaunchDemo}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-extrabold transition-all"
                >
                  Enter full workspace (Read-only view)
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* The Core Problems We Solve Section */}
      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-t border-b border-slate-900" id="problem">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">The Building Manager's Nightmare</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Spreadsheets and paper receipts are costing you hours and leaking cash.
            </h3>
            <p className="text-slate-400 text-sm font-medium max-w-2xl mx-auto leading-relaxed">
              Managing a multi-unit property involves a web of tiny transactions. Hand-calculating rent splits, tracking maintenance contractors, and sending manual SMS alerts is a recipe for error.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pain point 1 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                📊
              </div>
              <h4 className="text-md font-bold text-white">The Spreadsheet Sinkhole</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                One typo in your cell calculations can derail your entire monthly ledger. When a tenant requests their yearly statement, it takes hours of digging through old files to assemble.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                ✓ bProp auto-synchronizes ledger logs
              </div>
            </div>

            {/* Pain point 2 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                💸
              </div>
              <h4 className="text-md font-bold text-white">Outflow Maintenance Leakage</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Contractors complete repairs, utility bills are paid in cash, and paper receipts get lost inside glove compartments. At the end of the year, you have no clear record of your net yields.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                ✓ bProp outflow tracker with attachments
              </div>
            </div>

            {/* Pain point 3 */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-6 sm:p-8 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-extrabold text-lg select-none">
                💬
              </div>
              <h4 className="text-md font-bold text-white">The Chasing Friction</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Chasing late rent is awkward and stressful. Typing custom reminders for each tenant takes hours. bProp auto-identifies late tenants and constructs instantly shareable WhatsApp statement templates.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                ✓ 1-click WhatsApp alerts & invoices
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12" id="features">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">Comprehensive Solution Suite</h2>
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
                <span className="text-slate-400">Base Rent: $850 JOD</span>
              </div>
              <div className="text-slate-400">Guard: $50 JOD</div>
              <div className="text-emerald-400 font-extrabold">Auto-Settle: Succeeded</div>
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
              📱 MOBILE & TABLET OPTIMIZED
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
              ☁️ SECURE CLOUD STORAGE
            </div>
          </div>

          {/* Card 4: Statements & alerts */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 sm:p-8 rounded-2xl md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Interactive Statement Generators</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-xl">
                Need to prove a payment, or send an end-of-year audit trail? Generates PDF tax statements and shareable templates with single-tap clipboard copies. Your occupants get high-clarity bills, reducing support ticket rates.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Tax Audits & Statements Log</span>
              <span className="text-blue-400 font-extrabold hover:underline cursor-pointer">1-Click PDF export →</span>
            </div>
          </div>

        </div>
      </section>

      {/* Security and Audits section */}
      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-900" id="security">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-sans">Reliable History Log</h2>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              {activeConfig.auditTitle}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {activeConfig.auditDesc}
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                <p className="text-xs font-semibold text-slate-300">Tracks exactly who made which edit, what line was modified, and when.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                <p className="text-xs font-semibold text-slate-300">Prevents unauthorized ledger modifications with active role-based blocks.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white uppercase">Live Security Audit Ledger (Actual App Snippet)</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500">ReadOnly</span>
            </div>

            <div className="space-y-3 font-mono text-[10px]">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-emerald-400 block">[UPDATE_PAYMENT] Succeeded</span>
                  <p className="text-slate-400 mt-0.5">Tenant "Sarah Jenkins" Apt 202 marked Paid. Base rent split portion $920 recorded.</p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">Just now</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-blue-400 block">[CREATE_EXPENSE] Succeeded</span>
                  <p className="text-slate-400 mt-0.5">Maintenance repair: "Elevator Service Box Pump" logged amount of $350.</p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">12 min ago</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/60 flex items-start gap-3 justify-between">
                <div>
                  <span className="text-amber-400 block">[RESTORE_BACKUP] Warning</span>
                  <p className="text-slate-400 mt-0.5">Admin Hisham initiated manual rollback of tenant listings to version 2.4.</p>
                </div>
                <span className="text-slate-600 font-medium shrink-0">2 hours ago</span>
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
          "Before bProp, I spent my first weekend of every month doing math, copy-pasting late notifications into WhatsApp, and searching for elevator bills. bProp takes under 5 minutes now. My tenants love the clear ledger, and I love having my weekends back."
        </blockquote>
        <div>
          <span className="block font-extrabold text-white text-sm">Hisham Balatiah</span>
          <span className="block text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-widest">Building Portfolio Owner • Amman, Jordan</span>
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
              Sign Up For Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-2xl border border-slate-800 transition-all cursor-pointer"
            >
              Try Live Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-xs uppercase">
              {activeConfig.siteLogoAbbrev}
            </div>
            <span className="font-bold text-slate-300 tracking-tight">{activeConfig.siteName} Portal</span>
          </div>
          <p className="font-medium">© 2026 {activeConfig.siteName}. Made for properties with passion. All rights reserved.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <a href="#problem" className="hover:underline">Privacy Policy</a>
            <a href="#simulator" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
