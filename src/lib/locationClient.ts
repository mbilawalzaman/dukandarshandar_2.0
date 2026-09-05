export interface CityOption {
  name: string;
  province: string;
}

export interface AreasResponse {
  city: string;
  areas: string[];
  hasCuratedAreas: boolean;
}

const noStore: RequestInit = { cache: "no-store" };

export async function fetchProvinces(): Promise<string[]> {
  try {
    const res = await fetch("/api/locations/provinces", noStore);
    if (!res.ok) throw new Error(`Failed to fetch provinces: ${res.status}`);
    const data: string[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("fetchProvinces error:", error);
    return [];
  }
}

export async function fetchCities(province?: string): Promise<CityOption[]> {
  try {
    const url = province
      ? `/api/locations/cities?province=${encodeURIComponent(province)}`
      : "/api/locations/cities";
    const res = await fetch(url, noStore);
    if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
    const data: CityOption[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("fetchCities error:", error);
    return [];
  }
}

export async function fetchAreas(
  city: string,
  province?: string
): Promise<AreasResponse> {
  if (!city || !city.trim()) {
    return { city: "", areas: [], hasCuratedAreas: false };
  }
  try {
    const params = new URLSearchParams({ city });
    if (province && province.trim()) params.set("province", province.trim());
    const res = await fetch(`/api/locations/areas?${params.toString()}`, noStore);
    if (!res.ok) throw new Error(`Failed to fetch areas: ${res.status}`);
    const data: AreasResponse = await res.json();
    return {
      city: data?.city ?? city,
      areas: Array.isArray(data?.areas) ? data.areas : [],
      hasCuratedAreas: Boolean(data?.hasCuratedAreas),
    };
  } catch (error) {
    console.error("fetchAreas error:", error);
    return { city, areas: [], hasCuratedAreas: false };
  }
}
