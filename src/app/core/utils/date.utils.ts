const DAY_MS = 86_400_000;

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toIsoDate(date: Date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return local.toISOString().slice(0, 10);
}

export function normalizeDateToIso(value: unknown, language: string = 'tr') {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : toIsoDate(value);
  }

  const text = String(value ?? '').trim();
  const isoMatch = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(text);
  if (isoMatch) {
    return isoMatch[1];
  }

  return parseDisplayDate(text, language) ?? '';
}

export function formatDisplayDate(value: string | Date | null | undefined, language: string = 'tr') {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate(), language);
  }

  const text = String(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
  if (isoMatch) {
    return formatDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]), language);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate(), language);
}

export function parseDisplayDate(value: string, language: string = 'tr') {
  const text = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    return text;
  }

  const displayMatch = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  if (!displayMatch) {
    return null;
  }

  const first = Number(displayMatch[1]);
  const second = Number(displayMatch[2]);
  const day = language.toLowerCase().startsWith('tr') ? first : second;
  const month = language.toLowerCase().startsWith('tr') ? second : first;
  const year = Number(displayMatch[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

export function isIsoDateLike(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function diffDays(start: Date, end: Date) {
  const normalizedStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const normalizedEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((normalizedEnd - normalizedStart) / DAY_MS);
}

export function minDate(left: Date, right: Date) {
  return left < right ? left : right;
}

export function maxDate(left: Date, right: Date) {
  return left > right ? left : right;
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
}

export function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date);
}

export function naturalRoomSort(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function formatDateParts(year: number, month: number, day: number, language: string) {
  return language.toLowerCase().startsWith('tr')
    ? `${padDatePart(day)}.${padDatePart(month)}.${year}`
    : `${padDatePart(month)}/${padDatePart(day)}/${year}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
