const STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  absent: 'bg-red-50 text-red-700 ring-red-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  half_day: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  on_leave: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

const DOT_STYLES = {
  approved: 'bg-emerald-500',
  present: 'bg-emerald-500',
  rejected: 'bg-red-500',
  absent: 'bg-red-500',
  pending: 'bg-amber-500',
  late: 'bg-amber-500',
  half_day: 'bg-sky-500',
  on_leave: 'bg-brand-500',
  verified: 'bg-emerald-500',
  submitted: 'bg-sky-500',
};

export default function StatusBadge({ status }) {
  const label = String(status || '').replace(/_/g, ' ');
  const style = STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  const dot = DOT_STYLES[status] || 'bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
