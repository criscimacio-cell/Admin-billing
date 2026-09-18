import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/employees', label: 'Employees' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/leave-queue', label: 'Leave Requests' },
  { to: '/admin/team-calendar', label: 'Team Calendar' },
  { to: '/admin/leave-types', label: 'Leave Types' },
  { to: '/admin/workday-settings', label: 'Workday Settings' },
  { to: '/admin/audit-log', label: 'Audit Log' },
  { to: '/admin/reports', label: 'Reports' },
];

const EMPLOYEE_NAV = [
  { to: '/employee', label: 'Dashboard', end: true },
  { to: '/employee/my-attendance', label: 'My Attendance' },
  { to: '/employee/company-attendance', label: 'Company Attendance' },
  { to: '/employee/request-leave', label: 'Request Leave' },
  { to: '/employee/my-leave', label: 'My Leave' },
  { to: '/employee/team-calendar', label: 'Team Calendar' },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-brand-800 bg-brand-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">StashHQ</span>
            <span className="hidden text-sm text-brand-100 sm:inline">Attendance &amp; Leave</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{user?.full_name} · {user?.role === 'admin' ? 'Admin' : 'Employee'}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="rounded-md bg-brand-800 px-3 py-1.5 font-medium hover:bg-brand-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
