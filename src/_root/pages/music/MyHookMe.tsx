import { useState } from "react";
import { Link } from "react-router-dom";

import { ISongRequest, ISubmission, ISubmissionStatus } from "@/types";
import { GENRE_LABEL, formatDuration } from "@/constants/music";
import { hasRole } from "@/lib/roles";
import {
  useDeleteRequest,
  useMyRequests,
  useMySubmissions,
  usePosterSubmissions,
  useReviewSubmission,
  useUpdateRequest,
  useWithdrawSubmission,
} from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import Section, { ComingSoon } from "@/components/writers/Section";
import RequestCard from "@/components/music/RequestCard";
import RequestForm from "@/components/music/RequestForm";
import PlayButton from "@/components/music/PlayButton";
import ConnectWithWriter from "@/components/music/ConnectWithWriter";

const STATUS_STYLE: Record<ISubmissionStatus, string> = {
  submitted: "bg-dark-4 text-light-2",
  shortlisted: "bg-primary-500/20 text-primary-500",
  passed: "bg-dark-4 text-light-4",
};
const STATUS_LABEL: Record<ISubmissionStatus, string> = {
  submitted: "New",
  shortlisted: "Shortlisted",
  passed: "Passed",
};

const MyHookMe = () => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const isWriter = hasRole(user, "writer");
  const { data: requests, isLoading } = useMyRequests(user.accountId);
  const { data: received } = usePosterSubmissions(user.accountId);
  const { data: sent } = useMySubmissions(user.accountId);
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const review = useReviewSubmission();
  const withdraw = useWithdrawSubmission();
  const [editing, setEditing] = useState<ISongRequest | null>(null);
  const [connectFor, setConnectFor] = useState<ISubmission | null>(null);

  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: (e as Error).message, variant: "destructive" });

  const setStatus = (r: ISongRequest, status: "open" | "closed") =>
    updateRequest.mutateAsync({ id: r.$id, data: { status } }).catch(fail("Couldn't update posting"));

  const remove = async (r: ISongRequest) => {
    if (!window.confirm(`Delete "${r.title}"? Writers will no longer see it.`)) return;
    await deleteRequest.mutateAsync(r.$id).catch(fail("Couldn't delete posting"));
  };

  return (
    <div className="common-container">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <Link to="/hook-me" className="small-medium text-light-3 hover:text-light-1">← Hook Me</Link>
        <PageHero eyebrow="Hook Me" title={isWriter ? "My postings & submissions" : "My postings"}>
          Listen to the songs writers send you, shortlist your favourites, and connect
          with the writer.
        </PageHero>

        <Section title="My postings">
          {isLoading ? (
            <Loader />
          ) : !requests?.length ? (
            <ComingSoon>You haven't posted a request yet. Post one from Hook Me.</ComingSoon>
          ) : (
            <div className="flex flex-col gap-6">
              {requests.map((r) => {
                const subs = (received || []).filter((s) => s.requestId === r.$id);
                return (
                  <div key={r.$id} className="flex flex-col gap-3">
                    <ul>
                      <RequestCard request={r}>
                        <Button size="sm" className="shad-button_dark_4" onClick={() => setEditing(r)}>Edit</Button>
                        <Button size="sm" className="shad-button_dark_4" onClick={() => setStatus(r, r.status === "open" ? "closed" : "open")}>
                          {r.status === "open" ? "Close posting" : "Reopen"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red hover:bg-dark-4" onClick={() => remove(r)}>Delete</Button>
                      </RequestCard>
                    </ul>
                    <div className="ml-0 md:ml-6 flex flex-col gap-3">
                      <h4 className="small-semibold text-light-3">
                        {subs.length} submission{subs.length === 1 ? "" : "s"}
                      </h4>
                      {subs.map((s) => (
                        <div key={s.$id} className="rounded-2xl border border-dark-4 bg-dark-3 p-4 flex flex-wrap items-center gap-4">
                          <PlayButton song={{ id: s.songId, title: s.songTitle, writerName: s.writerName }} />
                          <div className="min-w-0 flex-1">
                            <p className="base-semibold line-clamp-1">{s.songTitle}</p>
                            <p className="small-regular text-light-3">
                              <Link to={`/profile/${s.writerUserId}`} className="hover:text-light-1">{s.writerName}</Link>
                              {" · "}
                              {[GENRE_LABEL[s.songGenre], formatDuration(s.songDurationSec)].filter(Boolean).join(" · ")}
                            </p>
                            {s.note && <p className="small-regular text-light-2 italic mt-1">“{s.note}”</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 subtle-semibold ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                          <div className="flex gap-2">
                            {s.status !== "shortlisted" && (
                              <Button size="sm" className="shad-button_dark_4" disabled={review.isPending}
                                onClick={() => review.mutateAsync({ id: s.$id, status: "shortlisted" }).catch(fail("Couldn't update"))}>
                                Shortlist
                              </Button>
                            )}
                            {s.status !== "passed" && (
                              <Button size="sm" variant="ghost" className="shad-button_ghost" disabled={review.isPending}
                                onClick={() => review.mutateAsync({ id: s.$id, status: "passed" }).catch(fail("Couldn't update"))}>
                                Pass
                              </Button>
                            )}
                            <Button size="sm" className="shad-button_primary" onClick={() => setConnectFor(s)}>
                              Connect with Writer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {isWriter && (
          <Section title="Songs I've submitted">
            {!sent?.length ? (
              <ComingSoon>When you upload to a posting, it shows up here with the poster's response.</ComingSoon>
            ) : (
              <ul className="flex flex-col gap-3">
                {sent.map((s) => (
                  <li key={s.$id} className="rounded-2xl border border-dark-4 bg-dark-2 p-4 flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="base-semibold line-clamp-1">{s.songTitle}</p>
                      <p className="small-regular text-light-3">to “{s.requestTitle}”</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 subtle-semibold ${STATUS_STYLE[s.status]}`}>
                      {s.status === "submitted" ? "Waiting" : STATUS_LABEL[s.status]}
                    </span>
                    <Button size="sm" variant="ghost" className="shad-button_ghost" disabled={withdraw.isPending}
                      onClick={() => window.confirm(`Withdraw "${s.songTitle}" from this posting?`) && withdraw.mutateAsync(s.$id).catch(fail("Couldn't withdraw"))}>
                      Withdraw
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>

      {editing && <RequestForm request={editing} onClose={() => setEditing(null)} />}
      {connectFor && (
        <ConnectWithWriter
          song={{ $id: connectFor.songId, title: connectFor.songTitle, writerName: connectFor.writerName }}
          onClose={() => setConnectFor(null)}
        />
      )}
    </div>
  );
};

export default MyHookMe;
