import { isValidPhoneNumber, phoneNumberValidationMessage } from './phone-validator';

export type RequiredFieldError = 'required' | 'invalid-phone' | 'invalid-email' | 'phone-length' | 'invalid-date';

export interface ValidatedField {
  value: unknown;
  label: string;
  required?: boolean;
  phone?: boolean;
  email?: boolean;
  date?: boolean;
  min?: number;
  max?: number;
}

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return false;
  return !value.toString().trim();
};



export const isValidEmail = (value: string): boolean => {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/ .test(value);
};

export const parseNonNegativeNumber = (value: string): number | null => {
  if (!value || typeof value !== 'string') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
};

export const isValidDate = (value: string): boolean => {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const validateField = (
  field: ValidatedField,
  originalValue?: string
): string => {
  const strValue = String(field.value);
  
  if (isEmpty(field.value)) {
    if (field.required) return 'This field is required';
    return '';
  }
  
  if (field.phone) {
    if (!isValidPhoneNumber(strValue)) {
      return 'Enter a valid 10-digit mobile number';
    }
  }
  
  if (field.email) {
    if (!isValidEmail(strValue)) {
      return 'Enter a valid email address';
    }
  }
  
  if (field.date) {
    if (!isValidDate(strValue)) {
      return 'Enter a valid date';
    }
  }
  
  if (typeof field.min !== 'undefined') {
    if (Number(field.value) < field.min) {
      return `Must be at least ${field.min}`;
    }
  }
  
  if (typeof field.max !== 'undefined') {
    if (Number(field.value) > field.max) {
      return `Must not exceed ${field.max}`;
    }
  }
  
  return '';
};

export const validateRequiredFields = (fields: ValidatedField[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  fields.forEach((field) => {
    const key = field.label.toLowerCase();
    const error = validateField(field);
    if (error) {
      errors[key] = error;
    }
  });
  
  return errors;
};

export const hasErrors = (errors: Record<string, string>): boolean => {
  return Object.keys(errors).length > 0;
};