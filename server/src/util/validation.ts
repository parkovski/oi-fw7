import { StatusError } from './error.js';

export function requireField(field: string, errorCode?: number, message?: string): string;
export function requireField(field: string, message: string): string;
export function requireField(field: string, errorCode?: number | string, message?: string): string {
  if (typeof errorCode === 'string') {
    message = errorCode;
    errorCode = 400;
  } else if (typeof errorCode === 'undefined') {
    errorCode = 400;
  }
  if (field === undefined) {
    throw new StatusError(errorCode, message);
  }
  return field;
}

export function validateUuid(uuid: any, errorCode?: number): string {
  errorCode ||= 400;
  if (typeof uuid !== 'string') {
    throw new StatusError(errorCode, 'Expected a UUID string');
  }
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new StatusError(errorCode, 'UUID validation failed');
  }
  return uuid;
}

export function validateNumeric(num: any, errorCode?: number): string {
  errorCode ||= 400;
  const regex = /^[0-9]{1,19}$/;
  if (typeof num !== 'string' || !regex.test(num)) {
    throw new StatusError(errorCode, 'Expected a numeric string');
  }
  return num;
}

export function validateMaybeNegative(num: any, errorCode?: number): string {
  errorCode ||= 400;
  const regex = /^-?[0-9]{1,19}$/;
  if (typeof num !== 'string' || !regex.test(num)) {
    throw new StatusError(errorCode, 'Expected a numeric string');
  }
  return num;
}

export function validateMinLength(str: any, minLength: number): string {
  if (typeof str !== 'string') {
    throw new StatusError(400, 'Expected a string');
  }
  if (str.length < minLength) {
    throw new StatusError(400, 'String too short');
  }
  return str;
}

export function validateMaxLength(str: any, maxLength: number): string {
  if (typeof str !== 'string') {
    throw new StatusError(400, 'Expected a string');
  }
  if (str.length > maxLength) {
    throw new StatusError(413, 'String exceeds maximum length');
  }
  return str;
}

export function validateMinMaxLength(str: any, minLength: number, maxLength: number): string {
  if (typeof str !== 'string') {
    throw new StatusError(400, 'Expected a string');
  }
  if (str.length < minLength) {
    throw new StatusError(413, 'String too short');
  } else if (str.length > maxLength) {
    throw new StatusError(413, 'String too long');
  }
  return str;
}

export function validateDate(date: any): Date {
  if (typeof date === 'string') {
    date = new Date(date);
    if (isNaN(date.valueOf())) {
      throw new StatusError(400, 'Expected a valid date string');
    }
  } else if (!(date instanceof Date)) {
    throw new StatusError(400, 'Expected a Date object or date string');
  }
  return date;
}

export function validateFutureDate(date: any): Date {
  date = validateDate(date);
  if (date.valueOf() < Date.now()) {
    throw new StatusError(400, 'Expected a future date');
  }
  return date;
}

export function validateBoolean(bool: any): boolean {
  if (typeof bool === 'boolean') {
    return bool;
  }
  if (typeof bool === 'string') {
    if (bool === 'true') {
      return true;
    } else if (bool === 'false') {
      return false;
    }
  }
  throw new StatusError(400, 'Expected the value \'true\' or \'false\'');
}

export function validateJson(obj: any): object {
  if (typeof obj === 'object') {
    return obj;
  }
  if (typeof obj === 'string') {
    try {
      return JSON.parse(obj);
    } catch {
    }
  }
  throw new StatusError(400, 'Expected JSON value');
}

export function validateArray(arr: any): any[] {
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
    }
  }
  if (!Array.isArray(arr)) {
    throw new StatusError(400, 'Expected array');
  }
  return arr;
}

export function validateArrayEach<T>(arr: any, validate: (item: T) => void): T[] {
  arr = validateArray(arr);
  for (let item of arr) {
    validate(item);
  }
  return arr;
}

export function validateOneOf<T>(obj: T, arr: T[]): T {
  for (let item of arr) {
    if (Object.is(obj, item)) {
      return obj;
    }
  }
  throw new StatusError(400, 'Invalid set item');
}
