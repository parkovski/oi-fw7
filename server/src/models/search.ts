import { SearchResult } from 'oi-types/search';
import DataModel from './data.js';

export default class SearchModel extends DataModel {
  async searchEventsAndGroups(query: string): Promise<SearchResult[]> {
    const result = await this._dbclient.query(
      `
      SELECT id, title, description, 1::smallint AS kind
      FROM events
      WHERE public = TRUE AND ts @@ plainto_tsquery('english', $1::text)
      UNION
      SELECT id, name, description, 2::smallint AS kind
      FROM groups
      WHERE public = TRUE AND ts @@ plainto_tsquery('english', $1::text)
      `,
      [query]
    );
    return result.rows;
  }
}
