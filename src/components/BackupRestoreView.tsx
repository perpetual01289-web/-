import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { MaintenanceForm, Vehicle } from '../types/fleet';
import {
  exportFleetBackupJson,
  exportFleetCsv,
  importFleetBackupJson,
} from '../lib/fleetService';

interface BackupRestoreViewProps {
  user: User;
  vehicles: Vehicle[];
  forms: MaintenanceForm[];
  mediaMap: Record<string, string>;
}

export function BackupRestoreView({
  user,
  vehicles,
  forms,
  mediaMap,
}: BackupRestoreViewProps) {
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const text = await file.text();
      const res = await importFleetBackupJson(text, user);
      setStatusMessage(
        `تمت الاستعادة بنجاح: ${res.vehiclesImported} مركبة و ${res.formsImported} نموذج صيانة.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'تعذر قراءة أو استيراد ملف النسخة الاحتياطية.'
      );
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          النسخ الاحتياطي وتصدير البيانات
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          حفظ نسخة احتياطية كاملة من قاعدة البيانات السحابية أو تصدير جداول الأسطول إلى Excel
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Full JSON Backup */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="w-11 h-11 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              نسخة احتياطية كاملة (JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تصدير جميع ملفات المركبات ({vehicles.length}) وجميع نماذج الصيانة ({forms.length})
              والصور المرفقة في ملف واحد قابل للاستعادة لاحقاً.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportFleetBackupJson(vehicles, forms, mediaMap)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1F3A] hover:bg-[#133159] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل النسخة الاحتياطية</span>
          </button>
        </div>

        {/* Excel CSV Export */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="w-11 h-11 rounded-lg bg-emerald-700 text-white flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              تصدير جدول الأسطول (CSV / Excel)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تصدير قائمة المركبات وبياناتها الفنية وحالاتها التشغيلية وعدد سجلات الصيانة
              بترميز عربي متوافق مع Microsoft Excel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportFleetCsv(vehicles, forms)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير إلى Excel (CSV)</span>
          </button>
        </div>

        {/* Restore from JSON */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="w-11 h-11 rounded-lg bg-[#B91C1C] text-white flex items-center justify-center mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              استعادة نسخة احتياطية (JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              استيراد ملف نسخة احتياطية سابقة إلى قاعدة بيانات Firebase Firestore مع الحفاظ
              على جميع النماذج وسجلات المركبات.
            </p>
          </div>
          <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#B91C1C] border border-[#B91C1C] text-sm font-semibold rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{importing ? 'جاري الاستيراد...' : 'اختيار ملف النسخة الاحتياطية'}</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
