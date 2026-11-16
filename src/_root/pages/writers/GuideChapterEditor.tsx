import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { GuideChapterInput } from "@/lib/hookline/data";
import {
  useDeleteGuideChapter,
  useGuideChapter,
  useGuideChapters,
  useSaveGuideChapter,
} from "@/lib/hookline/queries";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import RichText from "@/components/writers/RichText";

/** Admin-only: create (/guild-me-through-it/new) or edit a chapter. */
const GuideChapterEditor = () => {
  const { id = "" } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: chapter, isLoading } = useGuideChapter(id);
  const { data: chapters } = useGuideChapters(true);
  const save = useSaveGuideChapter();
  const remove = useDeleteGuideChapter();
  const [form, setForm] = useState<GuideChapterInput | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (form) return;
    if (isNew && chapters) {
      setForm({
        title: "",
        summary: "",
        body: "",
        videoUrl: "",
        position: chapters.length + 1,
        published: false,
      });
    } else if (chapter) {
      setForm({
        title: chapter.title,
        summary: chapter.summary,
        body: chapter.body,
        videoUrl: chapter.videoUrl,
        position: chapter.position,
        published: chapter.published,
      });
    }
  }, [isNew, chapters, chapter, form]);

  if (!form || (!isNew && isLoading)) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  const set = <K extends keyof GuideChapterInput>(k: K, v: GuideChapterInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.videoUrl && !/^https?:\/\//i.test(form.videoUrl)) {
      toast({ title: "Video link must start with http:// or https://", variant: "destructive" });
      return;
    }
    try {
      const doc = await save.mutateAsync({ id: id || null, input: form });
      toast({ title: "Chapter saved" });
      navigate(`/guild-me-through-it/${doc.$id}`);
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete "${form.title}"? This can't be undone.`)) return;
    try {
      await remove.mutateAsync(id);
      navigate("/guild-me-through-it");
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="common-container">
      <div className="max-w-3xl w-full flex flex-col gap-8">
        <Link
          to={isNew ? "/guild-me-through-it" : `/guild-me-through-it/${id}`}
          className="small-medium text-light-3 hover:text-light-1"
        >
          ← Back
        </Link>
        <h1 className="h2-bold">{isNew ? "New chapter" : "Edit chapter"}</h1>

        <form onSubmit={submit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Title</span>
            <Input required maxLength={200} className="shad-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Summary</span>
            <Input maxLength={500} className="shad-input" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Video link (optional, YouTube or Vimeo embeds automatically)</span>
            <Input type="url" maxLength={2000} placeholder="https://" className="shad-input" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex-between">
              <span className="shad-form_label">Content</span>
              <button type="button" className="small-medium text-primary-500" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="rounded-xl border border-dark-4 bg-dark-3 p-5 min-h-[300px]">
                <RichText text={form.body} />
              </div>
            ) : (
              <Textarea
                maxLength={20000}
                className="shad-textarea min-h-[360px] font-mono"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
              />
            )}
            <span className="subtle-semibold text-light-3">
              Blank line starts a new paragraph · "## " starts a heading · "- " starts a bullet ·{" "}
              {form.body.length}/20000
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 small-medium">
              Order
              <Input
                type="number"
                min={0}
                max={10000}
                className="shad-input w-24"
                value={form.position}
                onChange={(e) => set("position", Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex items-center gap-3 small-medium">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set("published", e.target.checked)}
                className="h-4 w-4 accent-primary-500"
              />
              Published (visible to writers)
            </label>
          </div>

          <div className="flex-between gap-3">
            {!isNew ? (
              <Button type="button" variant="ghost" className="text-red hover:bg-dark-4" onClick={onDelete} disabled={remove.isPending}>
                Delete chapter
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" className="shad-button_primary px-10" disabled={save.isPending}>
              {save.isPending ? <Loader /> : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuideChapterEditor;
