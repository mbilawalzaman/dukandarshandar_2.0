"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  ensureProductCategories,
  getCategorySnapshot,
  getServerCategorySnapshot,
  subscribeToCategories,
} from "@/lib/productCategoryStore";
import type { CategoryStoreState } from "@/types/apps/categoryTypes";

export function useProductCategories(): CategoryStoreState {
  const state = useSyncExternalStore(
    subscribeToCategories,
    getCategorySnapshot,
    getServerCategorySnapshot,
  );

  useEffect(ensureProductCategories, []);

  return state;
}
