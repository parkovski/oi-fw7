export const enum SearchResultKind {
  Event = 1,
  Group = 2,
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  kind: SearchResultKind;
}
