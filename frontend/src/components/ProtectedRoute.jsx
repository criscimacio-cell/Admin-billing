import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function defaultHomeFor(user) {
  return user?.role === 'admin' ? '/admin' : '/employee';
}

// `check` is a predicate over the current user; omit it for "any
// authenticated user" (the Personal section — everyone, including Admin,
// Dept Head, and CEO, is fundamentally an employee with their own
// attendance/leave/incentives).
export default function ProtectedRoute({ check, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (check && !check(user)) {
    return <Navigate to={defaultHomeFor(user)} replace />;
  }
  return children;
}
