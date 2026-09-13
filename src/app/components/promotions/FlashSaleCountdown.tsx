"use client";

import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { countdownLabel } from "@/lib/promotionDisplay";

/** Live "Ends in 2h 10m" chip for flash sales; re-renders once a minute. */
export default function FlashSaleCountdown({ endAt, size = "small" }: { endAt: string; size?: "small" | "medium" }) {
  const [label, setLabel] = useState(() => countdownLabel(endAt));

  useEffect(() => {
    setLabel(countdownLabel(endAt));
    const t = setInterval(() => setLabel(countdownLabel(endAt)), 60 * 1000);
    return () => clearInterval(t);
  }, [endAt]);

  return (
    <Chip
      icon={<BoltIcon sx={{ fontSize: "16px !important", color: "#ea580c !important" }} />}
      label={label}
      size={size}
      sx={{ mt: 0.5, backgroundColor: "#fff7ed", color: "#9a3412", fontWeight: 700, height: size === "small" ? 22 : 28 }}
    />
  );
}
