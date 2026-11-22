import React, { useMemo, useState } from 'react';
import {
  Bus,
  Calendar,
  Check,
  CheckSquare,
  Download,
  Eye,
  FileText,
  Layers,
  PenLine,
  Printer,
  Settings,
  Square,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  MaintenanceForm,
  MaintenanceItem,
} from '../types/fleet';
import { VehicleImageFrame } from './StatusText';

interface MaintenancePrintDocumentProps {
  form: MaintenanceForm;
  resolvedImageUrl: string;
  onClose?: () => void;
}

interface PageData {
  pageNumber: number;
  isFirstPage: boolean;
  remainingSlice: Array<{ item: MaintenanceItem; globalIndex: number }>;
  completedSlice: MaintenanceItem[];
  categorySlice: Array<{ category: string; items: MaintenanceItem[] }>;
  showNotesAndSignoff: boolean;
}

const CATEGORY_THEMES: Record<
  string,
  { bg: string; border: string; headerText: string; dot: string }
> = {
  'أعمال فنية وإصلاحات': {
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FCA5A5]',
    headerText: 'text-[#991B1B]',
    dot: 'bg-[#B91C1C]',
  },
  'التكييف والنظافة': {
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#93C5FD]',
    headerText: 'text-[#1E3A8A]',
    dot: 'bg-[#1D4ED8]',
  },
  'التجهيزات والملحقات': {
    bg: 'bg-[#FEFCE8]',
    border: 'border-[#FDE047]',
    headerText: 'text-[#854D0E]',
    dot: 'bg-[#CA8A04]',
  },
  'الأعمال الكهربائية': {
    bg: 'bg-[#FFF7ED]',
    border: 'border-[#FDBA74]',
    headerText: 'text-[#9A3412]',
    dot: 'bg-[#EA580C]',
  },
  'المحرك والميكانيكا': {
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#CBD5E1]',
    headerText: 'text-[#0F172A]',
    dot: 'bg-[#334155]',
  },
  'الإطارات والفرامل': {
    bg: 'bg-[#F0FDF4]',
    border: 'border-[#86EFAC]',
    headerText: 'text-[#166534]',
    dot: 'bg-[#16A34A]',
  },
  'الهيكل الخارجي': {
    bg: 'bg-[#F5F3FF]',
    border: 'border-[#C4B5FD]',
    headerText: 'text-[#5B21B6]',
    dot: 'bg-[#7C3AED]',
  },
  'الصالون الداخلي': {
    bg: 'bg-[#ECFEFF]',
    border: 'border-[#67E8F9]',
    headerText: 'text-[#155E75]',
    dot: 'bg-[#0891B2]',
  },
  'الفحص والتجهيز للتشغيل': {
    bg: 'bg-[#FDF2F8]',
    border: 'border-[#F9A8D4]',
    headerText: 'text-[#9D174D]',
    dot: 'bg-[#DB2777]',
  },
};

function getCategoryTheme(cat: string) {
  return (
    CATEGORY_THEMES[cat] || {
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      headerText: 'text-slate-900',
      dot: 'bg-slate-700',
    }
  );
}

