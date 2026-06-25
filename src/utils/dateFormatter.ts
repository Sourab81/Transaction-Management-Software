export type DateFormatterInput = string | number | Date | null | undefined;

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

const parseStringDateParts = (value: string): DateParts | null => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/,
  );

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: typeof match[4] === 'string' ? Number(match[4]) : undefined,
    minute: typeof match[5] === 'string' ? Number(match[5]) : undefined,
  };
};

const parseDateParts = (value: DateFormatterInput): DateParts | null => {
  if (value === null || typeof value === 'undefined' || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
    };
  }

  if (typeof value === 'string') {
    const stringParts = parseStringDateParts(value);
    if (stringParts) return stringParts;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    year: parsedDate.getFullYear(),
    month: parsedDate.getMonth() + 1,
    day: parsedDate.getDate(),
    hour: parsedDate.getHours(),
    minute: parsedDate.getMinutes(),
  };
};

const formatTimeParts = (hour: number, minute: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${pad(hour12)}:${pad(minute)} ${period}`;
};

export const formatDate = (value: DateFormatterInput, fallback = '-') => {
  const parts = parseDateParts(value);
  if (!parts) return fallback;

  return `${pad(parts.day)}-${pad(parts.month)}-${parts.year}`;
};

export const formatTime = (value: DateFormatterInput, fallback = '-') => {
  const parts = parseDateParts(value);
  if (!parts || typeof parts.hour === 'undefined' || typeof parts.minute === 'undefined') {
    return fallback;
  }

  return formatTimeParts(parts.hour, parts.minute);
};

export const formatDateTime = (value: DateFormatterInput, fallback = '-') => {
  const date = formatDate(value, '');
  if (!date) return fallback;

  const time = formatTime(value, '');
  return time ? `${date} ${time}` : date;
};
