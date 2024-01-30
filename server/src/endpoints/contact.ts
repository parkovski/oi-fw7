import type { Request, Response } from 'express';
import { getPool, getNotificationSetting } from '../util/db.js';
import { handleError } from '../util/error.js';
import { validateUuid, validateNumeric } from '../util/validation.js';
import wsclients from '../server/wsclients.js';
import { ContactKind, ContactData } from 'oi-types/user';
import {
  ContactRequestedMessage, ContactRequestApprovedMessage, ContactAddedMessage,
} from 'oi-types/message';
import UserModel from '../models/user.js';
import SessionModel from '../models/session.js';
import SettingsModel from '../models/settings.js';

export async function getContacts(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, session).getUserId();

    const user = new UserModel(client, myUid);
    const [contacts, followers] = await Promise.all([
      user.getContacts(),
      user.getFollowers(),
    ]);

    const response: ContactData = {
      contacts: [],
      followers: [],
      pending: [],
    };
    contacts.forEach(contact => {
      if (contact.kind === ContactKind.Requested) {
        response.pending.push(contact);
      } else {
        response.contacts.push(contact);
      }
    });
    followers.forEach(follower => response.followers.push(follower));

    res.json(response);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getContactRequests(req: Request, res: Response) {
  let client;

  try {
    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    const contacts = await new UserModel(client, myUid).getContactRequests();
    res.json(contacts);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function hasContact(req: Request, res: Response) {
  let client;
  try {
    const uidContact = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    if (await new UserModel(client, myUid).hasContact(uidContact)) {
      res.write('true');
    } else {
      res.write('false');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function addContact(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const contactUid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, session).getUserId();
    if (BigInt(contactUid) === BigInt(myUid)) {
      res.status(400).write('Can\'t add self as a contact');
      return;
    }

    const user = new UserModel(client, myUid);
    const { name, public: isPublic } = await new UserModel(client, contactUid).getNameAndPublic();
    const contactKind = isPublic
      ? ContactKind.Approved
      : ContactKind.Requested;

    await user.addContact(contactUid, contactKind);
    if (contactKind === ContactKind.Requested) {
      res.end('requested');
      const setting =
        await new SettingsModel(client).getNotificationSetting(contactUid, 'contact_requested');
      wsclients.sendWsAndPush<ContactRequestedMessage>(contactUid, {
        m: 'contact_requested',
        id: myUid,
        name,
      }, setting);
    } else {
      res.end('approved');
      const setting =
        await new SettingsModel(client).getNotificationSetting(contactUid, 'contact_added');
      wsclients.sendWsAndPush<ContactAddedMessage>(contactUid, {
        m: 'contact_added',
        id: myUid,
        name,
      }, setting);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function removeContact(req: Request, res: Response) {
  let client;

  try {
    const contactUid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    await new UserModel(client, myUid).deleteContact(contactUid);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function approveContact(req: Request, res: Response) {
  let client;

  try {
    const uidOwner = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    const { uid_contact, name } = await new UserModel(client, myUid).approveContact(uidOwner);
    const setting = await new SettingsModel(client).getNotificationSetting(
      uidOwner, 'contact_request_approved'
    );
    const message: ContactRequestApprovedMessage = {
      m: 'contact_request_approved',
      id: uid_contact,
      name: name,
    };
    wsclients.sendWsAndPush(uidOwner, message, setting);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function denyContact(req: Request, res: Response) {
  let client;

  try {
    const uidOwner = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    await new UserModel(client, myUid).denyContact(uidOwner);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}
