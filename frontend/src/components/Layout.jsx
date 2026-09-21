import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApprovalCounts } from '../context/ApprovalCountsContext.jsx';
import {
  IconGrid, IconUsers, IconCalendarCheck, IconClipboard, IconCalendarDays,
  IconTag, IconClock, IconFileText, IconDownload, IconBuilding, IconSend,
  IconWallet, IconLogout, IconReceipt, IconShieldCheck, IconMenu, IconX,
} from './icons.jsx';

// Everyone (including Admin and Dept Head) is fundamentally an employee
// with their own attendance/leave/incentives — this section is always
// shown, regardless of role or approval capability. The CEO is the
// exception: as the owner, they don't clock attendance, request leave, or
// receive CEO-granted incentives from themselves, so those four items are
// filtered out for them below (see CEO_HIDDEN_PATHS).
const PERSONAL_NAV = [
  { to: '/employee', label: 'Dashboard', end: true, icon: IconGrid },
  { to: '/employee/my-attendance', label: 'My Attendance', icon: IconCalendarCheck },
  { to: '/employee/company-attendance', label: 'Company Attendance', icon: IconBuilding },
  { to: '/employee/request-leave', label: 'Request Leave', icon: IconSend },
  { to: '/employee/my-leave', label: 'My Leave', icon: IconWallet },
  { to: '/employee/my-incentives', label: 'My Incentives', icon: IconReceipt },
  { to: '/employee/team-calendar', label: 'Team Calendar', icon: IconCalendarDays },
];

const CEO_HIDDEN_PATHS = new Set([
  '/employee/my-attendance',
  '/employee/request-leave',
  '/employee/my-leave',
  '/employee/my-incentives',
]);

const TEAM_APPROVALS_NAV = [
  { to: '/team-approvals', label: 'Team Approvals', end: true, icon: IconClipboard },
];

const FINAL_APPROVALS_NAV = [
  { to: '/final-approvals', label: 'Final Approvals', end: true, icon: IconShieldCheck },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: IconGrid },
  { to: '/admin/employees', label: 'Employees', icon: IconUsers },
  { to: '/admin/attendance', label: 'Attendance', icon: IconCalendarCheck },
  { to: '/admin/leave-queue', label: 'Leave Requests', icon: IconClipboard },
  { to: '/admin/incentives', label: 'Incentives', icon: IconReceipt },
  { to: '/admin/team-calendar', label: 'Team Calendar', icon: IconCalendarDays },
  { to: '/admin/leave-types', label: 'Leave Types', icon: IconTag },
  { to: '/admin/workday-settings', label: 'Workday Settings', icon: IconClock },
  { to: '/admin/audit-log', label: 'Audit Log', icon: IconFileText },
  { to: '/admin/reports', label: 'Reports', icon: IconDownload },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function NavGroup({ title, items, onNavigate }) {
  return (
    <div className="mb-4">
      {title && <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
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
                    <span className="flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout, isAdmin, isDeptHead, isCeo } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const hasApprovals = isDeptHead || isCeo;
  const personalNav = isCeo ? PERSONAL_NAV.filter((item) => !CEO_HIDDEN_PATHS.has(item.to)) : PERSONAL_NAV;
  const { counts } = useApprovalCounts();

  const approvalsNav = [
    ...(isDeptHead ? [{ ...TEAM_APPROVALS_NAV[0], badge: counts.dept_head }] : []),
    ...(isCeo ? [{ ...FINAL_APPROVALS_NAV[0], badge: counts.ceo }] : []),
  ];

  const adminNav = ADMIN_NAV.map((item) =>
    item.to === '/admin/leave-queue' ? { ...item, badge: counts.admin } : item
  );

  const closeNav = () => setNavOpen(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {navOpen && (
          <div
            onClick={closeNav}
            className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
            aria-hidden="true"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:translate-x-0 ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between gap-2.5 border-b border-slate-100 px-5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
                S
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold tracking-tight text-slate-900">StashHQ</div>
                <div className="truncate text-[11px] text-slate-400">Attendance &amp; Leave</div>
              </div>
            </div>
            <button
              onClick={closeNav}
              title="Close menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
            >
              <IconX className="h-[18px] w-[18px]" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {isAdmin && <NavGroup title="Administration" items={adminNav} onNavigate={closeNav} />}
            {hasApprovals && <NavGroup title="Approvals" items={approvalsNav} onNavigate={closeNav} />}
            <NavGroup title={isAdmin || hasApprovals ? 'Personal' : undefined} items={personalNav} onNavigate={closeNav} />
          </nav>

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {initials(user?.full_name) || '?'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-slate-800">{user?.full_name}</div>
                <div className="truncate text-xs text-slate-400">
                  {isAdmin ? 'Admin' : 'Employee'}
                  {isDeptHead && ` · ${user.department_head_of} Head`}
                  {isCeo && ' · CEO'}
                </div>
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

        <div className="flex min-h-screen w-full flex-col lg:ml-64">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
            <button
              onClick={() => setNavOpen(true)}
              title="Open menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-400">
              {isAdmin ? 'Admin Workspace' : isDeptHead ? 'Department Head Workspace' : isCeo ? 'CEO Workspace' : 'Employee Workspace'}
            </div>
            <div className="hidden shrink-0 text-sm text-slate-500 sm:block">
              {user?.department} &middot; {user?.position}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
