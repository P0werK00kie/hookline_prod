import { Link } from "react-router-dom";

import { ISong } from "@/types";
import { GENRE_LABEL, MOODS, TEMPOS, formatDuration } from "@/constants/music";
import { Button } from "@/components/ui/button";
import PlayButton from "./PlayButton";

type SongRowProps = {
  song: ISong;
  isMine: boolean;
  showGenre?: boolean;
  onConnect: () => void;
};

const label = (list: { value: string; label: string }[], v: string | null) =>
  list.find((x) => x.value === v)?.label;

const SongRow = ({ song, isMine, showGenre, onConnect }: SongRowProps) => {
  const meta = [
    showGenre && GENRE_LABEL[song.genre],
    formatDuration(song.durationSec),
    label(MOODS, song.mood),
    label(TEMPOS, song.tempo) && `${label(TEMPOS, song.tempo)} tempo`,
  ].filter(Boolean);

  return (
    <li className="rounded-2xl border border-dark-4 bg-dark-2 p-4 flex items-center gap-4">
      <PlayButton song={{ id: song.$id, title: song.title, writerName: song.writerName }} />
      <div className="min-w-0 flex-1">
        <Link to={`/songs/${song.$id}`} className="base-semibold hover:text-primary-500 line-clamp-1">
          {song.title}
        </Link>
        <Link
          to={`/profile/${song.ownerUserId}`}
          className="small-regular text-light-3 hover:text-light-1 line-clamp-1"
        >
          {song.writerName}
        </Link>
        {meta.length > 0 && (
          <p className="subtle-semibold text-light-4 mt-1">{meta.join(" · ")}</p>
        )}
      </div>
      {isMine ? (
        <Link to={`/my-songs/${song.$id}/edit`} className="small-medium text-primary-500 shrink-0">
          Edit
        </Link>
      ) : (
        <Button size="sm" className="shad-button_dark_4 px-4 shrink-0" onClick={onConnect}>
          Connect with Writer
        </Button>
      )}
    </li>
  );
};

export default SongRow;
