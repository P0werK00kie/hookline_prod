// Collections owned by the "For Writers" features. Created on API startup if
// missing (idempotent), so a fresh Portainer deploy needs no manual setup.
import sdk from "node-appwrite";
import { CHAPTERS, ITEMS } from "./seed.mjs";

const { Permission: P, Role: R, Query, ID } = sdk;

export const COLLECTIONS = {
  writerProfiles: "writer_profiles",
  writerContacts: "writer_contacts",
  connections: "connections",
  guideChapters: "guide_chapters",
  guideItems: "guide_items",
};

export const ROLES = ["admin", "writer", "singer"];
export const GUIDE_SECTIONS = [
  "guild",
  "video",
  "distribution",
  "resource",
  "writing_group",
  "forum",
  "attorney",
];

const writer = R.label("writer");
const admin = R.label("admin");

// type, key, ...args   (args follow the node-appwrite 11 signatures)
const str = (key, size, required = false, def, array = false) => ({ t: "string", key, size, required, def, array });
const int = (key, required = false, min, max, def) => ({ t: "integer", key, required, min, max, def });
const bool = (key, required = false, def) => ({ t: "boolean", key, required, def });
const date = (key, required = false) => ({ t: "datetime", key, required });
const enm = (key, elements, required = false, def) => ({ t: "enum", key, elements, required, def });

const SPEC = [
  {
    id: COLLECTIONS.writerProfiles,
    name: "Writer profiles",
    documentSecurity: true, // owners edit their own listing
    permissions: [
      P.read(writer), P.read(admin),
      P.create(writer), P.create(admin),
      P.update(admin), P.delete(admin),
    ],
    attributes: [
      str("accountId", 36, true),
      str("userId", 36, true),
      str("name", 128, true),
      str("username", 64),
      str("imageUrl", 2000),
      str("genres", 32, false, undefined, true),
      str("lookingFor", 500),
      str("about", 2000),
      str("workStyle", 500),
      str("location", 128),
      bool("listed", false, true),
      date("agreedAt", true),
    ],
    indexes: [
      { key: "by_account", type: "unique", attributes: ["accountId"] },
      { key: "by_listed", type: "key", attributes: ["listed"] },
    ],
  },
  {
    id: COLLECTIONS.writerContacts,
    name: "Writer contacts (private)",
    documentSecurity: true, // only the owner can read; shared via the API on accept
    permissions: [P.create(writer), P.create(admin)],
    attributes: [str("accountId", 36, true), str("contact", 500, true)],
    indexes: [{ key: "by_account", type: "unique", attributes: ["accountId"] }],
  },
  {
    id: COLLECTIONS.connections,
    name: "Writer connections",
    documentSecurity: true, // per-document read for both writers, set by the API
    permissions: [P.read(admin)],
    attributes: [
      str("fromAccountId", 36, true),
      str("toAccountId", 36, true),
      str("fromName", 128),
      str("toName", 128),
      str("fromUserId", 36),
      str("toUserId", 36),
      str("note", 500),
      enm("status", ["pending", "accepted", "declined"], false, "pending"),
      str("fromContact", 500),
      str("toContact", 500),
      date("respondedAt"),
    ],
    indexes: [
      { key: "by_from", type: "key", attributes: ["fromAccountId"] },
      { key: "by_to", type: "key", attributes: ["toAccountId"] },
    ],
  },
  {
    id: COLLECTIONS.guideChapters,
    name: "Guide chapters",
    documentSecurity: false,
    permissions: [
      P.read(writer), P.read(admin),
      P.create(admin), P.update(admin), P.delete(admin),
    ],
    attributes: [
      int("position", false, 0, 10000, 0),
      str("title", 200, true),
      str("summary", 500),
      str("body", 20000),
      str("videoUrl", 2000),
      bool("published", false, true),
    ],
    indexes: [{ key: "by_position", type: "key", attributes: ["position"] }],
  },
  {
    id: COLLECTIONS.guideItems,
    name: "Guide & resource items",
    documentSecurity: false,
    permissions: [
      P.read(writer), P.read(admin),
      P.create(admin), P.update(admin), P.delete(admin),
    ],
    attributes: [
      enm("section", GUIDE_SECTIONS, true),
      str("title", 200, true),
      str("description", 1000),
      str("url", 2000),
      str("area", 128),
      int("position", false, 0, 10000, 0),
      bool("published", false, true),
    ],
    indexes: [{ key: "by_section", type: "key", attributes: ["section", "position"] }],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ignore409(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e?.code === 409) return null;
    throw e;
  }
}

