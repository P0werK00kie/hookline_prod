import { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
};

const PageHero = ({ eyebrow, title, children, actions }: PageHeroProps) => (
  <header className="w-full rounded-3xl border border-dark-4 bg-gradient-to-br from-dark-3 to-dark-2 p-7 md:p-10">
    <p className="subtle-semibold uppercase tracking-[0.2em] text-primary-500">
      ♪ {eyebrow}
    </p>
    <h1 className="h2-bold md:h1-bold mt-2">{title}</h1>
    {children && (
      <div className="base-regular text-light-2 mt-3 max-w-3xl">{children}</div>
    )}
    {actions && <div className="flex flex-wrap gap-3 mt-6">{actions}</div>}
  </header>
);

export default PageHero;
