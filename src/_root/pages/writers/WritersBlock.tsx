import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IConnection, IWriterProfile } from "@/types";
import { WRITER_GENRES } from "@/constants";
import {
  useConnect,
  useMyConnections,
  useWriterProfile,
  useWriterProfiles,
} from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/shared/Loader";
import Modal from "@/components/writers/Modal";
import PageHero from "@/components/writers/PageHero";
import Section, { ComingSoon } from "@/components/writers/Section";
import SafetyNotice from "@/components/writers/SafetyNotice";
import WriterAvatar from "@/components/writers/WriterAvatar";
import GuideItemsSection from "@/components/writers/GuideItemsSection";

const STEPS = [
  "List your name if you'd like to collaborate.",
  "Tell other writers who you are: what you write, what you're looking for in a co-writer, and how you like to work.",
  "Browse other writers, reach out, and start writing together.",
];

type Relation =
  | { kind: "none" }
  | { kind: "sent" | "received" | "connected"; connection: IConnection };

const WritersBlock = () => {
  const { user } = useUserContext();
  const { data: writers, isLoading } = useWriterProfiles();
  const { data: mine } = useWriterProfile(user.accountId);
  const { data: connections } = useMyConnections(user.accountId);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [connectTo, setConnectTo] = useState<IWriterProfile | null>(null);

  // Current relationship with each writer, keyed by their account ID.
  const relations = useMemo(() => {
    const map = new Map<string, Relation>();
    for (const c of connections?.sent || []) {
      if (c.status === "declined") continue;
      map.set(c.toAccountId, { kind: c.status === "accepted" ? "connected" : "sent", connection: c });
    }
    for (const c of connections?.received || []) {
      if (c.status === "declined") continue;
      map.set(c.fromAccountId, { kind: c.status === "accepted" ? "connected" : "received", connection: c });
    }
    return map;
  }, [connections]);

  const pendingIncoming =
    connections?.received.filter((c) => c.status === "pending").length || 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (writers || []).filter((w) => {
      if (genre && !w.genres.includes(genre)) return false;
      if (!q) return true;
      return [w.name, w.username, w.lookingFor, w.about, w.location, ...w.genres]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [writers, search, genre]);

  const genres = useMemo(
    () => [...new Set([...WRITER_GENRES, ...(writers || []).flatMap((w) => w.genres)])].sort(),
    [writers],
  );

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <PageHero
          eyebrow="The writers forum"
          title="Welcome to Writers Block"
          actions={
            <>
              <Link to="/writers-block/listing">
                <Button className="shad-button_primary px-6">
                  {mine ? "Edit my listing" : "List My Name"}
                </Button>
              </Link>
              <Link to="/connections">
                <Button className="shad-button_dark_4 px-6">
                  My connections
                  {pendingIncoming > 0 && (
                    <span className="ml-2 rounded-full bg-primary-500 px-2 py-0.5 subtle-semibold text-light-1">
                      {pendingIncoming} new
                    </span>
                  )}
                </Button>
              </Link>
            </>
          }
        >
          This is where writers find each other, start conversations, and build
          songs together.
        </PageHero>

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

        <Section
          title="Find your co-writer"
          description={writers ? `${writers.length} writer${writers.length === 1 ? "" : "s"} listed` : undefined}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="search"
              aria-label="Search writers"
              placeholder="Search by name, style, or what they're looking for"
              className="explore-search flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter by genre"
              className="h-12 rounded-md bg-dark-4 px-3 small-medium text-light-1 sm:w-48"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <Loader />
          ) : !filtered.length ? (
            <ComingSoon>
              {writers?.length
                ? "No writers match that search yet."
                : "No one has listed their name yet. Be the first!"}
            </ComingSoon>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((w) => (
                <WriterCard
                  key={w.$id}
                  writer={w}
                  isMe={w.accountId === user.accountId}
                  relation={relations.get(w.accountId) || { kind: "none" }}
                  onConnect={() => setConnectTo(w)}
                />
              ))}
            </ul>
          )}
        </Section>

        <GuideItemsSection
          title="Local writing groups and forums"
          description="Local writing groups listed by area, and Hook Line and Music forums as they're scheduled."
          sections={["writing_group", "forum"]}
          emptyText="New groups and forum dates are on the way. Check back soon."
        />

        <GuideItemsSection
          title="Resources"
          description="Protect your songs and find the right people to help."
          sections={["resource", "attorney", "guild"]}
          emptyText="Resources are on the way."
        />

        <SafetyNotice />
      </div>

      {connectTo && (
        <ConnectModal
          writer={connectTo}
          hasListing={!!mine}
          onClose={() => setConnectTo(null)}
        />
      )}
    </div>
  );
};

