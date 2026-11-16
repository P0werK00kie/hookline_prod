import { ReactNode } from "react";

type SectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

const Section = ({ title, description, action, children }: SectionProps) => (
  <section className="w-full flex flex-col gap-5">
    <div className="flex-between gap-4 flex-wrap">
      <div>
        <h2 className="h3-bold">{title}</h2>
        {description && (
          <p className="small-regular text-light-3 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const ComingSoon = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-dark-4 p-5 small-regular text-light-3">
    <span aria-hidden className="mr-2">
      z z
    </span>
    {children}
  </p>
);

export default Section;
