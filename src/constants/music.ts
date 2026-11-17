import { IGenre, IMood, IProjectType, ITempo } from "@/types";

/** Perfect Pitch categories, in the order the site lists them. */
export const GENRES: { slug: IGenre; label: string }[] = [
  { slug: "christian", label: "Christian" },
  { slug: "country", label: "Country" },
  { slug: "rock", label: "Rock" },
  { slug: "pop", label: "Pop" },
  { slug: "alternative", label: "Alternative" },
  { slug: "blues", label: "Blues" },
  { slug: "folk", label: "Folk" },
  { slug: "hip-hop", label: "Hip Hop" },
  { slug: "classical", label: "Classical" },
  { slug: "rnb", label: "R&B" },
  { slug: "reggae", label: "Reggae" },
  { slug: "jazz", label: "Jazz" },
  { slug: "show-tunes", label: "Show Tunes" },
];

export const GENRE_LABEL = Object.fromEntries(GENRES.map((g) => [g.slug, g.label])) as Record<
  IGenre,
  string
>;

export const MOODS: { value: IMood; label: string }[] = [
  { value: "upbeat", label: "Upbeat" },
  { value: "heartfelt", label: "Heartfelt" },
  { value: "moody", label: "Moody" },
  { value: "anthemic", label: "Anthemic" },
  { value: "chill", label: "Chill" },
];

export const TEMPOS: { value: ITempo; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "mid", label: "Mid" },
  { value: "fast", label: "Fast" },
];

export const PROJECT_TYPES: { value: IProjectType; label: string; badge: string }[] = [
  { value: "record", label: "Song to record", badge: "Artist" },
  { value: "jingle", label: "Jingle", badge: "Jingle" },
  { value: "commercial", label: "Commercial", badge: "Ad" },
  { value: "film", label: "Film", badge: "Film" },
  { value: "tv", label: "TV", badge: "TV" },
  { value: "musical", label: "Musical", badge: "Musical" },
  { value: "album", label: "Album", badge: "Album" },
  { value: "church", label: "Church", badge: "Church" },
  { value: "other", label: "Other", badge: "Other" },
];

export const PROJECT_LABEL = Object.fromEntries(
  PROJECT_TYPES.map((p) => [p.value, p.label]),
) as Record<IProjectType, string>;

export const AUDIO_ACCEPT = {
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "audio/aac": [".aac"],
  "audio/wav": [".wav"],
  "audio/x-wav": [".wav"],
  "audio/ogg": [".ogg"],
  "audio/flac": [".flac"],
};

export const formatDuration = (sec: number) =>
  sec > 0 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : "";
