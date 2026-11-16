import { Link, useParams } from "react-router-dom";

import { hasRole } from "@/lib/roles";
import { useGuideChapter, useGuideChapters } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import RichText from "@/components/writers/RichText";

/** YouTube/Vimeo watch links -> embeddable URL; anything else is shown as a link. */
function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v"))
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com") && /^\/\d+/.test(u.pathname))
      return `https://player.vimeo.com/video${u.pathname}`;
  } catch {
    /* not a URL */
  }
  return null;
}

const GuideChapter = () => {
  const { id = "" } = useParams();
  const { user } = useUserContext();
  const isAdmin = hasRole(user, "admin");
  const { data: chapter, isLoading, isError } = useGuideChapter(id);
  const { data: chapters } = useGuideChapters(isAdmin);

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }
  if (isError || !chapter || (!chapter.published && !isAdmin)) {
    return (
      <div className="common-container">
        <p className="body-medium">That chapter couldn't be found.</p>
        <Link to="/guild-me-through-it" className="text-primary-500">
          Back to the guide
        </Link>
      </div>
    );
  }

  const index = chapters?.findIndex((c) => c.$id === chapter.$id) ?? -1;
  const prev = index > 0 ? chapters?.[index - 1] : undefined;
  const next = index >= 0 ? chapters?.[index + 1] : undefined;
  const embed = chapter.videoUrl ? embedUrl(chapter.videoUrl) : null;

  return (
    <div className="common-container">
      <article className="max-w-3xl w-full flex flex-col gap-8">
        <div className="flex-between gap-4">
          <Link to="/guild-me-through-it" className="small-medium text-light-3 hover:text-light-1">
            ← Guild Me Through It
          </Link>
          {isAdmin && (
            <Link to={`/guild-me-through-it/${chapter.$id}/edit`}>
              <Button size="sm" className="shad-button_dark_4">
                Edit chapter
              </Button>
            </Link>
          )}
        </div>

        <header className="flex flex-col gap-3">
          <p className="subtle-semibold uppercase tracking-[0.2em] text-primary-500">
            ♪ Chapter {index >= 0 ? index + 1 : ""}
            {!chapter.published && <span className="ml-3 text-[#FFB620]">Draft</span>}
          </p>
          <h1 className="h2-bold md:h1-bold">{chapter.title}</h1>
          {chapter.summary && <p className="body-medium text-light-3">{chapter.summary}</p>}
        </header>

        {chapter.videoUrl &&
          (embed ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-dark-4">
              <iframe
                src={embed}
                title={`Video: ${chapter.title}`}
                className="h-full w-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={chapter.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500">
              Watch the video ↗
            </a>
          ))}

        <RichText text={chapter.body} />

        <nav className="flex-between gap-4 border-t border-dark-4 pt-6" aria-label="Chapters">
          {prev ? (
            <Link to={`/guild-me-through-it/${prev.$id}`} className="small-medium text-light-2 hover:text-primary-500">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/guild-me-through-it/${next.$id}`} className="small-medium text-light-2 hover:text-primary-500 text-right">
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
};

export default GuideChapter;
