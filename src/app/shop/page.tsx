"use client";

import { useState } from "react";
import ProductList from "../components/ProductList";
import PageBanner from "../components/PageBanner";

export default function ShopPage() {
  const [refreshTrigger] = useState(false);

  return (
    <div>
      <PageBanner title="Shop Catalog" subtitle="Explore all stationery, crafts, and creative essentials" />
      <ProductList refreshTrigger={refreshTrigger} hideHeader={true} />
    </div>
  );
}
