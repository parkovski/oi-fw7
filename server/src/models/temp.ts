import DataModel from './data.js';

export default class TempModel extends DataModel {
  async set(key: string, value: string) {
    await this._dbclient.query(
      `INSERT INTO temp(key, value) VALUES ($1, $2)`,
      [key, value]
    );
  }

  async get(key: string): Promise<string | null> {
    const result = await this._dbclient.query<{ value: string }>(
      `SELECT value FROM temp WHERE key = $1`,
      [key]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].value;
  }

  async delete(key: string): Promise<string | null> {
    const result = await this._dbclient.query<{ value: string }>(
      `DELETE FROM temp WHERE key = $1 RETURNING value`,
      [key]
    );
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0].value;
  }
}
