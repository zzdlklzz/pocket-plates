import { AppPageShell } from "@/components/ui/AppPageShell";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <AppPageShell>
      <div aria-label="Loading meal planner" role="status">
        <SkeletonBlock className="h-8 w-40 bg-leaf-100" />
        <SkeletonBlock className="mt-3 h-4 w-36" />
        <div className="mt-5 grid grid-cols-7 gap-2" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBlock className="h-12" key={index} />
          ))}
        </div>
        <div className="mt-6 space-y-6" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <section key={index}>
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="mt-3 h-14 w-full bg-white" />
              <SkeletonBlock className="mt-2 h-11 w-full bg-leaf-50" />
            </section>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
