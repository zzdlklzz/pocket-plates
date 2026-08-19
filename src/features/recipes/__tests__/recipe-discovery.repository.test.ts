import { describe, expect, it, vi } from "vitest";
import { replaceRecipeDiscoveryMetadata } from "../recipe-discovery.repository";

describe("replaceRecipeDiscoveryMetadata", () => {
  it("replaces all effort labels through one metadata RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: undefined, error: null });

    await expect(
      replaceRecipeDiscoveryMetadata(
        { rpc } as never,
        "recipe-1",
        ["quick", "one_pot"],
        ["microwave", "no_oven"]
      )
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("replace_recipe_discovery_metadata", {
      p_recipe_id: "recipe-1",
      p_effort_labels: ["quick", "one_pot"],
      p_equipment_keys: ["microwave", "no_oven"]
    });
  });

  it("propagates metadata replacement failures", async () => {
    const error = new Error("database details");
    const rpc = vi.fn().mockResolvedValue({ data: undefined, error });

    await expect(
      replaceRecipeDiscoveryMetadata({ rpc } as never, "recipe-1", [], [])
    ).rejects.toBe(error);
  });
});
