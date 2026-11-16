import { Link } from "react-router-dom";

import { hasRole } from "@/lib/roles";
import { useGuideChapters } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import Section, { ComingSoon } from "@/components/writers/Section";
import GuideItemsSection from "@/components/writers/GuideItemsSection";

const GuildMeThroughIt = () => {
  const { user } = useUserContext();
  const isAdmin = hasRole(user, "admin");
  const { data: chapters, isLoading } = useGuideChapters(isAdmin);

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <PageHero
          eyebrow="Guild Me Through It"
          title="Let us guide you: step by step, song by song."
        >
          Your guide to writing, and to getting your music out into the world.
          Whether you're starting your first song or you've been writing for years,
          start here.
        </PageHero>

        <Section
          title="Your guide to writing"
          description="From finding your hook, to building your lines, to finishing a song you're proud to share."
          action={
            isAdmin && (
              <Link to="/guild-me-through-it/new">
                <Button size="sm" className="shad-button_dark_4">
                  + Add chapter
                </Button>
              </Link>
            )
          }
        >
          {isLoading ? (
            <Loader />
          ) : !chapters?.length ? (
            <ComingSoon>Guide chapters are on the way.</ComingSoon>
          ) : (
            <ol className="flex flex-col gap-3">
              {chapters.map((ch, i) => (
                <li key={ch.$id}>
                  <Link
                    to={`/guild-me-through-it/${ch.$id}`}
                    className="group flex gap-5 items-start rounded-2xl border border-dark-4 bg-dark-2 p-5 hover:border-primary-500 transition"
                  >
                    <span className="h3-bold text-primary-500 w-8 shrink-0">{i + 1}.</span>
                    <span className="flex flex-col gap-1">
                      <span className="body-bold group-hover:text-primary-500">
                        {ch.title}
                        {!ch.published && (
                          <span className="ml-3 subtle-semibold text-[#FFB620]">Draft</span>
                        )}
                      </span>
                      {ch.summary && (
                        <span className="small-regular text-light-3">{ch.summary}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <GuideItemsSection
          title="Connect with local guilds"
          description="Find a guild or writers' group near you, learn together, and write together."
          sections={["guild", "writing_group"]}
          emptyText="Verified local guilds and groups are being added soon."
        />

        <GuideItemsSection
          title="Videos from professionals"
          description="Songwriters, singers, producers, and others who've done this before and want to help."
          sections={["video"]}
          emptyText="Pro videos are on the way."
        />

        <GuideItemsSection
          title="Get your music online, and everywhere else"
          description="Release your music to streaming services and stores, and register with performing rights organizations."
          sections={["distribution", "resource"]}
          emptyText="Sign-up links for verified distribution partners are coming soon."
        />
      </div>
    </div>
  );
};

export default GuildMeThroughIt;
