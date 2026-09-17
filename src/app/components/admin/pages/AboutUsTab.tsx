"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { PageSettings, PageSettingsKey, AboutHighlightItem } from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import SavePageButton from "./SavePageButton";

export interface AboutUsTabProps {
  settings: PageSettings;
  setSettings: React.Dispatch<React.SetStateAction<PageSettings>>;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  onOpenModal: (pageKey: PageSettingsKey, preferVideo?: boolean) => void;
  onSavePage: (page: PageSettingsKey) => Promise<boolean>;
}

export default function AboutUsTab({
  settings,
  setSettings,
  savingPage,
  modalUploading,
  onOpenModal,
  onSavePage,
}: AboutUsTabProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            About Us Page Banner
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => onOpenModal("about")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Configure Banner
            </Button>
            <SavePageButton
              page="about"
              savingPage={savingPage}
              modalUploading={modalUploading}
              onSave={onSavePage}
            />
          </Box>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading"
              fullWidth
              value={settings.about.bannerTitle}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  about: { ...prev.about, bannerTitle: e.target.value },
                }))
              }
              sx={{ mb: 2 }}
            />
            <TextField
              label="Subtitle"
              fullWidth
              multiline
              rows={2}
              value={settings.about.bannerSubtitle}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  about: { ...prev.about, bannerSubtitle: e.target.value },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Preview
            </Typography>
            <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <BannerMediaRenderer
                media={settings.about.bannerMedia || { type: settings.about.bannerType || "image", url: settings.about.bannerImage || "" }}
                alt="About Banner"
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Highlights Features */}
      {(() => {
        const rawHighlights = settings.about.highlights;
        const currentHighlights: AboutHighlightItem[] =
          Array.isArray(rawHighlights) && rawHighlights.length > 0
            ? rawHighlights
            : DEFAULT_PAGE_SETTINGS.about.highlights || [
                { id: "hl-1", icon: "time", title: "", text: "" },
                { id: "hl-2", icon: "craft", title: "", text: "" },
                { id: "hl-3", icon: "shipping", title: "", text: "" },
                { id: "hl-4", icon: "security", title: "", text: "" },
              ];

        const updateHighlight = (idx: number, patch: Partial<AboutHighlightItem>) => {
          setSettings((prev) => {
            const list = [...currentHighlights];
            list[idx] = { ...list[idx], ...patch };
            return { ...prev, about: { ...prev.about, highlights: list } };
          });
        };

        const addHighlightCard = () => {
          setSettings((prev) => {
            const list = [...currentHighlights];
            const newId = `hl-${Date.now()}`;
            const icons: ("time" | "craft" | "shipping" | "security")[] = ["time", "craft", "shipping", "security"];
            const nextIcon = icons[list.length % 4];
            list.push({ id: newId, icon: nextIcon, title: "", text: "" });
            return { ...prev, about: { ...prev.about, highlights: list } };
          });
        };

        const removeHighlightCard = (idx: number) => {
          setSettings((prev) => {
            const list = [...currentHighlights];
            list.splice(idx, 1);
            return { ...prev, about: { ...prev.about, highlights: list } };
          });
        };

        return (
          <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Feature Highlights
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Key feature cards displayed on the About Us page. Use {"{storeName}"} for dynamic store name.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addHighlightCard}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                + Add Feature Card
              </Button>
            </Box>

            <Grid container spacing={2}>
              {currentHighlights.map((hl, idx) => (
                <Grid item xs={12} sm={6} md={3} key={hl.id || idx}>
                  <Card sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0", position: "relative" }} elevation={0}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#d97706" }}>
                        Card #{idx + 1}
                      </Typography>
                      {currentHighlights.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => removeHighlightCard(idx)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                      <InputLabel id={`icon-select-label-${idx}`}>Icon Type</InputLabel>
                      <Select
                        labelId={`icon-select-label-${idx}`}
                        value={hl.icon || "time"}
                        label="Icon Type"
                        onChange={(e) => updateHighlight(idx, { icon: e.target.value as AboutHighlightItem["icon"] })}
                      >
                        <MenuItem value="time">⏱️ Time / History (Clock)</MenuItem>
                        <MenuItem value="craft">🎨 Craft / Handcrafted (Palette)</MenuItem>
                        <MenuItem value="shipping">🚚 Shipping / Fast Delivery (Truck)</MenuItem>
                        <MenuItem value="security">🛡️ Security / Trust (Shield)</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Title"
                      size="small"
                      fullWidth
                      value={hl.title || ""}
                      onChange={(e) => updateHighlight(idx, { title: e.target.value })}
                      sx={{ mb: 1.5 }}
                    />

                    <TextField
                      label="Description"
                      size="small"
                      fullWidth
                      multiline
                      rows={3}
                      value={hl.text || ""}
                      onChange={(e) => updateHighlight(idx, { text: e.target.value })}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        );
      })()}

      {/* Our Story Section */}
      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
          Our Story Section
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Story Heading"
              fullWidth
              value={settings.about.story?.title || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    story: { ...(prev.about.story || { title: "", text: "", image: "", buttonText: "View products", buttonLink: "/shop" }), title: val },
                  },
                }));
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Story Paragraph / Body Text"
              fullWidth
              multiline
              rows={4}
              value={settings.about.story?.text || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    story: { ...(prev.about.story || { title: "", text: "", image: "", buttonText: "View products", buttonLink: "/shop" }), text: val },
                  },
                }));
              }}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Button Label"
                  size="small"
                  fullWidth
                  value={settings.about.story?.buttonText || "View products"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      about: {
                        ...prev.about,
                        story: { ...(prev.about.story || { title: "", text: "", image: "", buttonText: "View products", buttonLink: "/shop" }), buttonText: val },
                      },
                    }));
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Button Link URL"
                  size="small"
                  fullWidth
                  value={settings.about.story?.buttonLink || "/shop"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      about: {
                        ...prev.about,
                        story: { ...(prev.about.story || { title: "", text: "", image: "", buttonText: "View products", buttonLink: "/shop" }), buttonLink: val },
                      },
                    }));
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Story Image URL"
              fullWidth
              placeholder="https://..."
              value={settings.about.story?.image || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    story: { ...(prev.about.story || { title: "", text: "", image: "", buttonText: "View products", buttonLink: "/shop" }), image: val },
                  },
                }));
              }}
              sx={{ mb: 2 }}
            />
            {settings.about.story?.image ? (
              <Box
                component="img"
                src={settings.about.story.image}
                alt="Story Preview"
                sx={{ width: "100%", height: 180, borderRadius: 2, objectFit: "cover", border: "1px solid #e2e8f0" }}
              />
            ) : (
              <Box sx={{ height: 180, borderRadius: 2, border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
                No Story Image Configured
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Testimonial Quotes Carousel */}
      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Testimonial Quotes / Highlight Statements
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setSettings((prev) => ({
                ...prev,
                about: {
                  ...prev.about,
                  quotes: [...(prev.about.quotes || []), ""],
                },
              }));
            }}
          >
            Add Quote
          </Button>
        </Box>
        <Grid container spacing={2}>
          {(settings.about.quotes || []).map((quote, idx) => (
            <Grid item xs={12} key={idx}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <TextField
                  label={`Quote #${idx + 1}`}
                  fullWidth
                  size="small"
                  multiline
                  value={quote}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => {
                      const updated = [...(prev.about.quotes || [])];
                      updated[idx] = val;
                      return { ...prev, about: { ...prev.about, quotes: updated } };
                    });
                  }}
                />
                <IconButton
                  color="error"
                  onClick={() => {
                    setSettings((prev) => {
                      const updated = [...(prev.about.quotes || [])];
                      updated.splice(idx, 1);
                      return { ...prev, about: { ...prev.about, quotes: updated } };
                    });
                  }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            </Grid>
          ))}
          {(!settings.about.quotes || settings.about.quotes.length === 0) && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                No quote statements added yet. Click &quot;Add Quote&quot; to add slides.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
