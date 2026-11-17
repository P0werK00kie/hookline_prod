import { ReactNode } from "react";

import { ISongRequest } from "@/types";
import { GENRE_LABEL, PROJECT_TYPES } from "@/constants/music";

export function dueLabel(deadline: string | null) {
  if (!deadline) return "No deadline";
  // Whole calendar days between today and the deadline date, in local time.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(deadline)) - startOfDay(new Date())) / 86400000);
  if (days < 0) return "Past deadline";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 14) return `Due in ${days} days`;
  if (days < 60) return `Due in ${Math.round(days / 7)} weeks`;
  return `Due ${new Date(deadline).toLocaleDateString()}`;
}

const RequestCard = ({ request, children }: { request: ISongRequest; children?: ReactNode }) => {
  const badge = PROJECT_TYPES.find((p) => p.value === request.projectType)?.badge;
  const facts: [string, string][] = [
    ["Genre", [request.genre ? GENRE_LABEL[request.genre] : "Any", request.style].filter(Boolean).join(" · ")],
    ["Mood", request.mood],
    ["Tempo / key / range", request.tempoKeyRange],
    ["Deadline", dueLabel(request.deadline)],
  ];

  return (
    <li className="rounded-2xl border border-dark-4 bg-dark-2 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="rounded-md bg-primary-500/20 px-2 py-1 tiny-medium uppercase tracking-wider text-primary-500">{badge}</span>
        {request.status === "closed" && (
          <span className="rounded-md bg-dark-4 px-2 py-1 tiny-medium uppercase tracking-wider text-light-3">Closed</span>
        )}
        <span className="subtle-semibold text-light-4">Posted by {request.posterName}</span>
      </div>
      <h3 className="body-bold">{request.title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="tiny-medium uppercase tracking-wider text-light-4">{k}</dt>
              <dd className="small-regular text-light-2">{v}</dd>
            </div>
          ))}
      </dl>
      {request.details && <p className="small-regular text-light-3 whitespace-pre-line line-clamp-4">{request.details}</p>}
      {children && <div className="flex flex-wrap items-center gap-3 mt-auto pt-2">{children}</div>}
    </li>
  );
};

export default RequestCard;
