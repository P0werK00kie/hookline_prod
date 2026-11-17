// hookline-api: the few operations the browser can't do itself.
//
//   GET  /api/health
//   GET  /api/me                        -> { roles }
//   POST /api/me/role   {role}          self-select "writer" or "singer"
//   GET  /api/admin/users?search=&cursor=          (admin)
//   PUT  /api/admin/users/:id/roles {roles: []}    (admin)
//   POST /api/connections {toAccountId, note}      (writer/admin)
//   POST /api/connections {songId, note}           (any member: "Connect with Writer")
//   POST /api/connections/:id/respond {accept}     (recipient)
//   POST /api/songs/:id/listen                     -> { url, expiresAt } (counts a play)
//   GET  /api/audio/:token                         streams audio (Range supported)
//   POST /api/requests/:id/submissions {songId, note}   (writer/admin, song owner)
//   PATCH /api/submissions/:id {status}            (request poster)
//
// Callers authenticate with an Appwrite JWT (account.createJWT()) in the
// X-Appwrite-JWT header. Roles are Appwrite user labels.
import http from "node:http";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import sdk from "node-appwrite";
import { BUCKETS, COLLECTIONS, ROLES, ensureBuckets, ensureSchema } from "./schema.mjs";

const { Client, Account, Databases, Storage, Users, Permission: P, Role: R, Query, ID } = sdk;

// ----------------------------------------------------------------- config
const ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://appwrite/v1";
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB = process.env.APPWRITE_DATABASE_ID;
const PORT = Number(process.env.PORT || 3000);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const SELF_ROLES = ["writer", "singer"];
const USER_COLLECTION = process.env.APPWRITE_USER_COLLECTION_ID || "";
const STORAGE_LIMIT = Number(process.env.APPWRITE_STORAGE_LIMIT || 30000000);
// Signs short-lived audio links. Random per start unless set, so links simply
// expire on restart.
const AUDIO_SECRET = process.env.AUDIO_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const AUDIO_TTL_MS = 60 * 60 * 1000;

const missing = ["APPWRITE_PROJECT_ID", "APPWRITE_API_KEY", "APPWRITE_DATABASE_ID"].filter(
  (k) => !process.env[k],
);

const server = new Client().setEndpoint(ENDPOINT).setProject(PROJECT || "").setKey(API_KEY || "");
const db = new Databases(server);
const users = new Users(server);
const storage = new Storage(server);

let ready = false;
let lastSchemaError = missing.length ? `missing env: ${missing.join(", ")}` : "starting";

// ----------------------------------------------------------------- http helpers
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw new HttpError(413, "Body too large");
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

/** Verify the caller's JWT and return their Appwrite account. */
async function caller(req) {
  const jwt = req.headers["x-appwrite-jwt"];
  if (!jwt) throw new HttpError(401, "Missing X-Appwrite-JWT");
  const c = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setJWT(String(jwt));
  let me;
  try {
    me = await new Account(c).get();
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }
  // Bootstrap admins from ADMIN_EMAILS.
  if (ADMIN_EMAILS.includes((me.email || "").toLowerCase()) && !me.labels.includes("admin")) {
    me.labels = [...new Set([...me.labels, "admin"])];
    await users.updateLabels(me.$id, me.labels);
    console.log(`roles: bootstrapped admin ${me.$id}`);
  }
  return me;
}

const hasRole = (me, ...roles) => roles.some((r) => me.labels.includes(r));
const cleanRoles = (labels) => labels.filter((l) => ROLES.includes(l));

// ----------------------------------------------------------------- handlers
async function getMe(req) {
  const me = await caller(req);
  return { id: me.$id, roles: cleanRoles(me.labels) };
}

async function setMyRole(req) {
  const me = await caller(req);
  const { role } = await readJson(req);
  if (!SELF_ROLES.includes(role)) throw new HttpError(400, `role must be one of ${SELF_ROLES.join(", ")}`);
  const labels = [...new Set([...me.labels, role])];
  await users.updateLabels(me.$id, labels);
  return { id: me.$id, roles: cleanRoles(labels) };
}

async function listUsers(req, url) {
  const me = await caller(req);
  if (!hasRole(me, "admin")) throw new HttpError(403, "Admins only");
  const queries = [Query.limit(25), Query.orderDesc("$createdAt")];
  const cursor = url.searchParams.get("cursor");
  if (cursor) queries.push(Query.cursorAfter(cursor));
  const search = url.searchParams.get("search")?.trim() || undefined;
  const page = await users.list(queries, search);
  return {
    total: page.total,
    users: page.users.map((u) => ({
      id: u.$id,
      name: u.name,
      email: u.email,
      createdAt: u.$createdAt,
      status: u.status,
      roles: cleanRoles(u.labels),
    })),
  };
}

