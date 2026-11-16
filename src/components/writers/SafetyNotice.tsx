/** Collaboration safety guidance shown on Writers Block and before listing. */
const POINTS = [
  "Meet in public places for in-person sessions, especially at first, and tell someone you trust where you're going.",
  "Don't share full unreleased songs, lyrics, demos, or recordings with strangers until your work is protected.",
  "Register your copyrights and keep dated records of your work before you share it widely.",
  "Get a written collaboration agreement (a split sheet is a good start) covering who wrote what, ownership, publishing splits, and royalties. Have an entertainment attorney review it.",
  "Never share personal, financial, banking, or password information with other members.",
  "Be wary of anyone asking for upfront fees to collaborate, record, or get your song heard.",
  "A collaboration isn't guaranteed to lead to a recording, publishing deal, or payment.",
  "Hook Line and Music isn't a party to agreements between members and isn't responsible for disputes, losses, misuse, theft, or non-payment.",
  "If someone seems unsafe, dishonest, or suspicious, stop contact, save your messages, and report it to us.",
];

const SafetyNotice = ({ compact = false }: { compact?: boolean }) => (
  <div className="w-full rounded-3xl border border-[#FFB620]/40 bg-dark-2 p-6 md:p-8 flex flex-col gap-4">
    <h2 className={compact ? "body-bold" : "h3-bold"}>
      Important: please read before you collaborate
    </h2>
    <p className="small-regular text-light-2">
      Writers Block is a place for writers to connect. We don't verify anyone's
      identity, credentials, experience, song ownership, or copyright status.
      Connect through local groups where you can, and take these precautions:
    </p>
    <ul className="flex flex-col gap-2 small-regular text-light-2">
      {POINTS.map((p) => (
        <li key={p} className="flex gap-3">
          <span aria-hidden className="text-primary-500">♪</span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
    <p className="subtle-semibold text-light-3">
      This isn't legal advice. Talk to your own entertainment attorney before you
      sign an agreement, release a song, or share rights to your work.
    </p>
  </div>
);

export default SafetyNotice;
