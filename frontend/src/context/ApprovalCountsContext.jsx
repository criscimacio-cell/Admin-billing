import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const ApprovalCountsContext = createContext(null);
const POLL_MS = 45_000;

// Sidebar notification badges (Team Approvals / Final Approvals / Admin's
// Leave Requests) need to update in two situations: on a timer (someone
// else approved/submitted something), and immediately after this user
// approves/rejects something themselves — which usually happens without a
// route change, so a location-based refetch in Layout alone would miss
// it. Centralizing the fetch + a manual `refresh()` here lets both Layout
// (render) and the approval pages themselves (trigger after a successful
// action) share one source of truth.
export function ApprovalCountsProvider({ children }) {
  const { isAdmin, isDeptHead, isCeo } = useAuth();
  const hasApprovals = isAdmin || isDeptHead || isCeo;
  const [counts, setCounts] = useState({ dept_head: 0, ceo: 0, admin: 0 });

  const refresh = useCallback(() => {
    if (!hasApprovals) return;
    api.get('/leave-requests/approval-counts').then((res) => setCounts(res.data));
  }, [hasApprovals]);

  useEffect(() => {
    if (!hasApprovals) {
      setCounts({ dept_head: 0, ceo: 0, admin: 0 });
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [hasApprovals, refresh]);

  return <ApprovalCountsContext.Provider value={{ counts, refresh }}>{children}</ApprovalCountsContext.Provider>;
}

export function useApprovalCounts() {
  const ctx = useContext(ApprovalCountsContext);
  if (!ctx) throw new Error('useApprovalCounts must be used within ApprovalCountsProvider');
  return ctx;
}