async function setUserRoles(req, userId) {
  const me = await caller(req);
  if (!hasRole(me, "admin")) throw new HttpError(403, "Admins only");
  const { roles } = await readJson(req);
  if (!Array.isArray(roles) || roles.some((r) => !ROLES.includes(r)))
    throw new HttpError(400, `roles must be a list drawn from ${ROLES.join(", ")}`);
  if (userId === me.$id && !roles.includes("admin"))
    throw new HttpError(400, "You can't remove your own admin role");
  const target = await users.get(userId).catch(() => null);
  if (!target) throw new HttpError(404, "User not found");
  // keep any non-role labels that might be used elsewhere
  const labels = [...new Set([...target.labels.filter((l) => !ROLES.includes(l)), ...roles])];
  await users.updateLabels(userId, labels);
  console.log(`roles: ${me.$id} set ${userId} -> [${roles.join(",")}]`);
  return { id: userId, roles: cleanRoles(labels) };
}

async function profileOf(accountId) {
  return db.getDocument(DB, COLLECTIONS.writerProfiles, accountId).catch(() => null);
}

/** Writer contact details if set, otherwise the account email. */
async function contactOf(accountId) {
  const doc = await db.getDocument(DB, COLLECTIONS.writerContacts, accountId).catch(() => null);
  if (doc?.contact) return doc.contact;
  const account = await users.get(accountId).catch(() => null);
  return account?.email || "";
}

/** The caller's document in the app's users collection (for profile links). */
async function userDocOf(accountId) {
  if (!USER_COLLECTION) return null;
  const res = await db
    .listDocuments(DB, USER_COLLECTION, [Query.equal("accountId", accountId), Query.limit(1)])
    .catch(() => null);
  return res?.documents[0] || null;
}

/** Name + profile link for anyone: writer listing first, then their user doc. */
async function identityOf(me) {
  const [profile, userDoc] = await Promise.all([profileOf(me.$id), userDocOf(me.$id)]);
  return {
    name: profile?.name || userDoc?.name || me.name || me.email,
    userId: profile?.userId || userDoc?.$id || "",
    hasListing: !!profile,
  };
}

async function songOf(id) {
  return db.getDocument(DB, COLLECTIONS.songs, id).catch(() => null);
}

async function createConnection(req) {
  const me = await caller(req);
  const { toAccountId: rawTo, songId, note = "" } = await readJson(req);
  if (typeof note !== "string" || note.length > 500) throw new HttpError(400, "Note must be 500 characters or fewer");

  // "Connect with Writer" from a song: open to every signed-in member.
  // Writer-to-writer (Writers Block): writers with a listing only.
  let toAccountId = rawTo;
  let song = null;
  if (songId) {
    song = await songOf(String(songId));
    // Same rule as playback: published, or submitted to one of the caller's postings.
    if (!song || !(await canListen(me, song))) throw new HttpError(404, "Song not found");
    toAccountId = song.ownerAccountId;
  } else if (!hasRole(me, "writer", "admin")) {
    throw new HttpError(403, "Writers only");
  }
  if (typeof toAccountId !== "string" || !toAccountId) throw new HttpError(400, "toAccountId or songId is required");
  if (toAccountId === me.$id) throw new HttpError(400, "You can't connect with yourself");

  const from = await identityOf(me);
  let toName, toUserId;
  if (song) {
    toName = song.writerName;
    toUserId = song.ownerUserId;
  } else {
    if (!from.hasListing) throw new HttpError(400, "List your name in Writers Block before connecting");
    const to = await profileOf(toAccountId);
    if (!to || !to.listed) throw new HttpError(404, "That writer isn't listed");
    toName = to.name;
    toUserId = to.userId;
  }

  // One open/accepted connection per pair, in either direction.
  const existing = await db.listDocuments(DB, COLLECTIONS.connections, [
    Query.equal("fromAccountId", [me.$id, toAccountId]),
    Query.equal("toAccountId", [me.$id, toAccountId]),
    Query.notEqual("status", "declined"),
    Query.limit(5),
  ]);
  if (existing.total > 0)
    throw new HttpError(409, "You already have a connection or pending request with this writer");

  return db.createDocument(
    DB,
    COLLECTIONS.connections,
    ID.unique(),
    {
      fromAccountId: me.$id,
      toAccountId,
      fromName: from.name,
      toName,
      fromUserId: from.userId,
      toUserId,
      note: note.trim(),
      status: "pending",
      songId: song?.$id || "",
      songTitle: song?.title || "",
    },
    [
      P.read(R.user(me.$id)),
      P.read(R.user(toAccountId)),
      P.delete(R.user(me.$id)), // sender can withdraw
      P.read(R.label("admin")),
      P.delete(R.label("admin")),
    ],
  );
}

