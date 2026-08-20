import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  mealPlanner: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock("@/features/meal-planning/MealPlanner", () => ({
  MealPlanner: ({ requestedWeek }: { requestedWeek?: string }) => {
    mocks.mealPlanner(requestedWeek);
    return <div>Weekly meal planner</div>;
  }
}));

import Loading from "../loading";
import MealPlannerPage from "../page";

describe("MealPlannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser }
    });
  });

  it("redirects signed-out visitors to the home page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(MealPlannerPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("renders the planner for a signed-in user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await MealPlannerPage());

    expect(screen.getByText("Weekly meal planner")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("passes the requested week to the client planner", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await MealPlannerPage({
      searchParams: Promise.resolve({ week: "2026-12-28" })
    }));

    expect(mocks.mealPlanner).toHaveBeenCalledWith("2026-12-28");
  });

  it("treats repeated week parameters as invalid", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await MealPlannerPage({
      searchParams: Promise.resolve({ week: ["2026-12-28", "2027-01-04"] })
    }));

    expect(mocks.mealPlanner).toHaveBeenCalledWith(undefined);
  });

  it("provides an immediate route loading state", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: "Loading meal planner" })).toBeInTheDocument();
  });
});
