export const isValidPhoneNumber = (value: string): boolean => {
  if (!value) return true;
  const normalized = value.replace(/^\s*(?:\+?91)?\s*(\d{10})\s*$/, '$1');
  return /^6\d{9}$|^7\d{9}$|^8\d{9}$|^9\d{9}$/.test(normalized);
};

export const normalizePhoneNumber = (value: string): string => {
  if (!value) return '';
  return value.replace(/^\s*(?:\+?91)?\s*(\d{10})\s*$/, '$1');
};

export const phoneNumberValidationMessage = 'Enter a valid 10-digit mobile number.';