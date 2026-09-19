import React, { useState } from 'react';
import { Lock, Sparkles, Shield, X, ArrowRight, RefreshCw, KeyRound, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onDemoSignIn: () => Promise<void>;
  onSuperAdminSignIn: (email: string, pass: string) => Promise<void>;
  authLoading: boolean;
  siteName?: string;
  siteLogoAbbrev?: string;
  siteLogoUrl?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onGoogleSignIn,
  onDemoSignIn,
  onSuperAdminSignIn,
  authLoading,
  siteName = 'amra solution',
  siteLogoAbbrev = 'AS',
  siteLogoUrl,
}: LoginModalProps) {
  const { language } = useLanguage();
  const [isAdminFormVisible, setIsAdminFormVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  
  // COPPA Compliance & Age Gate state
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState(false);

  const handleGuardedGoogleSignIn = async () => {
    if (!isAgeConfirmed) {
      setAgeError(true);
      return;
    }
    setAgeError(false);
    await onGoogleSignIn();
  };

  const handleGuardedDemoSignIn = async () => {
    if (!isAgeConfirmed) {
      setAgeError(true);
      return;
    }
    setAgeError(false);
    await onDemoSignIn();
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgeConfirmed) {
      setAgeError(true);
      return;
    }
    setAgeError(false);
    setSubmittingAdmin(true);
    try {
      await onSuperAdminSignIn(adminEmail, adminPassword);
    } finally {
      setSubmittingAdmin(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        {/* Backdrop clickable */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
          id="login-modal-panel"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          {(() => {
            const effectiveName = siteName && siteName !== 'bProp' ? siteName : 'amra solution';
            const effectiveAbbrev = siteLogoAbbrev && siteLogoAbbrev !== 'bP' ? siteLogoAbbrev : (language === 'ar' ? 'عا' : 'AS');
            return (
              <div className="text-center space-y-2.5 mb-8">
                {siteLogoUrl ? (
                  <img src={siteLogoUrl} alt={effectiveName} className="w-12 h-12 rounded-2xl mx-auto object-cover shadow-md" />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-md tracking-wider">
                    {effectiveAbbrev}
                  </div>
                )}
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {language === 'ar' ? `الدخول إلى بوابة ${effectiveName}` : `Access ${effectiveName} Portal`}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {language === 'ar' 
                    ? 'سجل الدخول بأمان لإدارة جداول الإيجار ودفاتر الأستاذ للشاغلين والمعاملات العقارية.'
                    : 'Securely log in to manage rent schedules, occupant ledgers, and property transactions.'}
                </p>
              </div>
            );
          })()}

          {/* Social Sign-in Methods */}
          <div className="space-y-4">
            {/* COPPA Age Gate Checkbox */}
            <div 
              onClick={() => {
                setIsAgeConfirmed(!isAgeConfirmed);
                if (ageError) setAgeError(false);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-start flex items-start gap-3 ${
                ageError 
                  ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200' 
                  : isAgeConfirmed
                    ? 'bg-blue-50/60 border-blue-200'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
              }`}
              id="age-gate-container"
            >
              <button 
                type="button" 
                className="mt-0.5 shrink-0 text-blue-600 cursor-pointer"
                aria-label="Toggle age verification"
              >
                {isAgeConfirmed ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {language === 'ar' 
                    ? 'التحقق من السن القانوني (COPPA): عمري 18 عاماً أو أكثر'
                    : 'Age Verification (COPPA): I am 18 or older'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {language === 'ar'
                    ? 'أؤكد أنني أبلغ 18 عاماً على الأقل (أو 13+ بموافقة ولي الأمر). هذه المنصة مخصصة لإدارة العقارات ولا تجمع عن قصد بيانات الأطفال دون 13 عاماً.'
                    : `I certify that I am at least 18 years old (or 13+ with legal parental consent). ${siteName && siteName !== 'bProp' ? siteName : 'amra solution'} does not knowingly collect personal data from children under 13.`}
                </p>
                {ageError && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {language === 'ar' 
                        ? 'يرجى تأكيد السن القانوني للمتابعة (مطلب قانوني إلزامي).'
                        : 'Please confirm age requirement to proceed (Mandatory legal requirement).'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {authLoading ? (
              <div className="py-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                  {language === 'ar' ? 'جاري التحقق من الهوية...' : 'Verifying Credentials...'}
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGuardedGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-4 px-6 rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                  id="google-signin-btn"
                >
                  <Lock className="w-4 h-4" />
                  {language === 'ar' ? 'تسجيل الدخول باستخدام حساب Google' : 'Sign In with Google Account'}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-slate-300 text-[10px] tracking-wider uppercase font-bold font-sans">
                    {language === 'ar' ? 'وصول سريع' : 'Quick Access'}
                  </span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  onClick={handleGuardedDemoSignIn}
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-3.5 px-6 rounded-2xl border border-slate-200/60 transition-colors cursor-pointer"
                  id="sandbox-demo-signin-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  {language === 'ar' ? 'استكشف العرض المباشر (للقراءة فقط)' : 'Explore Live Demo (Read-Only)'}
                </button>
              </>
            )}
          </div>

          {/* Footer Info */}
          <div className="text-center mt-6 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-medium">
              {language === 'ar' 
                ? 'لوحة تحكم سهلة الاستخدام للمدير بدون أي وقت إعداد.'
                : 'Easy-to-use manager dashboard with zero setup time.'}
            </p>
          </div>

          {/* SuperAdmin Secure Password entryway */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsAdminFormVisible(!isAdminFormVisible)}
              className="text-slate-400 hover:text-slate-600 transition-colors text-[9px] font-extrabold tracking-wider uppercase font-mono inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              {isAdminFormVisible 
                ? (language === 'ar' ? 'إخفاء بوابة المدير المتميز' : 'Hide Admin Access') 
                : (language === 'ar' ? 'بوابة المدير المتميز (SuperAdmin)' : 'SuperAdmin Portal')}
            </button>

            {isAdminFormVisible && (
              <form
                onSubmit={handleAdminSubmit}
                className="mt-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-start space-y-3 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                    {language === 'ar' ? 'البريد الإلكتروني للمشرف المتميز' : 'SuperAdmin Email'}
                  </label>
                  <input
                    type="email"
                    required
                    data-mask="true"
                    data-private="true"
                    autoComplete="off"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="hisham@bosstsc.com"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                    {language === 'ar' ? 'كلمة المرور السرية' : 'Secret Passcode'}
                  </label>
                  <input
                    type="password"
                    required
                    data-mask="true"
                    data-private="true"
                    autoComplete="off"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer text-center uppercase tracking-wider font-mono flex items-center justify-center gap-1.5"
                >
                  {submittingAdmin ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {language === 'ar' ? 'التحقق من الصلاحية' : 'Verify Access'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
