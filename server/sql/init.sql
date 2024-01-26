-- vim: set ft=pgsql:

CREATE TABLE IF NOT EXISTS temp(
  key text NOT NULL,
  value text NOT NULL,
  modified timestamp without time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS temp_key_idx ON temp(key);

CREATE TABLE IF NOT EXISTS users(
  id bigserial PRIMARY KEY,
  username text NOT NULL,
  name text,
  email text,
  phone text,
  avatar_url text,
  pwhash text,
  verified boolean NOT NULL DEFAULT FALSE,
  public boolean NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS users_lower_idx ON users(lower(username));

CREATE TABLE IF NOT EXISTS sessions(
  uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client text NOT NULL,
  sesskey uuid NOT NULL PRIMARY KEY,
  last_used timestamp without time zone NOT NULL DEFAULT NOW(),
  push_endpoint text,
  key_p256dh text,
  key_auth text
);
CREATE INDEX IF NOT EXISTS sessions_uid_idx ON sessions(uid);

CREATE TABLE IF NOT EXISTS google_accounts(
  uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_id text NOT NULL,
  token jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS google_accounts_google_id_idx ON google_accounts(google_id);

CREATE TABLE IF NOT EXISTS microsoft_accounts(
  uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  microsoft_id text NOT NULL,
  token jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS microsoft_accounts_microsoft_id_idx ON microsoft_accounts(microsoft_id);

CREATE TABLE IF NOT EXISTS events(
  id bigserial PRIMARY KEY,
  gid bigint REFERENCES groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  place text,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  capacity integer,
  public boolean NOT NULL DEFAULT FALSE,
  cover_photo text,
  ts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || coalesce(place, '') || ' ' ||
      coalesce(description, ''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events USING GIN (ts);
CREATE INDEX IF NOT EXISTS events_gid_idx ON events(gid);

CREATE TABLE IF NOT EXISTS event_comments(
  id bigserial PRIMARY KEY,
  eid bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uid_from bigint REFERENCES users(id) ON DELETE SET NULL,
  sent timestamp without time zone NOT NULL DEFAULT NOW(),
  message text
);
CREATE INDEX IF NOT EXISTS event_comments_eid_idx ON event_comments(eid);

CREATE TABLE IF NOT EXISTS event_photos(
  id bigserial PRIMARY KEY,
  eid bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uid_from bigint REFERENCES users(id) ON DELETE SET NULL,
  sent timestamp without time zone NOT NULL DEFAULT NOW(),
  filename text NOT NULL
);
CREATE INDEX IF NOT EXISTS event_photos_eid_idx ON event_photos(eid);

CREATE TABLE IF NOT EXISTS contacts(
  uid_owner bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uid_contact bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind smallint NOT NULL,
  PRIMARY KEY (uid_owner, uid_contact)
);
CREATE INDEX IF NOT EXISTS contacts_uid_owner_idx ON contacts(uid_owner);
CREATE INDEX IF NOT EXISTS contacts_uid_contact_idx ON contacts(uid_contact);

CREATE TABLE IF NOT EXISTS attendance(
  uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eid bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind smallint NOT NULL,
  PRIMARY KEY (uid, eid)
);
CREATE INDEX IF NOT EXISTS attendance_uid_idx ON attendance(uid);
CREATE INDEX IF NOT EXISTS attendance_eid_idx ON attendance(eid);

CREATE TABLE IF NOT EXISTS groups(
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  description text,
  public boolean NOT NULL DEFAULT FALSE,
  ts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', name || ' ' || coalesce(description, ''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS groups_ts_idx ON groups USING GIN (ts);

CREATE TABLE IF NOT EXISTS groupmems(
  uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gid bigint NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  kind smallint NOT NULL,
  PRIMARY KEY (uid, gid)
);
CREATE INDEX IF NOT EXISTS groupmems_uid_idx on groupmems(uid);
CREATE INDEX IF NOT EXISTS groupmems_gid_idx on groupmems(gid);

CREATE TABLE IF NOT EXISTS user_messages(
  id bigserial PRIMARY KEY,
  uid_from bigint REFERENCES users(id),
  uid_to bigint REFERENCES users(id),
  sent timestamp without time zone NOT NULL DEFAULT NOW(),
  received timestamp without time zone,
  message text,
  reaction smallint
);
CREATE INDEX IF NOT EXISTS user_messages_uid_from_idx ON user_messages(uid_from);
CREATE INDEX IF NOT EXISTS user_messages_uid_to_idx ON user_messages(uid_to);

CREATE TABLE IF NOT EXISTS group_messages(
  id bigserial PRIMARY KEY,
  uid_from bigint REFERENCES users(id) ON DELETE SET NULL,
  gid_to bigint REFERENCES groups(id) ON DELETE CASCADE,
  sent timestamp without time zone NOT NULL DEFAULT NOW(),
  message text,
  reaction smallint
);
CREATE INDEX IF NOT EXISTS group_messages_gid_to_idx ON group_messages(gid_to);

CREATE TABLE IF NOT EXISTS group_messages_read(
  mid bigint REFERENCES group_messages(id) ON DELETE CASCADE,
  uid bigint REFERENCES users(id) ON DELETE CASCADE,
  "time" timestamp without time zone NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mid, uid)
);
CREATE INDEX IF NOT EXISTS group_messages_read_mid_idx ON group_messages_read(mid);

CREATE TABLE IF NOT EXISTS notification_settings(
  uid bigint NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  event_added boolean NOT NULL DEFAULT TRUE,
  event_responded boolean NOT NULL DEFAULT TRUE,
  event_commented boolean NOT NULL DEFAULT TRUE,
  event_attendance_changed boolean NOT NULL DEFAULT TRUE,
  chat boolean NOT NULL DEFAULT TRUE,
  groupchat boolean NOT NULL DEFAULT TRUE,
  contact_requested boolean NOT NULL DEFAULT TRUE,
  contact_added boolean NOT NULL DEFAULT TRUE,
  contact_request_approved boolean NOT NULL DEFAULT TRUE
);
