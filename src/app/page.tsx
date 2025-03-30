"use client";

import { useState, useEffect } from "react";
import Banner from "./components/Banner";
import UploadProduct from "./components/UploadProduct";
import { jwtDecode } from "jwt-decode";
import TopRatedProducts from "./components/TopRatedProducts";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  interface DecodedToken {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
  }

  useEffect(() => {
    const fetchUserRole = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const decodedToken: DecodedToken = jwtDecode<DecodedToken>(token);
            const role = decodedToken.role; // ✅ Extract role from token
            setUserRole(role); // ✅ Set user role in state

          } catch (error) {
            console.error("Error fetching user role:", error);
          }
        }
      }
    };

    fetchUserRole();
  }, []);

  return (
    <>
      <main>
        <Banner />
        <h1 className="text-2xl font-bold">Welcome to DukandarShandar</h1>

        {/* ✅ Show upload form only if user is admin */}
        {userRole === "admin" && (
          <UploadProduct onProductUpload={() => setRefreshTrigger((prev) => !prev)} />
        )}
        <TopRatedProducts refreshTrigger={refreshTrigger} />
        {/* <ProductList refreshTrigger={refreshTrigger} /> */}
      </main>
    </>
  );
}
