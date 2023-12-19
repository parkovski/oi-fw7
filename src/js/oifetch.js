export function fetchAny(resource, options) {
  if (!options) {
    options = { credentials: 'include' };
  } else if (!options.credentials) {
    options.credentials = 'include';
  }
  let url;
  if (process.env.NODE_ENV === 'production') {
    url = `https://api.openinvite.parkovski.com${resource}`;
  } else {
    url = `http://localhost:3000${resource}`;
  }
  return fetch(url, options);
}

export function fetchText(resource, options) {
  return fetchAny(resource, options).then(x => x.text()).catch(e => { throw e; });
}

export function fetchJson(resource, options) {
  return fetchAny(resource, options).then(x => x.json()).catch(e => { throw e; });
}
