import DataModel from './data.js';
import { Membership } from 'oi-types/group';

export default class GroupModel extends DataModel {
  async getMembership(uid: string, gid: string): Promise<Membership | null> {
    const result = await this._dbclient.query<{ kind: Membership }>(
      `SELECT kind FROM groupmems WHERE (uid, gid) = ($1, $2)`,
      [uid, gid]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].kind;
  }

  async getMembers(gid: string): Promise<string[]> {
    const result = await this._dbclient.query<{ uid: string }>(
      `SELECT uid FROM groupmems WHERE gid = $1`, [gid]
    );
    return result.rows.map(row => row.uid);
  }
}
