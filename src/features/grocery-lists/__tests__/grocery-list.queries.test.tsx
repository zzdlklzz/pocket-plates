import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/query-keys";

const mocks = vi.hoisted(() => ({
  addGroceryListItem: vi.fn(),
  createBlankGroceryList: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
  deleteGroceryList: vi.fn(),
  getGroceryListDetail: vi.fn(),
  listGroceryLists: vi.fn(),
  removeGroceryListItem: vi.fn(),
  renameGroceryList: vi.fn(),
  setGroceryListItemChecked: vi.fn(),
  updateGroceryListItem: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient
}));

vi.mock("../grocery-list.repository", () => ({
  addGroceryListItem: mocks.addGroceryListItem,
  createBlankGroceryList: mocks.createBlankGroceryList,
  deleteGroceryList: mocks.deleteGroceryList,
  getGroceryListDetail: mocks.getGroceryListDetail,
  listGroceryLists: mocks.listGroceryLists,
  removeGroceryListItem: mocks.removeGroceryListItem,
  renameGroceryList: mocks.renameGroceryList,
  setGroceryListItemChecked: mocks.setGroceryListItemChecked,
  updateGroceryListItem: mocks.updateGroceryListItem
}));

import {
  useAddGroceryListItem,
  useCreateBlankGroceryList,
  useDeleteGroceryList,
  useGroceryListDetail,
  useGroceryLists,
  useRemoveGroceryListItem,
  useRenameGroceryList,
  useSetGroceryListItemChecked,
  useUpdateGroceryListItem
} from "../grocery-list.queries";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function checkedCacheFixtures(checked = false) {
  return {
    detail: {
      id: "list-1",
      items: [
        {
          amount: null,
          checked,
          id: "item-1",
          isManual: true,
          name: "Pepper",
          normalizedName: "pepper",
          notes: null,
          quantityOverridden: false,
          requirementGroups: [],
          sortOrder: 0,
          sources: [],
          unit: null
        }
      ],
      mealPlanAvailable: false,
      mealPlanId: null,
      sourceType: "manual" as const,
      sourceWeekStartDate: null,
      title: "Groceries",
      updatedAt: "2026-08-21T10:00:00Z"
    },
    summaries: [
      {
        checkedItemCount: checked ? 1 : 0,
        id: "list-1",
        itemCount: 1,
        mealPlanAvailable: false,
        sourceType: "manual" as const,
        sourceWeekStartDate: null,
        title: "Groceries",
        updatedAt: "2026-08-21T10:00:00Z"
      }
    ]
  };
}

function concurrentCheckedCacheFixtures() {
  const fixtures = checkedCacheFixtures();

  return {
    detail: {
      ...fixtures.detail,
      items: [
        ...fixtures.detail.items,
        {
          ...fixtures.detail.items[0]!,
          id: "item-2",
          name: "Rice",
          normalizedName: "rice",
          sortOrder: 1
        }
      ]
    },
    summaries: [{ ...fixtures.summaries[0]!, itemCount: 2 }]
  };
}

