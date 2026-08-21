"use client";

import { Plus, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RecipeNavigation } from "@/features/recipes/RecipeNavigation";
import {
  useCreateBlankGroceryList,
  useGroceryLists
} from "./grocery-list.queries";
import { MAX_GROCERY_LIST_TITLE_LENGTH } from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { GroceryListCard } from "./GroceryListCard";
import { GroceryListLibrarySkeleton } from "./grocery-list-skeletons";

const LINK_BUTTON_CLASSES =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold";

export function GroceryListLibrary() {
  const listsQuery = useGroceryLists();

  if (listsQuery.isPending) {
    return <GroceryListLibrarySkeleton />;
  }

  return (
    <>
      <AppPageShell>
        <header>
          <p className="text-sm font-semibold text-leaf-700">PocketPlates</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Grocery lists</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Plan what to buy, then check items off in store.
          </p>
          <div className="mt-5 space-y-3">
            <Link
              className={`${LINK_BUTTON_CLASSES} bg-leaf-700 text-white`}
              href="/grocery-lists/new?source=recipes"
            >
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              Generate from recipes
            </Link>
            <Link
              className={`${LINK_BUTTON_CLASSES} border border-slate-200 bg-white text-leaf-700`}
              href="/grocery-lists/new"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New blank list
            </Link>
          </div>
        </header>

        <section aria-label="Your grocery lists" className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Your lists</h2>
            {!listsQuery.isError && listsQuery.data ? (
              <p className="text-xs text-slate-500">
                {listsQuery.data.length} list{listsQuery.data.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          {listsQuery.isError ? (
            <div className="mt-4">
              <InlineNotice role="alert" tone="error">
                {getGroceryListErrorMessage(listsQuery.error, "loadList")}
              </InlineNotice>
              <ActionButton
                className="mt-3"
                onClick={() => listsQuery.refetch()}
                variant="secondary"
              >
                Try again
              </ActionButton>
            </div>
          ) : listsQuery.data?.length ? (
            <ul className="mt-4 space-y-3">
              {listsQuery.data.map((list) => (
                <GroceryListCard key={list.id} list={list} />
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-leaf-100 bg-leaf-50 p-5 text-center">
              <ShoppingBasket className="mx-auto h-7 w-7 text-leaf-700" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">No grocery lists yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with an empty checklist or build one from saved recipes.
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  className={`${LINK_BUTTON_CLASSES} bg-leaf-700 text-white`}
                  href="/grocery-lists/new?source=recipes"
                >
                  Generate from recipes
                </Link>
                <Link
                  className={`${LINK_BUTTON_CLASSES} border border-slate-200 bg-white text-leaf-700`}
                  href="/grocery-lists/new"
                >
                  New blank list
                </Link>
              </div>
            </div>
          )}
        </section>
      </AppPageShell>
      <RecipeNavigation activePage="grocery-lists" />
    </>
  );
}

export function NewGroceryList({ source }: { source: "blank" | "recipes" }) {
  const router = useRouter();
  const createList = useCreateBlankGroceryList();
  const [title, setTitle] = useState("Grocery list");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (source === "recipes") {
    return (
      <AppPageShell spacing="compact">
        <BackLink href="/grocery-lists">Grocery lists</BackLink>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Generate from recipes</h1>
        <InlineNotice className="mt-5" tone="info">
          Recipe selection is coming in the next grocery-list step.
        </InlineNotice>
        <Link
          className="mt-5 inline-flex text-sm font-semibold text-leaf-700"
          href="/grocery-lists/new"
        >
          Create a blank list instead
        </Link>
      </AppPageShell>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      setValidationError("Add a list title.");
      return;
    }
    if (nextTitle.length > MAX_GROCERY_LIST_TITLE_LENGTH) {
      setValidationError(
        `Keep the title under ${MAX_GROCERY_LIST_TITLE_LENGTH} characters.`
      );
      return;
    }

    setValidationError(null);
    try {
      const id = await createList.mutateAsync({ title: nextTitle });
      router.push(`/grocery-lists/${id}`);
    } catch {
      // The mutation error is rendered below the title field.
    }
  }

  return (
    <AppPageShell spacing="compact">
      <BackLink href="/grocery-lists">Grocery lists</BackLink>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">New blank list</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Give your checklist a name. You can add items on the next screen.
      </p>
      <form className="mt-6" onSubmit={submit}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          List title
          <input
            autoFocus
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-leaf-500"
            disabled={createList.isPending}
            maxLength={MAX_GROCERY_LIST_TITLE_LENGTH}
            onChange={(event) => {
              setTitle(event.target.value);
              setValidationError(null);
            }}
            value={title}
          />
        </label>
        {validationError || createList.isError ? (
          <InlineNotice className="mt-4" role="alert" tone="error">
            {validationError ?? getGroceryListErrorMessage(createList.error, "create")}
          </InlineNotice>
        ) : null}
        <ActionButton
          className="mt-5"
          fullWidth
          pending={createList.isPending}
          pendingLabel="Creating..."
          type="submit"
        >
          Create grocery list
        </ActionButton>
      </form>
    </AppPageShell>
  );
}
