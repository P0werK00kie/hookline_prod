import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IGenre, IProjectType, ISongRequest } from "@/types";
import { GENRES, PROJECT_TYPES } from "@/constants/music";
import { hasRole } from "@/lib/roles";
import { useOpenRequests } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import Section, { ComingSoon } from "@/components/writers/Section";
import RequestCard from "@/components/music/RequestCard";
import RequestForm from "@/components/music/RequestForm";
import SubmitToRequest from "@/components/music/SubmitToRequest";

const WHAT_TO_POST = [
  "The kind of song: one to record, a jingle, or a song for a film, TV show, musical, commercial, album, or church service",
  "Genre and style",
  "Mood, theme, and message",
  "Tempo, key, or vocal range, if you know it",
  "What the song is for, and when you need it",
];

const STEPS: [string, string][] = [
  ["Post.", "Producers, singers, and other buyers post what they're looking for."],
  ["Search.", "Writers search the postings."],
  ["Upload.", "Writers upload their songs to the postings that fit."],
  ["Connect.", "The poster and the writer connect directly to talk about the song."],
];

const HookMe = () => {
  const { user } = useUserContext();
  const isWriter = hasRole(user, "writer");
  const { data: requests, isLoading } = useOpenRequests();
  const [posting, setPosting] = useState(false);
  const [submitTo, setSubmitTo] = useState<ISongRequest | null>(null);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<IGenre | "">("");
  const [project, setProject] = useState<IProjectType | "">("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests || []).filter(
      (r) =>
        (!genre || r.genre === genre || !r.genre) &&
        (!project || r.projectType === project) &&
        (!q ||
          [r.title, r.style, r.mood, r.details, r.tempoKeyRange, r.posterName]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [requests, search, genre, project]);

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <PageHero
          eyebrow="Hook Me"
          title="Looking for something particular?"
          actions={
            <>
              <Button className="shad-button_primary px-6" onClick={() => setPosting(true)}>
                Post a Request
              </Button>
              <Link to="/hook-me/mine">
                <Button className="shad-button_dark_4 px-6">
                  {isWriter ? "My postings & submissions" : "My postings"}
                </Button>
              </Link>
            </>
          }
        >
          Post it here, and let the writers come to you. Producers, singers, and anyone
          who needs a song can say exactly what they need, and writers upload songs to
          your posting.
        </PageHero>

        <Section title="Post what you're looking for" description="Be as specific as you can. The clearer your post, the easier it is for the right writer to find you.">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WHAT_TO_POST.map((t) => (
              <li key={t} className="flex gap-3 small-regular text-light-2">
                <span aria-hidden className="text-primary-500">♪</span>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={isWriter ? "Find the postings that fit your songs" : "Open postings"}
          description={isWriter ? "Search by genre, keyword, mood, or project, then upload your song to the postings that fit." : undefined}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="search"
              aria-label="Search postings"
              placeholder="Search by keyword, mood, or project…"
              className="explore-search flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select aria-label="Genre" className="h-12 rounded-md bg-dark-4 px-3 small-medium sm:w-44" value={genre} onChange={(e) => setGenre(e.target.value as IGenre | "")}>
              <option value="">All genres</option>
              {GENRES.map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
            </select>
            <select aria-label="Project type" className="h-12 rounded-md bg-dark-4 px-3 small-medium sm:w-44" value={project} onChange={(e) => setProject(e.target.value as IProjectType | "")}>
              <option value="">All projects</option>
              {PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {isLoading ? (
            <Loader />
          ) : !filtered.length ? (
            <ComingSoon>{requests?.length ? "No postings match that search." : "No open postings yet. Post the first one!"}</ComingSoon>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((r) => (
                <RequestCard key={r.$id} request={r}>
                  {r.posterAccountId === user.accountId ? (
                    <Link to="/hook-me/mine" className="small-medium text-primary-500">
                      Your posting · view submissions
                    </Link>
                  ) : isWriter ? (
                    <Button size="sm" className="shad-button_primary px-5" onClick={() => setSubmitTo(r)}>
                      Upload to This Posting
                    </Button>
                  ) : (
                    <span className="subtle-semibold text-light-4">Writers can upload songs to this posting</span>
                  )}
                </RequestCard>
              ))}
            </ul>
          )}
        </Section>

        <Section title="How it works">
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map(([h, t], i) => (
              <li key={h} className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex flex-col gap-2">
                <span className="h3-bold text-primary-500">{i + 1}</span>
                <p className="base-semibold">{h}</p>
                <p className="small-regular text-light-2">{t}</p>
              </li>
            ))}
          </ol>
        </Section>

        <p className="rounded-2xl border border-dark-4 bg-dark-2 p-5 small-regular text-light-3">
          Hook Line and Music connects writers and buyers. Agreements, licensing, and
          payments for recording or using a song are between the writer and the buyer;
          make sure all rights are cleared before use.
        </p>
      </div>

      {posting && <RequestForm onClose={() => setPosting(false)} />}
      {submitTo && <SubmitToRequest request={submitTo} onClose={() => setSubmitTo(null)} />}
    </div>
  );
};

export default HookMe;
