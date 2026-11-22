export type OperationalStatus =
  | 'جاهز للتشغيل'
  | 'صالح للتشغيل مع وجود نواقص تجهيز'
  | 'تحت الصيانة'
  | 'يحتاج إلى تجهيز'
  | 'متوقف عن التشغيل';

export const OPERATIONAL_STATUSES: OperationalStatus[] = [
  'جاهز للتشغيل',
  'صالح للتشغيل مع وجود نواقص تجهيز',
  'تحت الصيانة',
  'يحتاج إلى تجهيز',
  'متوقف عن التشغيل',
];

export type WorkItemStatus =
  | 'لم يبدأ'
  | 'قيد التنفيذ'
  | 'تم التنفيذ'
  | 'يحتاج إلى متابعة'
  | 'مؤجل';

export const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  'لم يبدأ',
  'قيد التنفيذ',
  'تم التنفيذ',
  'يحتاج إلى متابعة',
  'مؤجل',
];

export const DEFAULT_MAINTENANCE_CATEGORIES = [
  'أعمال فنية وإصلاحات',
  'التكييف والنظافة',
  'التجهيزات والملحقات',
  'الأعمال الكهربائية',
  'المحرك والميكانيكا',
  'الإطارات والفرامل',
  'الهيكل الخارجي',
  'الصالون الداخلي',
  'الفحص والتجهيز للتشغيل',
] as const;

export type FormStatus = 'مفتوح' | 'مكتمل';

// Volumetric bounds synchronized verbatim with firebase-blueprint.json & firestore.rules
export const FIELD_LIMITS = {
  idMax: 128,
  internalCodeMax: 40,
  commonNameMax: 120,
  brandTypeMax: 120,
  modelYearMax: 40,
  plateNumberMax: 40,
  vinMax: 64,
  engineSerialMax: 64,
  colorMax: 40,
  seatsMax: 120,
  imageUrlMax: 2048,
  vehicleNotesMax: 4000,
  serialNumberMax: 64,
  dateMax: 32,
  formNotesMax: 8000,
  supervisorNameMax: 120,
  itemTitleMax: 300,
  itemCategoryMax: 120,
  itemNotesMax: 1000,
  maxItemsPerForm: 150,
  maxMediaDataUrl: 900000,
} as const;

export interface Vehicle {
  id: string;
  ownerId: string;
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
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VehicleSnapshot {
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
}

export interface MaintenanceItem {
  id: string;
  title: string;
  category: string;
  status: WorkItemStatus;
  notes: string;
  order: number;
}

export interface ReviewChecklist {
  allWorkCompleted: boolean;
  busTestedAfterRepair: boolean;
  equipmentVerified: boolean;
  additionalNotesReviewed: boolean;
  readyForOperationApproved: boolean;
}

export interface MaintenanceForm {
  id: string;
  ownerId: string;
  vehicleId: string;
  serialNumber: string;
  formStatus: FormStatus;
  startDate: string;
  endDate: string;
  vehicleSnapshot: VehicleSnapshot;
  statusAfterMaintenance: OperationalStatus;
  items: MaintenanceItem[];
  notes: string;
  reviewChecklist: ReviewChecklist;
  maintenanceSupervisorName: string;
  followupSupervisorName: string;
  managementApprovalName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'supervisor';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FleetBackupPayload {
  version: string;
  exportedAt: string;
  companyName: string;
  vehicles: Array<Omit<Vehicle, 'createdAt' | 'updatedAt'>>;
  maintenanceForms: Array<Omit<MaintenanceForm, 'createdAt' | 'updatedAt'>>;
  vehicleMedia: Array<{ vehicleId: string; dataUrl: string }>;
}

export const ADMIN_EMAIL = 'perpetual01289@gmail.com';
