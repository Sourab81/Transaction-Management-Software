export type CsvCell = string | number | boolean | null | undefined;

const riskyExcelCellPattern = /^[=+\-@\t\r]/;

export const escapeCsvValue = (value: CsvCell) => {
  let text = value == null ? '' : String(value);
  const trimmedStart = text.trimStart();

  if (riskyExcelCellPattern.test(trimmedStart)) {
    const leadingWhitespace = text.slice(0, text.length - trimmedStart.length);
    text = `${leadingWhitespace}'${trimmedStart}`;
  }

  const escapedText = text.replace(/"/g, '""');
  const needsQuotes = /[",\r\n]/.test(escapedText) || escapedText.startsWith(' ') || escapedText.endsWith(' ');

  return needsQuotes ? `"${escapedText}"` : escapedText;
};

export const buildCsv = (rows: CsvCell[][]) => {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
};
