import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { IGenre, IMood, ISong, ITempo } from "@/types";
import { GENRES, GENRE_LABEL, MOODS, TEMPOS } from "@/constants/music";
import { hasRole } from "@/lib/roles";
import { useGenreSongs } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader from "@/components/shared/Loader";
import { ComingSoon } from "@/components/writers/Section";
import SongRow from "@/components/music/SongRow";
import ConnectWithWriter from "@/components/music/ConnectWithWriter";

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`rounded-full px-4 py-1.5 small-medium border transition ${
      on ? "bg-primary-500 border-primary-500 text-light-1" : "border-dark-4 bg-dark-3 text-light-2 hover:border-primary-500"
    }`}
  >
    {children}
  </button>
);

const GenreSongs = () => {
  const { genre = "" } = useParams();
  const valid = GENRES.some((g) => g.slug === genre);
  const { user } = useUserContext();
  const { data: songs, isLoading } = useGenreSongs(genre as IGenre);
  const [mood, setMood] = useState<IMood | "">("");
  const [tempo, setTempo] = useState<ITempo | "">("");
  const [search, setSearch] = useState("");
  const [connectTo, setConnectTo] = useState<ISong | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (songs || []).filter(
      (s) =>
        (!mood || s.mood === mood) &&
        (!tempo || s.tempo === tempo) &&
        (!q || `${s.title} ${s.writerName} ${s.description}`.toLowerCase().includes(q)),
    );
  }, [songs, mood, tempo, search]);

  if (!valid) {
    return (
      <div className="common-container">
        <p className="body-medium">That category doesn't exist.</p>
        <Link to="/perfect-pitch" className="text-primary-500">All genres</Link>
      </div>
    );
  }

  const label = GENRE_LABEL[genre as IGenre];

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        <Link to="/perfect-pitch" className="small-medium text-light-3 hover:text-light-1">
          ← All genres
        </Link>
        <header className="flex-between flex-wrap gap-4">
          <div>
            <h1 className="h2-bold md:h1-bold">{label}</h1>
            <p className="base-regular text-light-2 mt-1">
              Real {label} songs from real writers, ready to be heard.
            </p>
          </div>
          {hasRole(user, "writer") && (
            <Link to={`/my-songs/new?genre=${genre}`}>
              <Button className="shad-button_primary px-6">Upload a {label} song</Button>
            </Link>
          )}
        </header>

        <div className="flex flex-col gap-4">
          <Input
            type="search"
            aria-label={`Search ${label} songs`}
            placeholder="Search by title, writer, or description"
            className="explore-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mood">
            <span className="small-semibold text-light-3 w-16">Mood</span>
            {MOODS.map((m) => (
              <Chip key={m.value} on={mood === m.value} onClick={() => setMood(mood === m.value ? "" : m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tempo">
            <span className="small-semibold text-light-3 w-16">Tempo</span>
            {TEMPOS.map((t) => (
              <Chip key={t.value} on={tempo === t.value} onClick={() => setTempo(tempo === t.value ? "" : t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : !filtered.length ? (
          <ComingSoon>
            {songs?.length ? "No songs match those filters." : `No ${label} songs yet. Check back soon.`}
          </ComingSoon>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((s) => (
              <SongRow
                key={s.$id}
                song={s}
                isMine={s.ownerAccountId === user.accountId}
                onConnect={() => setConnectTo(s)}
              />
            ))}
          </ul>
        )}
      </div>
      {connectTo && <ConnectWithWriter song={connectTo} onClose={() => setConnectTo(null)} />}
    </div>
  );
};

export default GenreSongs;
