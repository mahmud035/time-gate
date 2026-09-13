/**
 * A cell that starts with any of these is treated as a formula by Excel,
 * LibreOffice and Google Sheets. A staff member named `=cmd|...` is unlikely,
 * but this file is opened by a manager on a work machine and the cost of
 * getting it wrong is somebody's spreadsheet executing a payload.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

const escapeCell = (value: string): string => {
  const guarded = FORMULA_TRIGGERS.test(value) ? `'${value}` : value;

  return /["\n\r,]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
};

/**
 * Serialises rows for a spreadsheet, not for a machine.
 *
 * A BOM because Excel otherwise reads UTF-8 as the local codepage and mangles
 * any non-ASCII name; CRLF because that is what the same spreadsheets expect.
 */
export const toCsv = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string =>
  '﻿' +
  [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') +
  '\r\n';
