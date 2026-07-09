import React, { useState } from 'react';
import { Lock, Sparkles, Shield, X, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onDemoSignIn: () => Promise<void>;
  onSuperAdminSignIn: (email: string, pass: string) => Promise<void>;
  authLoading: boolean;
}

export default function LoginModal({
  isOpen,
  onClose,
  onGoogleSignIn,
  onDemoSignIn,
  onSuperAdminSignIn,
  authLoading,
}: LoginModalProps) {
  const [isAdminFormVisible, setIsAdminFormVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2.5 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">
              bP
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Access bProp Portal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Securely log in to manage rent schedules, occupant ledgers, and property transactions.
            </p>
          </div>

          {/* Social Sign-in Methods */}
          <div className="space-y-4">
            {authLoading ? (
              <div className="py-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                  Verifying Credentials...
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={onGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-4 px-6 rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                  id="google-signin-btn"
                >
                  <Lock className="w-4 h-4" />
                  Sign In with Google Account
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-slate-300 text-[10px] tracking-wider uppercase font-bold font-sans">
                    Quick Access
                  </span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  onClick={onDemoSignIn}
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-3.5 px-6 rounded-2xl border border-slate-200/60 transition-colors cursor-pointer"
                  id="sandbox-demo-signin-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  Explore Live Demo (Read-Only)
                </button>
              </>
            )}
          </div>

          {/* Footer Info */}
          <div className="text-center mt-6 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-medium">
              Easy-to-use manager dashboard with zero setup time.
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
              {isAdminFormVisible ? 'Hide Admin Access' : 'SuperAdmin Portal'}
            </button>

            {isAdminFormVisible && (
              <form
                onSubmit={handleAdminSubmit}
                className="mt-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-left space-y-3 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                    SuperAdmin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="hisham@bosstsc.com"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                    Secret Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter password"
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
                  Verify Access
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
