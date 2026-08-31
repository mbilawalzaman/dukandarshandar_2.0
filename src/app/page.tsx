"use client";

import { useEffect, useState } from "react";
import Banner from "./components/Banner";
import HeroSection from "./components/HeroSection";
import TopRatedProducts from "./components/TopRatedProducts";
import ProductList from "./components/ProductList";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export default function Home() {
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
        console.error("Error loading home page settings:", err);
      }
    };
    loadSettings();
  }, []);

  return (
    <main>
      <Banner images={settings.home.bannerImages} />
      <HeroSection />
      <TopRatedProducts refreshTrigger={refreshTrigger} count={settings.home.topRatedCount} />
      <ProductList refreshTrigger={refreshTrigger} productsPerPage={settings.home.productsPerPage} />
    </main>
  );
}
