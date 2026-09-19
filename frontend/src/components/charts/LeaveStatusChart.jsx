import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';

// Status colors reuse the same vocabulary as StatusBadge elsewhere in the
// app (emerald/amber/red) — validated as a set with the dataviz skill's
// palette checker, all checks pass.
const STATUS_META = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { status, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-popover">
      <span className="font-semibold text-slate-700">{STATUS_META[status].label}</span>
      <span className="ml-2 text-slate-500">{count} request{count === 1 ? '' : 's'}</span>
    </div>
  );
}

// Leave requests by status — magnitude comparison across 3 named states;
// a horizontal bar reads counts more precisely than a pie for this size.
export default function LeaveStatusChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No leave requests yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="status"
          tickFormatter={(s) => STATUS_META[s].label}
          tick={{ fontSize: 13, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_META[d.status].color} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
