"use client";

import { useCallback } from "react";

import { Alert, Button, LinearProgress } from "@mui/material";

import { useProductCategories } from "@/hooks/useProductCategories";
import { refreshProductCategories } from "@/lib/productCategoryStore";

export default function CategoryLoadStatus(): React.JSX.Element | null {
  const { error, loading } = useProductCategories();

  const retry = useCallback((): void => {
    void refreshProductCategories();
  }, []);

  if (loading)
    return <LinearProgress aria-label="Loading categories" sx={{ my: 1 }} />;
  if (error !== null)
    return (
      <Alert
        severity="error"
        sx={{ my: 1 }}
        action={
          <Button color="inherit" onClick={retry}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );

  return null;
}
