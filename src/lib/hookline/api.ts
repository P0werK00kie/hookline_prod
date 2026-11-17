// Client for hookline-api (served at /api by the web container).
import { account } from "@/lib/appwrite/config";
import { IConnection, IRole, ISubmission, ISubmissionStatus } from "@/types";

let cached: { jwt: string; expires: number } | null = null;

/** Appwrite JWTs live 15 minutes; reuse one for up to 10. */
async function jwt() {
  if (cached && cached.expires > Date.now()) return cached.jwt;
  const { jwt } = await account.createJWT();
  cached = { jwt, expires: Date.now() + 10 * 60 * 1000 };
  return jwt;
}

export function clearApiSession() {
  cached = null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-appwrite-jwt": await jwt(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message || `Request failed (${res.status})`);
  return data as T;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: boolean;
  roles: IRole[];
};

export const hooklineApi = {
  me: () => call<{ id: string; roles: IRole[] }>("GET", "/me"),
  chooseRole: (role: "writer" | "singer") =>
    call<{ id: string; roles: IRole[] }>("POST", "/me/role", { role }),
  listUsers: (search = "", cursor?: string) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (cursor) q.set("cursor", cursor);
    return call<{ total: number; users: AdminUser[] }>("GET", `/admin/users?${q}`);
  },
  setUserRoles: (userId: string, roles: IRole[]) =>
    call<{ id: string; roles: IRole[] }>("PUT", `/admin/users/${userId}/roles`, { roles }),
  connect: (toAccountId: string, note: string) =>
    call<IConnection>("POST", "/connections", { toAccountId, note }),
  respond: (connectionId: string, accept: boolean) =>
    call<IConnection>("POST", `/connections/${connectionId}/respond`, { accept }),
  /** "Connect with Writer" from a song (any signed-in member). */
  connectAboutSong: (songId: string, note: string) =>
    call<IConnection>("POST", "/connections", { songId, note }),
  /** Returns a short-lived URL the <audio> element can stream. Counts a play. */
  listen: (songId: string) =>
    call<{ url: string; expiresAt: string }>("POST", `/songs/${songId}/listen`),
  submit: (requestId: string, songId: string, note: string) =>
    call<ISubmission>("POST", `/requests/${requestId}/submissions`, { songId, note }),
  reviewSubmission: (submissionId: string, status: ISubmissionStatus) =>
    call<ISubmission>("PATCH", `/submissions/${submissionId}`, { status }),
};