describe("grocery list queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseBrowserClient.mockReturnValue({ client: "supabase" });
  });

  it("loads summaries and details under separate grocery-list keys", async () => {
    const summaries = [{ id: "list-1" }];
    const detail = { id: "list-1", items: [] };
    mocks.listGroceryLists.mockResolvedValue(summaries);
    mocks.getGroceryListDetail.mockResolvedValue(detail);
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result: listResult } = renderHook(() => useGroceryLists(), {
      wrapper
    });
    const { result: detailResult } = renderHook(
      () => useGroceryListDetail("list-1"),
      { wrapper }
    );

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(queryKeys.groceryLists.list)).toBe(
      summaries
    );
    expect(
      queryClient.getQueryData(queryKeys.groceryLists.detail("list-1"))
    ).toBe(detail);
    expect(mocks.getGroceryListDetail).toHaveBeenCalledWith(
      { client: "supabase" },
      "list-1"
    );
  });

  it("invalidates only the summary after creating a blank list", async () => {
    mocks.createBlankGroceryList.mockResolvedValue("list-1");
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateBlankGroceryList(), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync({ title: "Groceries" });
    });

    expect(mocks.createBlankGroceryList).toHaveBeenCalledWith(
      { client: "supabase" },
      { title: "Groceries" }
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.list
    });
  });

  it("invalidates only the changed grocery list and its summary", async () => {
    mocks.renameGroceryList.mockResolvedValue(undefined);
    mocks.addGroceryListItem.mockResolvedValue("item-1");
    mocks.updateGroceryListItem.mockResolvedValue(undefined);
    mocks.setGroceryListItemChecked.mockResolvedValue(undefined);
    mocks.removeGroceryListItem.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const { result: renameResult } = renderHook(() => useRenameGroceryList(), {
      wrapper
    });
    const { result: addResult } = renderHook(() => useAddGroceryListItem(), {
      wrapper
    });
    const { result: updateResult } = renderHook(
      () => useUpdateGroceryListItem(),
      { wrapper }
    );
    const { result: checkResult } = renderHook(
      () => useSetGroceryListItemChecked(),
      { wrapper }
    );
    const { result: removeResult } = renderHook(
      () => useRemoveGroceryListItem(),
      { wrapper }
    );
    const values = { amount: "", name: "Pepper", notes: "", unit: "" };

    await act(async () => {
      await renameResult.current.mutateAsync({
        groceryListId: "list-1",
        title: "Renamed"
      });
      await addResult.current.mutateAsync({ groceryListId: "list-1", values });
      await updateResult.current.mutateAsync({
        groceryListId: "list-1",
        itemId: "item-1",
        quantityOverridden: false,
        values
      });
      await checkResult.current.mutateAsync({
        checked: true,
        groceryListId: "list-1",
        itemId: "item-1"
      });
      await removeResult.current.mutateAsync({
        groceryListId: "list-1",
        itemId: "item-1"
      });
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(10);
    for (let index = 0; index < 10; index += 2) {
      expect(invalidateQueries).toHaveBeenNthCalledWith(index + 1, {
        queryKey: queryKeys.groceryLists.list
      });
      expect(invalidateQueries).toHaveBeenNthCalledWith(index + 2, {
        queryKey: queryKeys.groceryLists.detail("list-1")
      });
    }
  });

  it("optimistically checks the exact item and summary before success settles", async () => {
    const deferred = createDeferred<void>();
    mocks.setGroceryListItemChecked.mockReturnValue(deferred.promise);
    const queryClient = createQueryClient();
    const fixtures = checkedCacheFixtures();
    queryClient.setQueryData(
      queryKeys.groceryLists.detail("list-1"),
      fixtures.detail
    );
    queryClient.setQueryData(queryKeys.groceryLists.list, fixtures.summaries);
    const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSetGroceryListItemChecked(), {
      wrapper: createWrapper(queryClient)
    });
    const input = {
      checked: true,
      groceryListId: "list-1",
      itemId: "item-1"
    };
    let mutation!: Promise<void>;

    act(() => {
      mutation = result.current.mutateAsync(input);
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<typeof fixtures.detail>(
          queryKeys.groceryLists.detail("list-1")
        )?.items[0]?.checked
      ).toBe(true)
    );
    expect(
      queryClient.getQueryData<typeof fixtures.summaries>(
        queryKeys.groceryLists.list
      )?.[0]?.checkedItemCount
    ).toBe(1);
    expect(cancelQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.groceryLists.detail("list-1")
    });
    expect(cancelQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.groceryLists.list
    });
    expect(invalidateQueries).not.toHaveBeenCalled();

    deferred.resolve(undefined);
    await act(async () => mutation);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.groceryLists.list
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.groceryLists.detail("list-1")
    });
  });

  it("rolls both optimistic caches back before settled reconciliation", async () => {
    const deferred = createDeferred<void>();
    mocks.setGroceryListItemChecked.mockReturnValue(deferred.promise);
    const queryClient = createQueryClient();
    const fixtures = checkedCacheFixtures();
    queryClient.setQueryData(
      queryKeys.groceryLists.detail("list-1"),
      fixtures.detail
    );
    queryClient.setQueryData(queryKeys.groceryLists.list, fixtures.summaries);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSetGroceryListItemChecked(), {
      wrapper: createWrapper(queryClient)
    });
    let mutation!: Promise<void>;

    act(() => {
      mutation = result.current.mutateAsync({
        checked: true,
        groceryListId: "list-1",
        itemId: "item-1"
      });
    });
    await waitFor(() =>
      expect(
        queryClient.getQueryData<typeof fixtures.detail>(
          queryKeys.groceryLists.detail("list-1")
        )?.items[0]?.checked
      ).toBe(true)
    );

    deferred.reject(new Error("save failed"));
    await act(async () => {
      await expect(mutation).rejects.toThrow("save failed");
    });

    expect(
      queryClient.getQueryData(queryKeys.groceryLists.detail("list-1"))
    ).toEqual(fixtures.detail);
    expect(queryClient.getQueryData(queryKeys.groceryLists.list)).toEqual(
      fixtures.summaries
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.groceryLists.list
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.groceryLists.detail("list-1")
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.recipes.all
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.mealPlanning.all
    });
  });

  it("rolls back only the failed item while another check succeeds", async () => {
    const firstMutation = createDeferred<void>();
    const secondMutation = createDeferred<void>();
    mocks.setGroceryListItemChecked.mockImplementation(
      (_client, input: { itemId: string }) =>
        input.itemId === "item-1"
          ? firstMutation.promise
          : secondMutation.promise
    );
    const queryClient = createQueryClient();
    const fixtures = concurrentCheckedCacheFixtures();
    queryClient.setQueryData(
      queryKeys.groceryLists.detail("list-1"),
      fixtures.detail
    );
    queryClient.setQueryData(queryKeys.groceryLists.list, fixtures.summaries);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const { result: firstResult } = renderHook(
      () => useSetGroceryListItemChecked(),
      { wrapper }
    );
    const { result: secondResult } = renderHook(
      () => useSetGroceryListItemChecked(),
      { wrapper }
    );
    let firstPromise!: Promise<void>;
    let secondPromise!: Promise<void>;

    act(() => {
      firstPromise = firstResult.current.mutateAsync({
        checked: true,
        groceryListId: "list-1",
        itemId: "item-1"
      });
      secondPromise = secondResult.current.mutateAsync({
        checked: true,
        groceryListId: "list-1",
        itemId: "item-2"
      });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<typeof fixtures.detail>(
        queryKeys.groceryLists.detail("list-1")
      );
      expect(detail?.items.map(({ checked }) => checked)).toEqual([true, true]);
      expect(
        queryClient.getQueryData<typeof fixtures.summaries>(
          queryKeys.groceryLists.list
        )?.[0]?.checkedItemCount
      ).toBe(2);
    });

    firstMutation.reject(new Error("first save failed"));
    await act(async () => {
      await expect(firstPromise).rejects.toThrow("first save failed");
    });

    expect(
      queryClient
        .getQueryData<typeof fixtures.detail>(
          queryKeys.groceryLists.detail("list-1")
        )
        ?.items.map(({ checked }) => checked)
    ).toEqual([false, true]);
    expect(
      queryClient.getQueryData<typeof fixtures.summaries>(
        queryKeys.groceryLists.list
      )?.[0]?.checkedItemCount
    ).toBe(1);
    expect(invalidateQueries).not.toHaveBeenCalled();

    secondMutation.resolve(undefined);
    await act(async () => secondPromise);

    expect(
      queryClient
        .getQueryData<typeof fixtures.detail>(
          queryKeys.groceryLists.detail("list-1")
        )
        ?.items.map(({ checked }) => checked)
    ).toEqual([false, true]);
    expect(
      queryClient.getQueryData<typeof fixtures.summaries>(
        queryKeys.groceryLists.list
      )?.[0]?.checkedItemCount
    ).toBe(1);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.groceryLists.list
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.groceryLists.detail("list-1")
    });
  });

  it("removes deleted detail data and refreshes only the summary", async () => {
    mocks.deleteGroceryList.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.groceryLists.detail("list-1"), {
      id: "list-1"
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const { result } = renderHook(() => useDeleteGroceryList(), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync({ groceryListId: "list-1" });
    });

    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.detail("list-1")
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.list
    });
  });
});
