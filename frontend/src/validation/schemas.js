import { z } from 'zod';

// Client-side mirror of the backend's zod schemas (backend/src/validation/schemas.js).
// Kept as a separate, hand-maintained copy rather than a shared package: the
// two apps are independent npm projects, and pre-empting the same handful of
// mistakes (empty required field, bad date range, non-positive amount)
// doesn't need to be byte-for-byte identical to the server's rules — the
// server is still the source of truth and re-validates everything.
const email = z.string().trim().min(1, 'Email is required').email('Must be a valid email address');
const nonEmpty = (label, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalEmail = email.optional().or(z.literal('').transform(() => undefined));
const positiveAmount = z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Must be greater than 0');
const nonNegativeNumber = z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Cannot be negative');

export const loginSchema = z.object({
  email: nonEmpty('Email'),
  password: nonEmpty('Password'),
});

export const employeeCreateSchema = z.object({
  full_name: nonEmpty('Full name', 120),
  employee_id: nonEmpty('Employee ID', 30),
  department: nonEmpty('Department', 80),
  position: nonEmpty('Position', 80),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const requestLeaveSchema = z
  .object({
    leave_type_id: nonEmpty('Leave type'),
    start_date: nonEmpty('Start date'),
    end_date: nonEmpty('End date'),
    reason: nonEmpty('Reason', 1000),
    notify_email: optionalEmail,
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  });

export const incentiveCreateSchema = z.object({
  user_id: nonEmpty('Employee'),
  description: nonEmpty('Description', 200),
  amount: positiveAmount,
  given_date: nonEmpty('Date given'),
});

export const incentiveBulkCreateSchema = z.object({
  description: nonEmpty('Description', 200),
  amount: positiveAmount,
  given_date: nonEmpty('Date given'),
});

export const incentiveReceiptSchema = z.object({
  amount: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Must be greater than 0').optional()
  ),
});

export const leaveTypeCreateSchema = z.object({
  name: nonEmpty('Name', 80),
  code: nonEmpty('Code', 10),
});

export const leaveTypeUpdateSchema = z
  .object({
    name: nonEmpty('Name', 80).optional(),
    default_credits_per_year: nonNegativeNumber.optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), { message: 'No changes to save' });

export const workdaySettingsSchema = z.object({
  workday_start_time: nonEmpty('Workday start time'),
  admin_notify_email: email,
});

export const attendanceMarkSchema = z.object({
  user_id: nonEmpty('Employee'),
  date: nonEmpty('Date'),
});

export const commentSchema = z.object({
  comment: nonEmpty('This field', 500),
});
