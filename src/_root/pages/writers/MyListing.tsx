import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { WRITER_GENRES } from "@/constants";
import { WriterProfileInput } from "@/lib/hookline/data";
import {
  useMyContact,
  useSaveWriterProfile,
  useWriterProfile,
} from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import SafetyNotice from "@/components/writers/SafetyNotice";

const MAX_GENRES = 5;

const MyListing = () => {
  const { user } = useUserContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existing, isLoading } = useWriterProfile(user.accountId);
  const { data: contact, isLoading: contactLoading } = useMyContact(user.accountId);
  const save = useSaveWriterProfile(user.accountId);

  const [form, setForm] = useState<WriterProfileInput | null>(null);
  const [customGenre, setCustomGenre] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Fill the form once the existing listing (if any) has loaded.
  useEffect(() => {
    if (isLoading || contactLoading || form) return;
    setForm({
      userId: user.id,
      name: existing?.name || user.name,
      username: user.username,
      imageUrl: user.imageUrl,
      genres: existing?.genres || [],
      lookingFor: existing?.lookingFor || "",
      about: existing?.about || "",
      workStyle: existing?.workStyle || "",
      location: existing?.location || "",
      listed: existing?.listed ?? true,
      contact: contact || "",
    });
  }, [isLoading, contactLoading, existing, contact, form, user]);

  if (!form) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  const set = <K extends keyof WriterProfileInput>(k: K, v: WriterProfileInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  // Functional updates so rapid clicks never work from a stale genre list.
  const updateGenres = (fn: (genres: string[]) => string[]) =>
    setForm((f) => (f ? { ...f, genres: fn(f.genres) } : f));

  const toggleGenre = (g: string) =>
    updateGenres((gs) =>
      gs.includes(g) ? gs.filter((x) => x !== g) : gs.length < MAX_GENRES ? [...gs, g] : gs,
    );

  const addCustomGenre = () => {
    const g = customGenre.trim().slice(0, 32);
    if (g) updateGenres((gs) => (!gs.includes(g) && gs.length < MAX_GENRES ? [...gs, g] : gs));
    setCustomGenre("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!existing && !agreed) {
      toast({ title: "Please read and agree to the collaboration guidelines.", variant: "destructive" });
      return;
    }
    try {
      // Keep the listing's avatar in sync with the user's current profile.
      await save.mutateAsync({ ...form, imageUrl: user.imageUrl, username: user.username });
      toast({ title: existing ? "Listing updated" : "You're listed!" });
      navigate("/writers-block");
    } catch (err) {
      toast({ title: "Couldn't save your listing", description: (err as Error).message, variant: "destructive" });
    }
  };

  const allGenres = [...new Set([...WRITER_GENRES, ...form.genres])];

  return (
    <div className="common-container">
      <div className="max-w-3xl w-full flex flex-col gap-8">
        <Link to="/writers-block" className="small-medium text-light-3 hover:text-light-1">
          ← Writers Block
        </Link>
        <PageHero eyebrow="Writers Block" title={existing ? "Edit my listing" : "List My Name"}>
          Tell other writers who you are, what you write, and what you're looking for
          in a co-writer.
        </PageHero>

        <form onSubmit={submit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Display name</span>
            <Input
              required
              maxLength={128}
              className="shad-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>

          <fieldset className="flex flex-col gap-3">
            <legend className="shad-form_label mb-3">
              Genres you write <span className="text-light-3">(up to {MAX_GENRES})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {allGenres.map((g) => {
                const on = form.genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full px-4 py-2 small-medium border transition ${
                      on
                        ? "bg-primary-500 border-primary-500 text-light-1"
                        : "border-dark-4 bg-dark-3 text-light-2 hover:border-primary-500"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                aria-label="Add another genre"
                placeholder="Another genre"
                maxLength={32}
                className="shad-input"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomGenre();
                  }
                }}
              />
              <Button type="button" className="shad-button_dark_4" onClick={addCustomGenre}>
                Add
              </Button>
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">What are you looking for in a co-writer?</span>
            <Input
              required
              maxLength={500}
              placeholder="e.g. A melody writer for a heartbreak ballad"
              className="shad-input"
              value={form.lookingFor}
              onChange={(e) => set("lookingFor", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">About you and the songs you write</span>
            <Textarea
              maxLength={2000}
              className="shad-textarea"
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">How you like to work</span>
            <Input
              maxLength={500}
              placeholder="e.g. In person on weekends, or remote over voice memos"
              className="shad-input"
              value={form.workStyle}
              onChange={(e) => set("workStyle", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Area (optional)</span>
            <Input
              maxLength={128}
              placeholder="e.g. Nashville, TN"
              className="shad-input"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="shad-form_label">Contact details (private)</span>
            <Input
              maxLength={500}
              placeholder="Email, phone, or social handle"
              className="shad-input"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
            <span className="subtle-semibold text-light-3">
              Only shared with writers whose connection request you accept, or who
              accept yours.
            </span>
          </label>

          <label className="flex items-center gap-3 small-medium">
            <input
              type="checkbox"
              checked={form.listed}
              onChange={(e) => set("listed", e.target.checked)}
              className="h-4 w-4 accent-primary-500"
            />
            Show my listing on the Writers Block board
          </label>

          {!existing && (
            <>
              <SafetyNotice compact />
              <label className="flex items-start gap-3 small-medium">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 mt-0.5 accent-primary-500"
                />
                I understand that I'm responsible for protecting my own work, checking
                who I collaborate with, and getting agreements in writing.
              </label>
            </>
          )}

          <Button type="submit" className="shad-button_primary self-end px-10" disabled={save.isPending}>
            {save.isPending ? <Loader /> : existing ? "Save changes" : "List My Name"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MyListing;
