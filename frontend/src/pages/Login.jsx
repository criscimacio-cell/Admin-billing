import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Section 8 — Login Screen.
// - Single login form, no self-registration.
// - No self-serve password reset: static "Contact Admin" note.
// - Fields: Email/Username, Password, Login button.
// - Role is not selected here; the server determines it from the account.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/employee', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(20,184,166,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(15,118,110,0.4), transparent 50%)',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white shadow-popover">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">StashHQ</h1>
          <p className="mt-1 text-sm text-slate-400">Attendance &amp; Leave Tracking</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-popover">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email / Username
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@stash.ph"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            Forgot your password? <span className="font-medium text-slate-500">Contact Admin.</span>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Stash PH — Internal Admin Tool</p>
      </div>
    </div>
  );
}
