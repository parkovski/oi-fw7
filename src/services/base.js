export default class ServiceBase {
  fetch(resource, options) {
    if (!options) {
      options = { credentials: 'include' };
    } else if (!options.credentials) {
      options.credentials = 'include';
    }
    let url;
    if (process.env.NODE_ENV === 'production') {
      url = `https://api.openinvite.com${resource}`;
    } else {
      url = `http://localhost:3000${resource}`;
    }
    return fetch(url, options);
  }
};
