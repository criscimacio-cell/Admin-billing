import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

// Section 4 — WorkdaySettings: single company-wide workday_start_time,
// used for the SL late-notification rule (Section 3.2.1). Also holds
// admin_notify_email (Section 9, item 1, resolved): the medical-cert
// contact email is a config field here, not hardcoded in the leave form.
export default function WorkdaySettings() {
  const [form, setForm] = useState({ workday_start_time: '', admin_notify_email: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/workday-settings').then((res) => setForm({
      workday_start_time: res.data.workday_start_time?.slice(0, 5) || '08:00',
      admin_notify_email: res.data.admin_notify_email || '',
    }));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await api.put('/workday-settings', form);
    setMessage('Settings saved.');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Workday Settings</h1>
      <Card title="Company-Wide Settings">
        <form onSubmit={handleSave} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Workday Start Time</label>
            <input type="time" value={form.workday_start_time}
              onChange={(e) => setForm({ ...form, workday_start_time: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">
              Used to flag Sick Leave requests submitted after this time on the leave's start date as "late notification" (informational only).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Admin Notification Email</label>
            <input type="email" value={form.admin_notify_email}
              onChange={(e) => setForm({ ...form, admin_notify_email: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">
              Shown in the medical-certificate instructional notice on the leave request form.
            </p>
          </div>
          <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            Save Settings
          </button>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
        </form>
      </Card>
    </div>
  );
}
