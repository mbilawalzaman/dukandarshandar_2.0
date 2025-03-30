"use client";

import { useState } from "react";
import React from "react";
import ProductList from "../components/ProductList";

const ShopPage = () => {
  const [refreshTrigger] = useState(false);

  return (
    <div className="container mx-auto p-4">
      <ProductList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default ShopPage;
