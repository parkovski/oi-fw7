import type { Request, Response } from 'express';
import { getPool } from '../util/db.js';
import { handleError } from '../util/error.js';
import { validateMinMaxLength } from '../util/validation.js';
import { SearchResult } from 'oi-types/search';

export async function search(req: Request, res: Response) {
  let client;

  try {
    const text = validateMinMaxLength(req.query.q, 1, 255);

    client = await getPool().connect();

    const message = await client.query<SearchResult>(
      `
      SELECT id, title, description, 1::smallint AS kind
      FROM events
      WHERE public = TRUE AND ts @@ to_tsquery('english', $1::text)
      UNION
      SELECT id, name, description, 2::smallint AS kind
      FROM groups
      WHERE public = TRUE AND ts @@ to_tsquery('english', $1::text)
      `,
      [text]
    );

    res.json(message.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}
