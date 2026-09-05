"use client";

import { useEffect, useState } from "react";
import { Grid, TextField, Autocomplete, CircularProgress } from "@mui/material";
import {
  fetchProvinces,
  fetchCities,
  fetchAreas,
  type CityOption,
} from "@/lib/locationClient";

export interface LocationFormFields {
  province?: string;
  city?: string;
  area?: string;
  address?: string;
}

export interface PakistanLocationFieldsProps {
  values: LocationFormFields;
  onChange: (fields: Partial<LocationFormFields>) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function PakistanLocationFields({
  values,
  onChange,
  disabled = false,
  required = true,
}: PakistanLocationFieldsProps) {
  const currentProvince = values.province || "";
  const currentCity = values.city || "";
  const currentArea = values.area || "";
  const currentAddress = values.address || "";

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(false);

  // 1. Fetch Provinces on mount
  useEffect(() => {
    let active = true;
    setLoadingProvinces(true);
    fetchProvinces()
      .then((res) => {
        if (active) setProvinces(res);
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch Cities whenever currentProvince changes
  useEffect(() => {
    let active = true;
    if (!currentProvince) {
      setCityOptions([]);
      return;
    }
    setLoadingCities(true);
    fetchCities(currentProvince)
      .then((res) => {
        if (active) setCityOptions(res);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [currentProvince]);

  // 3. Fetch Areas whenever currentCity (or province) changes
  useEffect(() => {
    let active = true;
    if (!currentCity) {
      setAvailableAreas([]);
      return;
    }
    setLoadingAreas(true);
    fetchAreas(currentCity, currentProvince || undefined)
      .then((res) => {
        if (active) setAvailableAreas(res.areas || []);
      })
      .finally(() => {
        if (active) setLoadingAreas(false);
      });
    return () => {
      active = false;
    };
  }, [currentCity, currentProvince]);

  const cityNames = cityOptions.map((c) => c.name);

  const handleProvinceChange = (newProvince: string | null) => {
    // Always clear city/area — cityOptions still reflect the previous province
    onChange({
      province: newProvince || "",
      city: "",
      area: "",
    });
  };

  const handleCityChange = (newCity: string | null) => {
    const cityVal = newCity || "";
    const matchedCity = cityOptions.find(
      (c) => c.name.toLowerCase() === cityVal.toLowerCase()
    );
    const autoProvince = matchedCity?.province || currentProvince;

    onChange({
      province: autoProvince,
      city: cityVal,
      area: "", // Reset area when city changes
    });
  };

  const handleAreaChange = (newArea: string | null) => {
    onChange({ area: newArea || "" });
  };

  return (
    <Grid container spacing={2}>
      {/* Province Selector */}
      <Grid item xs={12} sm={6}>
        <Autocomplete
          options={provinces}
          value={currentProvince || null}
          onChange={(_, newValue) => handleProvinceChange(newValue)}
          disabled={disabled || loadingProvinces}
          loading={loadingProvinces}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              required={required}
              name="province"
              label="Province / Region"
              placeholder="Select Province"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingProvinces ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Grid>

      {/* City Autocomplete (Select from list) */}
      <Grid item xs={12} sm={6}>
        <Autocomplete
          options={cityNames}
          value={currentCity || null}
          onChange={(_, newValue) => {
            handleCityChange(newValue || "");
          }}
          disabled={disabled || !currentProvince || loadingCities}
          loading={loadingCities}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              required={required}
              name="city"
              label="City"
              placeholder={!currentProvince ? "Select Province first" : "Select City"}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingCities ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Grid>

      {/* Area: curated list for cities with sub-areas; freeSolo elsewhere */}
      <Grid item xs={12}>
        <Autocomplete
          freeSolo={availableAreas.length === 0}
          options={availableAreas}
          value={currentArea || (availableAreas.length > 0 ? null : "")}
          onChange={(_, newValue) => {
            handleAreaChange(typeof newValue === "string" ? newValue : newValue || "");
          }}
          onInputChange={(_, newInputValue, reason) => {
            if (availableAreas.length === 0 && reason === "input") {
              handleAreaChange(newInputValue);
            }
          }}
          disabled={disabled || !currentProvince || !currentCity || loadingAreas}
          loading={loadingAreas}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              name="area"
              label="Area / Neighborhood"
              required={availableAreas.length > 0 && required}
              placeholder={
                !currentProvince
                  ? "Select Province first"
                  : !currentCity
                    ? "Select City first"
                    : availableAreas.length > 0
                      ? "Select area"
                      : "Type your area / sector"
              }
              helperText={
                !currentProvince || !currentCity
                  ? undefined
                  : availableAreas.length > 0
                    ? "Select from the list"
                    : "Type neighborhood or sector name"
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingAreas ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Grid>

      {/* Street Address Line */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          required={required}
          name="address"
          label="Street Address"
          placeholder="House# 123, Street# 12"
          value={currentAddress}
          onChange={(e) => onChange({ address: e.target.value })}
          disabled={disabled}
          multiline
          minRows={2}
        />
      </Grid>
    </Grid>
  );
}
