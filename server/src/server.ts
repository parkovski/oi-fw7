import express from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { onWebSocketConnected, listen as wslisten } from './wsserver.js';
import { initPool } from './db.js';
import {
  hello, getMyProfile, getUserInfo, authorize, logout, register, updateProfile,
} from './user.js';
import {
  getGroups, getGroupInfo, inviteToGroup, makeGroupAdmin, joinGroup,
  leaveGroup, newGroup, getGroupRequests, approveGroupRequest,
  denyGroupRequest, deleteGroup,
} from './group.js';
import {
  getContacts, getContactRequests, addContact, removeContact, approveContact,
  denyContact,
} from './contact.js';
import {
  chatListen, chatMessageReceived, getUserChat, getUserChatSummary,
} from './chat.js';
import {
  groupChatListen, groupMessageReceived, getGroupChat
} from './groupchat.js';
import {
  getEvents, getEventInfo, newEvent, setEventAttendance, inviteToEvent,
  makeEventHost,
} from './event.js';
import {
  getGroupEvents, getGroupEventInfo, newGroupEvent, setGroupEventAttendance,
} from './groupevent.js';

export default async function serve(port: number) {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'openinvite';
  const dbPassword = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'openinvite';

  // Check early that the database works.
  const pool = initPool({ host: dbHost, user: dbUser, password: dbPassword, database });
  const res = await pool.query('SELECT $1::text as message', ['Hello OpenInvite!']);
  console.log('>> ' + res.rows[0].message);

  const app = express();
  if (process.env.NODE_ENV === 'production') {
    // Rate limit to 30 reqs per minute in production.
    app.use(rateLimit({
      windowMs: 1 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }));
  }
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'production') {
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'https://oi.parkovski.com');
      res.header('Access-Control-Allow-Credentials', 'true');
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
      next();
    });
  }

  app.get('/hello', hello);
  app.get('/profile', getMyProfile);
  app.post('/profile/update', updateProfile);
  app.get('/user/:uid', getUserInfo);
  app.post('/authorize', authorize);
  app.post('/logout', logout);
  app.post('/register', register);

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
  app.post('/newevent', newEvent);

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
