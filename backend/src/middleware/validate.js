// Validates req.body against a zod schema before the route handler runs.
// On success, req.body is replaced with the parsed/coerced data (trimmed
// strings, numbers coerced from form-data strings, etc.) so handlers can
// trust their shape. On failure, returns 400 with a message plus a
// field->message map the frontend can use for inline errors.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key]) fields[key] = issue.message;
      }
      return res.status(400).json({ error: 'Please fix the highlighted fields', fields });
    }
    req.body = result.data;
    next();
  };
}
