export const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

export const isValidPhoneNumber = (value: string) =>
  /^[6-9]\d{9}$/.test(normalizePhoneNumber(value));

export const phoneNumberValidationMessage = 'Enter a valid 10-digit mobile number.';
