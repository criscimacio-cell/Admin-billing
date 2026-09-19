// Runs a zod schema against form state and returns a field->message map
// instead of throwing, so components can render inline errors without a
// try/catch around every submit handler.
export function validateForm(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { valid: true, data: result.data, errors: {} };

  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, data: null, errors };
}

// className helper for an <input>/<select>/<textarea> using the .input
// component class — appends .input-error when that field has an error.
export function inputClass(errors, field, base = 'input') {
  return errors[field] ? `${base} input-error` : base;
}
