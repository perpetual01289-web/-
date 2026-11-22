import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Edit3,
  FilePlus2,
  Printer,
  Trash2,
  Wrench,
} from 'lucide-react';
import { MaintenanceForm, Vehicle } from '../types/fleet';
import { deleteMaintenanceFormById, resolveVehicleImage } from '../lib/fleetService';
import {
  OperationalStatusLabel,
  VehicleImageFrame,
  WorkItemStatusLabel,
} from './StatusText';
import { MaintenancePrintDocument } from './MaintenancePrintDocument';

interface VehicleArchiveViewProps {
  vehicles: Vehicle[];
  forms: MaintenanceForm[];
  mediaMap: Record<string, string>;
  selectedVehicleId: string;
  onSelectVehicleId: (id: string) => void;
  onOpenForm: (form: MaintenanceForm) => void;
  onCreateNewFormForVehicle: (vehicle: Vehicle) => void;
}

export function VehicleArchiveView({
  vehicles,
  forms,
  mediaMap,
  selectedVehicleId,
  onSelectVehicleId,
  onOpenForm,
  onCreateNewFormForVehicle,
}: VehicleArchiveViewProps) {
  const [printingForm, setPrintingForm] = useState<MaintenanceForm | null>(null);
  const [confirmDeleteFormId, setConfirmDeleteFormId] = useState<string | null>(null);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null,
    [vehicles, selectedVehicleId]
  );

  const vehicleForms = useMemo(() => {
    if (!activeVehicle) return [];
    return forms.filter((f) => f.vehicleId === activeVehicle.id);
  }, [forms, activeVehicle]);

  const archiveStats = useMemo(() => {
    let totalCompleted = 0;
    let totalPending = 0;
    const itemTitleCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    vehicleForms.forEach((f) => {
      (f.items || []).forEach((it) => {
        if (it.status === 'تم التنفيذ') {
          totalCompleted += 1;
        } else {
          totalPending += 1;
        }
        const normalizedTitle = it.title.trim();
        if (normalizedTitle) {
          itemTitleCounts.set(
            normalizedTitle,
            (itemTitleCounts.get(normalizedTitle) || 0) + 1
          );
        }
        if (it.category) {
          categoryCounts.set(it.category, (categoryCounts.get(it.category) || 0) + 1);
        }
      });
    });

    const recurringItems = Array.from(itemTitleCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      totalVisits: vehicleForms.length,
      totalCompleted,
      totalPending,
      recurringItems,
      topCategories,
    };
  }, [vehicleForms]);

  if (!activeVehicle) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Archive className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">
          لا توجد مركبات في الأرشيف بعد
        </h3>
        <p className="text-sm text-slate-500">
          أضف مركبة وقم بإنشاء نماذج صيانة لها ليظهر سجلها التاريخي الكامل هنا.
        </p>
      </div>
    );
  }

  const vehicleImg = resolveVehicleImage(activeVehicle.imageUrl, mediaMap);

  return (
    <div className="space-y-6">
      {/* Header & Vehicle Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">أرشيف صيانة المركبات</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            سجل تاريخي مستقل لكل مركبة يحتفظ بجميع النماذج السابقة والأعطال المتكررة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeVehicle.id}
            onChange={(e) => onSelectVehicleId(e.target.value)}
            className="px-3.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                [{v.internalCode}] {v.commonName}{' '}
                {v.plateNumber ? `— ${v.plateNumber}` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onCreateNewFormForVehicle(activeVehicle)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>نموذج صيانة جديد للمركبة</span>
          </button>
        </div>
      </div>

      {/* Vehicle Profile Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-36 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
            <VehicleImageFrame
              src={vehicleImg}
              alt={activeVehicle.commonName}
              className="w-full h-full"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-code text-xs font-bold text-white bg-[#0B1F3A] px-2 py-0.5 rounded">
                كود {activeVehicle.internalCode}
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                {activeVehicle.commonName}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {activeVehicle.brandType}
              {activeVehicle.modelYear ? ` · موديل ${activeVehicle.modelYear}` : ''}
              {activeVehicle.plateNumber ? ` · لوحة ${activeVehicle.plateNumber}` : ''}
              {activeVehicle.vin ? ` · شاسيه ${activeVehicle.vin}` : ''}
            </p>
            <div>
              <OperationalStatusLabel status={activeVehicle.operationalStatus} />
            </div>
          </div>
        </div>

        {/* 4 Archive Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-r border-slate-200 pt-4 lg:pt-0 lg:pr-6">
          <div>
            <p className="text-xs text-slate-500">مرات دخول الصيانة</p>
            <p className="text-2xl font-bold text-[#0B1F3A] tabular-nums mt-0.5">
              {archiveStats.totalVisits}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">أعمال تم تنفيذها</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
              {archiveStats.totalCompleted}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">أعمال لم تنفذ</p>
            <p className="text-2xl font-bold text-[#B91C1C] tabular-nums mt-0.5">
              {archiveStats.totalPending}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">أعطال متكررة</p>
            <p className="text-2xl font-bold text-amber-700 tabular-nums mt-0.5">
              {archiveStats.recurringItems.length}
            </p>
          </div>
        </div>
      </div>

      {/* Recurring Faults & Category Breakdown */}
      {(archiveStats.recurringItems.length > 0 || archiveStats.topCategories.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">تحليل الأعطال المتكررة</h4>
            </div>
            {archiveStats.recurringItems.length === 0 ? (
              <p className="text-xs text-slate-500">
                لم يتم رصد بنود متكررة في أكثر من نموذج صيانة لهذه المركبة حتى الآن.
              </p>
            ) : (
              <ul className="space-y-2">
                {archiveStats.recurringItems.map(([title, count]) => (
                  <li
                    key={title}
                    className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <span className="font-semibold text-slate-900">{title}</span>
                    <span className="font-bold text-amber-900 tabular-nums">
                      تكرر {count} مرات
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-[#0B1F3A]" />
              <h4 className="text-sm font-bold text-slate-900">
                أكثر تصنيفات الصيانة تكراراً للمركبة
              </h4>
            </div>
            <div className="space-y-2">
              {archiveStats.topCategories.map(([cat, count]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <span className="font-mono-code font-bold text-[#0B1F3A] tabular-nums">
                    {count} بند
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chronological Maintenance Plans Archive */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          جميع خطط ونماذج الصيانة السابقة ({vehicleForms.length})
        </h3>

        {vehicleForms.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
            لا توجد نماذج صيانة مسجلة لهذه المركبة حتى الآن.
          </div>
        ) : (
          vehicleForms.map((form) => {
            const done = (form.items || []).filter((i) => i.status === 'تم التنفيذ');
            const pending = (form.items || []).filter((i) => i.status !== 'تم التنفيذ');

            return (
              <div
                key={form.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono-code text-xs font-bold text-white bg-[#0B1F3A] px-2.5 py-1 rounded">
                      {form.serialNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      بدء: {form.startDate || '—'} · انتهاء: {form.endDate || 'مفتوح'}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        form.formStatus === 'مكتمل'
                          ? 'text-emerald-700'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      · خطة {form.formStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OperationalStatusLabel status={form.statusAfterMaintenance} compact />

                    <button
                      type="button"
                      onClick={() => setPrintingForm(form)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0B1F3A] border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>طباعة A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenForm(form)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1F3A] hover:bg-[#133159] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>فتح / تعديل</span>
                    </button>

                    {confirmDeleteFormId === form.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteMaintenanceFormById(form.id);
                          setConfirmDeleteFormId(null);
                        }}
                        className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        تأكيد
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteFormId(form.id)}
                        className="p-1.5 bg-white hover:bg-red-50 text-red-600 border border-slate-300 rounded-lg cursor-pointer"
                        title="حذف السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      الأعمال المنفذة ({done.length})
                    </h5>
                    {done.length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد بنود منفذة</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {done.map((it) => (
                          <li key={it.id} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>
                              {it.title}{' '}
                              <span className="text-slate-400">({it.category})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-[#B91C1C] mb-2">
                      الأعمال المتبقية / غير المنفذة ({pending.length})
                    </h5>
                    {pending.length === 0 ? (
                      <p className="text-xs text-slate-400">تم تنفيذ جميع البنود</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {pending.map((it) => (
                          <li
                            key={it.id}
                            className="flex items-center justify-between gap-2 text-slate-700"
                          >
                            <span>{it.title}</span>
                            <WorkItemStatusLabel status={it.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {form.notes && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-700">
                    <strong className="text-slate-900">ملاحظات: </strong>
                    {form.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {printingForm && (
        <MaintenancePrintDocument
          form={printingForm}
          resolvedImageUrl={resolveVehicleImage(
            printingForm.vehicleSnapshot.imageUrl || activeVehicle.imageUrl,
            mediaMap
          )}
          onClose={() => setPrintingForm(null)}
        />
      )}
    </div>
  );
}
