import { Client, Account, Databases, Storage, Avatars } from "appwrite";

// Values come from window.__ENV__ (written at container start by
// docker/40-env-config.sh) first, then from build-time VITE_* variables.
const runtimeEnv: Record<string, string | undefined> =
  (typeof window !== "undefined" &&
    (window as unknown as { __ENV__?: Record<string, string> }).__ENV__) ||
  {};

const env = (key: keyof ImportMetaEnv & string): string =>
  runtimeEnv[key] || import.meta.env[key];

export const appwriteConfig = {
  url: env("VITE_APPWRITE_URL"),
  projectId: env("VITE_APPWRITE_PROJECT_ID"),
  databaseId: env("VITE_APPWRITE_DATABASE_ID"),
  storageId: env("VITE_APPWRITE_STORAGE_ID"),
  userCollectionId: env("VITE_APPWRITE_USER_COLLECTION_ID"),
  postCollectionId: env("VITE_APPWRITE_POST_COLLECTION_ID"),
  savesCollectionId: env("VITE_APPWRITE_SAVES_COLLECTION_ID"),
};

export const client = new Client();

client.setEndpoint(appwriteConfig.url);
client.setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