async function createAttribute(db, dbId, colId, a) {
  const def = a.required ? undefined : a.def;
  switch (a.t) {
    case "string":
      return db.createStringAttribute(dbId, colId, a.key, a.size, a.required, def, a.array);
    case "integer":
      return db.createIntegerAttribute(dbId, colId, a.key, a.required, a.min, a.max, def);
    case "boolean":
      return db.createBooleanAttribute(dbId, colId, a.key, a.required, def);
    case "datetime":
      return db.createDatetimeAttribute(dbId, colId, a.key, a.required, def);
    case "enum":
      return db.createEnumAttribute(dbId, colId, a.key, a.elements, a.required, def);
  }
}

async function waitAvailable(list) {
  for (let i = 0; i < 120; i++) {
    const items = await list();
    const failed = items.find((x) => x.status === "failed");
    if (failed) throw new Error(`${failed.key} failed: ${failed.error}`);
    if (items.every((x) => x.status === "available")) return;
    await sleep(500);
  }
  throw new Error("timed out waiting for attributes/indexes");
}

export async function ensureSchema(db, dbId, log = console.log) {
  // A fresh install has no database yet (the Cloud migration creates it otherwise).
  if (await ignore409(() => db.create(dbId, "Hook Line and Music", true)))
    log(`schema: created database ${dbId}`);
  for (const c of SPEC) {
    const created = await ignore409(() =>
      db.createCollection(dbId, c.id, c.name, c.permissions, c.documentSecurity, true),
    );
    if (!created) {
      // keep permissions in sync with the spec on every start
      await db.updateCollection(dbId, c.id, c.name, c.permissions, c.documentSecurity, true);
    } else {
      log(`schema: created collection ${c.id}`);
    }
    for (const a of c.attributes) await ignore409(() => createAttribute(db, dbId, c.id, a));
    await waitAvailable(async () =>
      (await db.listAttributes(dbId, c.id, [Query.limit(100)])).attributes,
    );
    for (const idx of c.indexes)
      await ignore409(() => db.createIndex(dbId, c.id, idx.key, idx.type, idx.attributes));
    await waitAvailable(async () => (await db.listIndexes(dbId, c.id)).indexes);
  }
  await seed(db, dbId, log);
}

/** Starter guide content, only written into empty collections. */
async function seed(db, dbId, log) {
  const chapters = await db.listDocuments(dbId, COLLECTIONS.guideChapters, [Query.limit(1)]);
  if (chapters.total === 0) {
    for (const [i, ch] of CHAPTERS.entries())
      await db.createDocument(dbId, COLLECTIONS.guideChapters, ID.unique(), {
        ...ch,
        position: i + 1,
        published: true,
      });
    log(`schema: seeded ${CHAPTERS.length} guide chapters`);
  }
  const items = await db.listDocuments(dbId, COLLECTIONS.guideItems, [Query.limit(1)]);
  if (items.total === 0) {
    for (const [i, it] of ITEMS.entries())
      await db.createDocument(dbId, COLLECTIONS.guideItems, ID.unique(), {
        ...it,
        position: i + 1,
        published: true,
      });
    log(`schema: seeded ${ITEMS.length} guide items`);
  }
}
