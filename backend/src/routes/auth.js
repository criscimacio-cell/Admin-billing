import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = Router();

// Section 8 — Login Screen. Single form, no self-registration. Role is
// not selected at login; it is determined server-side from the account.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Everyone (including admin) is fundamentally an employee; department_head_of
  // and is_ceo are additional approval capabilities layered on top, not
  // exclusive roles — carried in the token so route guards and the
  // frontend nav don't need an extra lookup per request.
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      full_name: user.full_name,
      department_head_of: user.department_head_of,
      is_ceo: user.is_ceo,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      employee_id: user.employee_id,
      department: user.department,
      position: user.position,
      email: user.email,
      role: user.role,
      department_head_of: user.department_head_of,
      is_ceo: user.is_ceo,
    },
  });
});

export default router;
