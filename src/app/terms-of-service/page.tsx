import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { BRAND } from "@/lib/constants";
import PageBanner from "../components/PageBanner";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";

export const dynamic = "force-dynamic";

export default async function TermsOfServicePage() {
  const settings = await getGlobalPageSettings();
  const config = settings.terms;

  return (
    <Box>
      <PageBanner
        title={config.bannerTitle || "TERMS & CONDITIONS"}
        subtitle={config.bannerSubtitle}
        bgImage={config.bannerImage}
        bgMedia={config.bannerMedia}
      />

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <GavelIcon sx={{ fontSize: 36, color: BRAND.navy }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: BRAND.navy }}>
              {config.bannerTitle || "Terms & Conditions"}
            </Typography>
          </Box>
          {config.lastUpdated && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
              Last updated: {config.lastUpdated}
            </Typography>
          )}

          <Divider sx={{ mb: 4 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, color: "#334155", lineHeight: 1.7 }}>
            {(config.sections || []).map((sec, idx) => (
              <Box key={sec.id || idx}>
                {sec.title && (
                  <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.navy, mb: 1 }}>
                    {idx + 1}. {sec.title}
                  </Typography>
                )}
                {sec.content && (
                  <Typography variant="body1" sx={{ whitespace: "pre-line", color: "#334155" }}>
                    {sec.content}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