async function respondConnection(req, id) {
  const me = await caller(req);
  const { accept } = await readJson(req);
  const doc = await db.getDocument(DB, COLLECTIONS.connections, id).catch(() => null);
  if (!doc || doc.toAccountId !== me.$id) throw new HttpError(404, "Request not found");
  if (doc.status !== "pending") throw new HttpError(409, `Request is already ${doc.status}`);

  const data = { status: accept ? "accepted" : "declined", respondedAt: new Date().toISOString() };
  if (accept) {
    // Contact details are shared only once the request is accepted.
    const [fromContact, toContact] = await Promise.all([contactOf(doc.fromAccountId), contactOf(doc.toAccountId)]);
    Object.assign(data, { fromContact, toContact });
  }
  return db.updateDocument(DB, COLLECTIONS.connections, id, data);
}

// ----------------------------------------------------------------- songs / audio
async function canListen(me, song) {
  if (song.published || song.ownerAccountId === me.$id || hasRole(me, "admin")) return true;
  // A Hook Me poster can hear unpublished songs submitted to their requests.
  const subs = await db.listDocuments(DB, COLLECTIONS.submissions, [
    Query.equal("songId", song.$id),
    Query.equal("posterAccountId", me.$id),
    Query.limit(1),
  ]);
  return subs.total > 0;
}

const sign = (payload) =>
  crypto.createHmac("sha256", AUDIO_SECRET).update(payload).digest("base64url");

async function listen(req, songId) {
  const me = await caller(req);
  const song = await songOf(songId);
  if (!song || !(await canListen(me, song))) throw new HttpError(404, "Song not found");
  // Future paywall: check the caller has paid for this song here.
  if (song.ownerAccountId !== me.$id)
    await db
      .updateDocument(DB, COLLECTIONS.songs, song.$id, { plays: (song.plays || 0) + 1 })
      .catch((e) => console.error("play count:", e?.message));
  const expires = Date.now() + AUDIO_TTL_MS;
  const payload = `${song.audioFileId}.${expires}`;
  return { url: `/api/audio/${payload}.${sign(payload)}`, expiresAt: new Date(expires).toISOString() };
}

async function streamAudio(req, res, token) {
  const [fileId, expires, sig] = token.split(".");
  const payload = `${fileId}.${expires}`;
  const expected = sign(payload);
  if (
    !fileId || !sig || sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ||
    Number(expires) < Date.now()
  )
    throw new HttpError(403, "This link has expired. Press play again.");

  // Appwrite's /view labels audio as text/plain, so use /download and send the
  // file's real MIME type ourselves.
  const file = await storage.getFile(BUCKETS.songs, fileId).catch(() => null);
  if (!file) throw new HttpError(404, "Audio not available");

  const headers = { "x-appwrite-project": PROJECT, "x-appwrite-key": API_KEY };
  if (req.headers.range) headers.range = req.headers.range;
  const upstream = await fetch(`${ENDPOINT}/storage/buckets/${BUCKETS.songs}/files/${fileId}/download`, { headers });
  if (!upstream.ok) {
    await upstream.body?.cancel();
    throw new HttpError(upstream.status === 416 ? 416 : 404, "Audio not available");
  }

  const out = {
    "content-type": file.mimeType || "application/octet-stream",
    "content-disposition": "inline",
    "cache-control": "private, max-age=3600",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  };
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) out[h] = v;
  }
  res.writeHead(upstream.status, out);
  Readable.fromWeb(upstream.body).pipe(res);
}