function paginateForm(form: MaintenanceForm): PageData[] {
  const sortedItems = [...(form.items || [])].sort((a, b) => a.order - b.order);
  const completedAll = sortedItems.filter((i) => i.status === 'تم التنفيذ');
  const remainingAll = sortedItems
    .filter((i) => i.status !== 'تم التنفيذ')
    .map((item, idx) => ({ item, globalIndex: idx + 1 }));

  const categoryMap = new Map<string, MaintenanceItem[]>();
  for (const item of sortedItems) {
    const list = categoryMap.get(item.category) || [];
    list.push(item);
    categoryMap.set(item.category, list);
  }
  const categoriesAll = Array.from(categoryMap.entries()).map(([category, items]) => ({
    category,
    items,
  }));

  const notesLen = (form.notes || '').length;
  const totalCatItems = categoriesAll.reduce((acc, c) => acc + c.items.length, 0);

  const fitsOnSinglePage =
    remainingAll.length <= 13 &&
    completedAll.length <= 6 &&
    categoriesAll.length <= 4 &&
    totalCatItems <= 14 &&
    notesLen <= 340;

  if (fitsOnSinglePage) {
    return [
      {
        pageNumber: 1,
        isFirstPage: true,
        remainingSlice: remainingAll,
        completedSlice: completedAll,
        categorySlice: categoriesAll,
        showNotesAndSignoff: true,
      },
    ];
  }

  const pages: PageData[] = [];

  // Page 1 slices (no footer signoff when overflowing so more rows fit cleanly)
  const p1RemCap = 17;
  const p1CompCap = 8;
  const p1CatCap = 4;

  const p1Rem = remainingAll.slice(0, p1RemCap);
  const p1Comp = completedAll.slice(0, p1CompCap);
  const p1Cats = categoriesAll.slice(0, p1CatCap);

  pages.push({
    pageNumber: 1,
    isFirstPage: true,
    remainingSlice: p1Rem,
    completedSlice: p1Comp,
    categorySlice: p1Cats,
    showNotesAndSignoff: false,
  });

  let remIdx = p1RemCap;
  let compIdx = p1CompCap;
  let catIdx = p1CatCap;

  while (
    remIdx < remainingAll.length ||
    compIdx < completedAll.length ||
    catIdx < categoriesAll.length
  ) {
    const nextRem = remainingAll.slice(remIdx, remIdx + 22);
    const nextComp = completedAll.slice(compIdx, compIdx + 12);
    const nextCats = categoriesAll.slice(catIdx, catIdx + 5);

    remIdx += nextRem.length;
    compIdx += nextComp.length;
    catIdx += nextCats.length;

    const isAllConsumed =
      remIdx >= remainingAll.length &&
      compIdx >= completedAll.length &&
      catIdx >= categoriesAll.length;

    const canFitSignoff =
      isAllConsumed &&
      nextRem.length <= 10 &&
      nextComp.length <= 6 &&
      nextCats.length <= 2 &&
      notesLen <= 340;

    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage: false,
      remainingSlice: nextRem,
      completedSlice: nextComp,
      categorySlice: nextCats,
      showNotesAndSignoff: canFitSignoff,
    });
  }

  if (!pages[pages.length - 1].showNotesAndSignoff) {
    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage: false,
      remainingSlice: [],
      completedSlice: [],
      categorySlice: [],
      showNotesAndSignoff: true,
    });
  }

  return pages;
}

