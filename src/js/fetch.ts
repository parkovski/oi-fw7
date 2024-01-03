import { StatusError } from './error.js';

export async function fetchAny(resource: string, options?: RequestInit): Promise<Response> {
  if (!options) {
    options = { credentials: 'include' };
  } else if (!options.credentials) {
    options.credentials = 'include';
  }
  const url = `https://api.oi.parkovski.com${resource}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new StatusError(response.status, text);
  }
  return response;
}

export function fetchText(resource: string, options?: RequestInit): Promise<string> {
  return fetchAny(resource, options).then(x => x.text()).catch(e => { throw e; });
}

export function fetchJson(resource: string, options?: RequestInit): Promise<any> {
  return fetchAny(resource, options).then(x => x.json()).catch(e => { throw e; });
}