type WriterCardProps = {
  writer: IWriterProfile;
  isMe: boolean;
  relation: Relation;
  onConnect: () => void;
};

const WriterCard = ({ writer, isMe, relation, onConnect }: WriterCardProps) => (
  <li className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex flex-col gap-4">
    <div className="flex gap-4 items-center">
      <WriterAvatar name={writer.name} imageUrl={writer.imageUrl} />
      <div className="min-w-0">
        <Link
          to={`/profile/${writer.userId}`}
          className="base-semibold text-light-1 hover:text-primary-500 line-clamp-1"
        >
          {writer.name}
        </Link>
        {writer.location && (
          <p className="subtle-semibold text-light-3 line-clamp-1">{writer.location}</p>
        )}
      </div>
    </div>

    {writer.genres.length > 0 && (
      <ul className="flex flex-wrap gap-2" aria-label="Genres">
        {writer.genres.map((g) => (
          <li key={g} className="rounded-full bg-dark-4 px-3 py-1 subtle-semibold text-light-2">
            {g}
          </li>
        ))}
      </ul>
    )}

    {writer.lookingFor && (
      <p className="small-regular text-light-2">
        <span className="small-semibold text-light-1">Looking for: </span>
        {writer.lookingFor}
      </p>
    )}
    {writer.about && <p className="small-regular text-light-3 line-clamp-3">{writer.about}</p>}

    <div className="mt-auto pt-2">
      {isMe ? (
        <Link to="/writers-block/listing" className="small-medium text-primary-500">
          This is you · Edit listing
        </Link>
      ) : relation.kind === "none" ? (
        <Button size="sm" className="shad-button_primary px-5" onClick={onConnect}>
          Connect
        </Button>
      ) : relation.kind === "sent" ? (
        <p className="small-medium text-light-3">Request sent</p>
      ) : (
        <Link to="/connections">
          <Button size="sm" className="shad-button_dark_4 px-5">
            {relation.kind === "received" ? "Respond to request" : "Connected · view"}
          </Button>
        </Link>
      )}
    </div>
  </li>
);

const ConnectModal = ({
  writer,
  hasListing,
  onClose,
}: {
  writer: IWriterProfile;
  hasListing: boolean;
  onClose: () => void;
}) => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const connect = useConnect(user.accountId);
  const [note, setNote] = useState("");

  if (!hasListing) {
    return (
      <Modal open title="List your name first" onClose={onClose}>
        <p className="small-regular text-light-2 mb-6">
          So {writer.name} knows who's reaching out, add your Writers Block
          listing before you connect.
        </p>
        <Link to="/writers-block/listing">
          <Button className="shad-button_primary w-full">List My Name</Button>
        </Link>
      </Modal>
    );
  }

  const send = async () => {
    try {
      await connect.mutateAsync({ toAccountId: writer.accountId, note });
      toast({
        title: "Request sent",
        description: `We'll let you know when ${writer.name} responds.`,
      });
      onClose();
    } catch (e) {
      toast({ title: "Couldn't send request", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Modal open title={`Connect with ${writer.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="shad-form_label">Add a note (optional)</span>
          <Textarea
            className="shad-textarea"
            maxLength={500}
            placeholder="Say hi, and what you'd like to write together."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="subtle-semibold text-light-4 self-end">{note.length}/500</span>
        </label>
        <p className="subtle-semibold text-light-3">
          Your contact details are shared only if {writer.name} accepts, and you'll
          see theirs too.
        </p>
        <Button className="shad-button_primary" onClick={send} disabled={connect.isPending}>
          {connect.isPending ? <Loader /> : "Send request"}
        </Button>
      </div>
    </Modal>
  );
};

export default WritersBlock;
