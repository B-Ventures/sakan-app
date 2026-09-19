import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recordUnsubscribe, COMPANY_PHYSICAL_ADDRESS } from '../utils/emailMarketing';
import { useLanguage } from '../context/LanguageContext';

interface UnsubscribeModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export default function UnsubscribeModal({ isOpen, initialEmail = '', onClose }: UnsubscribeModalProps) {
  const { language, dir } = useLanguage();
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmailInput(initialEmail);
    }
  }, [initialEmail]);

  const handleUnsubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    recordUnsubscribe(emailInput.trim());
    setIsSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-slate-800"
          dir={dir}
        >
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              {language === 'ar' ? 'إلغاء الاشتراك من الرسائل التسويقية' : 'Unsubscribe from Marketing Emails'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {language === 'ar'
                ? 'وفقاً لقانون CAN-SPAM، يمكنك إلغاء اشتراكك بنقرة واحدة ودون أي قيود.'
                : 'Under the CAN-SPAM Act, you can opt out of commercial and promotional emails at any time.'}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {language === 'ar' ? 'تم إلغاء الاشتراك بنجاح' : 'You Have Been Successfully Unsubscribed'}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? `لن يتم إرسال أي رسائل ترويجية إلى ${emailInput}. ستبقى الإشعارات التشغيلية الهامة كإيصالات الدفع سارية.`
                  : `No further promotional emails will be sent to ${emailInput}. Important transaction receipts will continue to be delivered.`}
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl mt-2 cursor-pointer"
              >
                {language === 'ar' ? 'تم' : 'Done'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني للإلغاء' : 'Email Address to Unsubscribe'}
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {language === 'ar' ? 'تأكيد إلغاء الاشتراك' : 'Confirm Unsubscribe'}
              </button>
            </form>
          )}

          {/* Physical Address Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
              {language === 'ar' ? 'العنوان البريدي الفعلي للمرسل' : 'Official Sender Physical Address'}
            </span>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {COMPANY_PHYSICAL_ADDRESS.formatted}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
