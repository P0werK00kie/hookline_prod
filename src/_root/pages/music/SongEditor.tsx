import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";

import { IGenre, IMood, ITempo } from "@/types";
import { AUDIO_ACCEPT, GENRES, MOODS, TEMPOS, formatDuration } from "@/constants/music";
import { SongInput, readDuration } from "@/lib/hookline/music";
import { useSong, useSubmitSong, useUpdateSong, useUploadSong } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";

// Matches the stack's default APPWRITE_STORAGE_LIMIT; the server enforces the real limit.
const MAX_BYTES = 30 * 1000 * 1000;

/**
 * Upload (/my-songs/new) or edit (/my-songs/:id/edit) a song.
 * /my-songs/new?request=<id> uploads and submits straight to a Hook Me posting.
 */
const SongEditor = () => {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const requestId = params.get("request") || "";
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserContext();
  const { data: existing, isLoading } = useSong(id);
  const upload = useUploadSong();
  const update = useUpdateSong(user.accountId);
  const submit = useSubmitSong();

  const [form, setForm] = useState<SongInput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (form) return;
    if (isNew) {
      const g = params.get("genre");
      setForm({
        title: "",
        genre: (GENRES.some((x) => x.slug === g) ? g : "pop") as IGenre,
        mood: null,
        tempo: null,
        description: "",
        lyrics: "",
        coWriters: "",
        // Songs uploaded for a posting default to private.
        published: !requestId,
      });
    } else if (existing) {
      setForm({
        title: existing.title,
        genre: existing.genre,
        mood: existing.mood,
        tempo: existing.tempo,
        description: existing.description,
        lyrics: existing.lyrics,
        coWriters: existing.coWriters,
        published: existing.published,
      });
    }
  }, [isNew, existing, form, params, requestId]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const f = accepted[0];
      if (!f) return;
      if (f.size > MAX_BYTES) {
        toast({ title: "That file is too large", description: "The limit is 30 MB. Try an MP3 or M4A.", variant: "destructive" });
        return;
      }
      setFile(f);
      setDuration(await readDuration(f));
      setForm((cur) => (cur && !cur.title ? { ...cur, title: f.name.replace(/\.[^.]+$/, "").slice(0, 128) } : cur));
    },
    [toast],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: AUDIO_ACCEPT,
    multiple: false,
  });

  if (!form || (!isNew && isLoading)) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }
  if (!isNew && existing && existing.ownerAccountId !== user.accountId) {
    return (
      <div className="common-container">
        <p className="body-medium">You can only edit your own songs.</p>
      </div>
    );
  }

  const set = <K extends keyof SongInput>(k: K, v: SongInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const busy = upload.isPending || update.isPending || submit.isPending;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isNew) {
        if (!file) {
          toast({ title: "Choose an audio file to upload", variant: "destructive" });
          return;
        }
        const song = await upload.mutateAsync({
          owner: { accountId: user.accountId, userId: user.id, writerName: user.name },
          file,
          durationSec: duration,
          input: form,
          onProgress: setProgress,
        });
        if (requestId) {
          try {
            await submit.mutateAsync({ requestId, songId: song.$id, note });
            toast({ title: "Uploaded and submitted", description: "The poster can listen to it now." });
            navigate("/hook-me/mine");
          } catch (err) {
            toast({ title: "Uploaded, but couldn't submit", description: (err as Error).message, variant: "destructive" });
            navigate("/my-songs");
          }
          return;
        }
        toast({ title: form.published ? "Your song is live on Perfect Pitch" : "Song uploaded (private)" });
        navigate(`/songs/${song.$id}`);
      } else {
        await update.mutateAsync({ id, input: form });
        toast({ title: "Song saved" });
        navigate(`/songs/${id}`);
      }
    } catch (err) {
      toast({ title: "Couldn't save the song", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="common-container">
      <div className="max-w-3xl w-full flex flex-col gap-8">
        <Link to={requestId ? "/hook-me" : "/my-songs"} className="small-medium text-light-3 hover:text-light-1">
          ← {requestId ? "Hook Me" : "My Songs"}
        </Link>
        <h1 className="h2-bold">
          {isNew ? (requestId ? "Upload a song to this posting" : "Upload a song") : "Edit song"}
        </h1>

        <form onSubmit={save} className="flex flex-col gap-6">
          {isNew && (
            <div
              {...getRootProps()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                isDragActive ? "border-primary-500 bg-primary-500/10" : "border-dark-4 bg-dark-3 hover:border-primary-500"
              }`}
            >
              <input {...getInputProps()} aria-label="Audio file" />
              {file ? (
                <>
                  <p className="base-semibold">{file.name}</p>
                  <p className="small-regular text-light-3 mt-1">
                    {(file.size / 1e6).toFixed(1)} MB {duration ? `· ${formatDuration(duration)}` : ""} · click to change
                  </p>
                </>
              ) : (
                <>
                  <p className="base-semibold">Drag your song here, or click to choose a file</p>
                  <p className="small-regular text-light-3 mt-1">MP3, M4A, AAC, WAV, OGG or FLAC · up to 30 MB</p>
                </>
              )}
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Title</span>
            <Input required maxLength={128} className="shad-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="shad-form_label">Genre</span>
              <select className="shad-input rounded-md px-3" value={form.genre} onChange={(e) => set("genre", e.target.value as IGenre)}>
                {GENRES.map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="shad-form_label">Mood</span>
              <select className="shad-input rounded-md px-3" value={form.mood || ""} onChange={(e) => set("mood", (e.target.value || null) as IMood | null)}>
                <option value="">Not set</option>
                {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="shad-form_label">Tempo</span>
              <select className="shad-input rounded-md px-3" value={form.tempo || ""} onChange={(e) => set("tempo", (e.target.value || null) as ITempo | null)}>
                <option value="">Not set</option>
                {TEMPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">About this song</span>
            <Textarea maxLength={1000} placeholder="The story behind it, who it's for, what it would suit" className="shad-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Co-writers (optional)</span>
            <Input maxLength={256} className="shad-input" value={form.coWriters} onChange={(e) => set("coWriters", e.target.value)} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Lyrics (optional)</span>
            <Textarea maxLength={5000} className="shad-textarea min-h-[200px]" value={form.lyrics} onChange={(e) => set("lyrics", e.target.value)} />
          </label>

          {requestId && (
            <label className="flex flex-col gap-2">
              <span className="shad-form_label">Note to the poster (optional)</span>
              <Textarea maxLength={500} className="shad-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          )}

          <label className="flex items-start gap-3 small-medium">
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4 mt-0.5 accent-primary-500" />
            <span>
              Publish on Perfect Pitch
              <span className="block subtle-semibold text-light-3">
                Unticked, the song is private: only you, and posters you submit it to, can hear it.
              </span>
            </span>
          </label>

          <p className="subtle-semibold text-light-3">
            Only upload songs you wrote or have the right to share. Register your
            copyright before sharing unreleased work widely.
          </p>

          {upload.isPending && (
            <div className="h-2 w-full rounded-full bg-dark-4 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <Button type="submit" className="shad-button_primary self-end px-10" disabled={busy}>
            {busy ? <Loader /> : isNew ? (requestId ? "Upload and submit" : "Upload song") : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SongEditor;
