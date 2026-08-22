import { AppPageShell } from "@/components/ui/AppPageShell";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function ProfileEditorSkeleton() {
  return (
    <AppPageShell spacing="compact">
      <div aria-label="Loading profile" role="status">
        <SkeletonBlock className="h-5 w-20 bg-leaf-100" />
        <SkeletonBlock className="mt-6 h-8 w-28" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-8 h-5 w-28" />
        <SkeletonBlock className="mt-2 h-12 w-full bg-white" />
        <SkeletonBlock className="mt-6 h-5 w-24" />
        <SkeletonBlock className="mt-2 h-12 w-full bg-white" />
        <SkeletonBlock className="mt-8 h-12 w-full bg-leaf-100" />
      </div>
    </AppPageShell>
  );
}
