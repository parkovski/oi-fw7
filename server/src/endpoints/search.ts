import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import { validateMinMaxLength } from '../util/validation.js';
import SearchModel from '../models/search.js';

export async function search(req: Request, res: Response) {
  let client;

  try {
    const text = validateMinMaxLength(req.query.q, 1, 255);

    client = await getPool().connect();

    const results = await new SearchModel(client).searchEventsAndGroups(text);
    res.json(results);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}
