import pg from 'pg';
import { StatusError } from './error.js';

let pool: pg.Pool | undefined;

export function initPool(config: pg.PoolConfig): pg.Pool {
  pool = new pg.Pool(config);
  return pool;
}

export function getPool(): pg.Pool {
  return pool!;
}

export async function getUserId(client: pg.PoolClient, session: string): Promise<string> {
  let q = await client.query(
    `SELECT uid FROM sessions WHERE sessions.sesskey = $1`,
    [session]
  );
  if (q.rowCount === 0) {
    throw new StatusError(401, 'User id for session not found');
  }
  return q.rows[0].uid;
}
