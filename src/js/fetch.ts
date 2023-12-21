declare var process: any;

export function fetchAny(resource: string, options?: RequestInit): Promise<Response> {
  if (!options) {
    options = { credentials: 'include' };
  } else if (!options.credentials) {
    options.credentials = 'include';
  }
  let url: string;
  if (process.env.NODE_ENV === 'production') {
    url = `https://api.openinvite.parkovski.com${resource}`;
  } else {
    url = `http://localhost:3000${resource}`;
  }
  return fetch(url, options);
}

export function fetchText(resource: string, options?: RequestInit): Promise<string> {
  return fetchAny(resource, options).then(x => x.text()).catch(e => { throw e; });
}

export function fetchJson(resource: string, options?: RequestInit): Promise<any> {
  return fetchAny(resource, options).then(x => x.json()).catch(e => { throw e; });
}
