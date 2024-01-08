import { initPool } from './db.js';
import { validateUuid } from './validation.js';
import webpush from 'web-push';

export default async function sendPushNotification() {
  const session = validateUuid(process.argv[3]);
  const message = process.argv[4];
  if (!message) {
    throw 'No message given';
  }

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'openinvite';
  const dbPassword = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'openinvite';
  const pool = initPool({ host: dbHost, user: dbUser, password: dbPassword, database });

  const q = await pool.query(
    `SELECT push_endpoint, key_p256dh, key_auth FROM sessions WHERE sesskey = $1`,
    [session]
  );
  if (q.rows[0].endpoint === null) {
    throw 'Push not registered for this session';
  }

  if (!process.env.VAPID_EMAIL) {
    throw 'VAPID_EMAIL not set';
  }
  if (!process.env.VAPID_PUBKEY || !process.env.VAPID_PRIVKEY) {
    throw 'VAPID keys not set';
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBKEY,
    process.env.VAPID_PRIVKEY
  );

  const subscription = {
    endpoint: q.rows[0].push_endpoint,
    keys: {
      p256dh: q.rows[0].key_p256dh,
      auth: q.rows[0].key_auth,
    },
  };
  await webpush.sendNotification(subscription, message);
  console.log('ok');
}
