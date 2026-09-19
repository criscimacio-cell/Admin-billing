import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import 'express-async-errors';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import attendanceRoutes from './routes/attendance.js';
import leaveTypeRoutes from './routes/leaveTypes.js';
import leaveBalanceRoutes from './routes/leaveBalances.js';
import leaveRequestRoutes from './routes/leaveRequests.js';
import workdaySettingsRoutes from './routes/workdaySettings.js';
import auditLogRoutes from './routes/auditLog.js';
import reportsRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import incentiveRoutes from './routes/incentives.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'StashHQ' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/leave-balances', leaveBalanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/workday-settings', workdaySettingsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/incentives', incentiveRoutes);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || /^Only JPG, PNG, WEBP/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`StashHQ API listening on port ${port}`));
