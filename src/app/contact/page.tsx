import {
  Box,
  Container,
  Grid,
  Button,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PageBanner from "../components/PageBanner";
import ContactForm from "../components/contact/ContactForm";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";
import { getDeliverySettings } from "@/lib/deliverySettings.server";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [settings, deliverySettings] = await Promise.all([
    getGlobalPageSettings(),
    getDeliverySettings(),
  ]);

  const storeName = deliverySettings.shopName || "";
  const storeEmail = deliverySettings.storeEmail || "";
  const whatsAppNumber = deliverySettings.whatsAppNumber || deliverySettings.shopPhone || "";
  const cleanedPhone = whatsAppNumber.replace(/[^0-9]/g, "");
  const whatsAppUrl = cleanedPhone ? `https://wa.me/${cleanedPhone}` : "#";

  return (
    <Box>
      <PageBanner
        title={settings.contact.bannerTitle || "CONTACT"}
        subtitle={settings.contact.bannerSubtitle}
        bgImage={settings.contact.bannerImage}
        bgMedia={settings.contact.bannerMedia}
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Get in touch
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Questions about an order, a product, or a custom craft request? Send {storeName ? `${storeName} ` : ""}a message and we will reply as soon as we can.
            </Typography>
            <Card sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <EmailIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Email</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {storeEmail || "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <WhatsAppIcon sx={{ color: "#25D366" }} />
                  <Box>
                    <Typography fontWeight={700}>WhatsApp</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {deliverySettings.shopPhone || "N/A"}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  component="a"
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    backgroundColor: "#25D366",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#1ebe57" },
                  }}
                >
                  WhatsApp
                </Button>
              </CardContent>
            </Card>
            <Card sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <PlaceIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Location</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {deliverySettings.shopAddress || "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Hours</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mon–Sat, 10:00 AM – 8:00 PM
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <ContactForm />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

