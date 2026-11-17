import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { hooklineApi } from "@/lib/hookline/api";
import { useToast } from "@/components/ui/use-toast";

export type PlayableSong = { id: string; title: string; writerName: string };

type PlayerState = {
  current: PlayableSong | null;
  isLoading: boolean;
  isPlaying: boolean;
  /** Start a song, or pause/resume it if it's already the current one. */
  toggle: (song: PlayableSong) => void;
  stop: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayableSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const on = () => setIsPlaying(true);
    const off = () => setIsPlaying(false);
    a.addEventListener("play", on);
    a.addEventListener("pause", off);
    a.addEventListener("ended", off);
    return () => {
      a.removeEventListener("play", on);
      a.removeEventListener("pause", off);
      a.removeEventListener("ended", off);
    };
  }, []);

  const toggle = useCallback(
    async (song: PlayableSong) => {
      const a = audioRef.current;
      if (!a) return;
      if (current?.id === song.id && a.src) {
        if (a.paused) a.play().catch(() => {});
        else a.pause();
        return;
      }
      setCurrent(song);
      setIsLoading(true);
      a.pause();
      try {
        const { url } = await hooklineApi.listen(song.id);
        a.src = url;
        await a.play();
      } catch (e) {
        toast({ title: "Couldn't play this song", description: (e as Error).message, variant: "destructive" });
        setCurrent(null);
      } finally {
        setIsLoading(false);
      }
    },
    [current, toast],
  );

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setCurrent(null);
  }, []);

  return (
    <PlayerContext.Provider value={{ current, isLoading, isPlaying, toggle, stop, audioRef }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
};
