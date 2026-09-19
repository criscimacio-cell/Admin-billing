import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Dept Head / CEO are approval capabilities layered on the base
// employee/admin role, not exclusive roles — these check the capability
// flags carried in the JWT (see routes/auth.js), independent of `role`.
export function requireDeptHead(req, res, next) {
  if (!req.user?.department_head_of) {
    return res.status(403).json({ error: 'Not a Department Head' });
  }
  next();
}

export function requireCeo(req, res, next) {
  if (!req.user?.is_ceo) {
    return res.status(403).json({ error: 'Not the CEO' });
  }
  next();
}
