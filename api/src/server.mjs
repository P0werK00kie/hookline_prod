// hookline-api: the few operations the browser can't do itself.
//
//   GET  /api/health
//   GET  /api/me                        -> { roles }
//   POST /api/me/role   {role}          self-select "writer" or "singer"
//   GET  /api/admin/users?search=&cursor=          (admin)
//   PUT  /api/admin/users/:id/roles {roles: []}    (admin)
//   POST /api/connections {toAccountId, note}      (writer/admin)
//   POST /api/connections/:id/respond {accept}     (recipient)
//
// Callers authenticate with an Appwrite JWT (account.createJWT()) in the
// X-Appwrite-JWT header. Roles are Appwrite user labels.
import http from "node:http";
import sdk from "node-appwrite";
import { COLLECTIONS, ROLES, ensureSchema } from "./schema.mjs";

const { Client, Account, Databases, Users, Permission: P, Role: R, Query, ID } = sdk;

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

const missing = ["APPWRITE_PROJECT_ID", "APPWRITE_API_KEY", "APPWRITE_DATABASE_ID"].filter(
  (k) => !process.env[k],
);

const server = new Client().setEndpoint(ENDPOINT).setProject(PROJECT || "").setKey(API_KEY || "");
const db = new Databases(server);
const users = new Users(server);

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

async function contactOf(accountId) {
  const doc = await db.getDocument(DB, COLLECTIONS.writerContacts, accountId).catch(() => null);
  return doc?.contact || "";
}

async function createConnection(req) {
  const me = await caller(req);
  if (!hasRole(me, "writer", "admin")) throw new HttpError(403, "Writers only");
  const { toAccountId, note = "" } = await readJson(req);
  if (typeof toAccountId !== "string" || !toAccountId) throw new HttpError(400, "toAccountId is required");
  if (toAccountId === me.$id) throw new HttpError(400, "You can't connect with yourself");
  if (typeof note !== "string" || note.length > 500) throw new HttpError(400, "Note must be 500 characters or fewer");

  const [from, to] = await Promise.all([profileOf(me.$id), profileOf(toAccountId)]);
  if (!from) throw new HttpError(400, "List your name in Writers Block before connecting");
  if (!to || !to.listed) throw new HttpError(404, "That writer isn't listed");

  // One open/accepted connection per pair, in either direction.
  const existing = await db.listDocuments(DB, COLLECTIONS.connections, [
    Query.equal("fromAccountId", [me.$id, toAccountId]),
    Query.equal("toAccountId", [me.$id, toAccountId]),
    Query.notEqual("status", "declined"),
    Query.limit(5),
  ]);
  if (existing.total > 0)
    throw new HttpError(409, "You already have a connection or pending request with this writer");

  const doc = await db.createDocument(
    DB,
    COLLECTIONS.connections,
    ID.unique(),
    {
      fromAccountId: me.$id,
      toAccountId,
      fromName: from.name,
      toName: to.name,
      fromUserId: from.userId,
      toUserId: to.userId,
      note: note.trim(),
      status: "pending",
    },
    [
      P.read(R.user(me.$id)),
      P.read(R.user(toAccountId)),
      P.delete(R.user(me.$id)), // sender can withdraw
      P.read(R.label("admin")),
      P.delete(R.label("admin")),
    ],
  );
  return doc;
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

// ----------------------------------------------------------------- router
async function route(req, res) {
  const url = new URL(req.url, "http://local");
  const path = url.pathname.replace(/\/+$/, "");
  const m = req.method;

  if (m === "GET" && path === "/api/health")
    return send(res, ready ? 200 : 503, { ok: ready, schema: ready ? "ready" : lastSchemaError });
  if (!ready) throw new HttpError(503, `API not ready: ${lastSchemaError}`);

  let match;
  if (m === "GET" && path === "/api/me") return send(res, 200, await getMe(req));
  if (m === "POST" && path === "/api/me/role") return send(res, 200, await setMyRole(req));
  if (m === "GET" && path === "/api/admin/users") return send(res, 200, await listUsers(req, url));
  if (m === "PUT" && (match = path.match(/^\/api\/admin\/users\/([\w.-]{1,36})\/roles$/)))
    return send(res, 200, await setUserRoles(req, match[1]));
  if (m === "POST" && path === "/api/connections") return send(res, 201, await createConnection(req));
  if (m === "POST" && (match = path.match(/^\/api\/connections\/([\w.-]{1,36})\/respond$/)))
    return send(res, 200, await respondConnection(req, match[1]));

  throw new HttpError(404, "Not found");
}

http
  .createServer((req, res) => {
    route(req, res).catch((e) => {
      const status = e instanceof HttpError ? e.status : 500;
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
