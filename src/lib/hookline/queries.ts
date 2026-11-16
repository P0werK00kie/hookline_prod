import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IGuideSection, IRole } from "@/types";
import { hooklineApi } from "./api";
import {
  GuideChapterInput,
  GuideItemInput,
  WriterProfileInput,
  deleteGuideChapter,
  deleteGuideItem,
  getGuideChapter,
  getMyContact,
  getWriterProfile,
  listGuideChapters,
  listGuideItems,
  listMyConnections,
  listWriterProfiles,
  saveGuideChapter,
  saveGuideItem,
  saveWriterProfile,
  withdrawConnection,
} from "./data";

export const KEYS = {
  writers: ["writers"] as const,
  writerProfile: (accountId: string) => ["writerProfile", accountId] as const,
  myContact: (accountId: string) => ["myContact", accountId] as const,
  connections: (accountId: string) => ["connections", accountId] as const,
  chapters: (drafts: boolean) => ["guideChapters", drafts] as const,
  chapter: (id: string) => ["guideChapter", id] as const,
  items: (sections: IGuideSection[], drafts: boolean) =>
    ["guideItems", sections.join(","), drafts] as const,
  adminUsers: (search: string) => ["adminUsers", search] as const,
};

// ============================================================ writers block
export const useWriterProfiles = () =>
  useQuery({ queryKey: KEYS.writers, queryFn: listWriterProfiles });

export const useWriterProfile = (accountId: string) =>
  useQuery({
    queryKey: KEYS.writerProfile(accountId),
    queryFn: () => getWriterProfile(accountId),
    enabled: !!accountId,
  });

export const useMyContact = (accountId: string) =>
  useQuery({
    queryKey: KEYS.myContact(accountId),
    queryFn: () => getMyContact(accountId),
    enabled: !!accountId,
  });

export const useSaveWriterProfile = (accountId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WriterProfileInput) => saveWriterProfile(accountId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.writers });
      qc.invalidateQueries({ queryKey: KEYS.writerProfile(accountId) });
      qc.invalidateQueries({ queryKey: KEYS.myContact(accountId) });
    },
  });
};

export const useMyConnections = (accountId: string) =>
  useQuery({
    queryKey: KEYS.connections(accountId),
    queryFn: () => listMyConnections(accountId),
    enabled: !!accountId,
  });

const useInvalidateConnections = (accountId: string) => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEYS.connections(accountId) });
};

export const useConnect = (accountId: string) => {
  const invalidate = useInvalidateConnections(accountId);
  return useMutation({
    mutationFn: ({ toAccountId, note }: { toAccountId: string; note: string }) =>
      hooklineApi.connect(toAccountId, note),
    onSuccess: invalidate,
  });
};

export const useRespond = (accountId: string) => {
  const invalidate = useInvalidateConnections(accountId);
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      hooklineApi.respond(id, accept),
    onSuccess: invalidate,
  });
};

export const useWithdraw = (accountId: string) => {
  const invalidate = useInvalidateConnections(accountId);
  return useMutation({ mutationFn: withdrawConnection, onSuccess: invalidate });
};

// ============================================================ guide
export const useGuideChapters = (includeDrafts: boolean) =>
  useQuery({
    queryKey: KEYS.chapters(includeDrafts),
    queryFn: () => listGuideChapters(includeDrafts),
  });

export const useGuideChapter = (id: string) =>
  useQuery({
    queryKey: KEYS.chapter(id),
    queryFn: () => getGuideChapter(id),
    enabled: !!id,
  });

export const useSaveGuideChapter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: GuideChapterInput }) =>
      saveGuideChapter(id, input),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["guideChapters"] });
      qc.invalidateQueries({ queryKey: KEYS.chapter(doc.$id) });
    },
  });
};

export const useDeleteGuideChapter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGuideChapter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guideChapters"] }),
  });
};

export const useGuideItems = (sections: IGuideSection[], includeDrafts: boolean) =>
  useQuery({
    queryKey: KEYS.items(sections, includeDrafts),
    queryFn: () => listGuideItems(sections, includeDrafts),
  });

export const useSaveGuideItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: GuideItemInput }) =>
      saveGuideItem(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guideItems"] }),
  });
};

export const useDeleteGuideItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGuideItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guideItems"] }),
  });
};

// ============================================================ admin
export const useAdminUsers = (search: string) =>
  useQuery({
    queryKey: KEYS.adminUsers(search),
    queryFn: () => hooklineApi.listUsers(search),
  });

export const useSetUserRoles = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: IRole[] }) =>
      hooklineApi.setUserRoles(userId, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
};
