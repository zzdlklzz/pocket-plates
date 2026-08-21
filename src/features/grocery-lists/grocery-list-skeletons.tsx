import { AppPageShell } from "@/components/ui/AppPageShell";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function GroceryListLibrarySkeleton() {
  return (
    <AppPageShell>
      <div aria-label="Loading grocery lists" role="status">
        <SkeletonBlock className="h-4 w-24 bg-leaf-100" />
        <SkeletonBlock className="mt-4 h-9 w-48" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-5 h-11 w-full bg-leaf-100" />
        <SkeletonBlock className="mt-3 h-11 w-full bg-white" />
        <SkeletonBlock className="mt-8 h-5 w-24" />
        <SkeletonBlock className="mt-4 h-28 w-full bg-white" />
        <SkeletonBlock className="mt-3 h-28 w-full bg-white" />
      </div>
    </AppPageShell>
  );
}

export function NewGroceryListSkeleton() {
  return (
    <AppPageShell spacing="compact">
      <div aria-label="Loading new grocery list" role="status">
        <SkeletonBlock className="h-5 w-28 bg-leaf-100" />
        <SkeletonBlock className="mt-6 h-8 w-44" />
        <SkeletonBlock className="mt-6 h-20 w-full bg-white" />
        <SkeletonBlock className="mt-5 h-11 w-full bg-leaf-100" />
      </div>
    </AppPageShell>
  );
}

export function GroceryListDetailSkeleton() {
  return (
    <AppPageShell>
      <div aria-label="Loading grocery list" role="status">
        <SkeletonBlock className="h-5 w-28 bg-leaf-100" />
        <SkeletonBlock className="mt-6 h-4 w-32" />
        <SkeletonBlock className="mt-3 h-8 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-36" />
        <SkeletonBlock className="mt-5 h-11 w-full bg-white" />
        <SkeletonBlock className="mt-8 h-5 w-24" />
        <SkeletonBlock className="mt-4 h-16 w-full bg-white" />
        <SkeletonBlock className="mt-3 h-16 w-full bg-white" />
      </div>
    </AppPageShell>
  );
}
