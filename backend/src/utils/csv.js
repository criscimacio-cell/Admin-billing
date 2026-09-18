function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Minimal CSV builder — avoids pulling in a dependency for Section 3.3 exports. */
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key])).join(',')
  );
  return [header, ...lines].join('\n');
}
