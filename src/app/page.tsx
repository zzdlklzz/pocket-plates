import { ChefHat, CircleDollarSign, Gauge, Plus, Search, SlidersHorizontal } from "lucide-react";
import { APP_METADATA } from "./app.constants";
import { AuthPanel } from "@/features/auth/auth-panel";
import { AUTH_SEARCH_PARAM, getAuthMessage } from "@/features/auth/auth.constants";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { MEAL_FILTER_LABELS, STARTER_RECIPE_CARDS } from "@/features/recipes/recipe-library.constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const authMessageKey = searchParams?.[AUTH_SEARCH_PARAM];
  const authMessage = getAuthMessage(Array.isArray(authMessageKey) ? authMessageKey[0] : authMessageKey);

  if (!user) {
    return <AuthPanel message={authMessage} />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">
      <header className="space-y-4 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{APP_METADATA.name}</h1>
            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search recipes</span>
        </label>
      </header>

      <section className="mt-5 flex gap-2 overflow-x-auto" aria-label="Meal type filters">
        {MEAL_FILTER_LABELS.map((filter, index) => (
          <button
            className={
              index === 0
                ? "shrink-0 rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                : "shrink-0 rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-600"
            }
            key={filter}
            type="button"
          >
            {filter}
          </button>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-4" aria-label="Recipe library">
        {STARTER_RECIPE_CARDS.map((recipe) => (
          <article className="rounded-lg border border-slate-200 bg-white p-3" key={recipe.title}>
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
              <ChefHat className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-center text-sm font-semibold text-slate-800">{recipe.title}</h2>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                {recipe.cost}
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                {recipe.difficulty}
              </span>
            </div>
          </article>
        ))}
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-around border-t border-slate-200 bg-leaf-50 px-5 py-4 text-sm text-slate-600">
        <button className="font-semibold text-leaf-700" type="button">
          Home
        </button>
        <button className="rounded-full bg-leaf-700 p-3 text-white" type="button" aria-label="Add recipe">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button className="flex items-center gap-1" type="button">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </nav>
    </main>
  );
}
