import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminEmployees from './pages/admin/Employees.jsx';
import AdminAttendance from './pages/admin/Attendance.jsx';
import AdminLeaveQueue from './pages/admin/LeaveQueue.jsx';
import AdminIncentives from './pages/admin/Incentives.jsx';
import AdminTeamCalendar from './pages/admin/TeamCalendar.jsx';
import AdminLeaveTypes from './pages/admin/LeaveTypesConfig.jsx';
import AdminWorkdaySettings from './pages/admin/WorkdaySettings.jsx';
import AdminAuditLog from './pages/admin/AuditLog.jsx';
import AdminReports from './pages/admin/Reports.jsx';

import EmployeeDashboard from './pages/employee/Dashboard.jsx';
import EmployeeMyAttendance from './pages/employee/MyAttendance.jsx';
import EmployeeCompanyAttendance from './pages/employee/CompanyAttendance.jsx';
import EmployeeRequestLeave from './pages/employee/RequestLeave.jsx';
import EmployeeMyLeave from './pages/employee/MyLeave.jsx';
import EmployeeMyIncentives from './pages/employee/MyIncentives.jsx';
import EmployeeTeamCalendar from './pages/employee/TeamCalendar.jsx';

function withLayout(Component) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <Routes>
              <Route index element={withLayout(AdminDashboard)} />
              <Route path="employees" element={withLayout(AdminEmployees)} />
              <Route path="attendance" element={withLayout(AdminAttendance)} />
              <Route path="leave-queue" element={withLayout(AdminLeaveQueue)} />
              <Route path="incentives" element={withLayout(AdminIncentives)} />
              <Route path="team-calendar" element={withLayout(AdminTeamCalendar)} />
              <Route path="leave-types" element={withLayout(AdminLeaveTypes)} />
              <Route path="workday-settings" element={withLayout(AdminWorkdaySettings)} />
              <Route path="audit-log" element={withLayout(AdminAuditLog)} />
              <Route path="reports" element={withLayout(AdminReports)} />
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/*"
        element={
          <ProtectedRoute role="employee">
            <Routes>
              <Route index element={withLayout(EmployeeDashboard)} />
              <Route path="my-attendance" element={withLayout(EmployeeMyAttendance)} />
              <Route path="company-attendance" element={withLayout(EmployeeCompanyAttendance)} />
              <Route path="request-leave" element={withLayout(EmployeeRequestLeave)} />
              <Route path="my-leave" element={withLayout(EmployeeMyLeave)} />
              <Route path="my-incentives" element={withLayout(EmployeeMyIncentives)} />
              <Route path="team-calendar" element={withLayout(EmployeeTeamCalendar)} />
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          user ? <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
