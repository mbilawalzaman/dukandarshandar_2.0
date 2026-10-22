"use client";

import type { CategoryStoreState } from "@/types/apps/categoryTypes";

const initialState: CategoryStoreState = {
  categories: [],
  loading: true,
  error: null,
};

let state = initialState;
let pending: Promise<void> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function publish(next: CategoryStoreState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeToCategories(listener: () => void): () => void {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
}

export function getCategorySnapshot(): CategoryStoreState {
  return state;
}

export function getServerCategorySnapshot(): CategoryStoreState {
  return initialState;
}

async function fetchCategoryPage(
  cursor: string | null,
  accumulated: string[],
): Promise<string[]> {
  const params = new URLSearchParams({ limit: "200" });

  if (cursor !== null) params.set("cursor", cursor);
  const response = await fetch(`/api/categories?${params}`);
  const data: unknown = await response.json();

  if (
    !response.ok ||
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    data.success !== true ||
    !("categories" in data) ||
    !Array.isArray(data.categories) ||
    !data.categories.every(
      (value: unknown): value is string => typeof value === "string",
    ) ||
    !("nextCursor" in data) ||
    (data.nextCursor !== null && typeof data.nextCursor !== "string")
  ) {
    throw new Error("Unable to load categories. Please retry.");
  }

  const categories = [...accumulated, ...data.categories];

  if (data.nextCursor === null)
    return categories.sort((left, right) => left.localeCompare(right));
  if (cursor !== null && data.nextCursor <= cursor)
    throw new Error("Invalid category pagination response");

  // Subsequent requests depend on the cursor returned by the preceding page.
  return fetchCategoryPage(data.nextCursor, categories);
}

export function refreshProductCategories(force = true): Promise<void> {
  if (pending !== null) {
    return force
      ? pending.then(() => refreshProductCategories(false))
      : pending;
  }

  publish({ ...state, loading: true, error: null });
  pending = fetchCategoryPage(null, [])
    .then((categories): void => {
      loaded = true;
      publish({ categories, loading: false, error: null });
    })
    .catch((error: unknown): void => {
      console.error("Failed to load categories:", error);
      publish({
        ...state,
        loading: false,
        error:
          error instanceof Error ? error.message : "Unable to load categories",
      });
    })
    .finally((): void => {
      pending = null;
    });

  return pending;
}

export function ensureProductCategories(): void {
  if (!loaded && pending === null && state.error === null)
    void refreshProductCategories(false);
}
