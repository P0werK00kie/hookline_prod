import { Link } from "react-router-dom";

import { GENRES } from "@/constants/music";
import { hasRole } from "@/lib/roles";
import { useGenreCounts } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import PageHero from "@/components/writers/PageHero";
import Section from "@/components/writers/Section";

const STEPS = [
  "Choose a category.",
  "Listen to songs posted by writers in that category.",
  "Connect with the writer when you find one you love, to talk about recording it, licensing it, or using it in your project.",
];

const PerfectPitch = () => {
  const { user } = useUserContext();
  const { data: counts } = useGenreCounts();
  const isWriter = hasRole(user, "writer");

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <PageHero
          eyebrow="Perfect Pitch"
          title="Looking for your next song to record?"
          actions={
            <>
              <Link to="/hook-me">
                <Button className="shad-button_dark_4 px-6">Post what you need on Hook Me</Button>
              </Link>
              {isWriter && (
                <Link to="/my-songs/new">
                  <Button className="shad-button_primary px-6">Upload a song</Button>
                </Link>
              )}
            </>
          }
        >
          A jingle for your next commercial? A song for a film, TV show, musical, album,
          church service, or special project? Singers, artists, producers, labels,
          publishers, music supervisors, and advertisers come here to find real songs by
          real writers. Browse by category, listen, and connect directly with the writer.
        </PageHero>

        <Section title="Browse music by category">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {GENRES.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/perfect-pitch/${g.slug}`}
                  className="group flex flex-col gap-1 rounded-2xl border border-dark-4 bg-gradient-to-br from-dark-3 to-dark-2 p-5 h-full hover:border-primary-500 transition"
                >
                  <span aria-hidden className="text-primary-500 text-xl">♪</span>
                  <span className="body-bold group-hover:text-primary-500">{g.label}</span>
                  <span className="subtle-semibold text-light-3">
                    {counts?.[g.slug]
                      ? `${counts[g.slug]} song${counts[g.slug] === 1 ? "" : "s"}`
                      : "Be the first"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="How it works">
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <li key={i} className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex gap-4">
                <span className="h3-bold text-primary-500">{i + 1}</span>
                <p className="small-regular text-light-2">{step}</p>
              </li>
            ))}
          </ol>
        </Section>

        <p className="rounded-2xl border border-dark-4 bg-dark-2 p-5 small-regular text-light-3">
          <span className="small-semibold text-light-1">Listening is free during launch. </span>
          Hook Line and Music connects writers with singers and buyers. Agreements,
          licensing, and payments for recording or using a song are between the writer
          and the buyer; make sure all rights are cleared before use. Writers Block has
          resources on copyright and protecting your work.
        </p>
      </div>
    </div>
  );
};

export default PerfectPitch;
