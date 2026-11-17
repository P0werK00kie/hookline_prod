import { PlayableSong, usePlayer } from "@/context/PlayerContext";

const PlayButton = ({ song, size = 44 }: { song: PlayableSong; size?: number }) => {
  const { current, isPlaying, isLoading, toggle } = usePlayer();
  const active = current?.id === song.id;
  const playing = active && isPlaying;
  const label = playing ? `Pause ${song.title}` : `Play ${song.title}`;

  return (
    <button
      type="button"
      onClick={() => toggle(song)}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-full flex-center transition ${
        active ? "bg-primary-500 text-light-1" : "bg-dark-4 text-primary-500 hover:bg-primary-500 hover:text-light-1"
      }`}
      style={{ width: size, height: size }}
    >
      {active && isLoading ? (
        <span className="animate-pulse">…</span>
      ) : playing ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <rect x="3" y="2" width="3.5" height="12" rx="1" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M4 2.5v11a.75.75 0 0 0 1.13.65l9-5.5a.75.75 0 0 0 0-1.3l-9-5.5A.75.75 0 0 0 4 2.5Z" />
        </svg>
      )}
    </button>
  );
};

export default PlayButton;
