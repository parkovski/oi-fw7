//import { precacheAndRoute } from 'workbox-precaching';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', e => {
  self.registration.showNotification('Push notification', {
    body: e.data.text(),
  });
});
