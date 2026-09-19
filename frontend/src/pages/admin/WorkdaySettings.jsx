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
      <h1 className="page-title">Workday Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Company-Wide Settings" className="lg:col-span-2">
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Workday Start Time</label>
              <input type="time" value={form.workday_start_time}
                onChange={(e) => setForm({ ...form, workday_start_time: e.target.value })}
                className="input" />
              <p className="help-text">
                Used to flag Sick Leave requests submitted after this time on the leave's start date as
                "late notification" (informational only).
              </p>
            </div>
            <div>
              <label className="label">Admin Notification Email</label>
              <input type="email" value={form.admin_notify_email}
                onChange={(e) => setForm({ ...form, admin_notify_email: e.target.value })}
                className="input" />
              <p className="help-text">
                Shown in the medical-certificate instructional notice on the leave request form.
              </p>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">
                Save Settings
              </button>
              {message && <span className="ml-3 text-sm font-medium text-emerald-600">{message}</span>}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Live Preview">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Medical certificate notice</p>
            <p className="mt-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
              Sick leave exceeding 3 working days requires a medical certificate. Please email a copy to{' '}
              <strong>{form.admin_notify_email || 'admin@stash.ph'}</strong> before your return to work.
            </p>
          </Card>

          <Card title="How These Rules Are Used">
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Vacation Leave:</span> must be submitted at least 3
                calendar days before the start date, checked independently of this setting.
              </li>
              <li>
                <span className="font-medium text-slate-800">Sick Leave:</span> flagged "late notification" if
                submitted on the start date after <strong>{form.workday_start_time || '08:00'}</strong>.
              </li>
              <li>
                Both flags are informational only — they never block submission or the approval chain.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
