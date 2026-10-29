/**
 * Build an RFC 4180-style CSV string and neutralize spreadsheet formula-leading
 * text values so imported descriptions/notes cannot execute as formulas.
 */
export function buildCsv(rows) {
  if (!Array.isArray(rows)) throw new TypeError('CSV rows must be an array.');
  return rows.map(row => {
    if (!Array.isArray(row)) throw new TypeError('Each CSV row must be an array.');
    return row.map(value => {
      let text = value == null ? '' : String(value);
      if (typeof value === 'string' && /^[\u0000-\u0020]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\r\n');
}
