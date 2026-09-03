"use client";

import { Box, Typography, Paper } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ProfileEditor from "@/app/components/ProfileEditor";
import { BRAND } from "@/lib/constants";

export default function AdminProfilePage() {
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <PersonIcon sx={{ color: BRAND.gold, fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            My Profile
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Manage your admin account, email, and contact details
          </Typography>
        </Box>
      </Paper>

      <ProfileEditor loginNextPath="/admin/profile" showDelivery />
    </Box>
  );
}
