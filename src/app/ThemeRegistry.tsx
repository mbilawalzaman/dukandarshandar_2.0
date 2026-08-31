"use client";

import { ReactNode } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { BRAND } from "@/lib/constants";
import { CartProvider } from "./providers/CartProvider";

const cache = createCache({ key: "mui", prepend: true });

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND.gold,
      dark: BRAND.goldHover,
      contrastText: "#1a1a1a",
    },
    secondary: {
      main: BRAND.navy,
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: BRAND.navy,
      secondary: BRAND.muted,
    },
  },
  typography: {
    fontFamily: "var(--font-poppins), Poppins, sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          boxShadow: "none",
          "&:hover": { backgroundColor: BRAND.goldHover, boxShadow: "none" },
        },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CartProvider>{children}</CartProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
