import type { PoolClient } from 'pg';

export default class DataModel {
  protected _dbclient: PoolClient;

  constructor(dbclient: PoolClient) {
    this._dbclient = dbclient;
  }
}
