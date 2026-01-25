import { Models } from "appwrite";
import { IPost, IUserDocument } from "@/types";

// Helper functions for type assertions
export const asPost = (doc: Models.Document): IPost => doc as unknown as IPost;
export const asPosts = (docs: Models.Document[]): IPost[] => docs as unknown as IPost[];
export const asUser = (doc: Models.Document): IUserDocument => doc as unknown as IUserDocument;
export const asUsers = (docs: Models.Document[]): IUserDocument[] => docs as unknown as IUserDocument[];
