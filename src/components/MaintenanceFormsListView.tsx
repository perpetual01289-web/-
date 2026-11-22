import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  FilePlus2,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { FormStatus, MaintenanceForm } from '../types/fleet';
import { deleteMaintenanceFormById, resolveVehicleImage } from '../lib/fleetService';
import { OperationalStatusLabel } from './StatusText';
import { MaintenancePrintDocument } from './MaintenancePrintDocument';

interface MaintenanceFormsListViewProps {
  forms: MaintenanceForm[];
  mediaMap: Record<string, string>;
  onCreateNew: () => void;
  onOpenForm: (form: MaintenanceForm) => void;
}

export function MaintenanceFormsListView({
  forms,
  mediaMap,
  onCreateNew,
  onOpenForm,
}: MaintenanceFormsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'الكل' | FormStatus>('الكل');
  const [printingForm, setPrintingForm] = useState<MaintenanceForm | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredForms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return forms.filter((f) => {
      if (statusFilter !== 'الكل' && f.formStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        f.serialNumber.toLowerCase().includes(q) ||
        f.vehicleSnapshot.commonName.toLowerCase().includes(q) ||
        f.vehicleSnapshot.internalCode.toLowerCase().includes(q) ||
        f.vehicleSnapshot.plateNumber.toLowerCase().includes(q)
      );
    });
  }, [forms, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">نماذج وخطط الصيانة</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            جميع خطط الصيانة المفتوحة والمكتملة مع إمكانية التعديل والطباعة المباشرة A4
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B91C1C] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>إنشاء نموذج صيانة جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم المسلسل، اسم المركبة، الكود، أو اللوحة..."
            className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B1F3A] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['الكل', 'مفتوح', 'مكتمل'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filteredForms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {forms.length === 0 ? 'لا توجد نماذج صيانة بعد' : 'لا توجد نماذج مطابقة'}
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            قم بإنشاء نموذج صيانة جديد لسحب بيانات المركبة وتوثيق بنود الإصلاح والتجهيز.
          </p>
          {forms.length === 0 && (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>إنشاء أول نموذج</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#0B1F3A] text-white text-xs">
                  <th className="py-3 px-4 text-right">المسلسل</th>
                  <th className="py-3 px-4 text-right">المركبة</th>
                  <th className="py-3 px-4 text-right">تاريخ البدء</th>
                  <th className="py-3 px-4 text-right">الانتهاء</th>
                  <th className="py-3 px-4 text-right">البنود (منفذ / إجمالي)</th>
                  <th className="py-3 px-4 text-right">حالة المركبة</th>
                  <th className="py-3 px-4 text-right">حالة الخطة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredForms.map((form) => {
                  const total = (form.items || []).length;
                  const done = (form.items || []).filter(
                    (i) => i.status === 'تم التنفيذ'
                  ).length;

                  return (
                    <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono-code font-bold text-xs text-[#0B1F3A]">
                        {form.serialNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 text-xs">
                          {form.vehicleSnapshot.commonName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-code">
                          كود {form.vehicleSnapshot.internalCode}
                          {form.vehicleSnapshot.plateNumber
                            ? ` · ${form.vehicleSnapshot.plateNumber}`
                            : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono-code text-xs text-slate-600 tabular-nums">
                        {form.startDate || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono-code text-xs text-slate-600 tabular-nums">
                        {form.endDate || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono-code text-xs font-bold tabular-nums text-slate-800">
                        {done} / {total}
                      </td>
                      <td className="py-3 px-4">
                        <OperationalStatusLabel status={form.statusAfterMaintenance} compact />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            form.formStatus === 'مكتمل'
                              ? 'text-emerald-700'
                              : 'text-[#B91C1C]'
                          }`}
                        >
                          {form.formStatus === 'مكتمل' && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{form.formStatus}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenForm(form)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B1F3A] hover:bg-[#133159] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>فتح</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintingForm(form)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 text-[#B91C1C] border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </button>

                          {confirmDeleteId === form.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteMaintenanceFormById(form.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              تأكيد
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(form.id)}
                              className="p-1.5 bg-white hover:bg-red-50 text-red-600 border border-slate-300 rounded-lg cursor-pointer"
                              title="حذف النموذج"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {printingForm && (
        <MaintenancePrintDocument
          form={printingForm}
          resolvedImageUrl={resolveVehicleImage(
            printingForm.vehicleSnapshot.imageUrl,
            mediaMap
          )}
          onClose={() => setPrintingForm(null)}
        />
      )}
    </div>
  );
}
