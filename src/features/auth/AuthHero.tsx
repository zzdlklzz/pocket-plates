import type { ReactNode } from "react";

type AuthHeroProps = {
  description: ReactNode;
  title: ReactNode;
};

export function AuthHero({ description, title }: AuthHeroProps) {
  return (
    <div className="rounded-b-3xl bg-leaf-100 px-4 pb-6 pt-5">
      <p className="text-sm font-semibold text-leaf-700">PocketPlates</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
