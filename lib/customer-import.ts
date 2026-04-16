'use client';

export interface ImportedCustomerRow {
  name: string;
  phone: string;
  email?: string;
}

const NAME_HEADERS = new Set([
  'name',
  'customer',
  'customer name',
  'full name',
  'client',
  'client name',
]);

const PHONE_HEADERS = new Set([
  'phone',
  'phone number',
  'mobile',
  'mobile number',
  'contact',
  'contact number',
  'whatsapp',
  'whatsapp number',
]);

const EMAIL_HEADERS = new Set([
  'email',
  'email address',
  'mail',
  'mail id',
]);

const RECORD_NODE_NAMES = new Set([
  'customer',
  'record',
  'entry',
  'item',
  'contact',
  'client',
]);

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '').trim();

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const dedupeImportedCustomers = (rows: ImportedCustomerRow[]) => {
  const seenKeys = new Set<string>();

  return rows.filter((row) => {
    const dedupeKey = `${normalizePhone(row.phone)}|${normalizeEmail(row.email || '')}`;
    if (!dedupeKey || seenKeys.has(dedupeKey)) {
      return false;
    }

    seenKeys.add(dedupeKey);
    return true;
  });
};

const createImportedCustomer = (name: string, phone: string, email?: string): ImportedCustomerRow | null => {
  const normalizedName = name.trim();
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email ? normalizeEmail(email) : '';

  if (!normalizedName || !normalizedPhone) {
    return null;
  }

  return {
    name: normalizedName,
    phone: normalizedPhone,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
  };
};

const getHeaderIndexes = (row: string[]) => {
  let nameIndex = -1;
  let phoneIndex = -1;
  let emailIndex = -1;

  row.forEach((value, index) => {
    const normalizedValue = normalizeHeader(value);

    if (nameIndex === -1 && NAME_HEADERS.has(normalizedValue)) {
      nameIndex = index;
      return;
    }

    if (phoneIndex === -1 && PHONE_HEADERS.has(normalizedValue)) {
      phoneIndex = index;
      return;
    }

    if (emailIndex === -1 && EMAIL_HEADERS.has(normalizedValue)) {
      emailIndex = index;
    }
  });

  if (nameIndex === -1 || phoneIndex === -1) {
    return null;
  }

  return {
    nameIndex,
    phoneIndex,
    emailIndex,
  };
};

const parseTabularRows = (rows: string[][]): ImportedCustomerRow[] => {
  const cleanedRows = rows
    .map((row) => row.map((cell) => normalizeCell(cell)))
    .filter((row) => row.some(Boolean));

  if (cleanedRows.length === 0) {
    return [];
  }

  const headerIndexes = getHeaderIndexes(cleanedRows[0]);
  const dataRows = headerIndexes ? cleanedRows.slice(1) : cleanedRows;

  return dedupeImportedCustomers(
    dataRows
      .map((row) => {
        if (headerIndexes) {
          return createImportedCustomer(
            row[headerIndexes.nameIndex] || '',
            row[headerIndexes.phoneIndex] || '',
            headerIndexes.emailIndex >= 0 ? row[headerIndexes.emailIndex] || '' : '',
          );
        }

        return createImportedCustomer(row[0] || '', row[1] || '', row[2] || '');
      })
      .filter((row): row is ImportedCustomerRow => Boolean(row)),
  );
};

const splitDelimitedLine = (line: string) => {
  if (line.includes('\t')) {
    return line.split('\t');
  }

  if (line.includes('|')) {
    return line.split('|');
  }

  return line.split(',');
};

const parseKeyValueCustomerText = (rawText: string): ImportedCustomerRow[] => {
  const rows: ImportedCustomerRow[] = [];
  const lines = rawText.split(/\r?\n/);
  let currentRecord: Partial<ImportedCustomerRow> = {};

  const pushCurrentRecord = () => {
    const nextRow = createImportedCustomer(
      currentRecord.name || '',
      currentRecord.phone || '',
      currentRecord.email,
    );

    if (nextRow) {
      rows.push(nextRow);
    }

    currentRecord = {};
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (currentRecord.name || currentRecord.phone || currentRecord.email) {
        pushCurrentRecord();
      }
      return;
    }

    const match = trimmedLine.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      return;
    }

    const [, rawKey, rawValue] = match;
    const normalizedKey = normalizeHeader(rawKey);
    const normalizedValue = rawValue.trim();

    if (NAME_HEADERS.has(normalizedKey)) {
      if (currentRecord.name && currentRecord.phone) {
        pushCurrentRecord();
      }
      currentRecord.name = normalizedValue;
      return;
    }

    if (PHONE_HEADERS.has(normalizedKey)) {
      currentRecord.phone = normalizedValue;
      return;
    }

    if (EMAIL_HEADERS.has(normalizedKey)) {
      currentRecord.email = normalizedValue;
    }
  });

  if (currentRecord.name || currentRecord.phone || currentRecord.email) {
    pushCurrentRecord();
  }

  return dedupeImportedCustomers(rows);
};

