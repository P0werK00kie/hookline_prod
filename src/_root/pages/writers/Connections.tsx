import { Link } from "react-router-dom";

import { IConnection } from "@/types";
import { useMyConnections, useRespond, useWithdraw } from "@/lib/hookline/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import PageHero from "@/components/writers/PageHero";
import Section, { ComingSoon } from "@/components/writers/Section";
import WriterAvatar from "@/components/writers/WriterAvatar";

const Connections = () => {
  const { user } = useUserContext();
  const { toast } = useToast();
  const { data, isLoading } = useMyConnections(user.accountId);
  const respond = useRespond(user.accountId);
  const withdraw = useWithdraw(user.accountId);

  if (isLoading || !data) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  const incoming = data.received.filter((c) => c.status === "pending");
  const outgoing = data.sent.filter((c) => c.status === "pending");
  const connected = [...data.sent, ...data.received].filter((c) => c.status === "accepted");

  const onRespond = async (c: IConnection, accept: boolean) => {
    try {
      await respond.mutateAsync({ id: c.$id, accept });
      toast({ title: accept ? `You're connected with ${c.fromName}` : "Request declined" });
    } catch (e) {
      toast({ title: "Couldn't respond", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onWithdraw = async (c: IConnection) => {
    if (!window.confirm(`Withdraw your request to ${c.toName}?`)) return;
    try {
      await withdraw.mutateAsync(c.$id);
    } catch (e) {
      toast({ title: "Couldn't withdraw", description: (e as Error).message, variant: "destructive" });
    }
  };

  const busy = respond.isPending || withdraw.isPending;

  return (
    <div className="common-container">
      <div className="max-w-3xl w-full flex flex-col gap-10">
        <Link to="/writers-block" className="small-medium text-light-3 hover:text-light-1">
          ← Writers Block
        </Link>
        <PageHero eyebrow="Writers Block" title="My connections">
          Requests from other writers, requests you've sent, and the writers you're
          connected with.
        </PageHero>

        <Section title={`Requests for you (${incoming.length})`}>
          {!incoming.length ? (
            <ComingSoon>No new requests.</ComingSoon>
          ) : (
            <ul className="flex flex-col gap-4">
              {incoming.map((c) => (
                <Row key={c.$id} name={c.fromName} userId={c.fromUserId} note={c.note} date={c.$createdAt}>
                  <Button size="sm" className="shad-button_primary px-5" disabled={busy} onClick={() => onRespond(c, true)}>
                    Accept
                  </Button>
                  <Button size="sm" className="shad-button_dark_4 px-5" disabled={busy} onClick={() => onRespond(c, false)}>
                    Decline
                  </Button>
                </Row>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Connected (${connected.length})`}>
          {!connected.length ? (
            <ComingSoon>When a writer accepts your request (or you accept theirs), they'll show up here.</ComingSoon>
          ) : (
            <ul className="flex flex-col gap-4">
              {connected.map((c) => {
                const iSent = c.fromAccountId === user.accountId;
                const theirContact = iSent ? c.toContact : c.fromContact;
                return (
                  <Row
                    key={c.$id}
                    name={iSent ? c.toName : c.fromName}
                    userId={iSent ? c.toUserId : c.fromUserId}
                    note={c.note}
                    date={c.respondedAt || c.$updatedAt}
                  >
                    <p className="small-regular text-light-2">
                      <span className="small-semibold text-light-1">Contact: </span>
                      {theirContact || "They haven't added contact details yet."}
                    </p>
                  </Row>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={`Sent, waiting for a reply (${outgoing.length})`}>
          {!outgoing.length ? (
            <ComingSoon>No pending requests.</ComingSoon>
          ) : (
            <ul className="flex flex-col gap-4">
              {outgoing.map((c) => (
                <Row key={c.$id} name={c.toName} userId={c.toUserId} note={c.note} date={c.$createdAt}>
                  <Button size="sm" variant="ghost" className="shad-button_ghost" disabled={busy} onClick={() => onWithdraw(c)}>
                    Withdraw
                  </Button>
                </Row>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
};

type RowProps = {
  name: string;
  userId: string;
  note: string;
  date: string;
  children: React.ReactNode;
};

const Row = ({ name, userId, note, date, children }: RowProps) => (
  <li className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex flex-col gap-3">
    <div className="flex items-center gap-4">
      <WriterAvatar name={name} size={44} />
      <div className="min-w-0 flex-1">
        <Link to={`/profile/${userId}`} className="base-semibold hover:text-primary-500">
          {name}
        </Link>
        <p className="subtle-semibold text-light-3">{new Date(date).toLocaleDateString()}</p>
      </div>
    </div>
    {note && <p className="small-regular text-light-2 italic">“{note}”</p>}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </li>
);

export default Connections;