// ----------------------------------------------------------------- hook me
async function submitToRequest(req, requestId) {
  const me = await caller(req);
  if (!hasRole(me, "writer", "admin")) throw new HttpError(403, "Writers only");
  const { songId, note = "" } = await readJson(req);
  if (typeof note !== "string" || note.length > 500) throw new HttpError(400, "Note must be 500 characters or fewer");

  const request = await db.getDocument(DB, COLLECTIONS.songRequests, requestId).catch(() => null);
  if (!request) throw new HttpError(404, "Posting not found");
  if (request.status !== "open") throw new HttpError(409, "This posting is closed");
  if (request.posterAccountId === me.$id) throw new HttpError(400, "You can't submit to your own posting");

  const song = await songOf(String(songId || ""));
  if (!song || song.ownerAccountId !== me.$id) throw new HttpError(404, "Choose one of your own songs");

  const dupe = await db.listDocuments(DB, COLLECTIONS.submissions, [
    Query.equal("requestId", requestId),
    Query.equal("songId", song.$id),
    Query.limit(1),
  ]);
  if (dupe.total > 0) throw new HttpError(409, "You've already submitted this song to this posting");

  const who = await identityOf(me);
  const doc = await db.createDocument(
    DB,
    COLLECTIONS.submissions,
    ID.unique(),
    {
      requestId,
      requestTitle: request.title,
      posterAccountId: request.posterAccountId,
      songId: song.$id,
      songTitle: song.title,
      songGenre: song.genre,
      songDurationSec: song.durationSec || 0,
      writerAccountId: me.$id,
      writerUserId: who.userId || song.ownerUserId,
      writerName: song.writerName || who.name,
      note: note.trim(),
      status: "submitted",
    },
    [
      P.read(R.user(me.$id)),
      P.read(R.user(request.posterAccountId)),
      P.delete(R.user(me.$id)), // writer can withdraw
      P.read(R.label("admin")),
      P.delete(R.label("admin")),
    ],
  );
  await db
    .updateDocument(DB, COLLECTIONS.songRequests, requestId, {
      submissionCount: (request.submissionCount || 0) + 1,
    })
    .catch(() => {});
  return doc;
}

async function reviewSubmission(req, id) {
  const me = await caller(req);
  const { status } = await readJson(req);
  if (!["submitted", "shortlisted", "passed"].includes(status)) throw new HttpError(400, "Invalid status");
  const sub = await db.getDocument(DB, COLLECTIONS.submissions, id).catch(() => null);
  if (!sub || sub.posterAccountId !== me.$id) throw new HttpError(404, "Submission not found");
  return db.updateDocument(DB, COLLECTIONS.submissions, id, { status });
}

// ----------------------------------------------------------------- router
async function route(req, res) {
  const url = new URL(req.url, "http://local");
  const path = url.pathname.replace(/\/+$/, "");
  const m = req.method;
  let match;

  if (m === "GET" && (match = path.match(/^\/api\/audio\/([\w.-]{1,200})$/)))
    return streamAudio(req, res, match[1]);
  if (m === "GET" && path === "/api/health")
    return send(res, ready ? 200 : 503, { ok: ready, schema: ready ? "ready" : lastSchemaError });
  if (!ready) throw new HttpError(503, `API not ready: ${lastSchemaError}`);

  if (m === "GET" && path === "/api/me") return send(res, 200, await getMe(req));
  if (m === "POST" && path === "/api/me/role") return send(res, 200, await setMyRole(req));
  if (m === "GET" && path === "/api/admin/users") return send(res, 200, await listUsers(req, url));
  if (m === "PUT" && (match = path.match(/^\/api\/admin\/users\/([\w.-]{1,36})\/roles$/)))
    return send(res, 200, await setUserRoles(req, match[1]));
  if (m === "POST" && path === "/api/connections") return send(res, 201, await createConnection(req));
  if (m === "POST" && (match = path.match(/^\/api\/connections\/([\w.-]{1,36})\/respond$/)))
    return send(res, 200, await respondConnection(req, match[1]));
  if (m === "POST" && (match = path.match(/^\/api\/songs\/([\w.-]{1,36})\/listen$/)))
    return send(res, 200, await listen(req, match[1]));
  if (m === "POST" && (match = path.match(/^\/api\/requests\/([\w.-]{1,36})\/submissions$/)))
    return send(res, 201, await submitToRequest(req, match[1]));
  if (m === "PATCH" && (match = path.match(/^\/api\/submissions\/([\w.-]{1,36})$/)))
    return send(res, 200, await reviewSubmission(req, match[1]));

  throw new HttpError(404, "Not found");
}

http
  .createServer((req, res) => {
    route(req, res).catch((e) => {
      const status = e instanceof HttpError ? e.status : 500;
      if (res.headersSent) return res.destroy();
      if (status === 500) console.error(`${req.method} ${req.url}:`, e?.message || e);
      send(res, status, { message: status === 500 ? "Internal error" : e.message });
    });
  })
  .listen(PORT, () => console.log(`hookline-api listening on :${PORT}`));

// ----------------------------------------------------------------- schema (retry until Appwrite is up)
async function boot() {
  if (missing.length) {
    console.error(`hookline-api: ${lastSchemaError}. Set them in the stack and redeploy.`);
    return;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      await ensureSchema(db, DB);
      await ensureBuckets(storage, STORAGE_LIMIT);
      ready = true;
      lastSchemaError = "";
      console.log("hookline-api: schema ready");
      return;
    } catch (e) {
      lastSchemaError = e?.message || String(e);
      console.error(`hookline-api: schema attempt ${attempt} failed: ${lastSchemaError}`);
      await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * attempt)));
    }
  }
}
boot();
