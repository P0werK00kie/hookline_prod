// Appwrite reads/writes for the For Writers features. Collection IDs are fixed
// (created by hookline-api); the database is the app's main database.
import { ID, Permission, Query, Role } from "appwrite";

import { appwriteConfig, databases } from "@/lib/appwrite/config";
import {
  IConnection,
  IGuideChapter,
  IGuideItem,
  IGuideSection,
  IWriterProfile,
} from "@/types";

export const COLLECTIONS = {
  writerProfiles: "writer_profiles",
  writerContacts: "writer_contacts",
  connections: "connections",
  guideChapters: "guide_chapters",
  guideItems: "guide_items",
} as const;

const db = () => appwriteConfig.databaseId;

/** Read/update/delete for the owning account only. */
const ownerOnly = (accountId: string) => [
  Permission.read(Role.user(accountId)),
  Permission.update(Role.user(accountId)),
  Permission.delete(Role.user(accountId)),
];

// ============================================================ writer profiles
export async function listWriterProfiles() {
  const res = await databases.listDocuments<IWriterProfile>(
    db(),
    COLLECTIONS.writerProfiles,
    [Query.equal("listed", true), Query.orderDesc("$updatedAt"), Query.limit(100)],
  );
  return res.documents;
}

export async function getWriterProfile(accountId: string) {
  try {
    return await databases.getDocument<IWriterProfile>(
      db(),
      COLLECTIONS.writerProfiles,
      accountId,
    );
  } catch (e: unknown) {
    if ((e as { code?: number })?.code === 404) return null;
    throw e;
  }
}

export type WriterProfileInput = Pick<
  IWriterProfile,
  | "userId"
  | "name"
  | "username"
  | "imageUrl"
  | "genres"
  | "lookingFor"
  | "about"
  | "workStyle"
  | "location"
  | "listed"
> & { contact: string };

/** Create or update the caller's listing (document ID = account ID). */
export async function saveWriterProfile(accountId: string, input: WriterProfileInput) {
  const { contact, ...profile } = input;
  const existing = await getWriterProfile(accountId);
  const data = { ...profile, accountId };

  const saved = existing
    ? await databases.updateDocument<IWriterProfile>(
        db(), COLLECTIONS.writerProfiles, accountId, data,
      )
    : await databases.createDocument<IWriterProfile>(
        db(),
        COLLECTIONS.writerProfiles,
        accountId,
        { ...data, agreedAt: new Date().toISOString() },
        [
          Permission.update(Role.user(accountId)),
          Permission.delete(Role.user(accountId)),
        ],
      );

  await saveMyContact(accountId, contact);
  return saved;
}

// ============================================================ private contact
export async function getMyContact(accountId: string) {
  try {
    const doc = await databases.getDocument(db(), COLLECTIONS.writerContacts, accountId);
    return (doc.contact as string) || "";
  } catch (e: unknown) {
    if ((e as { code?: number })?.code === 404) return "";
    throw e;
  }
}

async function saveMyContact(accountId: string, contact: string) {
  const value = contact.trim();
  try {
    await databases.updateDocument(db(), COLLECTIONS.writerContacts, accountId, {
      contact: value,
    });
  } catch (e: unknown) {
    if ((e as { code?: number })?.code !== 404) throw e;
    if (!value) return;
    await databases.createDocument(
      db(),
      COLLECTIONS.writerContacts,
      accountId,
      { accountId, contact: value },
      ownerOnly(accountId),
    );
  }
}

// ============================================================ connections
/** Every connection the caller can see (sent or received). */
export async function listMyConnections(accountId: string) {
  const [sent, received] = await Promise.all([
    databases.listDocuments<IConnection>(db(), COLLECTIONS.connections, [
      Query.equal("fromAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]),
    databases.listDocuments<IConnection>(db(), COLLECTIONS.connections, [
      Query.equal("toAccountId", accountId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]),
  ]);
  return { sent: sent.documents, received: received.documents };
}

export async function withdrawConnection(id: string) {
  await databases.deleteDocument(db(), COLLECTIONS.connections, id);
}

// ============================================================ guide
export async function listGuideChapters(includeDrafts: boolean) {
  const q = [Query.orderAsc("position"), Query.limit(100)];
  if (!includeDrafts) q.push(Query.equal("published", true));
  return (
    await databases.listDocuments<IGuideChapter>(db(), COLLECTIONS.guideChapters, q)
  ).documents;
}

export async function getGuideChapter(id: string) {
  return databases.getDocument<IGuideChapter>(db(), COLLECTIONS.guideChapters, id);
}

export type GuideChapterInput = Pick<
  IGuideChapter,
  "title" | "summary" | "body" | "videoUrl" | "position" | "published"
>;

export async function saveGuideChapter(id: string | null, input: GuideChapterInput) {
  return id
    ? databases.updateDocument<IGuideChapter>(db(), COLLECTIONS.guideChapters, id, input)
    : databases.createDocument<IGuideChapter>(
        db(), COLLECTIONS.guideChapters, ID.unique(), input,
      );
}

export async function deleteGuideChapter(id: string) {
  await databases.deleteDocument(db(), COLLECTIONS.guideChapters, id);
}

export async function listGuideItems(sections: IGuideSection[], includeDrafts: boolean) {
  const q = [
    Query.equal("section", sections),
    Query.orderAsc("position"),
    Query.limit(100),
  ];
  if (!includeDrafts) q.push(Query.equal("published", true));
  return (await databases.listDocuments<IGuideItem>(db(), COLLECTIONS.guideItems, q))
    .documents;
}

export type GuideItemInput = Pick<
  IGuideItem,
  "section" | "title" | "description" | "url" | "area" | "position" | "published"
>;

export async function saveGuideItem(id: string | null, input: GuideItemInput) {
  return id
    ? databases.updateDocument<IGuideItem>(db(), COLLECTIONS.guideItems, id, input)
    : databases.createDocument<IGuideItem>(db(), COLLECTIONS.guideItems, ID.unique(), input);
}

export async function deleteGuideItem(id: string) {
  await databases.deleteDocument(db(), COLLECTIONS.guideItems, id);
}
