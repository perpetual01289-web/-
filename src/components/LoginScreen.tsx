import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Bus, CheckCircle2, FileText, ShieldCheck, Wrench } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else {
        setError('تعذر تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between"
    >
      {/* Top Corporate Bar */}
      <div className="bg-[#0B1F3A] text-white border-b-4 border-[#B91C1C]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#B91C1C] flex items-center justify-center shrink-0">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight leading-snug">
                شركة مني صلاح محمد
              </p>
              <p className="text-xs text-slate-300">للرحلات ونقل العمال</p>
            </div>
          </div>
          <span className="text-xs text-slate-300 hidden sm:inline">
            بوابة إدارة الأسطول والصيانة
          </span>
        </div>
      </div>

      {/* Main Split Portal */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm">
          {/* Right Information Panel */}
          <div className="lg:col-span-7 bg-[#0B1F3A] text-white p-8 md:p-10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-red-400 mb-3">
                منظومة المتابعة الإدارية والفنية
              </p>
              <h1 className="text-2xl md:text-3xl font-bold leading-snug mb-4">
                نظام إدارة ومتابعة صيانة أسطول المركبات
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed mb-8">
                منصة مركزية لحفظ ملفات الأتوبيسات، توثيق خطط التجهيز والصيانة الدورية،
                متابعة الأعطال المتكررة، وإصدار نماذج الطباعة الرسمية بمقاس A4.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      ملفات مركبات مستقلة وأرشيف دائم
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      حفظ سحابي فوري عبر Firebase Firestore لجميع سجلات الصيانة والصور.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      نماذج طباعة A4 متعددة الصفحات
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      إخراج مطابق للنموذج الإداري الرسمي مع تكرار الترويسة عند زيادة البنود.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      نسخ احتياطي وتصدير بيانات
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      إمكانية تصدير واستعادة قاعدة البيانات بالكامل بصيغ JSON و CSV.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-400">
              شركة مني صلاح محمد للرحلات ونقل العمال
            </div>
          </div>

          {/* Left Sign-In Box */}
          <div className="lg:col-span-5 p-8 md:p-10 flex flex-col justify-center bg-white">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-[#B91C1C] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              تسجيل الدخول للنظام
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              قم بتسجيل الدخول بحساب Google المعتمد للوصول إلى قاعدة بيانات الأسطول
              ومزامنة النماذج من أي جهاز.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-[#0B1F3A] hover:bg-[#133159] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>{loading ? 'جاري الاتصال...' : 'الدخول باستخدام حساب Google'}</span>
            </button>

            <p className="mt-6 text-xs text-slate-500 leading-relaxed">
              تُحفظ جميع البيانات في سحابة Firebase الآمنة وتظل متاحة عند فتح النظام من
              الكمبيوتر أو الآيباد أو الهاتف.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
