import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { APP_METADATA } from "@/app/app.constants";
import { MEAL_TYPE_FILTERS } from "./recipe-library.constants";

type SkeletonBlockProps = {
  className: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} aria-hidden="true" />;
}

function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">{children}</main>;
}

function HeaderSkeleton() {
  return (
    <header className="space-y-4 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-slate-800">{APP_METADATA.name}</p>
          <SkeletonBlock className="mt-2 h-3 w-36" />
        </div>
        <SkeletonBlock className="h-9 w-24 rounded-lg bg-white/80" />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <Search className="h-4 w-4" aria-hidden="true" />
        <SkeletonBlock className="h-5 flex-1" />
      </div>
    </header>
  );
}

function MealFilterSkeleton() {
  return (
    <section className="mt-5 flex gap-2 overflow-hidden" aria-hidden="true">
      <SkeletonBlock className="h-8 w-12 shrink-0 rounded-full bg-leaf-700/40" />
      {MEAL_TYPE_FILTERS.slice(0, 4).map((filter) => (
        <SkeletonBlock className="h-8 w-20 shrink-0 rounded-full bg-leaf-100" key={filter.value} />
      ))}
    </section>
  );
}

function RecipeCardSkeleton() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <SkeletonBlock className="aspect-[4/3] w-full rounded-lg bg-leaf-100" />
      <SkeletonBlock className="mx-auto mt-3 h-4 w-24" />
      <div className="mt-3 flex justify-center gap-2">
        <SkeletonBlock className="h-3 w-10" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
      <div className="mt-3 flex justify-center gap-1">
        <SkeletonBlock className="h-5 w-14 rounded-full bg-leaf-50" />
        <SkeletonBlock className="h-5 w-12 rounded-full bg-leaf-50" />
      </div>
    </article>
  );
}

export function RecipeGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <RecipeCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function RecipeLibrarySkeleton() {
  return (
    <PageShell>
      <div role="status" aria-label="Loading recipe library">
        <HeaderSkeleton />
        <MealFilterSkeleton />
        <section className="mt-5" aria-label="Recipe library loading">
          <RecipeGridSkeleton />
        </section>
      </div>
    </PageShell>
  );
}

export function RecipeDetailSkeleton() {
  return (
    <PageShell>
      <div role="status" aria-label="Loading recipe">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-20 bg-leaf-100" />
          <SkeletonBlock className="h-10 w-20 rounded-lg bg-white" />
        </div>
        <section className="mt-5 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
          <SkeletonBlock className="h-9 w-4/5 bg-white/80" />
          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonBlock className="h-6 w-20 rounded-full bg-white/80" />
            <SkeletonBlock className="h-6 w-24 rounded-full bg-white/80" />
          </div>
        </section>
        <SkeletonPanel lines={3} titleWidth="w-16" />
        <SkeletonPanel lines={5} titleWidth="w-24" />
        <SkeletonPanel lines={4} titleWidth="w-16" />
      </div>
    </PageShell>
  );
}

export function RecipeFormSkeleton() {
  return (
    <PageShell>
      <div role="status" aria-label="Loading recipe form">
        <SkeletonBlock className="h-5 w-20 bg-leaf-100" />
        <section className="mt-5 space-y-3 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
          <SkeletonBlock className="h-8 w-36 bg-white/80" />
          <SkeletonBlock className="h-16 w-full bg-white/80" />
          <SkeletonBlock className="h-16 w-full bg-white/80" />
        </section>
        <SkeletonPanel lines={2} titleWidth="w-24" />
        <SkeletonPanel lines={3} titleWidth="w-28" />
        <SkeletonPanel lines={4} titleWidth="w-24" />
        <SkeletonPanel lines={3} titleWidth="w-16" />
        <SkeletonBlock className="mt-5 h-12 w-full rounded-lg bg-leaf-700/40" />
      </div>
    </PageShell>
  );
}

function SkeletonPanel({ lines, titleWidth }: { lines: number; titleWidth: string }) {
  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
      <SkeletonBlock className={`h-4 ${titleWidth}`} />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonBlock className={index % 2 === 0 ? "h-4 w-full" : "h-4 w-4/5"} key={index} />
        ))}
      </div>
    </section>
  );
}
