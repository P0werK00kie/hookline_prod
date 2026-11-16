/**
 * Copy an Appwrite Cloud project into the self-hosted Appwrite 1.4 stack.
 *
 * Copies, keeping every ID the same:
 *   - users (with password hashes when Cloud returns them), prefs, labels, status
 *   - databases, collections, attributes (incl. relationships), indexes
 *   - documents (with permissions); Cloud file URLs are rewritten to the local endpoint
 *   - storage buckets and files (with permissions)
 *
 * Not copied: sessions (users sign in again), platforms, API keys, teams,
 * functions. $createdAt/$updatedAt can't be set on Appwrite 1.4, so documents
 * are inserted and touched in their original order to keep feeds ordered.
 *
 * Safe to re-run: anything that already exists (409) is skipped.
 *
 * Usage:  cp .env.migrate.example .env.migrate   # fill it in
 *         npm run migrate
 */
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sdk from "node-appwrite";

const { Client, Databases, Storage, Users, Query, InputFile } = sdk;

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.migrate") });

// ----------------------------------------------------------------- config
function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env.migrate`);
    process.exit(1);
  }
  return v;
}
const trim = (s: string) => s.replace(/\/+$/, "");

const SRC_ENDPOINT = trim(need("SOURCE_ENDPOINT"));
const SRC_PROJECT = need("SOURCE_PROJECT_ID");
const DST_ENDPOINT = trim(need("TARGET_ENDPOINT"));
const DST_PROJECT = process.env.TARGET_PROJECT_ID || SRC_PROJECT;
const DST_PUBLIC_ENDPOINT = trim(
  process.env.TARGET_PUBLIC_ENDPOINT || DST_ENDPOINT,
);
const DST_STORAGE_LIMIT = Number(process.env.TARGET_STORAGE_LIMIT || 30000000);
const ONLY_DATABASES = (process.env.DATABASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ONLY_BUCKETS = (process.env.BUCKET_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SKIP_USERS = process.env.SKIP_USERS === "true";
const SKIP_FILES = process.env.SKIP_FILES === "true";

const mk = (endpoint: string, project: string, key: string) =>
  new Client().setEndpoint(endpoint).setProject(project).setKey(key);

const src = mk(SRC_ENDPOINT, SRC_PROJECT, need("SOURCE_API_KEY"));
const dst = mk(DST_ENDPOINT, DST_PROJECT, need("TARGET_API_KEY"));

const S = {
  db: new Databases(src),
  storage: new Storage(src),
  users: new Users(src),
};
const D = {
  db: new Databases(dst),
  storage: new Storage(dst),
  users: new Users(dst),
};

// ----------------------------------------------------------------- helpers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ifNew<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.code === 409) {
      console.log(`  = ${label} (already exists)`);
      return null;
    }
    throw new Error(`${label}: ${e?.message || e}`);
  }
}

/** Page through any Appwrite list endpoint using cursor pagination. */
async function listAll<T extends { $id: string }>(
  fetchPage: (queries: string[]) => Promise<any>,
  field: string,
  extra: string[] = [],
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const q = [...extra, Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const page = await fetchPage(q);
    const items: T[] = page[field];
    out.push(...items);
    if (items.length < 100) break;
    cursor = items[items.length - 1].$id;
  }
  return out;
}

/** Rewrite Cloud URLs (file previews, avatars) to the local Appwrite. */
function rewrite(value: any): any {
  if (typeof value === "string" && value.startsWith(SRC_ENDPOINT)) {
    let v = DST_PUBLIC_ENDPOINT + value.slice(SRC_ENDPOINT.length);
    if (DST_PROJECT !== SRC_PROJECT)
      v = v.replace(`project=${SRC_PROJECT}`, `project=${DST_PROJECT}`);
    return v;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  return value;
}

const stats = {
  users: 0,
  usersNoHash: 0,
  collections: 0,
  documents: 0,
  files: 0,
  skipped: 0,
};

// ----------------------------------------------------------------- users
async function migrateUsers() {
  console.log("\n▶ Users");
  const users = await listAll<any>((q) => S.users.list(q), "users");
  for (const u of users) {
    const email = u.email || undefined;
    const name = u.name || undefined;
    const hash: string | undefined = u.password || undefined;
    const opts: any = u.hashOptions || {};
    const created = await ifNew(`user ${u.$id}`, async () => {
      if (!hash) {
        stats.usersNoHash++;
        return D.users.create(u.$id, email, u.phone || undefined, undefined, name);
      }
      switch (u.hash) {
        case "argon2":
          return D.users.createArgon2User(u.$id, email, hash, name);
        case "bcrypt":
          return D.users.createBcryptUser(u.$id, email, hash, name);
        case "md5":
          return D.users.createMD5User(u.$id, email, hash, name);
        case "phpass":
          return D.users.createPHPassUser(u.$id, email, hash, name);
        case "sha":
          return D.users.createSHAUser(u.$id, email, hash, opts.version, name);
        case "scrypt":
          return D.users.createScryptUser(
            u.$id, email, hash, opts.salt, opts.costCpu, opts.costMemory,
            opts.costParallel, opts.length, name,
          );
        case "scryptMod":
          return D.users.createScryptModifiedUser(
            u.$id, email, hash, opts.salt, opts.saltSeparator, opts.signerKey, name,
          );
        default:
          stats.usersNoHash++;
          console.warn(`  ! user ${u.$id}: unknown hash "${u.hash}", created without password`);
          return D.users.create(u.$id, email, u.phone || undefined, undefined, name);
      }
    });
    if (!created) {
      stats.skipped++;
      continue;
    }
    if (u.phone) await D.users.updatePhone(u.$id, u.phone).catch(() => {});
    if (u.emailVerification) await D.users.updateEmailVerification(u.$id, true);
    if (u.phoneVerification) await D.users.updatePhoneVerification(u.$id, true);
    if (u.labels?.length) await D.users.updateLabels(u.$id, u.labels);
    if (u.prefs && Object.keys(u.prefs).length)
      await D.users.updatePrefs(u.$id, u.prefs);
    if (u.status === false) await D.users.updateStatus(u.$id, false);
    stats.users++;
    console.log(`  + ${u.email || u.$id}`);
  }
}

// ----------------------------------------------------------------- schema
async function createAttribute(dbId: string, colId: string, a: any) {
  const req = !!a.required;
  const def = req ? undefined : a.default ?? undefined;
  const arr = !!a.array;
  switch (a.type) {
    case "string":
      switch (a.format) {
        case "email":
          return D.db.createEmailAttribute(dbId, colId, a.key, req, def, arr);
        case "url":
          return D.db.createUrlAttribute(dbId, colId, a.key, req, def, arr);
        case "ip":
          return D.db.createIpAttribute(dbId, colId, a.key, req, def, arr);
        case "enum":
          return D.db.createEnumAttribute(dbId, colId, a.key, a.elements, req, def, arr);
        default:
          return D.db.createStringAttribute(dbId, colId, a.key, a.size, req, def, arr);
      }
    case "integer":
      return D.db.createIntegerAttribute(dbId, colId, a.key, req, a.min, a.max, def, arr);
    case "double":
      return D.db.createFloatAttribute(dbId, colId, a.key, req, a.min, a.max, def, arr);
    case "boolean":
      return D.db.createBooleanAttribute(dbId, colId, a.key, req, def, arr);
    case "datetime":
      return D.db.createDatetimeAttribute(dbId, colId, a.key, req, def, arr);
    case "relationship":
      return D.db.createRelationshipAttribute(
        dbId, colId, a.relatedCollection, a.relationType, !!a.twoWay, a.key,
        a.twoWayKey || undefined, a.onDelete,
      );
    default:
      throw new Error(`Unsupported attribute type ${a.type} (${colId}.${a.key})`);
  }
}

async function waitFor(
  what: string,
  check: () => Promise<{ status: string; key: string; error?: string }[]>,
) {
  for (let i = 0; i < 120; i++) {
    const items = await check();
    const failed = items.find((x) => x.status === "failed");
    if (failed) throw new Error(`${what} ${failed.key} failed: ${failed.error}`);
    if (items.every((x) => x.status === "available")) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

type Col = { $id: string; name: string; attrs: any[]; indexes: any[] };

async function migrateSchema(dbId: string): Promise<Col[]> {
  const db = await S.db.get(dbId);
  console.log(`\n▶ Database ${db.name} (${dbId})`);
  await ifNew(`database ${dbId}`, () => D.db.create(dbId, db.name, db.enabled));

  const raw = await listAll<any>((q) => S.db.listCollections(dbId, q), "collections");
  const cols: Col[] = [];
  for (const c of raw) {
    // A collection can hold at most a few dozen attributes; one page is enough.
    const attrs = (await S.db.listAttributes(dbId, c.$id, [Query.limit(100)])).attributes;
    const indexes = (await S.db.listIndexes(dbId, c.$id)).indexes;
    cols.push({ $id: c.$id, name: c.name, attrs, indexes });

    await ifNew(`collection ${c.name}`, () =>
      D.db.createCollection(dbId, c.$id, c.name, c.$permissions, c.documentSecurity, c.enabled),
    );
    stats.collections++;
    console.log(`  + collection ${c.name} (${c.$id})`);
  }

  // Plain attributes first, then relationships (both collections must exist).
  for (const pass of ["plain", "relationship"] as const) {
    for (const c of cols) {
      for (const a of c.attrs) {
        const isRel = a.type === "relationship";
        if ((pass === "plain") === isRel) continue;
        if (isRel && a.side !== "parent") continue; // created by the parent side
        await ifNew(`attribute ${c.name}.${a.key}`, () => createAttribute(dbId, c.$id, a));
      }
    }
    for (const c of cols) {
      await waitFor(`attribute in ${c.name}`, async () =>
        (await D.db.listAttributes(dbId, c.$id, [Query.limit(100)])).attributes as any,
      );
    }
  }
  console.log("  + attributes ready");

  for (const c of cols) {
    for (const idx of c.indexes) {
      await ifNew(`index ${c.name}.${idx.key}`, () =>
        D.db.createIndex(dbId, c.$id, idx.key, idx.type, idx.attributes, idx.orders),
      );
    }
    await waitFor(`index in ${c.name}`, async () =>
      (await D.db.listIndexes(dbId, c.$id)).indexes as any,
    );
  }
  console.log("  + indexes ready");
  return cols;
}

// ----------------------------------------------------------------- documents
const SYSTEM_KEYS = new Set([
  "$id", "$createdAt", "$updatedAt", "$permissions", "$collectionId", "$databaseId",
]);

const relId = (v: any) => (v && typeof v === "object" ? v.$id : v);

async function migrateDocuments(dbId: string, cols: Col[]) {
  const all: { col: Col; doc: any }[] = [];
  for (const c of cols) {
    const docs = await listAll<any>(
      (q) => S.db.listDocuments(dbId, c.$id, q),
      "documents",
    );
    docs.forEach((doc) => all.push({ col: c, doc }));
  }
  console.log(`\n▶ Documents (${all.length})`);

  const linksOf = (col: Col, doc: any) => {
    const data: Record<string, any> = {};
    for (const a of col.attrs) {
      if (a.type !== "relationship" || a.side !== "parent") continue;
      const v = doc[a.key];
      data[a.key] = Array.isArray(v) ? v.map(relId) : v == null ? null : relId(v);
    }
    return data;
  };
  const create = async (col: Col, doc: any, data: Record<string, any>) => {
    const ok = await ifNew(`document ${col.name}/${doc.$id}`, () =>
      D.db.createDocument(dbId, col.$id, doc.$id, data, doc.$permissions),
    );
    if (ok) stats.documents++;
    else stats.skipped++;
  };

  // Phase 1: scalar fields only, oldest first so $createdAt order is kept.
  // Documents with nothing but relationships (e.g. saves) wait until the
  // documents they point at exist, then are created with their links.
  all.sort((a, b) => a.doc.$createdAt.localeCompare(b.doc.$createdAt));
  const linkOnly: typeof all = [];
  for (const { col, doc } of all) {
    const data: Record<string, any> = {};
    for (const a of col.attrs) {
      if (a.type === "relationship" || SYSTEM_KEYS.has(a.key)) continue;
      if (a.key in doc) data[a.key] = rewrite(doc[a.key]);
    }
    if (!Object.keys(data).length) linkOnly.push({ col, doc });
    else await create(col, doc, data);
  }
  for (const { col, doc } of linkOnly) {
    const links = Object.fromEntries(
      Object.entries(linksOf(col, doc)).filter(([, v]) => v != null),
    );
    await create(col, doc, links);
  }
  console.log(`  + created ${stats.documents} documents`);

  // Phase 2: relationships, applied in $updatedAt order so feeds sorted by
  // $updatedAt come out in the same order as on Cloud.
  all.sort((a, b) => a.doc.$updatedAt.localeCompare(b.doc.$updatedAt));
  let linked = 0;
  for (const { col, doc } of all) {
    const data = linksOf(col, doc);
    if (!Object.keys(data).length) {
      // touch the doc so $updatedAt ordering still matches the source
      const k = col.attrs.find((a) => a.type !== "relationship" && a.key in doc)?.key;
      if (!k) continue;
      data[k] = rewrite(doc[k]);
    }
    try {
      await D.db.updateDocument(dbId, col.$id, doc.$id, data);
      linked++;
    } catch (e: any) {
      console.warn(`  ! link ${col.name}/${doc.$id}: ${e?.message || e}`);
    }
  }
  console.log(`  + linked/ordered ${linked} documents`);
}

// ----------------------------------------------------------------- storage
async function migrateStorage() {
  const buckets = await listAll<any>((q) => S.storage.listBuckets(q), "buckets");
  for (const b of buckets) {
    if (ONLY_BUCKETS.length && !ONLY_BUCKETS.includes(b.$id)) continue;
    console.log(`\n▶ Bucket ${b.name} (${b.$id})`);
    await ifNew(`bucket ${b.$id}`, () =>
      D.storage.createBucket(
        b.$id, b.name, b.$permissions, b.fileSecurity, b.enabled,
        Math.min(b.maximumFileSize, DST_STORAGE_LIMIT),
        b.allowedFileExtensions, b.compression, b.encryption, false,
      ),
    );
    if (SKIP_FILES) continue;

    const files = await listAll<any>((q) => S.storage.listFiles(b.$id, q), "files");
    files.sort((x, y) => x.$createdAt.localeCompare(y.$createdAt));
    for (const f of files) {
      const exists = await D.storage.getFile(b.$id, f.$id).then(() => true, () => false);
      if (exists) {
        stats.skipped++;
        continue;
      }
      const buf = Buffer.from(await S.storage.getFileDownload(b.$id, f.$id));
      await D.storage.createFile(b.$id, f.$id, InputFile.fromBuffer(buf, f.name), f.$permissions);
      stats.files++;
      console.log(`  + ${f.name} (${(f.sizeOriginal / 1024).toFixed(0)} KB)`);
    }
  }
}

// ----------------------------------------------------------------- main
async function main() {
  console.log(`Source: ${SRC_ENDPOINT} (project ${SRC_PROJECT})`);
  console.log(`Target: ${DST_ENDPOINT} (project ${DST_PROJECT})`);
  console.log(`URLs rewritten to: ${DST_PUBLIC_ENDPOINT}`);

  if (!SKIP_USERS) await migrateUsers();

  const dbs = await listAll<any>((q) => S.db.list(q), "databases");
  for (const db of dbs) {
    if (ONLY_DATABASES.length && !ONLY_DATABASES.includes(db.$id)) continue;
    const cols = await migrateSchema(db.$id);
    await migrateDocuments(db.$id, cols);
  }

  await migrateStorage();

  console.log("\n✔ Migration finished");
  console.log(`  users: ${stats.users} (without password hash: ${stats.usersNoHash})`);
  console.log(`  collections: ${stats.collections}, documents: ${stats.documents}, files: ${stats.files}`);
  console.log(`  already present / skipped: ${stats.skipped}`);
  if (stats.usersNoHash)
    console.log("  Users without a hash need a password reset (configure SMTP) or a new password set in the console.");
}

main().catch((e) => {
  console.error("\n✖ Migration failed:", e?.message || e);
  process.exit(1);
});
