import React from 'react';
import { Shield, X, Mail, MapPin, Phone, FileText, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export const DMCA_DESIGNATED_AGENT = {
  agentName: "Copyright Compliance Officer (Legal Department)",
  organizationName: "b ventures (owning company of amra solution)",
  serviceProviderName: "amra solution / bProp Platform",
  streetAddress: "30 N Gould St",
  city: "Sheridan",
  state: "WY",
  zipCode: "82801",
  country: "United States",
  phone: "+1 (307) 555-0199",
  email: "dmca@bprop.app",
  registrationId: "DMCA-1049281-BVENTURES",
  uscoDirectoryUrl: "https://www.copyright.gov/dmca-directory/"
};

interface DMCAPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DMCAPolicyModal({ isOpen, onClose }: DMCAPolicyModalProps) {
  const { language, dir } = useLanguage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-slate-800"
          dir={dir}
          id="dmca-policy-modal"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {language === 'ar' ? 'وكيل حقوق الطبع والنشر المعتمد (DMCA)' : 'DMCA Designated Agent & Policy'}
                </h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  17 U.S.C. § 512(c)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ar' 
                  ? 'سياسة الإشعار والإزالة وحماية الملكية الفكرية المعتمدة لدى مكتب حقوق الطبع والنشر الأمريكي.' 
                  : 'Notice & Takedown Policy and Designated Agent Registry with the U.S. Copyright Office.'}
              </p>
            </div>
          </div>

          {/* Designated Agent Official Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? 'معلومات الوكيل المعتمد المسجل' : 'OFFICIAL DESIGNATED AGENT DIRECTORY'}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Registered ID: {DMCA_DESIGNATED_AGENT.registrationId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                  {language === 'ar' ? 'اسم الوكيل والمنظمة' : 'Agent & Organization'}
                </span>
                <p className="font-bold text-slate-800 mt-0.5">{DMCA_DESIGNATED_AGENT.agentName}</p>
                <p className="text-slate-600 text-[11px]">{DMCA_DESIGNATED_AGENT.organizationName}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                  {language === 'ar' ? 'البريد الإلكتروني المخصص' : 'DMCA Dedicated Email'}
                </span>
                <a 
                  href={`mailto:${DMCA_DESIGNATED_AGENT.email}`}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {DMCA_DESIGNATED_AGENT.email}
                </a>
                <p className="text-[10px] text-slate-400 mt-0.5">Response within 24-48 business hours</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                  {language === 'ar' ? 'العنوان البريدي الفعلي' : 'Physical Postal Address'}
                </span>
                <p className="text-slate-700 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {DMCA_DESIGNATED_AGENT.streetAddress}<br />
                    {DMCA_DESIGNATED_AGENT.city}, {DMCA_DESIGNATED_AGENT.state} {DMCA_DESIGNATED_AGENT.zipCode}, {DMCA_DESIGNATED_AGENT.country}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                  {language === 'ar' ? 'الهاتف المباشر' : 'Telephone Contact'}
                </span>
                <p className="text-slate-700 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {DMCA_DESIGNATED_AGENT.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Statutory Takedown Policy Details */}
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                {language === 'ar' ? 'متطلبات تقديم إشعار انتهاك حقوق النشر (Takedown Notice)' : 'Requirements for Submitting a DMCA Takedown Notice'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'بموجب المادة 512(c)(3) من قانون الألفية للملكية الرقمية، يجب أن يتضمن أي إشعار موجه إلى الوكيل المعتمد العناصر التالية:'
                  : 'Under 17 U.S.C. § 512(c)(3), an effective copyright infringement notice to our Designated Agent must contain:'}
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 pl-2 text-slate-700">
                <li>{language === 'ar' ? 'توقيع إلكتروني أو فعلي لمالك الحقوق أو ممثله القانوني.' : 'A physical or electronic signature of the copyright owner or authorized representative.'}</li>
                <li>{language === 'ar' ? 'تحديد العمل المحمي بحقوق النشر المدعى انتهاكه بدقة.' : 'Identification of the copyrighted work claimed to have been infringed.'}</li>
                <li>{language === 'ar' ? 'تحديد المادة المنتهكة ورابط الوصول إليها على المنصة لتمكيننا من إزالتها.' : 'Identification of the infringing material and sufficient details (URL/location) to enable removal.'}</li>
                <li>{language === 'ar' ? 'بيانات اتصال مقدم الطلب (العنوان، الهاتف، والبريد الإلكتروني).' : 'Contact information of the complaining party (address, telephone, and email).'}</li>
                <li>{language === 'ar' ? 'بيان بحسن النية يفيد بأن استخدام المادة غير مصرح به من قبل المالك أو القانون.' : 'A good-faith statement that use of the material is not authorized by the copyright owner, agent, or law.'}</li>
                <li>{language === 'ar' ? 'إقرار تحت طائلة عقوبة شهادة الزور بأن المعلومات الواردة في الإشعار دقيقة.' : 'A statement, under penalty of perjury, that information in the notification is accurate and authorized.'}</li>
              </ul>
            </div>

            <div className="border-t border-slate-150 pt-4">
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {language === 'ar' ? 'الإشعار المضاد وسياسة المنتهكين المتكررين' : 'Counter-Notification & Repeat Infringer Policy'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'إذا كنت تعتقد أن المواد الخاصة بك قد أزيلت عن طريق الخطأ أو تحديد غير صحيح، يجوز لك إرسال إشعار مضاد وفق المادة 512(g). تحتفظ المنصة بالحق في إنهاء حسابات المستخدمين الذين يثبت تكرار انتهاكهم للملكية الفكرية بموجب المادة 512(i).'
                  : 'If you believe content was removed in error or misidentification, you may submit a Counter-Notification under § 512(g). In accordance with § 512(i), bProp maintains a strict policy of terminating, in appropriate circumstances, subscribers and account holders who are repeat infringers.'}
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="mailto:dmca@bprop.app?subject=DMCA%20Notice%20of%20Copyright%20Infringement"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Mail className="w-4 h-4" />
              {language === 'ar' ? 'إرسال إشعار للوكيل المعتمد' : 'Email Designated Agent'}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
