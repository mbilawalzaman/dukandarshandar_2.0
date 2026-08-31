"use client";

import { useState } from "react";
import ProductList from "../components/ProductList";
import PageBanner from "../components/PageBanner";

export default function ShopPage() {
  const [refreshTrigger] = useState(false);

  return (
    <div>
      <PageBanner title="Shop" subtitle="Stationery and craft supplies for every project" />
      <ProductList refreshTrigger={refreshTrigger} />
    </div>
  );
}
