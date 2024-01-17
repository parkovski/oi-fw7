import express from 'express';
import cookieParser from 'cookie-parser';
import webpush from 'web-push';
import { rateLimit } from 'express-rate-limit';
import fileupload from 'express-fileupload';
import { WebSocketServer } from 'ws';
import { onWebSocketConnected, listen as wslisten } from './wsserver.js';
import { initPool } from '../util/db.js';
import {
  hello, authorize, logout, register,
} from '../auth/openinvite.js';
import {
  getMyProfile, getUserInfo, updateProfile, uploadProfilePhoto, changePassword,
} from '../entity/user.js';
import {
  getGroups, getGroupInfo, inviteToGroup, makeGroupAdmin, joinGroup,
  leaveGroup, newGroup, getGroupRequests, approveGroupRequest,
  denyGroupRequest, deleteGroup,
} from '../entity/group.js';
import {
  getContacts, getContactRequests, addContact, removeContact, approveContact,
  denyContact, hasContact,
} from '../entity/contact.js';
import {
  chatListen, chatMessageReceived, getUserChat, getUserChatSummary,
} from '../entity/chat.js';
import {
  groupChatListen, groupMessageReceived, getGroupChat
} from '../entity/groupchat.js';
import {
  getEvents, getEventInfo, newEvent, setEventAttendance, inviteToEvent,
  makeEventHost, postEventComment,
} from '../entity/event.js';
import {
  getGroupEvents, getGroupEventInfo, newGroupEvent, setGroupEventAttendance,
} from '../entity/groupevent.js';
import { getHomeSummary, storePushEndpoint } from '../entity/home.js';
import {
  getNotificationSettings, setNotificationSetting, setAllNotificationSettings
} from '../entity/settings.js';
import { search } from '../entity/search.js';

export default async function serve(port: number) {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'openinvite';
  const dbPassword = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'openinvite';

  // Make sure our push keys are set.
  if (!process.env.VAPID_EMAIL) {
    console.error('Environment variable VAPID_EMAIL not set.');
    process.exit(1);
  }
  if (!process.env.VAPID_PUBKEY) {
    console.error('Environment variable VAPID_PUBKEY not set.');
    process.exit(1);
  }
  if (!process.env.VAPID_PRIVKEY) {
    console.error('Environment variable VAPID_PRIVKEY not set.');
    process.exit(1);
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBKEY,
    process.env.VAPID_PRIVKEY
  );

  // Check early that the database works.
  const pool = initPool({ host: dbHost, user: dbUser, password: dbPassword, database });
  const res = await pool.query('SELECT $1::text as message', ['Hello OpenInvite!']);
  console.log('>> ' + res.rows[0].message);

  const app = express();
  // Rate limit to 30 reqs per minute
  app.use(rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.UPLOAD_DIR) {
    app.use(fileupload({
      limits: { fileSize: 16 * 1024 * 1024 * 1024 },
      /*useTempFiles: true,
      tempFileDir: '/tmp/',*/
      //safeFileNames: true,
      abortOnLimit: true,
    }));
    app.use('/uploads', express.static(process.env.UPLOAD_DIR, {
      fallthrough: false,
    }));
  } else {
    console.warn('UPLOAD_DIR not set; file uploading disabled.');
  }
  if (process.env.NODE_ENV === 'production') {
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'https://oi.parkovski.com');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
      next();
    });
  } else {
    app.use((req, res, next) => {
      if (req.headers.origin === 'http://localhost:5173') {
        res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
      } else if (req.headers.origin === 'https://dev.oi.parkovski.com') {
        res.header('Access-Control-Allow-Origin', 'https://dev.oi.parkovski.com');
      } else if (req.headers.origin === 'https://oi.parkovski.com') {
        res.header('Access-Control-Allow-Origin', 'https://oi.parkovski.com');
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
      next();
    });
  }

  app.get('/hello', hello);
  app.post('/authorize', authorize);
  app.post('/logout', logout);
  app.post('/register', register);

  app.get('/home', getHomeSummary);
  app.put('/push-endpoint', storePushEndpoint);
  app.get('/profile', getMyProfile);
  app.post('/profile/update', updateProfile);
  app.put('/profile/photo', uploadProfilePhoto);
  app.get('/user/:uid', getUserInfo);

  app.get('/settings/notifications', getNotificationSettings);
  app.put('/settings/notifications', setNotificationSetting);
  app.put('/settings/notifications/all', setAllNotificationSettings);
  app.post('/settings/password', changePassword);

  app.get('/groups', getGroups);
  app.get('/groups/:gid', getGroupInfo);
  app.get('/groups/:gid/requests', getGroupRequests);
  app.post('/groups/:gid/approve', approveGroupRequest);
  app.post('/groups/:gid/deny', denyGroupRequest);
  app.post('/groups/:gid/invite', inviteToGroup);
  app.post('/groups/:gid/makeadmin', makeGroupAdmin);
  app.post('/groups/:gid/join', joinGroup);
  app.post('/groups/:gid/leave', leaveGroup);
  app.post('/groups/:gid/delete', deleteGroup);
  app.get('/groups/:gid/chat', getGroupChat);
  app.get('/groups/:gid/events', getGroupEvents);
  app.get('/groupevents/:eid', getGroupEventInfo);
  app.post('/groupevents/:eid/setattendance', setGroupEventAttendance);
  app.post('/groups/:gid/newevent', newGroupEvent);
  app.post('/newgroup', newGroup);

  app.get('/contacts', getContacts);
  app.get('/contactrequests', getContactRequests);
  app.get('/contacts/:uid/exists', hasContact);
  app.post('/contacts/:uid/add', addContact);
  app.post('/contacts/:uid/remove', removeContact);
  app.post('/contacts/:uid/approve', approveContact);
  app.post('/contacts/:uid/deny', denyContact);

  app.get('/chat', getUserChatSummary);
  app.get('/chat/:uid', getUserChat);

  app.get('/events', getEvents);
  app.get('/events/:eid', getEventInfo);
  app.post('/events/:eid/setattendance', setEventAttendance);
  app.post('/events/:eid/invite', inviteToEvent);
  app.post('/events/:eid/makehost', makeEventHost);
  app.post('/events/:eid/comment', postEventComment);
  app.post('/newevent', newEvent);

  app.get('/search', search);

  const server = app.listen(port, () => {
    console.log('>> Server is listening on port ' + port);
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws, req) => {
      wss.emit('connection', ws, req);
    })
  });
  wss.on('connection', onWebSocketConnected);

  wslisten('chat', chatListen);
  wslisten('message_received', chatMessageReceived);
  wslisten('groupchat', groupChatListen);
  wslisten('group_message_received', groupMessageReceived);
}
