const STYLES = {
  approved: 'bg-emerald-100 text-emerald-800',
  present: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  absent: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  late: 'bg-amber-100 text-amber-800',
  half_day: 'bg-sky-100 text-sky-800',
  on_leave: 'bg-brand-100 text-brand-800',
};

export default function StatusBadge({ status }) {
  const label = String(status || '').replace(/_/g, ' ');
  const style = STYLES[status] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}
