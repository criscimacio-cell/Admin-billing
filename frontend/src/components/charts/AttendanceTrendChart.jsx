import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Palette validated with the dataviz skill's CVD/normal-vision checks
// (node scripts/validate_palette.js) against a white chart surface —
// half_day uses violet rather than sky so it doesn't collide with the
// brand teal used for on_leave (ΔE 12.8 -> fails the 15 floor with sky).
const SERIES = [
  { key: 'present', label: 'Present', color: '#10b981' },
  { key: 'absent', label: 'Absent', color: '#ef4444' },
  { key: 'late', label: 'Late', color: '#f59e0b' },
  { key: 'half_day', label: 'Half-day', color: '#8b5cf6' },
  { key: 'on_leave', label: 'On leave', color: '#14b8a6' },
];

function formatDay(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-popover">
      <div className="mb-1 font-semibold text-slate-700">{formatDay(label)}</div>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {SERIES.find((s) => s.key === p.dataKey)?.label}
          </span>
          <span className="font-medium text-slate-700">{p.value}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 font-semibold text-slate-700">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
}

// 7-day attendance trend — stacked bar (part-to-whole across categories,
// over time). Categorical color, legend always shown for 5 series.
export default function AttendanceTrendChart({ data }) {
  const hasData = data.some((d) => SERIES.some((s) => d[s.key] > 0));

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-slate-400">No attendance marked in the last 7 days.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: 8 }}
        />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#fff" strokeWidth={2} maxBarSize={24} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
