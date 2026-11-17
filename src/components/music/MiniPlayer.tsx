import { useEffect } from "react";

import { usePlayer } from "@/context/PlayerContext";

/** Docked player. The <audio> element is always mounted so playback survives navigation. */
const MiniPlayer = () => {
  const { current, isLoading, stop, audioRef } = usePlayer();

  // Leave room at the bottom of scrolling pages while the player is showing.
  useEffect(() => {
    document.body.classList.toggle("has-player", !!current);
  }, [current]);

  return (
    <div
      className={`fixed z-40 left-0 right-0 bottom-[72px] md:bottom-0 md:left-[270px] border-t border-dark-4 bg-dark-2/95 backdrop-blur px-4 py-3 ${
        current ? "" : "hidden"
      }`}
      aria-label="Now playing"
      role="region"
    >
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="min-w-0 sm:w-56 shrink-0">
          <p className="small-semibold line-clamp-1">{current?.title}</p>
          <p className="subtle-semibold text-light-3 line-clamp-1">
            {isLoading ? "Loading…" : current?.writerName}
          </p>
        </div>
        <audio ref={audioRef} controls preload="none" className="w-full h-10" />
        <button
          type="button"
          onClick={stop}
          aria-label="Close player"
          className="hidden sm:block text-light-3 hover:text-light-1 text-xl px-2"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;
