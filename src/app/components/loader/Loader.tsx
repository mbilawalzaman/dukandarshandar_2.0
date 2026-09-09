"use client";

import React from "react";
import Image from "next/image";
import "./loader.css";

export interface LoaderProps {
  size?: number;
  marginTop?: string;
  overlay?: boolean;
  message?: string;
}

export default function Loader({
  size = 200,
  marginTop = "0px",
  overlay = false,
  message,
}: LoaderProps) {
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
          <Image
            src="/images/ds-icon.png"
            alt="Dukandar Shandar"
            width={Math.max(24, Math.round(size * 0.22))}
            height={Math.max(24, Math.round(size * 0.22))}
            priority
          />
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
