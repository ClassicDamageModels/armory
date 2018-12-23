DROP TABLE IF EXISTS uploader CASCADE;
DROP TABLE IF EXISTS realm CASCADE;
DROP TABLE IF EXISTS guild CASCADE;
DROP TABLE IF EXISTS character CASCADE;
DROP TABLE IF EXISTS itemslot CASCADE;
DROP TABLE IF EXISTS queue CASCADE;

CREATE TABLE uploader (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  api_key    text NOT NULL,

  UNIQUE(api_key)
);

CREATE TABLE realm (
  id        serial PRIMARY KEY,
  name      text NOT NULL,

  UNIQUE(name)
);

CREATE TABLE guild (
  id        serial PRIMARY KEY,
  name      text NOT NULL,
  realm_id  integer REFERENCES realm,

  UNIQUE(name, realm_id)
);

CREATE TABLE character (
  id            serial PRIMARY KEY,
  realm_id      integer REFERENCES realm,
  name          text NOT NULL,
  level         integer NOT NULL,
  race          text NOT NULL,
  class         text NOT NULL,
  sex           text NOT NULL,
  guild_id      integer REFERENCES guild,
  guild_rank    integer NOT NULL,
  inspected_at  timestamp NOT NULL,
  seen_by       integer REFERENCES uploader,

  UNIQUE (name, realm_id)
);

CREATE TABLE itemslot (
  id            serial PRIMARY KEY,
  character_id  integer REFERENCES character,
  slot          text NOT NULL,
  item          integer NOT NULL,
  enchant       integer NOT NULL,
  gem1          integer NOT NULL,
  gem2          integer NOT NULL,
  gem3          integer NOT NULL,

  UNIQUE(slot, character_id)
);

CREATE TABLE queue (
  id            serial PRIMARY KEY,
  uploader_id   integer REFERENCES uploader,
  filename      text NOT NULL,
  checksum      text NOT NULL,
  created_at    timestamp,
  processed_at  timestamp,

  UNIQUE(filename, checksum)
);

-- slot:item:enchant:gem1:gem2:gem3:jotain
-- 10:28507:2937:2728:2728:0:0:0:0,
