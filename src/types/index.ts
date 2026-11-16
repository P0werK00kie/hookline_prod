import { Models } from "appwrite";

export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};

export type IUpdateUser = {
  userId: string;
  name: string;
  bio: string;
  imageId: string;
  imageUrl: URL | string;
  file: File[];
};

export type INewPost = {
  userId: string;
  caption: string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUpdatePost = {
  postId: string;
  caption: string;
  imageId: string;
  imageUrl: URL | string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IRole = "admin" | "writer" | "singer";

export type IUser = {
  id: string;
  /** Appwrite account ID (differs from `id`, the users-collection document). */
  accountId: string;
  /** Role labels from the Appwrite account. */
  roles: IRole[];
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  bio: string;
};

export type INewUser = {
  name: string;
  email: string;
  username: string;
  password: string;
};

// ============================================================
// FOR WRITERS
// ============================================================
export interface IWriterProfile extends Models.Document {
  accountId: string;
  userId: string;
  name: string;
  username: string;
  imageUrl: string;
  genres: string[];
  lookingFor: string;
  about: string;
  workStyle: string;
  location: string;
  listed: boolean;
  agreedAt: string;
}

export type IConnectionStatus = "pending" | "accepted" | "declined";

export interface IConnection extends Models.Document {
  fromAccountId: string;
  toAccountId: string;
  fromName: string;
  toName: string;
  fromUserId: string;
  toUserId: string;
  note: string;
  status: IConnectionStatus;
  fromContact: string;
  toContact: string;
  respondedAt: string | null;
}

export interface IGuideChapter extends Models.Document {
  position: number;
  title: string;
  summary: string;
  body: string;
  videoUrl: string;
  published: boolean;
}

export type IGuideSection =
  | "guild"
  | "video"
  | "distribution"
  | "resource"
  | "writing_group"
  | "forum"
  | "attorney";

export interface IGuideItem extends Models.Document {
  section: IGuideSection;
  title: string;
  description: string;
  url: string;
  area: string;
  position: number;
  published: boolean;
}

// Extended Appwrite Document types
export interface IPost extends Models.Document {
  caption: string;
  imageUrl: string;
  imageId: string;
  location: string;
  tags: string[];
  likes: string[];
  creator: IUserDocument;
}

export interface IUserDocument extends Models.Document {
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  bio: string;
  save: ISave[];
}

export interface ISave extends Models.Document {
  post: IPost;
}
