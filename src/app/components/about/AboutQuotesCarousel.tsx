"use client";

import { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { BRAND } from "@/lib/uiBrand";

export default function AboutQuotesCarousel({ quotes }: { quotes: string[] }) {
  const [index, setIndex] = useState(0);

  if (!quotes || quotes.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        backgroundColor: BRAND.surface,
        borderRadius: 4,
        p: { xs: 3, md: 5 },
      }}
    >
      <IconButton onClick={() => setIndex((i) => (i === 0 ? quotes.length - 1 : i - 1))} aria-label="Previous">
        <ArrowBackIosNewIcon />
      </IconButton>
      <Typography variant="body1" sx={{ textAlign: "center", flexGrow: 1, lineHeight: 1.8 }}>
        {quotes[index % quotes.length]}
      </Typography>
      <IconButton onClick={() => setIndex((i) => (i === quotes.length - 1 ? 0 : i + 1))} aria-label="Next">
        <ArrowForwardIosIcon />
      </IconButton>
    </Box>
  );
}
