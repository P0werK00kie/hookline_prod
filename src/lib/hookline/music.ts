// Appwrite reads/writes for Perfect Pitch (songs) and Hook Me (requests).
// Collections/bucket are created by hookline-api.
import { ID, Permission, Query, Role } from "appwrite";

import { appwriteConfig, databases, storage } from "@/lib/appwrite/config";
import { IGenre, ISong, ISongRequest, ISubmission } from "@/types";

export const MUSIC = {
  songs: "songs",
  songRequests: "song_requests",
  submissions: "submissions",
  songsBucket: "songs",
} as const;

const db = () => appwriteConfig.databaseId;

const ownerWrite = (accountId: string) => [
  Permission.update(Role.user(accountId)),
  Permission.delete(Role.user(accountId)),
];

/** Published songs are readable by every signed-in member; private ones only by the owner. */
const songPermissions = (accountId: string, published: boolean) => [
  Permission.read(published ? Role.users() : Role.user(accountId)),
  ...ownerWrite(accountId),
];

// ============================================================ songs
export async function listSongsByGenre(genre: IGenre) {
  return (
    await databases.listDocuments<ISong>(db(), MUSIC.songs, [
      Query.equal("genre", genre),
      Query.equal("published", true),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export async function listGenreCounts() {
  // One small query per genre would be 13 requests; a single page is plenty for now.
  const res = await databases.listDocuments<ISong>(db(), MUSIC.songs, [
    Query.equal("published", true),
    Query.limit(100),
  ]);
  const counts: Partial<Record<IGenre, number>> = {};
  for (const s of res.documents) counts[s.genre] = (counts[s.genre] || 0) + 1;
  return counts;
}

export async function listMySongs(accountId: string) {
  return (
    await databases.listDocuments<ISong>(db(), MUSIC.songs, [
      Query.equal("ownerAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export async function getSong(id: string) {
  return databases.getDocument<ISong>(db(), MUSIC.songs, id);
}

export type SongInput = Pick<
  ISong,
  "title" | "genre" | "mood" | "tempo" | "description" | "lyrics" | "coWriters" | "published"
>;

export type SongOwner = { accountId: string; userId: string; writerName: string };

/** Upload the audio file, then create the song document. */
export async function uploadSong(
  owner: SongOwner,
  file: File,
  durationSec: number,
  input: SongInput,
  onProgress?: (percent: number) => void,
) {
  const uploaded = await storage.createFile(
    MUSIC.songsBucket,
    ID.unique(),
    file,
    [Permission.read(Role.user(owner.accountId)), ...ownerWrite(owner.accountId)],
    (p) => onProgress?.(Math.round(p.progress)),
  );
  try {
    return await databases.createDocument<ISong>(
      db(),
      MUSIC.songs,
      ID.unique(),
      {
        ...input,
        ownerAccountId: owner.accountId,
        ownerUserId: owner.userId,
        writerName: owner.writerName,
        durationSec: Math.round(durationSec),
        audioFileId: uploaded.$id,
        plays: 0,
      },
      songPermissions(owner.accountId, input.published),
    );
  } catch (e) {
    await storage.deleteFile(MUSIC.songsBucket, uploaded.$id).catch(() => {});
    throw e;
  }
}

export async function updateSong(accountId: string, id: string, input: SongInput) {
  return databases.updateDocument<ISong>(
    db(),
    MUSIC.songs,
    id,
    input,
    songPermissions(accountId, input.published),
  );
}

export async function deleteSong(song: ISong) {
  await databases.deleteDocument(db(), MUSIC.songs, song.$id);
  await storage.deleteFile(MUSIC.songsBucket, song.audioFileId).catch(() => {});
}

/** Read an audio file's duration in the browser before uploading. */
export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}

// ============================================================ hook me requests
export async function listOpenRequests() {
  return (
    await databases.listDocuments<ISongRequest>(db(), MUSIC.songRequests, [
      Query.equal("status", "open"),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export async function listMyRequests(accountId: string) {
  return (
    await databases.listDocuments<ISongRequest>(db(), MUSIC.songRequests, [
      Query.equal("posterAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export type RequestInput = Pick<
  ISongRequest,
  "title" | "projectType" | "genre" | "style" | "mood" | "details" | "tempoKeyRange" | "deadline"
>;

export type Poster = { accountId: string; userId: string; name: string };

export async function createRequest(poster: Poster, input: RequestInput) {
  return databases.createDocument<ISongRequest>(
    db(),
    MUSIC.songRequests,
    ID.unique(),
    {
      ...input,
      posterAccountId: poster.accountId,
      posterUserId: poster.userId,
      posterName: poster.name,
      status: "open",
      submissionCount: 0,
    },
    ownerWrite(poster.accountId),
  );
}

export async function updateRequest(id: string, data: Partial<RequestInput & { status: "open" | "closed" }>) {
  return databases.updateDocument<ISongRequest>(db(), MUSIC.songRequests, id, data);
}

export async function deleteRequest(id: string) {
  await databases.deleteDocument(db(), MUSIC.songRequests, id);
}

// ============================================================ submissions
export async function listSubmissionsForPoster(accountId: string) {
  return (
    await databases.listDocuments<ISubmission>(db(), MUSIC.submissions, [
      Query.equal("posterAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export async function listMySubmissions(accountId: string) {
  return (
    await databases.listDocuments<ISubmission>(db(), MUSIC.submissions, [
      Query.equal("writerAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ])
  ).documents;
}

export async function withdrawSubmission(id: string) {
  await databases.deleteDocument(db(), MUSIC.submissions, id);
}