export function MaintenancePrintDocument({
  form,
  resolvedImageUrl,
  onClose,
}: MaintenancePrintDocumentProps) {
  const [zoom, setZoom] = useState<number>(0.85);
  const [pdfNotice, setPdfNotice] = useState(false);

  const pages = useMemo(() => paginateForm(form), [form]);
  const totalPages = pages.length;
  const snap = form.vehicleSnapshot;

  const handlePrint = () => {
    setPdfNotice(false);
    const prevTitle = document.title;
    document.title = `نموذج_صيانة_${form.serialNumber}_${snap.internalCode}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 800);
  };

  const handleSavePdf = () => {
    setPdfNotice(true);
    const prevTitle = document.title;
    document.title = `نموذج_صيانة_${form.serialNumber}_${snap.internalCode}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col print-only-container">
      {/* Interactive Preview Toolbar (hidden when printing) */}
      <div className="no-print bg-[#0B1F3A] text-white border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold">معاينة نموذج الطباعة (A4 رأسي)</span>
            <span className="text-xs text-slate-300 tabular-nums">
              · {totalPages} {totalPages === 1 ? 'صفحة' : 'صفحات'} · مسلسل {form.serialNumber}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              className="p-1.5 rounded hover:bg-white/10 cursor-pointer"
              title="تصغير المعاينة"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono-code px-2 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.1).toFixed(2)))}
              className="p-1.5 rounded hover:bg-white/10 cursor-pointer"
              title="تكبير المعاينة"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoom(0.85)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            <span>معاينة قبل الطباعة</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة مباشرة</span>
          </button>

          <button
            type="button"
            onClick={handleSavePdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>حفظ PDF</span>
          </button>
        </div>
      </div>

      {pdfNotice && (
        <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 text-center">
          في نافذة الطباعة، اختر الوجهة <strong>حفظ كملف PDF (Save as PDF)</strong> مع تفعيل{' '}
          <strong>رسومات الخلفية (Background graphics)</strong> للحصول على نسخة PDF مطابقة للألوان.
        </div>
      )}

      {/* Scrollable A4 Sheets Viewport */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center gap-6 print-only-container">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              marginBottom: zoom < 1 ? `-${(1 - zoom) * 297}mm` : undefined,
            }}
            className="a4-sheet shadow-2xl border border-slate-300 flex flex-col justify-between print:transform-none! print:mb-0!"
          >
            {/* PAGE HEADER */}
            {page.isFirstPage ? (
              <header className="relative bg-[#0B1F3A] text-white px-5 pt-3.5 pb-4 border-b-[5px] border-[#B91C1C]">
                <div className="flex items-center justify-between gap-4">
                  {/* Right Side: Company Brand + Form Title */}
                  <div className="flex-1 flex flex-col justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white text-[#0B1F3A] flex items-center justify-center border-2 border-[#B91C1C] shrink-0">
                        <Bus className="w-7 h-7 text-[#0B1F3A]" />
                      </div>
                      <div>
                        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">
                          شركة مني صلاح محمد
                        </h1>
                        <p className="text-[13px] font-semibold text-slate-200">
                          للرحلات ونقل العمال
                        </p>
                      </div>
                    </div>

                    {/* White Title Banner matching reference image */}
                    <div className="bg-white text-[#0B1F3A] rounded-full px-4 py-1.5 flex items-center justify-between gap-3 border-2 border-[#B91C1C] shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[15px] font-extrabold">
                          نموذج متابعة تجهيز وصيانة المركبات
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#B91C1C] font-mono-code tabular-nums shrink-0">
                        {form.serialNumber}
                      </span>
                    </div>
                  </div>

                  {/* Left Side: Framed Vehicle Photo matching reference image */}
                  <div className="w-[66mm] h-[40mm] rounded-2xl overflow-hidden border-[3px] border-white ring-2 ring-[#B91C1C] bg-slate-800 shrink-0">
                    <VehicleImageFrame
                      src={resolvedImageUrl}
                      alt={snap.commonName}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </header>
            ) : (
              /* REPEATED COMPACT HEADER FOR CONTINUATION PAGES */
              <header className="bg-[#0B1F3A] text-white px-5 py-2.5 border-b-[4px] border-[#B91C1C]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white text-[#0B1F3A] flex items-center justify-center shrink-0">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold leading-none">
                        شركة مني صلاح محمد للرحلات ونقل العمال
                      </p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        نموذج متابعة تجهيز وصيانة المركبات (تابع)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold">
                    <span className="font-mono-code bg-white/10 px-2.5 py-1 rounded">
                      مسلسل: {form.serialNumber}
                    </span>
                    <span className="bg-[#B91C1C] px-2.5 py-1 rounded tabular-nums">
                      صفحة {page.pageNumber} من {totalPages}
                    </span>
                  </div>
                </div>

                {/* Repeated Vehicle Data Strip on Continuation Pages */}
                <div className="mt-2 bg-white text-slate-900 rounded-md px-3 py-1.5 grid grid-cols-5 gap-2 text-[10px] border border-slate-200">
                  <div>
                    <span className="text-slate-500">كود المركبة: </span>
                    <strong className="font-mono-code">{snap.internalCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">الاسم: </span>
                    <strong>{snap.commonName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">النوع: </span>
                    <strong>{snap.brandType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">اللوحة: </span>
                    <strong className="font-mono-code">{snap.plateNumber || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">الحالة: </span>
                    <strong>{form.statusAfterMaintenance}</strong>
                  </div>
                </div>
              </header>
            )}

            {/* PAGE BODY */}
            <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
              {page.isFirstPage ? (
                /* PAGE 1 TWO-COLUMN LAYOUT MATCHING REFERENCE FORM */
                <div className="grid grid-cols-12 gap-3 flex-1 items-start">
                  {/* RIGHT COLUMN (7 cols): Vehicle Data + Required Works */}
                  <div className="col-span-7 flex flex-col gap-2.5">
                    {/* Vehicle Data Card */}
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#B91C1C] text-white px-3 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-4 h-4" />
                          <h2 className="text-[13px] font-bold">بيانات المركبة</h2>
                        </div>
                        <span className="text-[10px] text-red-100 tabular-nums">
                          صفحة 1 من {totalPages}
                        </span>
                      </div>

                      <table className="w-full text-[11px] border-collapse">
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <th className="w-28 bg-slate-50 text-slate-800 font-bold text-right px-2.5 py-1 border-l border-slate-200">
                              كود المركبة :
                            </th>
                            <td className="px-2.5 py-1 font-bold font-mono-code text-center border-l border-slate-200">
                              {snap.internalCode}
                            </td>
                            <th className="w-24 bg-slate-50 text-slate-800 font-bold text-right px-2 py-1 border-l border-slate-200">
                              رقم اللوحة :
                            </th>
                            <td className="px-2 py-1 font-bold font-mono-code text-center">
                              {snap.plateNumber || '..................'}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2.5 py-1 border-l border-slate-200">
                              اسم المركبة :
                            </th>
                            <td colSpan={3} className="px-2.5 py-1 text-center">
                              <span className="inline-block w-full bg-[#FEF3C7] text-slate-900 font-extrabold rounded-md py-0.5 px-2">
                                {snap.commonName}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2.5 py-1 border-l border-slate-200">
                              النوع / الموديل :
                            </th>
                            <td className="px-2.5 py-1 font-bold text-center border-l border-slate-200">
                              {snap.brandType} {snap.modelYear ? `(${snap.modelYear})` : ''}
                            </td>
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2 py-1 border-l border-slate-200">
                              اللون / المقاعد :
                            </th>
                            <td className="px-2 py-1 font-semibold text-center tabular-nums">
                              {snap.color || '—'} · {snap.seatsCount} مقعد
                            </td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2.5 py-1 border-l border-slate-200">
                              رقم الشاسيه :
                            </th>
                            <td className="px-2 py-1 font-mono-code text-[10px] text-center border-l border-slate-200">
                              {snap.vin || '..................'}
                            </td>
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2 py-1 border-l border-slate-200">
                              رقم المحرك :
                            </th>
                            <td className="px-2 py-1 font-mono-code text-[10px] text-center">
                              {snap.engineSerial || '..................'}
                            </td>
                          </tr>
                          <tr>
                            <th className="bg-slate-50 text-slate-800 font-bold text-right px-2.5 py-1.5 border-l border-slate-200">
                              الحالة الحالية :
                            </th>
                            <td colSpan={3} className="px-2.5 py-1 text-center">
                              <span className="inline-block w-full bg-[#FEF3C7] text-slate-900 font-bold rounded-md py-0.5 px-2">
                                {form.statusAfterMaintenance || snap.operationalStatus}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </section>

                    {/* Required Works (Pending / Remaining) */}
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#B91C1C] text-white px-3 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4" />
                          <h2 className="text-[13px] font-bold">
                            الأعمال المطلوبة (النواقص)
                          </h2>
                        </div>
                        <span className="text-[10px] text-red-100 tabular-nums">
                          {page.remainingSlice.length} بند معروض
                        </span>
                      </div>

                      <table className="w-full text-[10.5px] border-collapse">
                        <thead>
                          <tr className="bg-[#0B1F3A] text-white">
                            <th className="w-7 py-1 px-1.5 text-center border-l border-slate-600">
                              م
                            </th>
                            <th className="py-1 px-2 text-right border-l border-slate-600">
                              بيان العمل المطلوب
                            </th>
                            <th className="w-24 py-1 px-1.5 text-center">حالة التنفيذ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.remainingSlice.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-3 px-3 text-center text-slate-500 font-medium"
                              >
                                تم إنجاز جميع الأعمال المطلوبة ولا توجد نواقص متبقية.
                              </td>
                            </tr>
                          ) : (
                            page.remainingSlice.map(({ item, globalIndex }, i) => (
                              <tr
                                key={item.id}
                                className={`border-b border-slate-200 last:border-b-0 ${
                                  i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                                }`}
                              >
                                <td className="py-1 px-1.5 text-center font-bold tabular-nums border-l border-slate-200 text-slate-700">
                                  {globalIndex}
                                </td>
                                <td className="py-1 px-2 text-slate-900 font-semibold border-l border-slate-200 leading-snug">
                                  <span>{item.title}</span>
                                  {item.notes && (
                                    <span className="block text-[9.5px] font-normal text-slate-500">
                                      {item.notes}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-1.5 text-center text-[9.5px] font-semibold text-slate-700 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1">
                                    <Square className="w-3 h-3 text-slate-700 shrink-0" />
                                    <span>{item.status}</span>
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </section>
                  </div>

                  {/* LEFT COLUMN (5 cols): Completed Works + Categories + Notes */}
                  <div className="col-span-5 flex flex-col gap-2.5">
                    {/* Completed Works */}
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-[12.5px] font-bold">
                          الأعمال التي تم تنفيذها بالفعل
                        </h2>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {page.completedSlice.length === 0 ? (
                          <div className="px-3 py-2.5 text-[10.5px] text-slate-500 text-center">
                            لم يتم تسجيل بنود منتهية بعد.
                          </div>
                        ) : (
                          page.completedSlice.map((item) => (
                            <div
                              key={item.id}
                              className="px-2.5 py-1 flex items-start gap-2 text-[10.5px] font-semibold text-slate-900"
                            >
                              <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                              <span className="leading-snug">{item.title}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    {/* Categorized Summary */}
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-200" />
                        <h2 className="text-[12.5px] font-bold">تصنيف الأعمال</h2>
                      </div>
                      <div className="p-2 flex flex-col gap-1.5">
                        {page.categorySlice.length === 0 ? (
                          <p className="text-[10.5px] text-slate-500 text-center py-2">
                            لا توجد بنود مصنفة حتى الآن.
                          </p>
                        ) : (
                          page.categorySlice.map((group) => {
                            const theme = getCategoryTheme(group.category);
                            return (
                              <div
                                key={group.category}
                                className={`rounded-lg border ${theme.border} ${theme.bg} px-2.5 py-1.5`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                                    <h3 className={`text-[11px] font-extrabold ${theme.headerText}`}>
                                      {group.category}
                                    </h3>
                                  </div>
                                  <span className="text-[9.5px] font-semibold text-slate-600 tabular-nums">
                                    ({group.items.length})
                                  </span>
                                </div>
                                <ul className="space-y-0.5">
                                  {group.items.slice(0, 6).map((it) => (
                                    <li
                                      key={it.id}
                                      className="flex items-start gap-1.5 text-[10px] text-slate-800 leading-tight"
                                    >
                                      {it.status === 'تم التنفيذ' ? (
                                        <CheckSquare className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                                      ) : (
                                        <Square className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                                      )}
                                      <span className="truncate">{it.title}</span>
                                    </li>
                                  ))}
                                  {group.items.length > 6 && (
                                    <li className="text-[9.5px] text-slate-600 pr-4">
                                      + {group.items.length - 6} بنود أخرى...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>

                    {/* Notes Box on Page 1 if single-page */}
                    {page.showNotesAndSignoff && (
                      <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                        <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-200" />
                          <h2 className="text-[12.5px] font-bold">
                            ملاحظات وتعديلات أثناء التنفيذ
                          </h2>
                        </div>
                        <div className="p-2.5 text-[10.5px] text-slate-800 min-h-[24mm] leading-relaxed whitespace-pre-wrap">
                          {form.notes ? (
                            form.notes
                          ) : (
                            <div className="space-y-3 pt-1">
                              <div className="border-b border-dotted border-slate-400" />
                              <div className="border-b border-dotted border-slate-400" />
                              <div className="border-b border-dotted border-slate-400" />
                              <div className="border-b border-dotted border-slate-400" />
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              ) : (
                /* CONTINUATION PAGE LAYOUT (PAGE 2+) */
                <div className="flex flex-col gap-3 flex-1">
                  {page.remainingSlice.length > 0 && (
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#B91C1C] text-white px-3 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4" />
                          <h2 className="text-[13px] font-bold">
                            تابع: الأعمال المطلوبة (النواقص)
                          </h2>
                        </div>
                      </div>
                      <table className="w-full text-[10.5px] border-collapse">
                        <thead>
                          <tr className="bg-[#0B1F3A] text-white">
                            <th className="w-8 py-1 px-2 text-center border-l border-slate-600">
                              م
                            </th>
                            <th className="py-1 px-2.5 text-right border-l border-slate-600">
                              بيان العمل المطلوب
                            </th>
                            <th className="w-36 py-1 px-2 text-right border-l border-slate-600">
                              التصنيف
                            </th>
                            <th className="w-28 py-1 px-2 text-center">حالة التنفيذ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.remainingSlice.map(({ item, globalIndex }, i) => (
                            <tr
                              key={item.id}
                              className={`border-b border-slate-200 last:border-b-0 ${
                                i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                              }`}
                            >
                              <td className="py-1 px-2 text-center font-bold tabular-nums border-l border-slate-200">
                                {globalIndex}
                              </td>
                              <td className="py-1 px-2.5 font-semibold border-l border-slate-200">
                                {item.title}
                                {item.notes && (
                                  <span className="block text-[9.5px] font-normal text-slate-500">
                                    {item.notes}
                                  </span>
                                )}
                              </td>
                              <td className="py-1 px-2 text-slate-700 border-l border-slate-200">
                                {item.category}
                              </td>
                              <td className="py-1 px-2 text-center font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <Square className="w-3 h-3 text-slate-700 shrink-0" />
                                  <span>{item.status}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  {page.completedSlice.length > 0 && (
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-[12.5px] font-bold">
                          تابع: الأعمال التي تم تنفيذها بالفعل
                        </h2>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-y divide-slate-200">
                        {page.completedSlice.map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-1.5 flex items-start gap-2 text-[10.5px] font-semibold text-slate-900"
                          >
                            <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span>
                              {item.title}{' '}
                              <span className="text-[9.5px] font-normal text-slate-500">
                                ({item.category})
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {page.categorySlice.length > 0 && (
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        <h2 className="text-[12.5px] font-bold">تابع: تصنيف الأعمال</h2>
                      </div>
                      <div className="p-2.5 grid grid-cols-2 gap-2">
                        {page.categorySlice.map((group) => {
                          const theme = getCategoryTheme(group.category);
                          return (
                            <div
                              key={group.category}
                              className={`rounded-lg border ${theme.border} ${theme.bg} p-2`}
                            >
                              <h3 className={`text-[11px] font-extrabold mb-1 ${theme.headerText}`}>
                                {group.category} ({group.items.length})
                              </h3>
                              <ul className="space-y-0.5">
                                {group.items.map((it) => (
                                  <li
                                    key={it.id}
                                    className="flex items-start gap-1.5 text-[10px] text-slate-800"
                                  >
                                    {it.status === 'تم التنفيذ' ? (
                                      <CheckSquare className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                                    ) : (
                                      <Square className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                                    )}
                                    <span>{it.title}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {page.showNotesAndSignoff && (
                    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <div className="bg-[#0B1F3A] text-white px-3 py-1.5 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        <h2 className="text-[12.5px] font-bold">
                          ملاحظات وتعديلات أثناء التنفيذ
                        </h2>
                      </div>
                      <div className="p-3 text-[11px] text-slate-800 min-h-[28mm] leading-relaxed whitespace-pre-wrap">
                        {form.notes || (
                          <div className="space-y-4 pt-1">
                            <div className="border-b border-dotted border-slate-400" />
                            <div className="border-b border-dotted border-slate-400" />
                            <div className="border-b border-dotted border-slate-400" />
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* FINAL PAGE FOOTER: REVIEW CHECKLIST + DATES & SIGNATURES */}
            {page.showNotesAndSignoff ? (
              <footer className="px-5 pb-4 pt-1 flex flex-col gap-2.5">
                {/* Review & Acceptance Checklist */}
                <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
                  <div className="bg-[#B91C1C] text-white px-3 py-1.5 flex items-center gap-1.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <h2 className="text-[13px] font-bold">مراجعة الأعمال والاستلام</h2>
                  </div>
                  <div className="p-2.5 bg-white">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] font-bold text-slate-900 mb-2">
                      <div className="flex items-center gap-2">
                        {form.reviewChecklist.allWorkCompleted ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span>تم تنفيذ جميع الأعمال المطلوبة.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {form.reviewChecklist.equipmentVerified ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span>تم التأكد من سلامة التجهيزات.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {form.reviewChecklist.busTestedAfterRepair ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span>تم اختبار الأتوبيس بعد الإصلاح.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {form.reviewChecklist.additionalNotesReviewed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span>تم مراجعة الملاحظات الإضافية.</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-[#FEF3C7] border border-amber-300 rounded-lg px-6 py-1 flex items-center gap-2 text-[12px] font-extrabold text-slate-900">
                        {form.reviewChecklist.readyForOperationApproved ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-700 shrink-0" />
                        )}
                        <span>تم اعتماد جاهزية الأتوبيس للتشغيل.</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bottom 4 Boxes: Dates + 3 Signatures */}
                <div className="grid grid-cols-12 gap-2.5 text-[11px]">
                  <div className="col-span-4 rounded-xl border border-slate-400 bg-white p-2 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-[#B91C1C]" />
                        <span>تاريخ بدء العمل :</span>
                      </div>
                      <span className="font-mono-code font-bold text-slate-800 tabular-nums">
                        {form.startDate || '.... / .... / ....'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-[#B91C1C]" />
                        <span>تاريخ الانتهاء :</span>
                      </div>
                      <span className="font-mono-code font-bold text-slate-800 tabular-nums">
                        {form.endDate || '.... / .... / ....'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-3 rounded-xl border border-slate-400 bg-white p-2 flex flex-col justify-between text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-900">
                      <PenLine className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>توقيع مسؤول الصيانة</span>
                    </div>
                    <div className="text-[10.5px] font-semibold text-slate-700 min-h-[14px]">
                      {form.maintenanceSupervisorName || ''}
                    </div>
                    <div className="border-b border-dotted border-slate-500 mx-2" />
                  </div>

                  <div className="col-span-3 rounded-xl border border-slate-400 bg-white p-2 flex flex-col justify-between text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-900">
                      <PenLine className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>توقيع مسؤول المتابعة</span>
                    </div>
                    <div className="text-[10.5px] font-semibold text-slate-700 min-h-[14px]">
                      {form.followupSupervisorName || ''}
                    </div>
                    <div className="border-b border-dotted border-slate-500 mx-2" />
                  </div>

                  <div className="col-span-2 rounded-xl border border-slate-400 bg-white p-2 flex flex-col justify-between text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-900">
                      <PenLine className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>اعتماد الإدارة</span>
                    </div>
                    <div className="text-[10.5px] font-semibold text-slate-700 min-h-[14px]">
                      {form.managementApprovalName || ''}
                    </div>
                    <div className="border-b border-dotted border-slate-500 mx-2" />
                  </div>
                </div>
              </footer>
            ) : (
              <footer className="px-5 py-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>يتبع في الصفحة التالية — نموذج {form.serialNumber}</span>
                <span className="tabular-nums">
                  صفحة {page.pageNumber} من {totalPages}
                </span>
              </footer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
