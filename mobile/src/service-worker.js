//import { precacheAndRoute } from 'workbox-precaching';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const __manifest__ = self.__WB_MANIFEST || [];
workbox.precaching.precacheAndRoute(__manifest__);

self.addEventListener('push', e => {
  const data = e.data.json();

  let options;
  switch (data.m) {
  case 'chat':
    options = {
      body: data.fromName + ': ' + data.text,
      actions: [
        {
          action: 'dismiss',
          type: 'button',
          title: 'Dismiss',
        },
        {
          action: 'reply',
          type: 'text',
          title: 'Reply',
          placeholder: 'Type a response...',
        },
      ],
    };
    break;
  default:
    options = { body: '(unknown message type)' };
  }

  const promiseChain = self.registration.showNotification('OpenInvite', options);
  // Need to do this so the service worker stays active.
  e.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', e => {
  // text in e.reply
  // action in e.action or null for click on the notification itself
  e.notification.close();
  // Still need to do e.waitUntil() if we're doing anything lengthy here.
});
