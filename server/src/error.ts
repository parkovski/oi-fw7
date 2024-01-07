import type { Response } from 'express';

export class StatusError extends Error {
  status: number;

  constructor(message: string);
  constructor(status: number, message?: string);
  constructor(status: number | string, message?: string) {
    super(typeof status === 'string' ? status : message);
    this.status = typeof status === 'string' ? 400 : status;
  }
}

export function handleError(e: any, res: Response, defaultStatus?: number) {
  if (e instanceof StatusError) {
    res.status(e.status).write(e.message);
  } else {
    res.status(defaultStatus || 500);
    if (typeof e === 'object' && typeof e.message === 'string') {
      res.write(e.message);
    }
  }
}
