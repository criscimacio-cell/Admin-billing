import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  IconGrid, IconUsers, IconCalendarCheck, IconClipboard, IconCalendarDays,
  IconTag, IconClock, IconFileText, IconDownload, IconBuilding, IconSend,
  IconWallet, IconLogout,
} from './icons.jsx';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: IconGrid },
  { to: '/admin/employees', label: 'Employees', icon: IconUsers },
  { to: '/admin/attendance', label: 'Attendance', icon: IconCalendarCheck },
  { to: '/admin/leave-queue', label: 'Leave Requests', icon: IconClipboard },
  { to: '/admin/team-calendar', label: 'Team Calendar', icon: IconCalendarDays },
  { to: '/admin/leave-types', label: 'Leave Types', icon: IconTag },
  { to: '/admin/workday-settings', label: 'Workday Settings', icon: IconClock },
  { to: '/admin/audit-log', label: 'Audit Log', icon: IconFileText },
  { to: '/admin/reports', label: 'Reports', icon: IconDownload },
];

const EMPLOYEE_NAV = [
  { to: '/employee', label: 'Dashboard', end: true, icon: IconGrid },
  { to: '/employee/my-attendance', label: 'My Attendance', icon: IconCalendarCheck },
  { to: '/employee/company-attendance', label: 'Company Attendance', icon: IconBuilding },
  { to: '/employee/request-leave', label: 'Request Leave', icon: IconSend },
  { to: '/employee/my-leave', label: 'My Leave', icon: IconWallet },
  { to: '/employee/team-calendar', label: 'Team Calendar', icon: IconCalendarDays },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
              S
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-slate-900">StashHQ</div>
              <div className="text-[11px] text-slate-400">Attendance &amp; Leave</div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {initials(user?.full_name) || '?'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-slate-800">{user?.full_name}</div>
                <div className="text-xs capitalize text-slate-400">{user?.role}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Log out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <IconLogout className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </aside>

        <div className="ml-64 flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
            <div className="text-sm font-medium text-slate-400">
              {isAdmin ? 'Admin Workspace' : 'Employee Workspace'}
            </div>
            <div className="text-sm text-slate-500">
              {user?.department} &middot; {user?.position}
            </div>
          </header>

          <main className="flex-1 px-6 py-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
