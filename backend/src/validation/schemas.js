import { z } from 'zod';

// Shared primitives, kept here so every route's shape rules agree with
// each other and with the DB enums/constraints in schema.sql.
const uuid = z.string({ required_error: 'Required' }).uuid('Must be a valid id');
const dateOnly = z
  .string({ required_error: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date (YYYY-MM-DD)');
const timeOnly = z
  .string({ required_error: 'Time is required' })
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be a time (HH:MM)');
const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Must be a valid email address');
const nonEmpty = (label, max = 200) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);
const optionalText = (max = 1000) => z.string().trim().max(max, 'Too long').optional().or(z.literal('').transform(() => undefined));
const money = z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Must be greater than 0');
const nonNegativeNumber = z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Cannot be negative');

export const authSchemas = {
  login: z.object({
    email: email,
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
};

const newPassword = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters');

export const userSchemas = {
  create: z.object({
    full_name: nonEmpty('Full name', 120),
    employee_id: nonEmpty('Employee ID', 30),
    department: nonEmpty('Department', 80),
    position: nonEmpty('Position', 80),
    email,
    password: newPassword,
    role: z.enum(['admin', 'employee']).optional(),
  }),
  update: z
    .object({
      full_name: nonEmpty('Full name', 120).optional(),
      department: nonEmpty('Department', 80).optional(),
      position: nonEmpty('Position', 80).optional(),
      email: email.optional(),
      role: z.enum(['admin', 'employee']).optional(),
      status: z.enum(['active', 'disabled']).optional(),
      password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('').transform(() => undefined)),
      department_head_of: z.preprocess(
        (val) => (val === '' ? null : val),
        z.string().trim().max(80).nullable().optional()
      ),
      is_ceo: z.boolean().optional(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), { message: 'No fields to update' }),
};

export const attendanceSchemas = {
  mark: z.object({
    user_id: uuid,
    date: dateOnly,
    status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']),
    notes: optionalText(500),
  }),
  flag: z.object({
    comment: nonEmpty('A comment describing the issue', 500),
  }),
  resolve: z
    .object({
      corrected_status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']).optional(),
      resolution_notes: optionalText(500),
    })
    .refine((data) => data.corrected_status !== undefined || data.resolution_notes !== undefined, {
      message: 'Provide a corrected status or a resolution note',
    }),
};

export const leaveTypeSchemas = {
  create: z.object({
    name: nonEmpty('Name', 80),
    code: nonEmpty('Code', 10).transform((v) => v.toUpperCase()),
    default_credits_per_year: nonNegativeNumber.optional(),
  }),
  update: z
    .object({
      name: nonEmpty('Name', 80).optional(),
      default_credits_per_year: nonNegativeNumber.optional(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), { message: 'No fields to update' }),
};

export const leaveRequestSchemas = {
  create: z
    .object({
      leave_type_id: uuid,
      start_date: dateOnly,
      end_date: dateOnly,
      is_half_day: z.boolean().optional(),
      reason: nonEmpty('Reason', 1000),
      notify_email: email.optional().or(z.literal('').transform(() => undefined)),
      cert_ack_confirmed: z.boolean().optional(),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: 'End date must be on or after the start date',
      path: ['end_date'],
    }),
  approveStage: z.object({
    stage: z.enum(['dept_head', 'admin', 'ceo']),
    decision: z.enum(['approved', 'rejected']),
    name: z.string().trim().max(120).optional(),
    remark: optionalText(500),
  }),
};

export const incentiveSchemas = {
  create: z.object({
    user_id: uuid,
    description: nonEmpty('Description', 200),
    amount: money,
    given_date: dateOnly,
    notes: optionalText(500),
  }),
  receipt: z.object({
    or_number: optionalText(60),
    vendor_name: optionalText(120),
    amount: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? undefined : val),
      z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Must be greater than 0').optional()
    ),
  }),
  verify: z.object({
    notes: optionalText(500),
  }),
  reject: z.object({
    notes: nonEmpty('A note explaining the rejection', 500),
  }),
};

export const workdaySettingsSchemas = {
  update: z
    .object({
      workday_start_time: timeOnly.optional(),
      admin_notify_email: email.optional(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), { message: 'No fields to update' }),
};
