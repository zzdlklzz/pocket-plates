import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeForm } from "../RecipeForm";
import { RecipeImageField } from "../RecipeImageField";
import type { RecipeFormValues } from "../recipe.types";

const mocks = vi.hoisted(() => ({
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  processRecipeImage: vi.fn<(file: File) => Promise<File>>()
}));

vi.mock("../recipe-image.processor", () => ({
  processRecipeImage: mocks.processRecipeImage
}));

vi.mock("../recipe.queries", () => ({
  useCreateRecipe: () => ({ error: null, isPending: false, mutateAsync: mocks.createRecipe }),
  useUpdateRecipe: () => ({ error: null, isPending: false, mutateAsync: mocks.updateRecipe })
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({})
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRecipe.mockResolvedValue("recipe-1");
  mocks.updateRecipe.mockResolvedValue("recipe-1");
  mocks.processRecipeImage.mockImplementation(async (file) => file);
});

function renderRecipeForm(initialValues?: RecipeFormValues, initialImageUrl?: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeForm
        initialImageUrl={initialImageUrl}
        initialValues={initialValues}
        recipeId={initialValues ? "recipe-1" : undefined}
      />
    </QueryClientProvider>
  );
}

function getSection(name: string) {
  const heading = screen.getByRole("heading", { name });
  const section = heading.closest("section");

  if (!section) {
    throw new Error(`Could not find the ${name} section.`);
  }

  return within(section);
}

