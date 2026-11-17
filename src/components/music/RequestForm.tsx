import { FormEvent, useState } from "react";

import { IGenre, IProjectType, ISongRequest } from "@/types";
import { GENRES, PROJECT_TYPES } from "@/constants/music";
import { RequestInput } from "@/lib/hookline/music";
import { useCreateRequest, useUpdateRequest } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import Modal from "@/components/writers/Modal";

type Props = { request?: ISongRequest; onClose: () => void; onSaved?: () => void };

/** Post (or edit) a Hook Me request. */
const RequestForm = ({ request, onClose, onSaved }: Props) => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const create = useCreateRequest();
  const update = useUpdateRequest();
  const [form, setForm] = useState<RequestInput>({
    title: request?.title || "",
    projectType: request?.projectType || "record",
    genre: request?.genre || null,
    style: request?.style || "",
    mood: request?.mood || "",
    details: request?.details || "",
    tempoKeyRange: request?.tempoKeyRange || "",
    deadline: request?.deadline || null,
  });
  const set = <K extends keyof RequestInput>(k: K, v: RequestInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const busy = create.isPending || update.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (request) await update.mutateAsync({ id: request.$id, data: form });
      else
        await create.mutateAsync({
          poster: { accountId: user.accountId, userId: user.id, name: user.name },
          input: form,
        });
      toast({ title: request ? "Posting updated" : "Your request is posted", description: request ? undefined : "Writers can now upload songs to it." });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open title={request ? "Edit posting" : "Post a request"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">What are you looking for?</span>
          <Input required maxLength={128} placeholder="e.g. Summer road-trip spot" className="shad-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">The kind of song</span>
            <select className="shad-input rounded-md px-3" value={form.projectType} onChange={(e) => set("projectType", e.target.value as IProjectType)}>
              {PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Genre</span>
            <select className="shad-input rounded-md px-3" value={form.genre || ""} onChange={(e) => set("genre", (e.target.value || null) as IGenre | null)}>
              <option value="">Any genre</option>
              {GENRES.map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Style</span>
            <Input maxLength={128} placeholder="e.g. 90s country-pop" className="shad-input" value={form.style} onChange={(e) => set("style", e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Mood</span>
            <Input maxLength={128} placeholder="e.g. Uplifting" className="shad-input" value={form.mood} onChange={(e) => set("mood", e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Theme, message, and what the song is for</span>
          <Textarea maxLength={2000} className="shad-textarea" placeholder="Be as specific as you can. The clearer your post, the easier it is for the right writer to find you." value={form.details} onChange={(e) => set("details", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Tempo, key, or vocal range</span>
            <Input maxLength={200} placeholder="Optional" className="shad-input" value={form.tempoKeyRange} onChange={(e) => set("tempoKeyRange", e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Needed by</span>
            <Input
              type="date"
              min={today}
              className="shad-input"
              value={form.deadline ? form.deadline.slice(0, 10) : ""}
              onChange={(e) => set("deadline", e.target.value ? new Date(`${e.target.value}T23:59:00`).toISOString() : null)}
            />
          </label>
        </div>
        <Button type="submit" className="shad-button_primary mt-2" disabled={busy}>
          {busy ? <Loader /> : request ? "Save changes" : "Post request"}
        </Button>
      </form>
    </Modal>
  );
};

export default RequestForm;
