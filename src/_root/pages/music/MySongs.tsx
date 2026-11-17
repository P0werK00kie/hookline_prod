import { Link } from "react-router-dom";

import { ISong } from "@/types";
import { GENRE_LABEL, formatDuration } from "@/constants/music";
import { useDeleteSong, useMySongs, useUpdateSong } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import { ComingSoon } from "@/components/writers/Section";
import PlayButton from "@/components/music/PlayButton";

const MySongs = () => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const { data: songs, isLoading } = useMySongs(user.accountId);
  const update = useUpdateSong(user.accountId);
  const remove = useDeleteSong();

  const togglePublished = async (s: ISong) => {
    try {
      await update.mutateAsync({
        id: s.$id,
        input: {
          title: s.title, genre: s.genre, mood: s.mood, tempo: s.tempo,
          description: s.description, lyrics: s.lyrics, coWriters: s.coWriters,
          published: !s.published,
        },
      });
      toast({ title: s.published ? `"${s.title}" is now private` : `"${s.title}" is live on Perfect Pitch` });
    } catch (e) {
      toast({ title: "Couldn't update", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onDelete = async (s: ISong) => {
    if (!window.confirm(`Delete "${s.title}" and its audio file? This can't be undone.`)) return;
    try {
      await remove.mutateAsync(s);
      toast({ title: "Song deleted" });
    } catch (e) {
      toast({ title: "Couldn't delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        <PageHero
          eyebrow="For Writers"
          title="My Songs"
          actions={
            <Link to="/my-songs/new">
              <Button className="shad-button_primary px-6">Upload a song</Button>
            </Link>
          }
        >
          Post your songs so singers, artists, and producers can find them on Perfect
          Pitch. Keep a song private to share it only through Hook Me submissions.
        </PageHero>

        {isLoading ? (
          <Loader />
        ) : !songs?.length ? (
          <ComingSoon>You haven't uploaded any songs yet.</ComingSoon>
        ) : (
          <ul className="flex flex-col gap-3">
            {songs.map((s) => (
              <li key={s.$id} className="rounded-2xl border border-dark-4 bg-dark-2 p-4 flex flex-wrap items-center gap-4">
                <PlayButton song={{ id: s.$id, title: s.title, writerName: s.writerName }} />
                <div className="min-w-0 flex-1">
                  <Link to={`/songs/${s.$id}`} className="base-semibold hover:text-primary-500 line-clamp-1">
                    {s.title}
                  </Link>
                  <p className="subtle-semibold text-light-3">
                    {[GENRE_LABEL[s.genre], formatDuration(s.durationSec), `${s.plays} play${s.plays === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 subtle-semibold ${
                    s.published ? "bg-primary-500/20 text-primary-500" : "bg-dark-4 text-[#FFB620]"
                  }`}
                >
                  {s.published ? "Published" : "Private"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" className="shad-button_dark_4" disabled={update.isPending} onClick={() => togglePublished(s)}>
                    {s.published ? "Make private" : "Publish"}
                  </Button>
                  <Link to={`/my-songs/${s.$id}/edit`}>
                    <Button size="sm" className="shad-button_dark_4">Edit</Button>
                  </Link>
                  <Button size="sm" variant="ghost" className="text-red hover:bg-dark-4" disabled={remove.isPending} onClick={() => onDelete(s)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MySongs;
