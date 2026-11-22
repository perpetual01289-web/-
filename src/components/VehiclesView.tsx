import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Archive,
  Bus,
  Edit3,
  FilePlus2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  FIELD_LIMITS,
  MaintenanceForm,
  OPERATIONAL_STATUSES,
  OperationalStatus,
  Vehicle,
} from '../types/fleet';
import {
  deleteVehicleById,
  generateDocId,
  resolveVehicleImage,
  savePendingVehicleMedia,
  saveVehicle,
  uploadVehicleImage,
} from '../lib/fleetService';
import { OperationalStatusLabel, VehicleImageFrame } from './StatusText';

interface VehiclesViewProps {
  user: User;
  vehicles: Vehicle[];
  forms: MaintenanceForm[];
  mediaMap: Record<string, string>;
  onCreateMaintenanceForm: (vehicle: Vehicle) => void;
  onOpenVehicleArchive: (vehicle: Vehicle) => void;
}

interface VehicleFormState {
  id: string;
  internalCode: string;
  commonName: string;
  brandType: string;
  modelYear: string;
  plateNumber: string;
  vin: string;
  engineSerial: string;
  color: string;
  seatsCount: number;
  imageUrl: string;
  operationalStatus: OperationalStatus;
  notes: string;
}

function emptyVehicleState(): VehicleFormState {
  return {
    id: generateDocId('veh'),
    internalCode: '',
    commonName: '',
    brandType: '',
    modelYear: '',
    plateNumber: '',
    vin: '',
    engineSerial: '',
    color: '',
    seatsCount: 28,
    imageUrl: '',
    operationalStatus: 'جاهز للتشغيل',
    notes: '',
  };
}