describe("RecipeForm", () => {
  it("constrains the form fieldset to the mobile page width", () => {
    const { container } = renderRecipeForm();

    expect(container.querySelector("fieldset")).toHaveClass("min-w-0", "w-full");
  });

  it("keeps optional cost and difficulty choices available", () => {
    renderRecipeForm();

    const optionsFor = (name: string) =>
      within(screen.getByRole("combobox", { name }))
        .getAllByRole("option")
        .map((option) => [(option as HTMLOptionElement).value, option.textContent]);

    expect(optionsFor("Cost")).toEqual([
      ["", "Optional"],
      ["very_cheap", "Very cheap"],
      ["cheap", "Cheap"],
      ["moderate", "Moderate"],
      ["splurge", "Splurge"]
    ]);
    expect(optionsFor("Difficulty")).toEqual([
      ["", "Optional"],
      ["beginner_friendly", "Beginner"],
      ["easy", "Easy"],
      ["medium", "Medium"],
      ["hard", "Hard"]
    ]);
  });

  it("selects, previews, replaces, and removes a device image", async () => {
    const createObjectUrl = vi.fn(() => "blob:recipe-cover");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    renderRecipeForm();

    const file = new File(["image"], "dinner.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [file] } });

    expect(await screen.findByAltText("Recipe cover preview")).toHaveAttribute("src", "blob:recipe-cover");
    expect(screen.getByText("Selected: dinner.webp")).toBeInTheDocument();
    expect(screen.getByLabelText("Replace image")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp"
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByAltText("Recipe cover preview")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choose image")).toBeInTheDocument();
  });

  it("waits for image processing before previewing or emitting a replacement", async () => {
    const processedFile = new File(["processed"], "dinner.webp", { type: "image/webp" });
    let finishProcessing: ((file: File) => void) | undefined;
    const processing = new Promise<File>((resolve) => {
      finishProcessing = resolve;
    });
    mocks.processRecipeImage.mockReturnValueOnce(processing);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:processed-cover")
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const onChange = vi.fn();
    render(<RecipeImageField onChange={onChange} />);

    const sourceFile = new File(["source"], "dinner.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [sourceFile] } });

    expect(screen.getByRole("status")).toHaveTextContent("Processing image...");
    expect(screen.queryByAltText("Recipe cover preview")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    finishProcessing?.(processedFile);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ file: processedFile, type: "replace" });
    });
    expect(screen.getByAltText("Recipe cover preview")).toHaveAttribute("src", "blob:processed-cover");
    expect(screen.getByText("Selected: dinner.webp")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not submit the recipe until image processing finishes", async () => {
    const processedFile = new File(["processed"], "dinner.webp", { type: "image/webp" });
    let finishProcessing: ((file: File) => void) | undefined;
    const processing = new Promise<File>((resolve) => {
      finishProcessing = resolve;
    });
    mocks.processRecipeImage.mockReturnValueOnce(processing);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:processed-cover")
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const values: RecipeFormValues = {
      title: "Dinner",
      servings: 2,
      mealTypes: ["dinner"],
      costRating: "",
      difficulty: "",
      effortLabels: [],
      equipmentKeys: [],
      sourceLinks: [],
      notes: "",
      ingredients: [{ name: "Rice", amount: "", unit: "", notes: "" }],
      steps: [{ instruction: "Cook the rice." }]
    };
    renderRecipeForm(values);

    const sourceFile = new File(["source"], "dinner.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [sourceFile] } });

    const processingButton = screen.getByRole("button", { name: "Processing image..." });
    expect(processingButton).toBeDisabled();
    fireEvent.click(processingButton);
    expect(mocks.updateRecipe).not.toHaveBeenCalled();

    finishProcessing?.(processedFile);
    const saveButton = await screen.findByRole("button", { name: "Save recipe" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(mocks.updateRecipe).toHaveBeenCalledTimes(1));
  });

  it("ignores a processing result after the image field unmounts", async () => {
    const processedFile = new File(["processed"], "dinner.webp", { type: "image/webp" });
    let finishProcessing: ((file: File) => void) | undefined;
    const processing = new Promise<File>((resolve) => {
      finishProcessing = resolve;
    });
    mocks.processRecipeImage.mockReturnValueOnce(processing);
    const createObjectUrl = vi.fn(() => "blob:unused-cover");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const onChange = vi.fn();
    const { unmount } = render(<RecipeImageField onChange={onChange} />);

    const sourceFile = new File(["source"], "dinner.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [sourceFile] } });
    unmount();

    await act(async () => {
      finishProcessing?.(processedFile);
      await processing;
    });

    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the pending replacement when processing another image fails", async () => {
    const firstProcessedFile = new File(["processed"], "first.webp", { type: "image/webp" });
    mocks.processRecipeImage
      .mockResolvedValueOnce(firstProcessedFile)
      .mockRejectedValueOnce(new Error("This image could not be processed. Choose a different file."));
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:first-cover")
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const onChange = vi.fn();
    render(
      <RecipeImageField
        initialImageUrl="https://example.com/current.jpg"
        onChange={onChange}
      />
    );

    const firstSourceFile = new File(["first"], "first.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Replace image"), {
      target: { files: [firstSourceFile] }
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    const failedSourceFile = new File(["broken"], "broken.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Replace image"), {
      target: { files: [failedSourceFile] }
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This image could not be processed. Choose a different file."
    );
    expect(screen.getByAltText("Recipe cover preview")).toHaveAttribute("src", "blob:first-cover");
    expect(screen.getByText("Selected: first.webp")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ file: firstProcessedFile, type: "replace" });
  });

  it("keeps an existing cover until the user removes or replaces it", () => {
    renderRecipeForm(undefined, "https://example.com/current.jpg");

    expect(screen.getByAltText("Recipe cover preview")).toHaveAttribute(
      "src",
      "https://example.com/current.jpg"
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByAltText("Recipe cover preview")).not.toBeInTheDocument();
  });

  it("adds and removes dynamic source, ingredient, and step rows", () => {
    renderRecipeForm();

    const sources = getSection("Sources");
    fireEvent.click(sources.getByRole("button", { name: "Add source" }));
    const sourceUrl = sources.getByPlaceholderText("https://example.com/recipe");
    expect(sourceUrl).toHaveFocus();
    fireEvent.click(sources.getByRole("button", { name: "Remove" }));
    expect(sources.queryByPlaceholderText("https://example.com/recipe")).not.toBeInTheDocument();

    const ingredients = getSection("Ingredients");
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveFocus();
    expect(ingredients.getByRole("heading", { name: "Ingredients" })).toHaveTextContent("Ingredients · 2");
    fireEvent.click(ingredients.getByRole("button", { name: "Remove ingredient 2" }));
    expect(ingredients.getByRole("heading", { name: "Ingredients" })).toHaveTextContent("Ingredients · 1");

    const steps = getSection("Steps");
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    const secondStep = steps.getByPlaceholderText("Step 2");
    expect(secondStep).toHaveFocus();
    expect(steps.getByRole("heading", { name: "Steps" })).toHaveTextContent("Steps · 2");
    fireEvent.click(steps.getByRole("button", { name: "Remove step 2" }));
    expect(steps.queryByPlaceholderText("Step 2")).not.toBeInTheDocument();
    expect(steps.getByRole("heading", { name: "Steps" })).toHaveTextContent("Steps · 1");
  });

  it("restores removed repeating rows at their original positions", () => {
    renderRecipeForm();

    const sources = getSection("Sources");
    fireEvent.click(sources.getByRole("button", { name: "Add source" }));
    fireEvent.change(sources.getByPlaceholderText("https://example.com/recipe"), {
      target: { value: "https://example.com/rice" }
    });
    fireEvent.click(sources.getByRole("button", { name: "Remove" }));
    fireEvent.click(sources.getByRole("button", { name: "Undo" }));
    expect(sources.getByPlaceholderText("https://example.com/recipe")).toHaveValue("https://example.com/rice");

    const ingredients = getSection("Ingredients");
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Rice" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Egg" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Remove ingredient 1" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Undo" }));
    expect(ingredients.getAllByRole("button", { name: /Edit ingredient/ }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Edit ingredient 1: Rice",
      "Edit ingredient 2: Egg"
    ]);

    const steps = getSection("Steps");
    fireEvent.change(steps.getByPlaceholderText("Step 1"), { target: { value: "Cook rice." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    fireEvent.change(steps.getByPlaceholderText("Step 2"), { target: { value: "Serve." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));
    fireEvent.click(steps.getByRole("button", { name: "Remove step 1" }));
    fireEvent.click(steps.getByRole("button", { name: "Undo" }));
    expect(steps.getByRole("button", { name: "Edit step 1: Cook rice." })).toBeInTheDocument();
    expect(steps.getByRole("button", { name: "Edit step 2: Serve." })).toBeInTheDocument();
  });

  it("shows undo in the deleted row's former position", () => {
    const initialValues: RecipeFormValues = {
      title: "Pancakes",
      servings: 4,
      mealTypes: ["breakfast"],
      costRating: "cheap",
      difficulty: "easy",
      effortLabels: ["make_ahead"],
      equipmentKeys: ["oven"],
      sourceLinks: [
        { label: "First source", url: "https://example.com/first" },
        { label: "Second source", url: "https://example.com/second" }
      ],
      notes: "",
      ingredients: [
        { name: "Milk", amount: "1", unit: "cups", notes: "" },
        { name: "Egg", amount: "1", unit: "pcs", notes: "" },
        { name: "Flour", amount: "1", unit: "cups", notes: "" }
      ],
      steps: [
        { instruction: "Whisk the milk and egg." },
        { instruction: "Mix in the flour." },
        { instruction: "Cook the pancakes." }
      ]
    };

    renderRecipeForm(initialValues);

    const sources = getSection("Sources");
    fireEvent.click(sources.getAllByRole("button", { name: "Remove" })[0]);
    const sourceNotice = sources.getByText("Source removed.").parentElement;
    expect(sourceNotice?.nextElementSibling).toContainElement(sources.getByDisplayValue("Second source"));

    const ingredients = getSection("Ingredients");
    fireEvent.click(ingredients.getByRole("button", { name: "Remove ingredient 2" }));
    const ingredientNotice = ingredients.getByText("Ingredient removed.").parentElement;
    expect(ingredientNotice?.nextElementSibling).toContainElement(
      ingredients.getByRole("button", { name: "Edit ingredient 2: 1 cups Flour" })
    );

    const steps = getSection("Steps");
    fireEvent.click(steps.getByRole("button", { name: "Remove step 3" }));
    const stepNotice = steps.getByText("Step removed.").parentElement;
    expect(stepNotice?.previousElementSibling).toContainElement(
      steps.getByRole("button", { name: "Edit step 2: Mix in the flour." })
    );
    expect(stepNotice?.nextElementSibling).toBeNull();
  });

  it("uses direct delete controls and drag handles for reorderable rows", () => {
    renderRecipeForm();

    const ingredients = getSection("Ingredients");
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));
    expect(ingredients.getByRole("button", { name: "Drag ingredient 1" })).toHaveAttribute("aria-roledescription", "sortable");
    expect(ingredients.getByRole("button", { name: "Drag ingredient 2" })).toBeInTheDocument();
    expect(ingredients.getByRole("button", { name: "Remove ingredient 2" })).toHaveClass("text-red-700");
    expect(ingredients.queryByRole("button", { name: /Ingredient \d actions/ })).not.toBeInTheDocument();

    const steps = getSection("Steps");
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    expect(steps.getByRole("button", { name: "Drag step 1" })).toHaveAttribute("aria-roledescription", "sortable");
    expect(steps.getByRole("button", { name: "Drag step 2" })).toBeInTheDocument();
    expect(steps.getByRole("button", { name: "Remove step 2" })).toHaveClass("text-red-700");
  });

  it("collapses completed rows and reopens them for editing", () => {
    renderRecipeForm();

    const ingredients = getSection("Ingredients");
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Rice" } });
    fireEvent.change(ingredients.getByPlaceholderText("Amount"), { target: { value: "2" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));

    expect(ingredients.queryByPlaceholderText("Ingredient")).not.toBeInTheDocument();
    fireEvent.click(ingredients.getByRole("button", { name: "Edit ingredient 1: 2 Rice" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveValue("Rice");

    const steps = getSection("Steps");
    fireEvent.change(steps.getByPlaceholderText("Step 1"), { target: { value: "Cook the rice." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));

    expect(steps.queryByPlaceholderText("Step 1")).not.toBeInTheDocument();
    fireEvent.click(steps.getByRole("button", { name: "Edit step 1: Cook the rice." }));
    expect(steps.getByPlaceholderText("Step 1")).toHaveValue("Cook the rice.");
  });

  it("renders saved ingredients and steps as editable compact rows", () => {
    const initialValues: RecipeFormValues = {
      title: "Egg fried rice",
      servings: 2,
      mealTypes: ["dinner"],
      costRating: "cheap",
      difficulty: "easy",
      effortLabels: ["quick", "low_cleanup"],
      equipmentKeys: ["microwave", "no_oven"],
      sourceLinks: [],
      notes: "",
      ingredients: [
        { name: "Rice", amount: "2", unit: "cups", notes: "cooked" },
        { name: "Egg", amount: "2", unit: "pcs", notes: "beaten" }
      ],
      steps: [
        { instruction: "Scramble the eggs." },
        { instruction: "Stir-fry the rice." }
      ]
    };

    renderRecipeForm(initialValues);

    expect(screen.getByRole("heading", { name: "Edit recipe" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Updated egg fried rice" }
    });
    expect(getSection("Effort").getByRole("button", { name: "Quick" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getSection("Effort").getByRole("button", { name: "Low cleanup" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getSection("Equipment & setup").getByRole("button", { name: "Microwave" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getSection("Equipment & setup").getByRole("button", { name: "No oven needed" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const ingredients = getSection("Ingredients");
    expect(ingredients.getByRole("button", { name: "Edit ingredient 1: 2 cups Rice · cooked" })).toBeInTheDocument();
    expect(ingredients.getByRole("button", { name: "Edit ingredient 2: 2 pcs Egg · beaten" })).toBeInTheDocument();
    fireEvent.click(ingredients.getByRole("button", { name: "Edit ingredient 2: 2 pcs Egg · beaten" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveValue("Egg");

    const steps = getSection("Steps");
    expect(steps.getByRole("button", { name: "Edit step 1: Scramble the eggs." })).toBeInTheDocument();
    fireEvent.click(steps.getByRole("button", { name: "Edit step 2: Stir-fry the rice." }));
    expect(steps.getByPlaceholderText("Step 2")).toHaveValue("Stir-fry the rice.");
  });

  it("selects optional effort labels", () => {
    renderRecipeForm();

    const effort = getSection("Effort");
    expect(effort.getByText("Optional. Choose every description that applies.")).toBeInTheDocument();
    fireEvent.click(effort.getByRole("button", { name: "Quick" }));
    fireEvent.click(effort.getByRole("button", { name: "One pot" }));
    expect(effort.getByRole("button", { name: "Quick" })).toHaveAttribute("aria-pressed", "true");
    expect(effort.getByRole("button", { name: "One pot" })).toHaveAttribute("aria-pressed", "true");
  });

  it("selects optional equipment and keeps oven choices mutually exclusive", () => {
    renderRecipeForm();

    const equipment = getSection("Equipment & setup");
    fireEvent.click(equipment.getByRole("button", { name: "Oven" }));
    expect(equipment.getByRole("button", { name: "Oven" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(equipment.getByRole("button", { name: "No oven needed" }));
    expect(equipment.getByRole("button", { name: "Oven" })).toHaveAttribute("aria-pressed", "false");
    expect(equipment.getByRole("button", { name: "No oven needed" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
