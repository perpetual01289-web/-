import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { OperationalStatus, WorkItemStatus } from '../types/fleet';

export function OperationalStatusLabel({
  status,
  compact = false,
}: {
  status: OperationalStatus;
  compact?: boolean;
}) {
  const config: Record<
    OperationalStatus,
    { text: string; bg: string; border: string; icon: React.ReactNode }
  > = {
    'جاهز للتشغيل': {
      text: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
    },
    'صالح للتشغيل مع وجود نواقص تجهيز': {
      text: 'text-amber-900',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />,
    },
    'تحت الصيانة': {
      text: 'text-red-800',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <Wrench className="w-3.5 h-3.5 text-red-700 shrink-0" />,
    },
    'يحتاج إلى تجهيز': {
      text: 'text-sky-900',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      icon: <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />,
    },
    'متوقف عن التشغيل': {
      text: 'text-slate-800',
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-700 shrink-0" />,
    },
  };

  const c = config[status] || config['تحت الصيانة'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${c.bg} ${c.border} ${c.text} ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold'
      } whitespace-nowrap`}
    >
      {c.icon}
      <span>{status}</span>
    </span>
  );
}

export function WorkItemStatusLabel({ status }: { status: WorkItemStatus }) {
  const config: Record<
    WorkItemStatus,
    { text: string; bg: string; border: string; icon: React.ReactNode }
  > = {
    'تم التنفيذ': {
      text: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
    },
    'قيد التنفيذ': {
      text: 'text-blue-900',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Wrench className="w-3.5 h-3.5 text-blue-700 shrink-0" />,
    },
    'لم يبدأ': {
      text: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    },
    'يحتاج إلى متابعة': {
      text: 'text-amber-900',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />,
    },
    'مؤجل': {
      text: 'text-red-800',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <PauseCircle className="w-3.5 h-3.5 text-red-700 shrink-0" />,
    },
  };

  const c = config[status] || config['لم يبدأ'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.border} ${c.text} whitespace-nowrap`}
    >
      {c.icon}
      <span>{status}</span>
    </span>
  );
}

export function VehicleImageFrame({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 border border-slate-200 ${className}`}
      >
        <svg
          viewBox="0 0 64 40"
          className="w-12 h-8 text-slate-400 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="4" y="6" width="52" height="24" rx="4" />
          <path d="M4 20h52M16 6v14M32 6v14M48 6v14" />
          <circle cx="15" cy="31" r="4" fill="currentColor" />
          <circle cx="45" cy="31" r="4" fill="currentColor" />
        </svg>
        <span className="text-[11px] font-medium text-slate-500">لا توجد صورة للمركبة</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}
