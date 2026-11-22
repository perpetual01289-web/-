import React, { useMemo, useState } from 'react';
import {
  Archive,
  Bus,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FilePlus2,
  Printer,
  Search,
  Settings,
  Wrench,
} from 'lucide-react';
import { MaintenanceForm, Vehicle } from '../types/fleet';
import { resolveVehicleImage } from '../lib/fleetService';
import { OperationalStatusLabel, VehicleImageFrame } from './StatusText';
import { MaintenancePrintDocument } from './MaintenancePrintDocument';

interface DashboardViewProps {
  vehicles: Vehicle[];
  forms: MaintenanceForm[];
  mediaMap: Record<string, string>;
  onNavigateVehicles: () => void;
  onCreateNewForm: (vehicle?: Vehicle) => void;
  onOpenForm: (form: MaintenanceForm) => void;
  onOpenArchive: (vehicle: Vehicle) => void;
}

export function DashboardView({
  vehicles,
  forms,
  mediaMap,
  onNavigateVehicles,
  onCreateNewForm,
  onOpenForm,
  onOpenArchive,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [printingForm, setPrintingForm] = useState<MaintenanceForm | null>(null);

  const metrics = useMemo(() => {
    const totalVehicles = vehicles.length;
    const readyVehicles = vehicles.filter(
      (v) => v.operationalStatus === 'جاهز للتشغيل'
    ).length;
    const inMaintenanceVehicles = vehicles.filter(
      (v) => v.operationalStatus === 'تحت الصيانة'
    ).length;
    const needsPrepVehicles = vehicles.filter(
      (v) =>
        v.operationalStatus === 'يحتاج إلى تجهيز' ||
        v.operationalStatus === 'صالح للتشغيل مع وجود نواقص تجهيز'
    ).length;
    const openForms = forms.filter((f) => f.formStatus === 'مفتوح').length;
    const completedForms = forms.filter((f) => f.formStatus === 'مكتمل').length;

    return {
      totalVehicles,
      readyVehicles,
      inMaintenanceVehicles,
      needsPrepVehicles,
      openForms,
      completedForms,
    };
  }, [vehicles, forms]);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles.slice(0, 6);
    return vehicles.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(q) ||
        v.commonName.toLowerCase().includes(q) ||
        v.internalCode.toLowerCase().includes(q) ||
        v.brandType.toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const filteredForms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return forms.slice(0, 10);
    return forms.filter(
      (f) =>
        f.serialNumber.toLowerCase().includes(q) ||
        f.vehicleSnapshot.commonName.toLowerCase().includes(q) ||
        f.vehicleSnapshot.plateNumber.toLowerCase().includes(q) ||
        f.vehicleSnapshot.internalCode.toLowerCase().includes(q)
    );
  }, [forms, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Global Search + Quick Primary Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع برقم اللوحة، اسم المركبة، رقم الملف / الكود، أو مسلسل النموذج..."
            className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B1F3A] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateVehicles}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0B1F3A] border border-slate-300 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Bus className="w-4 h-4" />
            <span>إدارة المركبات</span>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewForm()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#B91C1C] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>إنشاء نموذج صيانة جديد</span>
          </button>
        </div>
      </div>

      {/* 6 Fleet KPI Strip */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">إجمالي المركبات</span>
            <Bus className="w-4 h-4 text-[#0B1F3A]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] tabular-nums">
            {metrics.totalVehicles}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">جاهزة للتشغيل</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {metrics.readyVehicles}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">تحت الصيانة</span>
            <Wrench className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <p className="text-2xl font-extrabold text-[#B91C1C] tabular-nums">
            {metrics.inMaintenanceVehicles}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">تحتاج إلى تجهيز</span>
            <Settings className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 tabular-nums">
            {metrics.needsPrepVehicles}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">خطط صيانة مفتوحة</span>
            <ClipboardList className="w-4 h-4 text-sky-700" />
          </div>
          <p className="text-2xl font-extrabold text-sky-800 tabular-nums">
            {metrics.openForms}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">خطط صيانة مكتملة</span>
            <Archive className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {metrics.completedForms}
          </p>
        </div>
      </section>

      {/* Main Content Split: Latest Maintenance Operations + Fleet Quick Directory */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Latest Maintenance Operations Table */}
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">آخر عمليات الصيانة</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                أحدث نماذج الصيانة والتجهيز المسجلة على مستوى الأسطول
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {filteredForms.length} سجل
            </span>
          </div>

          {filteredForms.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {forms.length === 0
                ? 'لا توجد عمليات صيانة مسجلة بعد. ابدأ بإنشاء نموذج صيانة لمركبة.'
                : 'لا توجد نتائج مطابقة للبحث.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-2.5 px-4 text-right">المسلسل</th>
                    <th className="py-2.5 px-4 text-right">المركبة</th>
                    <th className="py-2.5 px-4 text-right">التاريخ</th>
                    <th className="py-2.5 px-4 text-right">الإنجاز</th>
                    <th className="py-2.5 px-4 text-right">الحالة</th>
                    <th className="py-2.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredForms.map((form) => {
                    const total = (form.items || []).length;
                    const done = (form.items || []).filter(
                      (i) => i.status === 'تم التنفيذ'
                    ).length;

                    return (
                      <tr key={form.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono-code text-xs font-bold text-[#0B1F3A]">
                          {form.serialNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {form.vehicleSnapshot.commonName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-code">
                            كود {form.vehicleSnapshot.internalCode}
                            {form.vehicleSnapshot.plateNumber
                              ? ` · ${form.vehicleSnapshot.plateNumber}`
                              : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 font-mono-code tabular-nums">
                          {form.startDate || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono-code font-semibold tabular-nums text-slate-700">
                          {done}/{total}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-bold ${
                              form.formStatus === 'مكتمل'
                                ? 'text-emerald-700'
                                : 'text-[#B91C1C]'
                            }`}
                          >
                            {form.formStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenForm(form)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="فتح / تعديل النموذج"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintingForm(form)}
                              className="p-1.5 rounded-lg border border-slate-200 text-[#B91C1C] hover:bg-red-50 cursor-pointer"
                              title="معاينة وطباعة A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Fleet Status List */}
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">ملفات المركبات</h3>
            <button
              type="button"
              onClick={onNavigateVehicles}
              className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              لا توجد مركبات مطابقة.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <VehicleImageFrame
                        src={resolveVehicleImage(v.imageUrl, mediaMap)}
                        alt={v.commonName}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        [{v.internalCode}] {v.commonName}
                      </p>
                      <div className="mt-1">
                        <OperationalStatusLabel status={v.operationalStatus} compact />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCreateNewForm(v)}
                      className="p-1.5 rounded-lg bg-[#0B1F3A] text-white hover:bg-[#133159] cursor-pointer"
                      title="إنشاء نموذج صيانة"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenArchive(v)}
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="أرشيف المركبة"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {printingForm && (
        <MaintenancePrintDocument
          form={printingForm}
          resolvedImageUrl={resolveVehicleImage(printingForm.vehicleSnapshot.imageUrl, mediaMap)}
          onClose={() => setPrintingForm(null)}
        />
      )}
    </div>
  );
}
