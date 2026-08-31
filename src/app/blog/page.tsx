"use client";

import { Box, Container, Typography, Button } from "@mui/material";
import Link from "next/link";
import PageBanner from "../components/PageBanner";

export default function BlogPage() {
  return (
    <Box>
      <PageBanner title="Blog" subtitle="Articles, guides, and craft inspiration" />
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: "#1e293b" }}>
          Blog Section Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          We are preparing exciting stationery tips, craft tutorials, and product guides for you.
        </Typography>
        <Button component={Link} href="/shop" variant="contained" color="primary">
          Explore Our Shop
        </Button>
      </Container>
    </Box>
  );
}
