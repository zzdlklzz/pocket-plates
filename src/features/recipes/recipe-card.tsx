import { ChefHat, CircleDollarSign, Gauge } from "lucide-react";
import { MEAL_TYPE_LABELS } from "./recipe-library.constants";
import type { RecipeCardDto } from "./recipe.types";

const COST_LABELS: Record<NonNullable<RecipeCardDto["costRating"]>, string> = {
  very_cheap: "$",
  cheap: "$$",
  moderate: "$$$",
  splurge: "$$$$"
};

const DIFFICULTY_LABELS: Record<NonNullable<RecipeCardDto["difficulty"]>, string> = {
  beginner_friendly: "Beginner",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

type RecipeCardProps = {
  recipe: RecipeCardDto;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const costLabel = recipe.costRating ? COST_LABELS[recipe.costRating] : "Cost";
  const difficultyLabel = recipe.difficulty ? DIFFICULTY_LABELS[recipe.difficulty] : "Difficulty";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full rounded-lg object-cover" src={recipe.imageUrl} />
        ) : (
          <ChefHat className="h-8 w-8" aria-hidden="true" />
        )}
      </div>
      <h2 className="mt-3 text-center text-sm font-semibold text-slate-800">{recipe.title}</h2>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
          {costLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          {difficultyLabel}
        </span>
      </div>
      {recipe.mealTypes.length ? (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {recipe.mealTypes.map((mealType) => (
            <span className="rounded-full bg-leaf-50 px-2 py-1 text-[11px] font-medium text-slate-500" key={mealType}>
              {MEAL_TYPE_LABELS[mealType]}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
