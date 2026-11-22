import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  Layers,
  Plus,
  Printer,
  Save,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  DEFAULT_MAINTENANCE_CATEGORIES,
  FIELD_LIMITS,
  FormStatus,
  MaintenanceForm,
  MaintenanceItem,
  OPERATIONAL_STATUSES,
  OperationalStatus,
  Vehicle,
  WORK_ITEM_STATUSES,
  WorkItemStatus,
} from '../types/fleet';
import {
  buildVehicleSnapshot,
  generateDocId,
  generateFormSerialNumber,
  resolveVehicleImage,
  saveMaintenanceForm,
} from '../lib/fleetService';
import {
  OperationalStatusLabel,
  VehicleImageFrame,
  WorkItemStatusLabel,
} from './StatusText';
import { MaintenancePrintDocument } from './MaintenancePrintDocument';

interface MaintenanceFormEditorProps {
  user: User;
  vehicles: Vehicle[];
  allForms: MaintenanceForm[];
  mediaMap: Record<string, string>;
  initialForm: MaintenanceForm | null;
  preselectedVehicle: Vehicle | null;
  onBack: () => void;
  onSaved?: (form: MaintenanceForm) => void;
}

export function MaintenanceFormEditor({
  user,
  vehicles,
  allForms,
  mediaMap,
  initialForm,
  preselectedVehicle,
  onBack,
  onSaved,
}: MaintenanceFormEditorProps) {
  const isNew = !initialForm;
  const startingVehicle =
    (initialForm && vehicles.find((v) => v.id === initialForm.vehicleId)) ||
    preselectedVehicle ||
    vehicles[0] ||
    null;

  const [formId] = useState<string>(() => initialForm?.id || generateDocId('frm'));
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialForm?.vehicleId || startingVehicle?.id || ''
  );
  const [serialNumber, setSerialNumber] = useState<string>(
    initialForm?.serialNumber || generateFormSerialNumber(allForms)
  );
  const [formStatus, setFormStatus] = useState<FormStatus>(
    initialForm?.formStatus || 'مفتوح'
  );
  const [startDate, setStartDate] = useState<string>(
    initialForm?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(initialForm?.endDate || '');
  const [statusAfterMaintenance, setStatusAfterMaintenance] = useState<OperationalStatus>(
    initialForm?.statusAfterMaintenance ||
      startingVehicle?.operationalStatus ||
      'تحت الصيانة'
  );
  const [syncVehicleOperationalStatus, setSyncVehicleOperationalStatus] = useState(true);

  const [items, setItems] = useState<MaintenanceItem[]>(
    () =>
      initialForm?.items
        ? [...initialForm.items].sort((a, b) => a.order - b.order)
        : []
  );

  const [notes, setNotes] = useState<string>(initialForm?.notes || '');
  const [reviewChecklist, setReviewChecklist] = useState(
    initialForm?.reviewChecklist || {
      allWorkCompleted: false,
      busTestedAfterRepair: false,
      equipmentVerified: false,
      additionalNotesReviewed: false,
      readyForOperationApproved: false,
    }
  );

  const [maintenanceSupervisorName, setMaintenanceSupervisorName] = useState(
    initialForm?.maintenanceSupervisorName || ''
  );
  const [followupSupervisorName, setFollowupSupervisorName] = useState(
    initialForm?.followupSupervisorName || ''
  );
  const [managementApprovalName, setManagementApprovalName] = useState(
    initialForm?.managementApprovalName || ''
  );

  // New item draft controls
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>(
    DEFAULT_MAINTENANCE_CATEGORIES[0]
  );
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newItemStatus, setNewItemStatus] = useState<WorkItemStatus>('لم يبدأ');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemDraft, setEditItemDraft] = useState<MaintenanceItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const activeVehicleSnapshot = useMemo(() => {
    if (selectedVehicle) {
      return buildVehicleSnapshot(selectedVehicle);
    }
    if (initialForm?.vehicleSnapshot) {
      return initialForm.vehicleSnapshot;
    }
    return {
      internalCode: '—',
      commonName: 'غير محدد',
      brandType: '—',
      modelYear: '',
      plateNumber: '',
      vin: '',
      engineSerial: '',
      color: '',
      seatsCount: 0,
      imageUrl: '',
      operationalStatus: 'تحت الصيانة' as OperationalStatus,
    };
  }, [selectedVehicle, initialForm]);

  const resolvedImg = resolveVehicleImage(activeVehicleSnapshot.imageUrl, mediaMap);

  // Live automatic separation between completed & remaining items
  const completedItems = useMemo(
    () => items.filter((it) => it.status === 'تم التنفيذ'),
    [items]
  );
  const remainingItems = useMemo(
    () => items.filter((it) => it.status !== 'تم التنفيذ'),
    [items]
  );

  // Category grouping summary
  const categorySummary = useMemo(() => {
    const map = new Map<string, MaintenanceItem[]>();
    items.forEach((it) => {
      const list = map.get(it.category) || [];
      list.push(it);
      map.set(it.category, list);
    });
    return Array.from(map.entries());
  }, [items]);

  const handleVehicleSelect = (vId: string) => {
    setSelectedVehicleId(vId);
    const v = vehicles.find((item) => item.id === vId);
    if (v) {
      setStatusAfterMaintenance(v.operationalStatus);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    if (items.length >= FIELD_LIMITS.maxItemsPerForm) {
      setErrorMsg(`الحد الأقصى لبنود النموذج الواحد هو ${FIELD_LIMITS.maxItemsPerForm} بند.`);
      return;
    }

    const chosenCategory =
      newItemCategory === '__custom__'
        ? customCategoryInput.trim() || 'أعمال فنية وإصلاحات'
        : newItemCategory;

    const created: MaintenanceItem = {
      id: generateDocId('itm'),
      title: title.slice(0, FIELD_LIMITS.itemTitleMax),
      category: chosenCategory.slice(0, FIELD_LIMITS.itemCategoryMax),
      status: newItemStatus,
      notes: newItemNotes.trim().slice(0, FIELD_LIMITS.itemNotesMax),
      order: items.length,
    };

    setItems((prev) => [...prev, created]);
    setNewItemTitle('');
    setNewItemNotes('');
    setSaveNotice('');
  };

  const handleStatusChange = (itemId: string, status: WorkItemStatus) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status } : it))
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== itemId)
        .map((it, idx) => ({ ...it, order: idx }))
    );
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.id === itemId);
      if (index === -1) return prev;
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, moved);
      return copy.map((it, idx) => ({ ...it, order: idx }));
    });
  };

  const startEditItem = (item: MaintenanceItem) => {
    setEditingItemId(item.id);
    setEditItemDraft({ ...item });
  };

  const commitEditItem = () => {
    if (!editItemDraft) return;
    setItems((prev) =>
      prev.map((it) => (it.id === editItemDraft.id ? editItemDraft : it))
    );
    setEditingItemId(null);
    setEditItemDraft(null);
  };

  const buildCurrentFormObject = (overrideStatus?: FormStatus): MaintenanceForm => ({
    id: formId,
    ownerId: initialForm?.ownerId || user.uid,
    vehicleId: selectedVehicleId,
    serialNumber: serialNumber.trim() || 'MNT-0001',
    formStatus: overrideStatus || formStatus,
    startDate,
    endDate,
    vehicleSnapshot: activeVehicleSnapshot,
    statusAfterMaintenance,
    items: items.map((it, idx) => ({ ...it, order: idx })),
    notes,
    reviewChecklist,
    maintenanceSupervisorName,
    followupSupervisorName,
    managementApprovalName,
  });

  const handleSave = async (overrideStatus?: FormStatus) => {
    if (!selectedVehicleId) {
      setErrorMsg('يرجى اختيار المركبة أولاً قبل حفظ النموذج.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSaveNotice('');

    try {
      const targetFormStatus = overrideStatus || formStatus;
      if (overrideStatus) {
        setFormStatus(overrideStatus);
      }
      const payload = buildCurrentFormObject(targetFormStatus);
      await saveMaintenanceForm(
        payload,
        isNew,
        syncVehicleOperationalStatus ? statusAfterMaintenance : undefined
      );
      setSaveNotice(
        targetFormStatus === 'مكتمل'
          ? 'تم اعتماد وحفظ نموذج الصيانة في الأرشيف الدائم بنجاح.'
          : 'تم حفظ بيانات نموذج الصيانة بنجاح في قاعدة البيانات.'
      );
      if (onSaved) onSaved(payload);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر حفظ نموذج الصيانة. يرجى المحاولة مجدداً.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (vehicles.length === 0 && !initialForm) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <Wrench className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">
          أضف مركبة أولاً لإنشاء نموذج صيانة
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          لا توجد مركبات مسجلة في الأسطول حالياً. قم بإضافة مركبة من قسم إدارة المركبات.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          العودة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="العودة"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isNew ? 'إنشاء نموذج صيانة وتجهيز جديد' : `تعديل نموذج صيانة (${serialNumber})`}
            </h2>
            <p className="text-xs text-slate-500">
              {activeVehicleSnapshot.commonName} · كود {activeVehicleSnapshot.internalCode}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-[#0B1F3A] border border-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-[#B91C1C]" />
            <span>معاينة وطباعة A4</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] hover:bg-[#133159] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ النموذج'}</span>
          </button>

          {formStatus !== 'مكتمل' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('مكتمل')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد واكتمال الصيانة</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between">
          <span>{saveNotice}</span>
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="text-xs font-bold underline cursor-pointer"
          >
            فتح نموذج الطباعة A4 الآن
          </button>
        </div>
      )}

      {/* 1. Vehicle Selection + Metadata + Auto-Pulled Vehicle Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Metadata */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            1. البيانات الأساسية للنموذج واختيار المركبة
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اختر المركبة (يتم سحب بياناتها وصورتها تلقائياً)
              </label>
              <select
                value={selectedVehicleId}
                disabled={!isNew}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 focus:outline-none focus:border-[#0B1F3A]"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    [{v.internalCode}] {v.commonName} — {v.brandType}{' '}
                    {v.plateNumber ? `(${v.plateNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الرقم المسلسل للنموذج
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.serialNumberMax}
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-code focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حالة خطة الصيانة
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as FormStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
              >
                <option value="مفتوح">مفتوح (قيد المتابعة)</option>
                <option value="مكتمل">مكتمل (معتمد ومؤرشف)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ بدء الصيانة
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-code focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ انتهاء الصيانة
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-code focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حالة المركبة التشغيلية (الظاهرة في النموذج)
              </label>
              <select
                value={statusAfterMaintenance}
                onChange={(e) =>
                  setStatusAfterMaintenance(e.target.value as OperationalStatus)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
              >
                {OPERATIONAL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncVehicleOperationalStatus}
                  onChange={(e) => setSyncVehicleOperationalStatus(e.target.checked)}
                  className="rounded border-slate-300 accent-[#0B1F3A]"
                />
                <span>تحديث الحالة التشغيلية في ملف المركبة الرئيسي تلقائياً عند الحفظ</span>
              </label>
            </div>
          </div>
        </div>

        {/* Auto-pulled Vehicle Snapshot Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#0B1F3A] text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold">بيانات المركبة المسحوبة تلقائياً</span>
            <span className="text-xs font-mono-code text-slate-300">
              كود {activeVehicleSnapshot.internalCode}
            </span>
          </div>
          <div className="p-4 flex gap-4 items-center border-b border-slate-100">
            <div className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
              <VehicleImageFrame
                src={resolvedImg}
                alt={activeVehicleSnapshot.commonName}
                className="w-full h-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {activeVehicleSnapshot.commonName}
              </h4>
              <p className="text-xs text-slate-600">
                {activeVehicleSnapshot.brandType}{' '}
                {activeVehicleSnapshot.modelYear ? `(${activeVehicleSnapshot.modelYear})` : ''}
              </p>
              <OperationalStatusLabel status={statusAfterMaintenance} compact />
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">رقم اللوحة: </span>
              <strong className="text-slate-900 font-mono-code">
                {activeVehicleSnapshot.plateNumber || '—'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">المقاعد: </span>
              <strong className="text-slate-900 tabular-nums">
                {activeVehicleSnapshot.seatsCount}
              </strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">رقم الشاسيه: </span>
              <strong className="text-slate-900 font-mono-code">
                {activeVehicleSnapshot.vin || '—'}
              </strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">رقم المحرك: </span>
              <strong className="text-slate-900 font-mono-code">
                {activeVehicleSnapshot.engineSerial || '—'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Manual Maintenance Items Entry + Live Split & Reordering */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              2. إدارة بنود الصيانة والتجهيز (إدخال حر وترتيب وتحديث فوري)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              أي بند تتغير حالته إلى "تم التنفيذ" ينتقل تلقائياً إلى قائمة الأعمال المنفذة
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
            <span className="text-emerald-700">المنفذة: {completedItems.length}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#B91C1C]">المتبقية (النواقص): {remainingItems.length}</span>
          </div>
        </div>

        {/* Add New Item Bar */}
        <form
          onSubmit={handleAddItem}
          className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              اسم البند / العمل المطلوب
            </label>
            <input
              type="text"
              required
              maxLength={FIELD_LIMITS.itemTitleMax}
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="مثال: فحص التكييف وقياس نسبة الفريون"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">التصنيف</label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            >
              {DEFAULT_MAINTENANCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ تصنيف مخصص آخر</option>
            </select>
            {newItemCategory === '__custom__' && (
              <input
                type="text"
                maxLength={FIELD_LIMITS.itemCategoryMax}
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                placeholder="اكتب اسم التصنيف..."
                className="mt-2 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
            <select
              value={newItemStatus}
              onChange={(e) => setNewItemStatus(e.target.value as WorkItemStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            >
              {WORK_ITEM_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملاحظات البند
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.itemNotesMax}
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              placeholder="اختياري..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#B91C1C] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>
        </form>

        {/* Full Editable & Reorderable Items Table */}
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
            لم تتم إضافة بنود صيانة بعد. استخدم النموذج أعلاه لإضافة البنود المطلوبة أو المنفذة.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#0B1F3A] text-white text-xs">
                  <th className="py-2.5 px-3 text-center w-12">م</th>
                  <th className="py-2.5 px-3 text-right">بيان العمل</th>
                  <th className="py-2.5 px-3 text-right w-44">التصنيف</th>
                  <th className="py-2.5 px-3 text-right w-40">حالة التنفيذ</th>
                  <th className="py-2.5 px-3 text-right">ملاحظات</th>
                  <th className="py-2.5 px-3 text-center w-36">ترتيب / إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => {
                  const isEditing = editingItemId === item.id && editItemDraft;
                  return (
                    <tr
                      key={item.id}
                      className={item.status === 'تم التنفيذ' ? 'bg-emerald-50/40' : 'bg-white'}
                    >
                      <td className="py-2.5 px-3 text-center font-mono-code font-bold text-slate-600 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItemDraft.title}
                            onChange={(e) =>
                              setEditItemDraft({ ...editItemDraft, title: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{item.title}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700">
                        {isEditing ? (
                          <select
                            value={editItemDraft.category}
                            onChange={(e) =>
                              setEditItemDraft({ ...editItemDraft, category: e.target.value })
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            {DEFAULT_MAINTENANCE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                            {!DEFAULT_MAINTENANCE_CATEGORIES.includes(
                              editItemDraft.category as (typeof DEFAULT_MAINTENANCE_CATEGORIES)[number]
                            ) && (
                              <option value={editItemDraft.category}>
                                {editItemDraft.category}
                              </option>
                            )}
                          </select>
                        ) : (
                          item.category
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as WorkItemStatus)
                          }
                          className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
                        >
                          {WORK_ITEM_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItemDraft.notes}
                            onChange={(e) =>
                              setEditItemDraft({ ...editItemDraft, notes: e.target.value })
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        ) : (
                          item.notes || '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={commitEditItem}
                                className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="حفظ التعديل"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditItemDraft(null);
                                }}
                                className="p-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                title="إلغاء"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveItem(item.id, 'up')}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                title="تحريك للأعلى"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === items.length - 1}
                                onClick={() => handleMoveItem(item.id, 'down')}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                title="تحريك للأسفل"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditItem(item)}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="تعديل البند"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="حذف البند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Automatic Split Preview Panels: Completed vs Remaining + Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-[#0B1F3A] text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
              <span>الأعمال التي تم تنفيذها بالفعل</span>
              <span className="tabular-nums">{completedItems.length}</span>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {completedItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  لا توجد أعمال منتهية بعد
                </p>
              ) : (
                completedItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start justify-between gap-2 text-xs p-2 rounded-lg bg-emerald-50/70 border border-emerald-200"
                  >
                    <span className="font-semibold text-slate-900">{it.title}</span>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(it.id, 'قيد التنفيذ')}
                      className="text-[11px] text-slate-500 hover:text-slate-900 underline shrink-0 cursor-pointer"
                    >
                      إرجاع
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-[#B91C1C] text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
              <span>الأعمال المطلوبة والمتبقية (النواقص)</span>
              <span className="tabular-nums">{remainingItems.length}</span>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {remainingItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  لا توجد نواقص متبقية
                </p>
              ) : (
                remainingItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{it.title}</p>
                      <div className="mt-1">
                        <WorkItemStatusLabel status={it.status} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(it.id, 'تم التنفيذ')}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded shrink-0 cursor-pointer"
                    >
                      تم التنفيذ
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>ملخص التصنيفات</span>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {categorySummary.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  سيظهر ملخص التصنيفات هنا
                </p>
              ) : (
                categorySummary.map(([cat, list]) => {
                  const done = list.filter((x) => x.status === 'تم التنفيذ').length;
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <span className="font-semibold text-slate-800">{cat}</span>
                      <span className="font-mono-code text-slate-600 tabular-nums">
                        {done}/{list.length} منجز
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Open Notes Workspace & 4. Review Checklist & Signatures */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Freeform Notes */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            3. الملاحظات والتعديلات أثناء التنفيذ
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            مساحة مفتوحة لتدوين الأعطال الإضافية، قطع الغيار المطلوبة، التعديلات، وتوصيات
            مسؤول الصيانة.
          </p>
          <textarea
            rows={7}
            maxLength={FIELD_LIMITS.formNotesMax}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب هنا أي أعطال مكتشفة أثناء الفحص، قطع الغيار المطلوبة، أو توصيات الفنيين..."
            className="flex-1 w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] leading-relaxed"
          />
        </div>

        {/* Review & Acceptance + Signatures */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-4 h-4 text-[#B91C1C]" />
              <h3 className="text-sm font-bold text-slate-900">
                4. مراجعة الأعمال والاستلام
              </h3>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'allWorkCompleted', label: 'تنفيذ جميع الأعمال المطلوبة.' },
                { key: 'busTestedAfterRepair', label: 'اختبار الأتوبيس بعد الإصلاح.' },
                { key: 'equipmentVerified', label: 'التأكد من سلامة التجهيزات.' },
                { key: 'additionalNotesReviewed', label: 'مراجعة الملاحظات الإضافية.' },
                {
                  key: 'readyForOperationApproved',
                  label: 'اعتماد جاهزية الأتوبيس للتشغيل.',
                },
              ].map((row) => {
                const checked =
                  reviewChecklist[row.key as keyof typeof reviewChecklist];
                return (
                  <label
                    key={row.key}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-amber-50 border-amber-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setReviewChecklist((prev) => ({
                          ...prev,
                          [row.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#0B1F3A] rounded"
                    />
                    <span className="text-xs font-bold">{row.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                مسؤول الصيانة
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.supervisorNameMax}
                value={maintenanceSupervisorName}
                onChange={(e) => setMaintenanceSupervisorName(e.target.value)}
                placeholder="الاسم / التوقيع"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                مسؤول المتابعة
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.supervisorNameMax}
                value={followupSupervisorName}
                onChange={(e) => setFollowupSupervisorName(e.target.value)}
                placeholder="الاسم / التوقيع"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اعتماد الإدارة
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.supervisorNameMax}
                value={managementApprovalName}
                onChange={(e) => setManagementApprovalName(e.target.value)}
                placeholder="الاسم / الاعتماد"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintPreview && (
        <MaintenancePrintDocument
          form={buildCurrentFormObject()}
          resolvedImageUrl={resolvedImg}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
