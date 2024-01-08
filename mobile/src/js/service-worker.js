//import { precacheAndRoute } from 'workbox-precaching';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', e => {
  const promiseChain = self.registration.showNotification('Push notification', {
    body: e.data.text(),
  });
  // Need to do this so the service worker stays active.
  e.waitUntil(promiseChain);
});
