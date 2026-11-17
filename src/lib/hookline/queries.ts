import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IGenre, IGuideSection, IRole, ISong, ISubmissionStatus } from "@/types";
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
import {
  Poster,
  RequestInput,
  SongInput,
  SongOwner,
  createRequest,
  deleteRequest,
  deleteSong,
  getSong,
  listGenreCounts,
  listMyRequests,
  listMySongs,
  listMySubmissions,
  listOpenRequests,
  listSongsByGenre,
  listSubmissionsForPoster,
  updateRequest,
  updateSong,
  uploadSong,
  withdrawSubmission,
} from "./music";

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
  genreSongs: (genre: string) => ["songs", "genre", genre] as const,
  genreCounts: ["songs", "counts"] as const,
  mySongs: (accountId: string) => ["songs", "mine", accountId] as const,
  song: (id: string) => ["song", id] as const,
  openRequests: ["requests", "open"] as const,
  myRequests: (accountId: string) => ["requests", "mine", accountId] as const,
  posterSubmissions: (accountId: string) => ["submissions", "poster", accountId] as const,
  mySubmissions: (accountId: string) => ["submissions", "writer", accountId] as const,
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

// ============================================================ songs
export const useGenreSongs = (genre: IGenre) =>
  useQuery({ queryKey: KEYS.genreSongs(genre), queryFn: () => listSongsByGenre(genre) });

export const useGenreCounts = () =>
  useQuery({ queryKey: KEYS.genreCounts, queryFn: listGenreCounts });

export const useMySongs = (accountId: string) =>
  useQuery({
    queryKey: KEYS.mySongs(accountId),
    queryFn: () => listMySongs(accountId),
    enabled: !!accountId,
  });

export const useSong = (id: string) =>
  useQuery({ queryKey: KEYS.song(id), queryFn: () => getSong(id), enabled: !!id, retry: false });

export const useUploadSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      owner: SongOwner;
      file: File;
      durationSec: number;
      input: SongInput;
      onProgress?: (p: number) => void;
    }) => uploadSong(v.owner, v.file, v.durationSec, v.input, v.onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["songs"] }),
  });
};

export const useUpdateSong = (accountId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SongInput }) =>
      updateSong(accountId, id, input),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["songs"] });
      qc.invalidateQueries({ queryKey: KEYS.song(doc.$id) });
    },
  });
};

export const useDeleteSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (song: ISong) => deleteSong(song),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["songs"] }),
  });
};

export const useConnectAboutSong = (accountId: string) => {
  const invalidate = useInvalidateConnections(accountId);
  return useMutation({
    mutationFn: ({ songId, note }: { songId: string; note: string }) =>
      hooklineApi.connectAboutSong(songId, note),
    onSuccess: invalidate,
  });
};

// ============================================================ hook me
export const useOpenRequests = () =>
  useQuery({ queryKey: KEYS.openRequests, queryFn: listOpenRequests });

export const useMyRequests = (accountId: string) =>
  useQuery({
    queryKey: KEYS.myRequests(accountId),
    queryFn: () => listMyRequests(accountId),
    enabled: !!accountId,
  });

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poster, input }: { poster: Poster; input: RequestInput }) =>
      createRequest(poster, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
};

export const useUpdateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateRequest>[1] }) =>
      updateRequest(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
};

export const useDeleteRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
};

export const usePosterSubmissions = (accountId: string) =>
  useQuery({
    queryKey: KEYS.posterSubmissions(accountId),
    queryFn: () => listSubmissionsForPoster(accountId),
    enabled: !!accountId,
  });

export const useMySubmissions = (accountId: string) =>
  useQuery({
    queryKey: KEYS.mySubmissions(accountId),
    queryFn: () => listMySubmissions(accountId),
    enabled: !!accountId,
  });

export const useSubmitSong = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { requestId: string; songId: string; note: string }) =>
      hooklineApi.submit(v.requestId, v.songId, v.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
};

export const useReviewSubmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ISubmissionStatus }) =>
      hooklineApi.reviewSubmission(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
};

export const useWithdrawSubmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: withdrawSubmission,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
};
