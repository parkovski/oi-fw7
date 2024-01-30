import pg from 'pg';

let pool: pg.Pool | undefined;

export function initPool(config: pg.PoolConfig): pg.Pool {
  pool = new pg.Pool(config);
  return pool;
}

export function getPool(): pg.Pool {
  return pool!;
}

export function dbconnect(): Promise<pg.PoolClient> {
  return pool!.connect();
}
