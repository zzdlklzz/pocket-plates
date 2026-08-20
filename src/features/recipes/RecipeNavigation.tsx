"use client";

import {
  Archive,
  CalendarDays,
  ChevronRight,
  Ellipsis,
  House,
  Plus,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type RecipeNavigationPage = "archived" | "home" | "meal-planner";

type RecipeNavigationProps = {
  activePage: RecipeNavigationPage;
};

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  id: RecipeNavigationPage;
  label: string;
};

const MORE_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/meal-planner",
    icon: CalendarDays,
    id: "meal-planner",
    label: "Meal planner"
  },
  { href: "/recipes/archived", icon: Archive, id: "archived", label: "Archived recipes" }
];

export function RecipeNavigation({ activePage }: RecipeNavigationProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const isMoreActive = MORE_NAVIGATION_ITEMS.some(({ id }) => id === activePage);

  function closeMoreMenu() {
    setIsMoreOpen(false);
    moreButtonRef.current?.focus();
  }

  return (
    <>
      <nav
        aria-label="Recipe navigation"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-md grid-cols-3 items-center border-t border-slate-200 bg-leaf-50 px-4 py-3 text-xs text-slate-600"
      >
        <NavigationLink
          activePage={activePage}
          item={{ href: "/", icon: House, id: "home", label: "Home" }}
        />

        <Link
          aria-label="Add recipe"
          className="mx-auto rounded-full bg-leaf-700 p-3 text-white"
          href="/recipes/new"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Link>

        <button
          aria-current={isMoreActive ? "page" : undefined}
          aria-expanded={isMoreOpen}
          aria-haspopup="dialog"
          className={isMoreActive ? "flex flex-col items-center gap-1 font-semibold text-leaf-700" : "flex flex-col items-center gap-1"}
          onClick={() => setIsMoreOpen(true)}
          ref={moreButtonRef}
          type="button"
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
          More
        </button>
      </nav>

      {isMoreOpen ? (
        <RecipeMoreMenu activePage={activePage} onClose={closeMoreMenu} />
      ) : null}
    </>
  );
}

function RecipeMoreMenu({ activePage, onClose }: { activePage: RecipeNavigationPage; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label="More"
        aria-modal="true"
        className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-xl outline-none"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">More</h2>
          <button
            aria-label="Close more menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
          {MORE_NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activePage;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="flex items-center gap-3 py-4 text-sm font-semibold text-slate-800"
                href={item.href}
                key={item.id}
                onClick={onClose}
              >
                <Icon className="h-4 w-4 text-leaf-700" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </Link>
            );
          })}
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">More pages will appear here when available.</p>
      </div>
    </div>
  );
}

function NavigationLink({ activePage, item }: { activePage: RecipeNavigationPage; item: NavigationItem }) {
  const Icon = item.icon;
  const isActive = item.id === activePage;

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={isActive ? "flex flex-col items-center gap-1 font-semibold text-leaf-700" : "flex flex-col items-center gap-1"}
      href={item.href}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
