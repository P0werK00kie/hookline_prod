import { useState } from "react";

import { ISong } from "@/types";
import { useConnectAboutSong } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import Modal from "@/components/writers/Modal";

type Props = { song: Pick<ISong, "$id" | "title" | "writerName">; onClose: () => void };

/** "Connect with Writer" about a specific song. Open to every signed-in member. */
const ConnectWithWriter = ({ song, onClose }: Props) => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const connect = useConnectAboutSong(user.accountId);
  const [note, setNote] = useState(
    `Hi ${song.writerName}, I'm interested in "${song.title}". `,
  );

  const send = async () => {
    try {
      await connect.mutateAsync({ songId: song.$id, note });
      toast({
        title: "Request sent",
        description: `You'll see ${song.writerName}'s reply in My connections.`,
      });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't send request", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Modal open title={`Connect with ${song.writerName}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">
            Tell them about your project: recording, licensing, or how you'd use the song
          </span>
          <Textarea
            className="shad-textarea"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="subtle-semibold text-light-4 self-end">{note.length}/500</span>
        </label>
        <p className="subtle-semibold text-light-3">
          If {song.writerName} accepts, you'll each see the other's contact details
          (their Writers Block contact, or account email).
        </p>
        <Button className="shad-button_primary" onClick={send} disabled={connect.isPending}>
          {connect.isPending ? <Loader /> : "Send request"}
        </Button>
      </div>
    </Modal>
  );
};

export default ConnectWithWriter;
