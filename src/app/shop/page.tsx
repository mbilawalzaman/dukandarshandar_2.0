"use client";

import { useEffect, useState } from "react";
import ProductList from "../components/ProductList";
import PageBanner from "../components/PageBanner";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export default function ShopPage() {
  const [refreshTrigger] = useState(false);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/page-settings");
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Error loading shop page settings:", err);
      }
    };
    loadSettings();
  }, []);

  return (
    <div>
      <PageBanner
        title={settings.shop.bannerTitle || "Shop Catalog"}
        subtitle={settings.shop.bannerSubtitle}
        bgImage={settings.shop.bannerImage}
      />
      <ProductList
        refreshTrigger={refreshTrigger}
        hideHeader={true}
        productsPerPage={settings.shop.productsPerPage}
      />
    </div>
  );
}
