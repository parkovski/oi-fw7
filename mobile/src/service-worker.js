//import { precacheAndRoute } from 'workbox-precaching';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const __manifest__ = self.__WB_MANIFEST || [];
workbox.precaching.precacheAndRoute(__manifest__);

self.addEventListener('push', e => {
  const data = e.data.json();

  let body = '(unknown message type)';
  if (data.m === 'chat') {
    body = data.fromName + ': ' + data.text;
  }

  const promiseChain = self.registration.showNotification('OpenInvite', {
    body
  });
  // Need to do this so the service worker stays active.
  e.waitUntil(promiseChain);
});
