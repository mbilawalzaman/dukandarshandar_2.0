"use client";

import { useState } from "react";
import Banner from "./components/Banner";
import HeroSection from "./components/HeroSection";
import TopRatedProducts from "./components/TopRatedProducts";
import ProductList from "./components/ProductList";

export default function Home() {
  const [refreshTrigger] = useState(false);

  return (
    <main>
      <Banner />
      <HeroSection />
      <TopRatedProducts refreshTrigger={refreshTrigger} />
      <ProductList refreshTrigger={refreshTrigger} />
    </main>
  );
}

