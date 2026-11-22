import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  Archive,
  Bus,
  ClipboardList,
  Database,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { auth, testConnection } from './lib/firebase';
import {
  ensureUserProfile,
  subscribeMaintenanceForms,
  subscribeVehicleMedia,
  subscribeVehicles,
} from './lib/fleetService';
import { MaintenanceForm, Vehicle } from './types/fleet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { VehiclesView } from './components/VehiclesView';
import { MaintenanceFormsListView } from './components/MaintenanceFormsListView';
import { MaintenanceFormEditor } from './components/MaintenanceFormEditor';
import { VehicleArchiveView } from './components/VehicleArchiveView';
import { BackupRestoreView } from './components/BackupRestoreView';

type ActiveTab =
  | 'dashboard'
  | 'vehicles'
  | 'forms'
  | 'editor'
  | 'archive'
  | 'backup';

function FleetAppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [forms, setForms] = useState<MaintenanceForm[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [editingForm, setEditingForm] = useState<MaintenanceForm | null>(null);
  const [preselectedVehicle, setPreselectedVehicle] = useState<Vehicle | null>(null);
  const [archiveVehicleId, setArchiveVehicleId] = useState<string>('');

  // Throw async Firestore subscription errors to React ErrorBoundary
  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    testConnection();
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          await ensureUserProfile(currentUser);
        } catch (err) {
          console.error('Failed ensuring user profile:', err);
        }
      } else {
        setVehicles([]);
        setForms([]);
        setMediaMap({});
        setDataLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);

    let vehiclesReady = false;
    let formsReady = false;
    const markReady = () => {
      if (vehiclesReady && formsReady) setDataLoading(false);
    };

    const unsubVehicles = subscribeVehicles(
      user,
      (list) => {
        setVehicles(list);
        vehiclesReady = true;
        markReady();
      },
      (err) => setAsyncError(err)
    );

    const unsubForms = subscribeMaintenanceForms(
      user,
      (list) => {
        setForms(list);
        formsReady = true;
        markReady();
      },
      (err) => setAsyncError(err)
    );

    const unsubMedia = subscribeVehicleMedia(
      user,
      (map) => {
        setMediaMap(map);
      },
      (err) => setAsyncError(err)
    );

    return () => {
      unsubVehicles();
      unsubForms();
      unsubMedia();
    };
  }, [authReady, user]);

  if (!authReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6"
      >
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center mx-auto">
            <Bus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            جاري تهيئة نظام إدارة أسطول شركة مني صلاح محمد...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const openNewFormEditor = (vehicle?: Vehicle) => {
    setEditingForm(null);
    setPreselectedVehicle(vehicle || null);
    setActiveTab('editor');
    setMobileMenuOpen(false);
  };

  const openExistingFormEditor = (form: MaintenanceForm) => {
    setEditingForm(form);
    setPreselectedVehicle(null);
    setActiveTab('editor');
    setMobileMenuOpen(false);
  };

  const openVehicleArchive = (vehicle: Vehicle) => {
    setArchiveVehicleId(vehicle.id);
    setActiveTab('archive');
    setMobileMenuOpen(false);
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'vehicles',
      label: 'إدارة المركبات',
      icon: <Bus className="w-4 h-4" />,
    },
    {
      id: 'forms',
      label: 'نماذج الصيانة',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      id: 'archive',
      label: 'أرشيف المركبات',
      icon: <Archive className="w-4 h-4" />,
    },
    {
      id: 'backup',
      label: 'النسخ الاحتياطي',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  const pageTitles: Record<ActiveTab, string> = {
    dashboard: 'لوحة التحكم الرئيسية',
    vehicles: 'إدارة ملفات المركبات',
    forms: 'سجل نماذج وخطط الصيانة',
    editor: editingForm ? `تعديل نموذج صيانة (${editingForm.serialNumber})` : 'نموذج صيانة جديد',
    archive: 'أرشيف المركبات المستقل',
    backup: 'النسخ الاحتياطي وتصدير البيانات',
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F6F9] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 bg-[#0B1F3A] text-white flex-col justify-between shrink-0 border-l border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#B91C1C] flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-white truncate">
                  شركة مني صلاح محمد
                </h1>
                <p className="text-[11px] text-slate-300 truncate">
                  للرحلات ونقل العمال
                </p>
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active =
                activeTab === item.id ||
                (activeTab === 'editor' && item.id === 'forms');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#B91C1C] text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account Footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="text-xs">
            <p className="font-bold text-white truncate">
              {user.displayName || 'مسؤول النظام'}
            </p>
            <p className="text-slate-400 truncate text-[11px]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Drawer */}
      <div className="no-print lg:hidden bg-[#0B1F3A] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[#B91C1C]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-white/10 cursor-pointer"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-extrabold">شركة مني صلاح محمد</p>
            <p className="text-[11px] text-slate-300">{pageTitles[activeTab]}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openNewFormEditor()}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#B91C1C] text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>نموذج صيانة</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 bg-[#0B1F3A] text-white h-full flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#B91C1C] flex items-center justify-center">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">شركة مني صلاح محمد</p>
                    <p className="text-[11px] text-slate-300">إدارة صيانة الأسطول</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-[#B91C1C] text-white'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="text-xs">
                <p className="font-bold text-white">{user.displayName}</p>
                <p className="text-slate-400 text-[11px]">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header */}
        <header className="no-print hidden lg:flex items-center justify-between gap-8 bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-bold text-[#0B1F3A] whitespace-nowrap">
              نظام إدارة ومتابعة صيانة أسطول المركبات
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600 truncate">
              {pageTitles[activeTab]}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openNewFormEditor()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>إنشاء نموذج صيانة</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="h-14 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  vehicles={vehicles}
                  forms={forms}
                  mediaMap={mediaMap}
                  onNavigateVehicles={() => setActiveTab('vehicles')}
                  onCreateNewForm={openNewFormEditor}
                  onOpenForm={openExistingFormEditor}
                  onOpenArchive={openVehicleArchive}
                />
              )}

              {activeTab === 'vehicles' && (
                <VehiclesView
                  user={user}
                  vehicles={vehicles}
                  forms={forms}
                  mediaMap={mediaMap}
                  onCreateMaintenanceForm={(v) => openNewFormEditor(v)}
                  onOpenVehicleArchive={openVehicleArchive}
                />
              )}

              {activeTab === 'forms' && (
                <MaintenanceFormsListView
                  forms={forms}
                  mediaMap={mediaMap}
                  onCreateNew={() => openNewFormEditor()}
                  onOpenForm={openExistingFormEditor}
                />
              )}

              {activeTab === 'editor' && (
                <MaintenanceFormEditor
                  key={editingForm?.id || preselectedVehicle?.id || 'new'}
                  user={user}
                  vehicles={vehicles}
                  allForms={forms}
                  mediaMap={mediaMap}
                  initialForm={editingForm}
                  preselectedVehicle={preselectedVehicle}
                  onBack={() => setActiveTab('forms')}
                  onSaved={(saved) => setEditingForm(saved)}
                />
              )}

              {activeTab === 'archive' && (
                <VehicleArchiveView
                  vehicles={vehicles}
                  forms={forms}
                  mediaMap={mediaMap}
                  selectedVehicleId={archiveVehicleId}
                  onSelectVehicleId={setArchiveVehicleId}
                  onOpenForm={openExistingFormEditor}
                  onCreateNewFormForVehicle={(v) => openNewFormEditor(v)}
                />
              )}

              {activeTab === 'backup' && (
                <BackupRestoreView
                  user={user}
                  vehicles={vehicles}
                  forms={forms}
                  mediaMap={mediaMap}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FleetAppContent />
    </ErrorBoundary>
  );
}
