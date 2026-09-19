import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function countWorkingDays(start, end) {
  if (!start || !end) return 0;
  let count = 0;
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function daysUntil(dateStr) {
  const ms = new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10));
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

const BLANK = {
  leave_type_id: '', start_date: '', end_date: '', is_half_day: false, reason: '', notify_email: '',
};

// Section 3.2 / 3.2.1 / 3.2.2 — Request Leave form: half-day support,
// notify email, VL/SL rule warnings (informational, never blocking), and
// the medical-certificate notice + required acknowledgment checkbox for
// SL requests exceeding 3 working days. The side panel surfaces balances
// and recent requests so the page uses its width for context, not just
// a wide empty margin next to a narrow form.
export default function RequestLeave() {
  const { user } = useAuth();
  const toast = useToast();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [balances, setBalances] = useState([]);
  const [recent, setRecent] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [certAck, setCertAck] = useState(false);

  function loadSidebar() {
    api.get(`/leave-balances/user/${user.id}`).then((res) => setBalances(res.data));
    api.get('/leave-requests/mine').then((res) => setRecent(res.data.slice(0, 5)));
  }

  useEffect(() => {
    api.get('/leave-types').then((res) => setLeaveTypes(res.data));
    api.get('/workday-settings').then((res) => setSettings(res.data));
    loadSidebar();
  }, []);

  const selectedType = leaveTypes.find((t) => t.id === form.leave_type_id);
  const selectedBalance = balances.find((b) => b.leave_type_id === form.leave_type_id);
  const workingDays = useMemo(() => countWorkingDays(form.start_date, form.end_date), [form.start_date, form.end_date]);
  const needsCertAck = selectedType?.code === 'SL' && workingDays > 3;

  const vlLeadWarning =
    selectedType?.code === 'VL' && form.start_date && daysUntil(form.start_date) < 3;
  const slSameDayWarning =
    selectedType?.code === 'SL' && form.start_date === new Date().toISOString().slice(0, 10);

  async function handleSubmit(e) {
    e.preventDefault();
    if (needsCertAck && !certAck) {
      toast.error('Please acknowledge the medical certificate notice before submitting.');
      return;
    }
    try {
      await api.post('/leave-requests', { ...form, cert_ack_confirmed: certAck });
      toast.success('Leave request submitted.');
      setForm(BLANK);
      setCertAck(false);
      loadSidebar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit leave request');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Request Leave</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Leave Type</label>
                <select required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  className="input">
                  <option value="">Select leave type…</option>
                  {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {selectedBalance && (
                  <p className="help-text">Remaining balance: <strong>{selectedBalance.remaining_credits}</strong></p>
                )}
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_half_day}
                  onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })} />
                Half-day
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Start Date</label>
                <input required type="date" value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="label">End Date</label>
                <input required type="date" value={form.end_date} min={form.start_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="input" />
              </div>
            </div>

            {vlLeadWarning && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Vacation Leave should be submitted at least 3 calendar days before the start date. This request will
                still be submitted, but it will be flagged as a late submission for Admin's visibility.
              </p>
            )}
            {slSameDayWarning && settings && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Sick Leave submitted after {settings.workday_start_time?.slice(0, 5)} on the start date is flagged as a
                late notification for Admin's visibility. This does not block submission.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Reason</label>
                <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={4} className="input" />
              </div>
              <div>
                <label className="label">Notify Email (optional)</label>
                <input type="email" value={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
                  className="input" />
                <p className="help-text">A copy of this request will be emailed here in addition to the approval table.</p>
              </div>
            </div>

            {needsCertAck && settings && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm text-orange-900">
                  Sick leave exceeding 3 working days requires a medical certificate. Please email a copy to{' '}
                  <strong>{settings.admin_notify_email}</strong> before your return to work.
                </p>
                <label className="mt-2 flex items-start gap-2 text-sm text-orange-900">
                  <input type="checkbox" checked={certAck} onChange={(e) => setCertAck(e.target.checked)} className="mt-0.5" />
                  I understand I must email my medical certificate to Admin.
                </label>
              </div>
            )}

            <button type="submit" className="btn-primary">
              Submit Request
            </button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Leave Balances">
            {balances.length === 0 ? (
              <p className="text-sm text-slate-500">No balances set up yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {balances.map((b) => (
                  <li key={b.leave_type_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{b.name}</span>
                    <span className="font-semibold text-slate-800">{b.remaining_credits}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent Requests">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-700">{r.leave_type_name}</div>
                      <div className="text-xs text-slate-400">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</div>
                    </div>
                    <StatusBadge status={r.overall_status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
