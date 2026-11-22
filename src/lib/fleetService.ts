import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from './firebase';
import {
  ADMIN_EMAIL,
  FIELD_LIMITS,
  FleetBackupPayload,
  MaintenanceForm,
  MaintenanceItem,
  OperationalStatus,
  ReviewChecklist,
  UserProfile,
  Vehicle,
  VehicleSnapshot,
} from '../types/fleet';

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function clampRawString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen);
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function generateFormSerialNumber(existingForms: MaintenanceForm[]): string {
  const year = new Date().getFullYear();
  const nextSeq = existingForms.length + 1;
  return `MNT-${year}-${String(nextSeq).padStart(4, '0')}`;
}

export function isUserAdmin(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === ADMIN_EMAIL);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const role: 'admin' | 'supervisor' = isUserAdmin(user) ? 'admin' : 'supervisor';
    const displayName = clampString(user.displayName || user.email || 'مستخدم', 120) || 'مستخدم';
    const email = clampString(user.email || '', 256);

    if (!snap.exists()) {
      const profilePayload = {
        uid: user.uid,
        email,
        displayName,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, profilePayload);
      return { uid: user.uid, email, displayName, role };
    }

    const existingData = snap.data() as UserProfile;
    if (existingData.displayName !== displayName || existingData.email !== email) {
      await updateDoc(userRef, {
        displayName,
        email,
        updatedAt: serverTimestamp(),
      });
    }
    return {
      uid: existingData.uid,
      email,
      displayName,
      role: existingData.role || role,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeVehicles(
  user: User,
  onData: (vehicles: Vehicle[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'vehicles';
  const q = isUserAdmin(user)
    ? collection(db, path)
    : query(collection(db, path), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Vehicle[] = snapshot.docs.map((d) => d.data() as Vehicle);
      list.sort((a, b) => a.internalCode.localeCompare(b.internalCode, 'ar'));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function subscribeMaintenanceForms(
  user: User,
  onData: (forms: MaintenanceForm[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'maintenanceForms';
  const q = isUserAdmin(user)
    ? collection(db, path)
    : query(collection(db, path), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MaintenanceForm[] = snapshot.docs.map((d) => d.data() as MaintenanceForm);
      list.sort((a, b) => {
        const dateCompare = (b.startDate || '').localeCompare(a.startDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.serialNumber || '').localeCompare(a.serialNumber || '');
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function subscribeVehicleMedia(
  user: User,
  onData: (mediaMap: Record<string, string>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'vehicleMedia';
  const q = isUserAdmin(user)
    ? collection(db, path)
    : query(collection(db, path), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as { vehicleId: string; dataUrl: string };
        if (data.vehicleId && data.dataUrl) {
          map[data.vehicleId] = data.dataUrl;
        }
      });
      onData(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function resolveVehicleImage(
  imageUrl: string | undefined,
  mediaMap: Record<string, string>
): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('media:')) {
    const vehicleId = imageUrl.slice('media:'.length);
    return mediaMap[vehicleId] || '';
  }
  return imageUrl;
}

function sanitizeVehiclePayload(
  vehicle: Omit<Vehicle, 'createdAt' | 'updatedAt'>
): Omit<Vehicle, 'createdAt' | 'updatedAt'> {
  const seats = Number.isFinite(Number(vehicle.seatsCount))
    ? Math.max(0, Math.min(FIELD_LIMITS.seatsMax, Math.round(Number(vehicle.seatsCount))))
    : 0;

  return {
    id: clampString(vehicle.id, FIELD_LIMITS.idMax),
    ownerId: clampString(vehicle.ownerId, FIELD_LIMITS.idMax),
    internalCode: clampString(vehicle.internalCode, FIELD_LIMITS.internalCodeMax) || '000',
    commonName: clampString(vehicle.commonName, FIELD_LIMITS.commonNameMax) || 'مركبة',
    brandType: clampString(vehicle.brandType, FIELD_LIMITS.brandTypeMax) || 'غير محدد',
    modelYear: clampString(vehicle.modelYear, FIELD_LIMITS.modelYearMax),
    plateNumber: clampString(vehicle.plateNumber, FIELD_LIMITS.plateNumberMax),
    vin: clampString(vehicle.vin, FIELD_LIMITS.vinMax),
    engineSerial: clampString(vehicle.engineSerial, FIELD_LIMITS.engineSerialMax),
    color: clampString(vehicle.color, FIELD_LIMITS.colorMax),
    seatsCount: seats,
    imageUrl: clampRawString(vehicle.imageUrl, FIELD_LIMITS.imageUrlMax),
    operationalStatus: vehicle.operationalStatus,
    notes: clampRawString(vehicle.notes, FIELD_LIMITS.vehicleNotesMax),
  };
}

export async function saveVehicle(
  vehicleInput: Omit<Vehicle, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const clean = sanitizeVehiclePayload(vehicleInput);
  const path = `vehicles/${clean.id}`;
  const refDoc = doc(db, 'vehicles', clean.id);

  try {
    if (isNew) {
      await setDoc(refDoc, {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(refDoc, {
        internalCode: clean.internalCode,
        commonName: clean.commonName,
        brandType: clean.brandType,
        modelYear: clean.modelYear,
        plateNumber: clean.plateNumber,
        vin: clean.vin,
        engineSerial: clean.engineSerial,
        color: clean.color,
        seatsCount: clean.seatsCount,
        imageUrl: clean.imageUrl,
        operationalStatus: clean.operationalStatus,
        notes: clean.notes,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteVehicleById(vehicleId: string): Promise<void> {
  const path = `vehicles/${vehicleId}`;
  try {
    try {
      await deleteDoc(doc(db, 'vehicleMedia', vehicleId));
    } catch {
      // Optional media fallback doc might not exist
    }
    await deleteDoc(doc(db, 'vehicles', vehicleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function compressImageFile(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('صيغة الصورة غير صالحة'));
      img.onload = () => {
        const maxWidth = 1000;
        const maxHeight = 750;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > FIELD_LIMITS.maxMediaDataUrl && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('تعذر ضغط الصورة'));
              return;
            }
            resolve({ blob, dataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadVehicleImage(
  vehicleId: string,
  ownerId: string,
  file: File,
  vehicleExistsInFirestore: boolean
): Promise<{ imageUrl: string; dataUrl: string; usedStorage: boolean }> {
  const { blob, dataUrl } = await compressImageFile(file);

  // Attempt Firebase Storage primary upload
  try {
    const storageRef = ref(storage, `vehicles/${vehicleId}/photo_${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    return {
      imageUrl: clampRawString(downloadUrl, FIELD_LIMITS.imageUrlMax),
      dataUrl,
      usedStorage: true,
    };
  } catch (storageErr) {
    console.warn('Firebase Storage unavailable or unauthorized, falling back to Firestore vehicleMedia:', storageErr);
  }

  // Fallback: if the vehicle already exists in Firestore, persist compressed JPEG to vehicleMedia/{vehicleId}
  if (vehicleExistsInFirestore) {
    const mediaPath = `vehicleMedia/${vehicleId}`;
    try {
      await setDoc(doc(db, 'vehicleMedia', vehicleId), {
        vehicleId,
        ownerId,
        dataUrl: clampRawString(dataUrl, FIELD_LIMITS.maxMediaDataUrl),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, mediaPath);
    }
  }

  return {
    imageUrl: `media:${vehicleId}`,
    dataUrl,
    usedStorage: false,
  };
}

export async function savePendingVehicleMedia(
  vehicleId: string,
  ownerId: string,
  dataUrl: string
): Promise<void> {
  const mediaPath = `vehicleMedia/${vehicleId}`;
  try {
    await setDoc(doc(db, 'vehicleMedia', vehicleId), {
      vehicleId,
      ownerId,
      dataUrl: clampRawString(dataUrl, FIELD_LIMITS.maxMediaDataUrl),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, mediaPath);
  }
}

export function buildVehicleSnapshot(vehicle: Vehicle): VehicleSnapshot {
  return {
    internalCode: clampString(vehicle.internalCode, FIELD_LIMITS.internalCodeMax),
    commonName: clampString(vehicle.commonName, FIELD_LIMITS.commonNameMax),
    brandType: clampString(vehicle.brandType, FIELD_LIMITS.brandTypeMax),
    modelYear: clampString(vehicle.modelYear, FIELD_LIMITS.modelYearMax),
    plateNumber: clampString(vehicle.plateNumber, FIELD_LIMITS.plateNumberMax),
    vin: clampString(vehicle.vin, FIELD_LIMITS.vinMax),
    engineSerial: clampString(vehicle.engineSerial, FIELD_LIMITS.engineSerialMax),
    color: clampString(vehicle.color, FIELD_LIMITS.colorMax),
    seatsCount: Number(vehicle.seatsCount) || 0,
    imageUrl: clampRawString(vehicle.imageUrl, FIELD_LIMITS.imageUrlMax),
    operationalStatus: vehicle.operationalStatus,
  };
}

function sanitizeMaintenanceForm(
  form: Omit<MaintenanceForm, 'createdAt' | 'updatedAt'>
): Omit<MaintenanceForm, 'createdAt' | 'updatedAt'> {
  const items: MaintenanceItem[] = (form.items || [])
    .slice(0, FIELD_LIMITS.maxItemsPerForm)
    .map((item, idx) => ({
      id: clampString(item.id, 80) || `item_${idx + 1}`,
      title: clampString(item.title, FIELD_LIMITS.itemTitleMax) || 'بند صيانة',
      category: clampString(item.category, FIELD_LIMITS.itemCategoryMax) || 'أعمال فنية وإصلاحات',
      status: item.status,
      notes: clampRawString(item.notes, FIELD_LIMITS.itemNotesMax),
      order: idx,
    }));

  const checklist: ReviewChecklist = {
    allWorkCompleted: Boolean(form.reviewChecklist?.allWorkCompleted),
    busTestedAfterRepair: Boolean(form.reviewChecklist?.busTestedAfterRepair),
    equipmentVerified: Boolean(form.reviewChecklist?.equipmentVerified),
    additionalNotesReviewed: Boolean(form.reviewChecklist?.additionalNotesReviewed),
    readyForOperationApproved: Boolean(form.reviewChecklist?.readyForOperationApproved),
  };

  const snap = form.vehicleSnapshot;
  const cleanSnap: VehicleSnapshot = {
    internalCode: clampString(snap.internalCode, FIELD_LIMITS.internalCodeMax),
    commonName: clampString(snap.commonName, FIELD_LIMITS.commonNameMax),
    brandType: clampString(snap.brandType, FIELD_LIMITS.brandTypeMax),
    modelYear: clampString(snap.modelYear, FIELD_LIMITS.modelYearMax),
    plateNumber: clampString(snap.plateNumber, FIELD_LIMITS.plateNumberMax),
    vin: clampString(snap.vin, FIELD_LIMITS.vinMax),
    engineSerial: clampString(snap.engineSerial, FIELD_LIMITS.engineSerialMax),
    color: clampString(snap.color, FIELD_LIMITS.colorMax),
    seatsCount: Math.max(0, Math.min(FIELD_LIMITS.seatsMax, Math.round(Number(snap.seatsCount) || 0))),
    imageUrl: clampRawString(snap.imageUrl, FIELD_LIMITS.imageUrlMax),
    operationalStatus: snap.operationalStatus,
  };

  return {
    id: clampString(form.id, FIELD_LIMITS.idMax),
    ownerId: clampString(form.ownerId, FIELD_LIMITS.idMax),
    vehicleId: clampString(form.vehicleId, FIELD_LIMITS.idMax),
    serialNumber: clampString(form.serialNumber, FIELD_LIMITS.serialNumberMax) || 'MNT-0001',
    formStatus: form.formStatus,
    startDate: clampString(form.startDate, FIELD_LIMITS.dateMax),
    endDate: clampString(form.endDate, FIELD_LIMITS.dateMax),
    vehicleSnapshot: cleanSnap,
    statusAfterMaintenance: form.statusAfterMaintenance,
    items,
    notes: clampRawString(form.notes, FIELD_LIMITS.formNotesMax),
    reviewChecklist: checklist,
    maintenanceSupervisorName: clampString(
      form.maintenanceSupervisorName,
      FIELD_LIMITS.supervisorNameMax
    ),
    followupSupervisorName: clampString(
      form.followupSupervisorName,
      FIELD_LIMITS.supervisorNameMax
    ),
    managementApprovalName: clampString(
      form.managementApprovalName,
      FIELD_LIMITS.supervisorNameMax
    ),
  };
}

export async function saveMaintenanceForm(
  formInput: Omit<MaintenanceForm, 'createdAt' | 'updatedAt'>,
  isNew: boolean,
  syncVehicleStatus?: OperationalStatus
): Promise<void> {
  const clean = sanitizeMaintenanceForm(formInput);
  const path = `maintenanceForms/${clean.id}`;
  const formRef = doc(db, 'maintenanceForms', clean.id);

  try {
    if (isNew) {
      await setDoc(formRef, {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(formRef, {
        serialNumber: clean.serialNumber,
        formStatus: clean.formStatus,
        startDate: clean.startDate,
        endDate: clean.endDate,
        vehicleSnapshot: clean.vehicleSnapshot,
        statusAfterMaintenance: clean.statusAfterMaintenance,
        items: clean.items,
        notes: clean.notes,
        reviewChecklist: clean.reviewChecklist,
        maintenanceSupervisorName: clean.maintenanceSupervisorName,
        followupSupervisorName: clean.followupSupervisorName,
        managementApprovalName: clean.managementApprovalName,
        updatedAt: serverTimestamp(),
      });
    }

    if (syncVehicleStatus) {
      const vehicleRef = doc(db, 'vehicles', clean.vehicleId);
      await updateDoc(vehicleRef, {
        operationalStatus: syncVehicleStatus,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteMaintenanceFormById(formId: string): Promise<void> {
  const path = `maintenanceForms/${formId}`;
  try {
    await deleteDoc(doc(db, 'maintenanceForms', formId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function exportFleetBackupJson(
  vehicles: Vehicle[],
  forms: MaintenanceForm[],
  mediaMap: Record<string, string>
): void {
  const payload: FleetBackupPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    companyName: 'شركة مني صلاح محمد للرحلات ونقل العمال',
    vehicles: vehicles.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
    maintenanceForms: forms.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
    vehicleMedia: Object.entries(mediaMap).map(([vehicleId, dataUrl]) => ({
      vehicleId,
      dataUrl,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `نسخة_احتياطية_أسطول_مني_صلاح_${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFleetCsv(vehicles: Vehicle[], forms: MaintenanceForm[]): void {
  const headers = [
    'كود المركبة',
    'الاسم المتداول',
    'النوع والماركة',
    'الموديل وسنة الصنع',
    'رقم اللوحة',
    'رقم الشاسيه VIN',
    'رقم المحرك',
    'اللون',
    'عدد المقاعد',
    'الحالة التشغيلية',
    'عدد نماذج الصيانة',
  ];

  const rows = vehicles.map((v) => {
    const count = forms.filter((f) => f.vehicleId === v.id).length;
    return [
      v.internalCode,
      v.commonName,
      v.brandType,
      v.modelYear,
      v.plateNumber,
      v.vin,
      v.engineSerial,
      v.color,
      String(v.seatsCount),
      v.operationalStatus,
      String(count),
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `سجل_مركبات_مني_صلاح_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importFleetBackupJson(
  rawJson: string,
  user: User
): Promise<{ vehiclesImported: number; formsImported: number }> {
  const parsed = JSON.parse(rawJson) as FleetBackupPayload;
  if (!parsed || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.maintenanceForms)) {
    throw new Error('ملف النسخة الاحتياطية غير صالح أو يفتقد البيانات الأساسية.');
  }

  let vehiclesImported = 0;
  let formsImported = 0;

  // 1. Write all vehicles first to satisfy referential exists() check in rules
  for (const v of parsed.vehicles) {
    const clean = sanitizeVehiclePayload({
      ...v,
      ownerId: user.uid,
    });
    const existingRef = doc(db, 'vehicles', clean.id);
    const snap = await getDoc(existingRef);
    await saveVehicle(clean, !snap.exists());
    vehiclesImported += 1;
  }

  // 2. Write fallback media entries
  if (Array.isArray(parsed.vehicleMedia)) {
    for (const m of parsed.vehicleMedia) {
      if (m.vehicleId && m.dataUrl) {
        await savePendingVehicleMedia(m.vehicleId, user.uid, m.dataUrl);
      }
    }
  }

  // 3. Write maintenance forms as independent records
  for (const f of parsed.maintenanceForms) {
    const clean = sanitizeMaintenanceForm({
      ...f,
      ownerId: user.uid,
    });
    const existingRef = doc(db, 'maintenanceForms', clean.id);
    const snap = await getDoc(existingRef);
    await saveMaintenanceForm(clean, !snap.exists());
    formsImported += 1;
  }

  return { vehiclesImported, formsImported };
}
