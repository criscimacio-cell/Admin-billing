import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

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

const BLANK = {
  leave_type_id: '', start_date: '', end_date: '', is_half_day: false, reason: '', notify_email: '',
};

// Section 3.2 / 3.2.1 / 3.2.2 — Request Leave form: half-day support,
// notify email, VL/SL rule warnings (informational, never blocking), and
// the medical-certificate notice + required acknowledgment checkbox for
// SL requests exceeding 3 working days.
export default function RequestLeave() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [certAck, setCertAck] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/leave-types').then((res) => setLeaveTypes(res.data));
    api.get('/workday-settings').then((res) => setSettings(res.data));
  }, []);

  const selectedType = leaveTypes.find((t) => t.id === form.leave_type_id);
  const workingDays = useMemo(() => countWorkingDays(form.start_date, form.end_date), [form.start_date, form.end_date]);
  const needsCertAck = selectedType?.code === 'SL' && workingDays > 3;

  const vlLeadWarning =
    selectedType?.code === 'VL' && form.start_date && daysUntil(form.start_date) < 3;
  const slSameDayWarning =
    selectedType?.code === 'SL' && form.start_date === new Date().toISOString().slice(0, 10);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (needsCertAck && !certAck) {
      setError('Please acknowledge the medical certificate notice before submitting.');
      return;
    }
    try {
      await api.post('/leave-requests', { ...form, cert_ack_confirmed: certAck });
      setMessage('Leave request submitted.');
      setForm(BLANK);
      setCertAck(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave request');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Request Leave</h1>

      <Card>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              className="input">
              <option value="">Select leave type…</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Start Date</label>
              <input required type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input" />
            </div>
            <div className="flex-1">
              <label className="label">End Date</label>
              <input required type="date" value={form.end_date} min={form.start_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_half_day}
              onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })} />
            Half-day
          </label>

          {vlLeadWarning && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Vacation Leave should be submitted at least 3 calendar days before the start date. This request will
              still be submitted, but it will be flagged as a late submission for Admin's visibility.
            </p>
          )}
          {slSameDayWarning && settings && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Sick Leave submitted after {settings.workday_start_time?.slice(0, 5)} on the start date is flagged as a
              late notification for Admin's visibility. This does not block submission.
            </p>
          )}

          <div>
            <label className="label">Reason</label>
            <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3} className="input" />
          </div>

          <div>
            <label className="label">Notify Email (optional)</label>
            <input type="email" value={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
              className="input" />
            <p className="help-text">A copy of this request will be emailed here in addition to the approval table.</p>
          </div>

          {needsCertAck && settings && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
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

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}

          <button type="submit" className="btn-primary">
            Submit Request
          </button>
        </form>
      </Card>
    </div>
  );
}
