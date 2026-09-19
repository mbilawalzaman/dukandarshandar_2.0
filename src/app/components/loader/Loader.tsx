"use client";

import React from "react";
import "./loader.css";
import { useSafeStoreSettings, getStoreInitials } from "@/app/providers/StoreSettingsProvider";

export interface LoaderProps {
  size?: number;
  marginTop?: string;
  overlay?: boolean;
  message?: string;
  initials?: string;
}

export default function Loader({
  size = 200,
  marginTop = "0px",
  overlay = false,
  message,
  initials: customInitials,
}: LoaderProps) {
  const { settings } = useSafeStoreSettings();
  const displayInitials = customInitials || getStoreInitials(settings.shopName, "DS");

  const content = (
    <div className="loader" style={{ marginTop: overlay ? "0" : marginTop }}>
      <div
        className="gooey-circle-container"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <div className="gooey-ring-1" />
        <div className="gooey-ring-2" />
        <div className="gooey-ring-3" />
        <div className="gooey-core">
          <span style={{ fontWeight: 800, color: "#d97706", fontSize: Math.max(14, Math.round(size * 0.16)) }}>
            {displayInitials}
          </span>
        </div>
      </div>
      {message && <div className="loader-message">{message}</div>}
    </div>
  );

  if (overlay) {
    return <div className="loader-overlay">{content}</div>;
  }

  return content;
}
