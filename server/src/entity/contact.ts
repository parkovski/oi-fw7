import type { Request, Response } from 'express';
import { getPool, getUserId } from '../util/db.js';
import { handleError } from '../util/error.js';
import { validateUuid, validateNumeric } from '../util/validation.js';
import { ContactKind, User, ContactData } from 'oi-types/user';

export async function getContacts(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);

    const contactResult = await client.query<User>(
      `
      SELECT users.id, users.name, users.username, contacts.kind
      FROM contacts
      INNER JOIN users ON contacts.uid_contact = users.id
      WHERE contacts.uid_owner = $1
      `,
      [myUid]
    );
    const response: ContactData = {
      contacts: [],
      followers: [],
      pending: [],
    };
    contactResult.rows.forEach(row => {
      if (row.kind === ContactKind.Requested) {
        response.pending.push(row);
      } else {
        response.contacts.push(row);
      }
    });

    const followersResult = await client.query<User>(
      `
      SELECT users.id, users.name, users.username
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = $1
      `,
      [myUid]
    );
    followersResult.rows.forEach(row => response.followers.push(row));

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
    const session = validateUuid(req.cookies.session, 401);

    client = await getPool().connect();

    const contactResult = await client.query<User>(
      `
      SELECT users.id, users.name, users.username
      FROM contacts
      INNER JOIN users ON contacts.uid_owner = users.id
      WHERE contacts.uid_contact = (SELECT uid FROM sessions WHERE sesskey = $1)
        AND contacts.kind = 0
      `,
      [session]
    );
    res.json(contactResult.rows);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function hasContact(req: Request, res: Response) {
  try {
    const session = validateUuid(req.cookies.session, 401);
    const uidTo = validateNumeric(req.params.uid);
    const contactResult = await getPool().query<{ kind: ContactKind }>(
      `
      SELECT kind FROM contacts
      WHERE (uid_owner, uid_contact) = ((SELECT uid FROM sessions WHERE sesskey = $1), $2)
      `,
      [session, uidTo]
    );
    if (contactResult.rowCount === 0 || contactResult.rows[0].kind === ContactKind.Requested) {
      res.write('false');
    } else {
      res.write('true');
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    res.end();
  }
}

export async function addContact(req: Request, res: Response) {
  let client;

  try {
    const session = validateUuid(req.cookies.session, 401);
    const contactUid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const myUid = await getUserId(client, session);
    if (BigInt(contactUid) === BigInt(myUid)) {
      res.status(400).write('Can\'t add self as a contact');
      return;
    }

    const userPublicResult = await client.query<{ public: boolean }>(
      `SELECT public FROM users WHERE id = $1`,
      [contactUid]
    );
    if (userPublicResult.rowCount === 0) {
      res.status(404);
      return;
    }
    const contactKind = userPublicResult.rows[0].public
      ? ContactKind.Approved
      : ContactKind.Requested;

    await client.query(
      `
      INSERT INTO contacts (uid_owner, uid_contact, kind)
      VALUES ($1, $2, $3)
      `,
      [myUid, contactUid, contactKind]
    );
    if (contactKind === ContactKind.Requested) {
      res.end('requested');
    } else {
      res.end('approved');
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
    const session = validateUuid(req.cookies.session, 401);
    const contactUid = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const deleteContactResult = await client.query(
      `
      DELETE FROM contacts
      WHERE uid_owner = (SELECT uid FROM sessions WHERE sesskey = $1)
        AND uid_contact = $2
      `,
      [session, contactUid]
    );
    if (deleteContactResult.rowCount === 0) {
      res.status(404);
    }
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
    const session = validateUuid(req.cookies.session, 401);
    const uidOwner = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const updateContactResult = await client.query(
      `
      UPDATE contacts SET kind = 1
      WHERE (uid_owner, uid_contact) = ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
      `,
      [uidOwner, session]
    );
    if (updateContactResult.rowCount === 0) {
      res.status(404);
    }
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
    const session = validateUuid(req.cookies.session, 401);
    const uidOwner = validateNumeric(req.params.uid);

    client = await getPool().connect();

    const deleteContactResult = await client.query(
      `
      DELETE FROM contacts
      WHERE (uid_owner, uid_contact) = ($1, (SELECT uid FROM sessions WHERE sesskey = $2))
      `,
      [uidOwner, session]
    );
    if (deleteContactResult.rowCount === 0) {
      res.status(404);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}
