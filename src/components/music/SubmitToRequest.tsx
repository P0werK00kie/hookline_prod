import { useState } from "react";
import { Link } from "react-router-dom";

import { ISongRequest } from "@/types";
import { GENRE_LABEL } from "@/constants/music";
import { useMySongs, useSubmitSong } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import Modal from "@/components/writers/Modal";

/** "Upload to This Posting": pick one of your songs, or upload a new one. */
const SubmitToRequest = ({ request, onClose }: { request: ISongRequest; onClose: () => void }) => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const { data: songs, isLoading } = useMySongs(user.accountId);
  const submit = useSubmitSong();
  const [songId, setSongId] = useState("");
  const [note, setNote] = useState("");

  const send = async () => {
    try {
      await submit.mutateAsync({ requestId: request.$id, songId, note });
      toast({ title: "Song submitted", description: `${request.posterName} can listen to it now.` });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't submit", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Modal open title={`Upload to "${request.title}"`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Link to={`/my-songs/new?request=${request.$id}${request.genre ? `&genre=${request.genre}` : ""}`}>
          <Button className="shad-button_primary w-full">Upload a new song</Button>
        </Link>
        <p className="small-medium text-light-3 text-center">or choose one you've already uploaded</p>
        {isLoading ? (
          <Loader />
        ) : !songs?.length ? (
          <p className="small-regular text-light-3 text-center">You haven't uploaded any songs yet.</p>
        ) : (
          <fieldset className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
            <legend className="sr-only">Your songs</legend>
            {songs.map((s) => (
              <label
                key={s.$id}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                  songId === s.$id ? "border-primary-500 bg-primary-500/10" : "border-dark-4"
                }`}
              >
                <input type="radio" name="song" value={s.$id} checked={songId === s.$id} onChange={() => setSongId(s.$id)} className="accent-primary-500" />
                <span className="flex-1 min-w-0">
                  <span className="block small-semibold line-clamp-1">{s.title}</span>
                  <span className="block subtle-semibold text-light-3">
                    {GENRE_LABEL[s.genre]} · {s.published ? "Published" : "Private"}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Note to {request.posterName} (optional)</span>
          <Textarea maxLength={500} className="shad-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="subtle-semibold text-light-3">
          Private songs stay private: only {request.posterName} can listen to a song you submit here.
        </p>
        <Button className="shad-button_dark_4" disabled={!songId || submit.isPending} onClick={send}>
          {submit.isPending ? <Loader /> : "Submit selected song"}
        </Button>
      </div>
    </Modal>
  );
};

export default SubmitToRequest;
