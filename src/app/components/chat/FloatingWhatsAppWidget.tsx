"use client";

import React from "react";
import { Fab, Tooltip, Zoom } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { usePathname } from "next/navigation";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

const FAB_SIZE = 54;

export default function FloatingWhatsAppWidget() {
  const pathname = usePathname();
  const { whatsAppUrl } = useDeliverySettings();

  // Hide widget on messages, chat workspaces, or admin messaging pages
  const hideWidget =
    pathname === "/messages" ||
    pathname === "/admin/messages" ||
    pathname === "/support" ||
    pathname === "/admin/support";

  if (hideWidget) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (whatsAppUrl) {
      window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Zoom in={true}>
      <Tooltip title="Chat with us on WhatsApp" placement="left" arrow>
        <Fab
          aria-label="Chat on WhatsApp"
          onClick={handleClick}
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: { xs: 88, sm: 94 },
            zIndex: 1399,
            backgroundColor: "#25D366",
            color: "#ffffff",
            width: FAB_SIZE,
            height: FAB_SIZE,
            boxShadow: "0 6px 20px rgba(37, 211, 102, 0.45)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              backgroundColor: "#1ebe57",
              transform: "scale(1.08)",
              boxShadow: "0 8px 25px rgba(37, 211, 102, 0.6)",
            },
            "&:active": {
              transform: "scale(0.95)",
            },
          }}
        >
          <WhatsAppIcon sx={{ fontSize: 32 }} />
        </Fab>
      </Tooltip>
    </Zoom>
  );
}