export function VehiclesView({
  user,
  vehicles,
  forms,
  mediaMap,
  onCreateMaintenanceForm,
  onOpenVehicleArchive,
}: VehiclesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [modalOpen, setModalOpen] = useState(false);
  const [isNewVehicle, setIsNewVehicle] = useState(true);
  const [formState, setFormState] = useState<VehicleFormState>(emptyVehicleState());
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [pendingMediaDataUrl, setPendingMediaDataUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (statusFilter !== 'الكل' && v.operationalStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        v.internalCode.toLowerCase().includes(q) ||
        v.commonName.toLowerCase().includes(q) ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.brandType.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q)
      );
    });
  }, [vehicles, searchQuery, statusFilter]);

  const openAddModal = () => {
    setIsNewVehicle(true);
    setFormState(emptyVehicleState());
    setPreviewDataUrl('');
    setPendingMediaDataUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setIsNewVehicle(false);
    setFormState({
      id: v.id,
      internalCode: v.internalCode,
      commonName: v.commonName,
      brandType: v.brandType,
      modelYear: v.modelYear,
      plateNumber: v.plateNumber,
      vin: v.vin,
      engineSerial: v.engineSerial,
      color: v.color,
      seatsCount: v.seatsCount,
      imageUrl: v.imageUrl,
      operationalStatus: v.operationalStatus,
      notes: v.notes,
    });
    setPreviewDataUrl(resolveVehicleImage(v.imageUrl, mediaMap));
    setPendingMediaDataUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const result = await uploadVehicleImage(
        formState.id,
        user.uid,
        file,
        !isNewVehicle
      );
      setFormState((prev) => ({ ...prev, imageUrl: result.imageUrl }));
      setPreviewDataUrl(result.dataUrl);
      if (!result.usedStorage && isNewVehicle) {
        setPendingMediaDataUrl(result.dataUrl);
      } else {
        setPendingMediaDataUrl('');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر رفع صورة المركبة');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.internalCode.trim() || !formState.commonName.trim() || !formState.brandType.trim()) {
      setErrorMsg('يرجى إدخال كود المركبة والاسم المتداول والنوع/الماركة على الأقل.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await saveVehicle(
        {
          ...formState,
          ownerId: user.uid,
        },
        isNewVehicle
      );

      if (pendingMediaDataUrl && formState.imageUrl.startsWith('media:')) {
        await savePendingVehicleMedia(formState.id, user.uid, pendingMediaDataUrl);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ بيانات المركبة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      await deleteVehicleById(vehicleId);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حذف المركبة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">إدارة ملفات المركبات</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ملف مستقل لكل مركبة يشمل البيانات الفنية وصورتها وحالتها التشغيلية
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B91C1C] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مركبة جديدة</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بكود المركبة، الاسم المتداول، رقم اللوحة، أو رقم الشاسيه..."
            className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B1F3A] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {['الكل', ...OPERATIONAL_STATUSES].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State or Vehicle Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Bus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {vehicles.length === 0 ? 'لا توجد مركبات مسجلة بعد' : 'لا توجد مركبات مطابقة للبحث'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {vehicles.length === 0
              ? 'ابدأ بإضافة أول مركبة في أسطول شركة مني صلاح محمد لمتابعة خطط الصيانة وإصدار النماذج.'
              : 'جرب تغيير كلمات البحث أو اختيار حالة تشغيلية أخرى.'}
          </p>
          {vehicles.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] hover:bg-[#133159] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول مركبة</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVehicles.map((vehicle) => {
            const imgSrc = resolveVehicleImage(vehicle.imageUrl, mediaMap);
            const vehicleFormsCount = forms.filter((f) => f.vehicleId === vehicle.id).length;
            const openFormsCount = forms.filter(
              (f) => f.vehicleId === vehicle.id && f.formStatus === 'مفتوح'
            ).length;

            return (
              <article
                key={vehicle.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
              >
                {/* Vehicle Photo */}
                <div className="h-44 bg-slate-100 relative border-b border-slate-200">
                  <VehicleImageFrame
                    src={imgSrc}
                    alt={vehicle.commonName}
                    className="w-full h-full"
                  />
                  <div className="absolute top-3 right-3 bg-[#0B1F3A]/90 text-white text-xs font-mono-code font-bold px-2.5 py-1 rounded-md">
                    كود {vehicle.internalCode}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {vehicle.commonName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      {vehicle.brandType}
                      {vehicle.modelYear ? ` · موديل ${vehicle.modelYear}` : ''}
                      {vehicle.plateNumber ? ` · لوحة ${vehicle.plateNumber}` : ''}
                    </p>
                  </div>

                  <div>
                    <OperationalStatusLabel status={vehicle.operationalStatus} />
                  </div>

                  {/* Key Technical Specs Table */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs pt-2 border-t border-slate-100 text-slate-600">
                    <div>
                      <span className="text-slate-400">المقاعد: </span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {vehicle.seatsCount} مقعد
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">اللون: </span>
                      <span className="font-semibold text-slate-800">
                        {vehicle.color || '—'}
                      </span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className="text-slate-400">الشاسيه: </span>
                      <span className="font-mono-code text-slate-800">
                        {vehicle.vin || '—'}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1">
                      <span>
                        سجلات الصيانة:{' '}
                        <strong className="text-slate-900 tabular-nums">
                          {vehicleFormsCount}
                        </strong>
                      </span>
                      {openFormsCount > 0 && (
                        <span className="text-[#B91C1C] font-semibold tabular-nums">
                          {openFormsCount} خطة مفتوحة
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onCreateMaintenanceForm(vehicle)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0B1F3A] hover:bg-[#133159] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>نموذج صيانة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenVehicleArchive(vehicle)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    title="أرشيف المركبة"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>الأرشيف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(vehicle)}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="تعديل بيانات المركبة"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === vehicle.id ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(vehicle.id)}
                      className="px-2.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      تأكيد الحذف
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(vehicle.id)}
                      className="p-2 bg-white hover:bg-red-50 text-red-600 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                      title="حذف المركبة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Bus className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold">
                  {isNewVehicle ? 'إضافة ملف مركبة جديد' : `تعديل ملف: ${formState.commonName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {errorMsg}
                </div>
              )}

              {/* Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-40 h-28 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                  <VehicleImageFrame
                    src={previewDataUrl}
                    alt={formState.commonName || 'صورة المركبة'}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 text-center sm:text-right">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">صورة المركبة</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    تُرفق تلقائيًا في ملف المركبة وفي رأس نموذج الصيانة عند الطباعة على A4.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#B91C1C]" />
                    <span>{uploadingPhoto ? 'جاري رفع الصورة...' : 'اختيار / رفع صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    كود المركبة الداخلي <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.internalCodeMax}
                    value={formState.internalCode}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, internalCode: e.target.value }))
                    }
                    placeholder="مثال: 001"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] font-mono-code"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم المتداول للمركبة <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.commonNameMax}
                    value={formState.commonName}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, commonName: e.target.value }))
                    }
                    placeholder="مثال: كوستر البيج"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نوع وماركة المركبة <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.brandTypeMax}
                    value={formState.brandType}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, brandType: e.target.value }))
                    }
                    placeholder="مثال: Toyota Coaster"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الموديل وسنة الصنع
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.modelYearMax}
                    value={formState.modelYear}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, modelYear: e.target.value }))
                    }
                    placeholder="مثال: 2022"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم اللوحة
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.plateNumberMax}
                    value={formState.plateNumber}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, plateNumber: e.target.value }))
                    }
                    placeholder="مثال: أ ب ج 1234"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الشاسيه (VIN)
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.vinMax}
                    value={formState.vin}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, vin: e.target.value }))
                    }
                    placeholder="رقم الشاسيه"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] font-mono-code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم المحرك والسيريال
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.engineSerialMax}
                    value={formState.engineSerial}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, engineSerial: e.target.value }))
                    }
                    placeholder="رقم المحرك"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] font-mono-code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اللون
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.colorMax}
                    value={formState.color}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, color: e.target.value }))
                    }
                    placeholder="مثال: بيج / أبيض"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عدد المقاعد
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={FIELD_LIMITS.seatsMax}
                    value={formState.seatsCount}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        seatsCount: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الحالة التشغيلية
                  </label>
                  <select
                    value={formState.operationalStatus}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        operationalStatus: e.target.value as OperationalStatus,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
                  >
                    {OPERATIONAL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ملاحظات عامة
                  </label>
                  <textarea
                    rows={3}
                    maxLength={FIELD_LIMITS.vehicleNotesMax}
                    value={formState.notes}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, notes: e.target.value }))
                    }
                    placeholder="أي ملاحظات فنية أو تشغيلية عامة تخص المركبة..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto}
                  className="px-6 py-2 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#133159] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'جاري الحفظ...' : isNewVehicle ? 'حفظ ملف المركبة' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