const getElementChildTextMap = (element: Element) => {
  const fieldValues = new Map<string, string>();

  Array.from(element.children).forEach((child) => {
    fieldValues.set(normalizeHeader(child.localName), child.textContent?.trim() || '');
  });

  return fieldValues;
};

const parseRecordNodesFromXml = (xmlDocument: Document): ImportedCustomerRow[] => {
  const candidateElements = Array.from(xmlDocument.getElementsByTagName('*')).filter((element) =>
    RECORD_NODE_NAMES.has(normalizeHeader(element.localName)),
  );

  return dedupeImportedCustomers(
    candidateElements
      .map((element) => {
        const childMap = getElementChildTextMap(element);
        const nameEntry = Array.from(childMap.entries()).find(([key]) => NAME_HEADERS.has(key));
        const phoneEntry = Array.from(childMap.entries()).find(([key]) => PHONE_HEADERS.has(key));
        const emailEntry = Array.from(childMap.entries()).find(([key]) => EMAIL_HEADERS.has(key));

        return createImportedCustomer(
          nameEntry?.[1] || '',
          phoneEntry?.[1] || '',
          emailEntry?.[1] || '',
        );
      })
      .filter((row): row is ImportedCustomerRow => Boolean(row)),
  );
};

const parseSpreadsheetXmlRows = (xmlDocument: Document): ImportedCustomerRow[] => {
  const rowElements = Array.from(xmlDocument.getElementsByTagName('*')).filter((element) =>
    normalizeHeader(element.localName) === 'row',
  );

  if (rowElements.length === 0) {
    return [];
  }

  const matrix = rowElements.map((rowElement) =>
    Array.from(rowElement.children)
      .map((child) => {
        const dataElement = Array.from(child.getElementsByTagName('*')).find(
          (nestedElement) => normalizeHeader(nestedElement.localName) === 'data',
        );

        return normalizeCell(dataElement?.textContent || child.textContent || '');
      }),
  );

  return parseTabularRows(matrix);
};

export const parseCustomerImportText = (rawText: string): ImportedCustomerRow[] => {
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return [];
  }

  const keyValueRows = parseKeyValueCustomerText(trimmedText);
  if (keyValueRows.length > 0) {
    return keyValueRows;
  }

  const lines = trimmedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tabularRows = parseTabularRows(lines.map(splitDelimitedLine));
  if (tabularRows.length > 0) {
    return tabularRows;
  }

  throw new Error('Customer import must use columns for Name and Phone, or key/value lines like "Name: Riya Sharma".');
};

export const formatImportedCustomers = (rows: ImportedCustomerRow[]) =>
  dedupeImportedCustomers(rows)
    .map((row) => `${row.name}, ${row.phone}, ${row.email || ''}`.replace(/, $/, ''))
    .join('\n');

export const extractCustomersFromXmlText = (xmlText: string): ImportedCustomerRow[] => {
  const parser = new DOMParser();
  const xmlDocument = parser.parseFromString(xmlText, 'application/xml');

  if (xmlDocument.querySelector('parsererror')) {
    throw new Error('The uploaded XML file could not be parsed. Please check the file format and try again.');
  }

  const recordRows = parseRecordNodesFromXml(xmlDocument);
  if (recordRows.length > 0) {
    return recordRows;
  }

  const tableRows = parseSpreadsheetXmlRows(xmlDocument);
  if (tableRows.length > 0) {
    return tableRows;
  }

  throw new Error('No customer records were found in the XML file.');
};

const extractCustomersFromSpreadsheet = async (file: File): Promise<ImportedCustomerRow[]> => {
  const XLSX = await import('xlsx');
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as unknown[][];

  return parseTabularRows(rows.map((row) => row.map((cell) => normalizeCell(cell))));
};

const extractCustomersFromWordDocument = async (file: File): Promise<ImportedCustomerRow[]> => {
  const mammoth = await import('mammoth');
  const fileBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
  const rows = parseCustomerImportText(result.value || '');

  if (rows.length === 0) {
    throw new Error('No customer records were found in the Word document.');
  }

  return rows;
};

export const extractCustomersFromFile = async (file: File): Promise<ImportedCustomerRow[]> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xml')) {
    return extractCustomersFromXmlText(await file.text());
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    return extractCustomersFromSpreadsheet(file);
  }

  if (fileName.endsWith('.docx')) {
    return extractCustomersFromWordDocument(file);
  }

  if (fileName.endsWith('.doc')) {
    throw new Error('Legacy Word .doc files are not supported yet. Please save the file as .docx and upload again.');
  }

  if (fileName.endsWith('.txt')) {
    return parseCustomerImportText(await file.text());
  }

  throw new Error('Supported upload formats are Excel (.xlsx, .xls), XML (.xml), Word (.docx), CSV (.csv), and text (.txt).');
};
