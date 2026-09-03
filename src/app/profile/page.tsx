"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Container } from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PageBanner from "@/app/components/PageBanner";
import ProfileEditor from "@/app/components/ProfileEditor";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = jwtDecode<{ role?: string }>(token);
      if (decoded.role === "admin") {
        router.replace("/admin/profile");
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  return (
    <Box>
      <PageBanner title="My Profile" subtitle="Manage your account, email, and delivery details" />
      <Container maxWidth="md" sx={{ py: 4, mb: 6 }}>
        <ProfileEditor loginNextPath="/profile" showDelivery />
      </Container>
    </Box>
  );
}
