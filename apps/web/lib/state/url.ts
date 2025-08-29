import queryString from 'query-string';
import type { ViewState } from './viewStore';

export function encodeState(state: Partial<ViewState>): string {
  return queryString.stringify(state);
}

export function hydrateState(search: string): Partial<ViewState> {
  return queryString.parse(search) as Partial<ViewState>;
}
