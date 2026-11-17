import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { GENRE_LABEL, MOODS, TEMPOS, formatDuration } from "@/constants/music";
import { useSong } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import PlayButton from "@/components/music/PlayButton";
import ConnectWithWriter from "@/components/music/ConnectWithWriter";

const SongDetail = () => {
  const { id = "" } = useParams();
  const { user } = useUserContext();
  const { data: song, isLoading, isError } = useSong(id);
  const [connecting, setConnecting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }
  if (isError || !song) {
    return (
      <div className="common-container">
        <p className="body-medium">This song isn't available.</p>
        <Link to="/perfect-pitch" className="text-primary-500">Browse Perfect Pitch</Link>
      </div>
    );
  }

  const isMine = song.ownerAccountId === user.accountId;
  const tags = [
    GENRE_LABEL[song.genre],
    MOODS.find((m) => m.value === song.mood)?.label,
    TEMPOS.find((t) => t.value === song.tempo)?.label &&
      `${TEMPOS.find((t) => t.value === song.tempo)?.label} tempo`,
    formatDuration(song.durationSec),
  ].filter(Boolean);

  return (
    <div className="common-container">
      <article className="max-w-3xl w-full flex flex-col gap-8">
        <Link to={`/perfect-pitch/${song.genre}`} className="small-medium text-light-3 hover:text-light-1">
          ← {GENRE_LABEL[song.genre]}
        </Link>

        <header className="flex gap-5 items-center">
          <PlayButton song={{ id: song.$id, title: song.title, writerName: song.writerName }} size={64} />
          <div className="min-w-0">
            <h1 className="h2-bold md:h1-bold">
              {song.title}
              {!song.published && <span className="ml-3 subtle-semibold text-[#FFB620] align-middle">Private</span>}
            </h1>
            <Link to={`/profile/${song.ownerUserId}`} className="body-medium text-light-3 hover:text-light-1">
              {song.writerName}
            </Link>
          </div>
        </header>

        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-dark-4 px-3 py-1 subtle-semibold text-light-2">{t}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          {isMine ? (
            <Link to={`/my-songs/${song.$id}/edit`}>
              <Button className="shad-button_dark_4 px-6">Edit song</Button>
            </Link>
          ) : (
            <Button className="shad-button_primary px-6" onClick={() => setConnecting(true)}>
              Connect with Writer
            </Button>
          )}
        </div>

        {song.description && (
          <section className="flex flex-col gap-2">
            <h2 className="body-bold">About this song</h2>
            <p className="base-regular text-light-2 whitespace-pre-line">{song.description}</p>
          </section>
        )}
        {song.coWriters && (
          <p className="small-regular text-light-3">
            <span className="small-semibold text-light-1">Co-writers: </span>
            {song.coWriters}
          </p>
        )}
        {song.lyrics && (
          <section className="flex flex-col gap-2">
            <h2 className="body-bold">Lyrics</h2>
            <p className="base-regular text-light-2 whitespace-pre-line rounded-2xl border border-dark-4 bg-dark-2 p-5">
              {song.lyrics}
            </p>
          </section>
        )}
        {isMine && (
          <p className="subtle-semibold text-light-3">
            {song.plays} play{song.plays === 1 ? "" : "s"} by other members
          </p>
        )}
      </article>
      {connecting && <ConnectWithWriter song={song} onClose={() => setConnecting(false)} />}
    </div>
  );
};

export default SongDetail;
