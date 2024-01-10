//import { precacheAndRoute } from 'workbox-precaching';
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const __manifest__ = self.__WB_MANIFEST || [];
workbox.precaching.precacheAndRoute(__manifest__);

function getNotificationOptions(message) {
  switch (message.m) {
  case 'event_added':
    return {
      body: `You're invited to ${message.name}.`,
    };

  case 'event_responded':
    return {
      body: 'Someone responded to your event.',
    };

  case 'event_commented':
    return {
      body: 'Someone commented on your event.',
    };

  case 'chat':
    return {
      body: `${message.fromName}: ${message.text}`,
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

  case 'groupchat':
    return {
      body: `Group chat: ${message.text}`,
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

  case 'contact_requested':
    return {
      body: `You have a new follower request from ${message.name}`,
      actions: [
        {
          action: 'reject',
          type: 'button',
          title: 'Reject',
        },
        {
          action: 'accept',
          type: 'button',
          title: 'Accept',
        },
      ],
    };

  case 'contact_added':
    return {
      body: `${message.name} is now following you.`,
      actions: [
        {
          action: 'follow-back',
          type: 'button',
          title: 'Follow back',
        },
      ],
    };

  case 'contact_request_approved':
    return {
      body: `${message.name} approved your follow request.`,
    };

  default:
    return;
  }
}

self.addEventListener('push', e => {
  const data = e.data.json();
  const options = getNotificationOptions(data);
  if (options) {
    const promiseChain = self.registration.showNotification('OpenInvite', options);
    // Need to do this so the service worker stays active.
    e.waitUntil(promiseChain);
  }
});

self.addEventListener('notificationclick', e => {
  // text in e.reply
  // action in e.action or null for click on the notification itself
  e.notification.close();
  // Still need to do e.waitUntil() if we're doing anything lengthy here.
});
