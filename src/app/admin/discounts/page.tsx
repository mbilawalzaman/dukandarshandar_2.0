"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscountsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/promotions");
  }, [router]);

  return null;
}
