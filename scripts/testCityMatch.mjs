import dotenv from "dotenv";
dotenv.config();
import PostExService from "../src/services/postex.service.js";

async function testCityMatch() {
  const testCities = [
    "Lahore - Garhi Shahu",
    "Karachi - Gulshan",
    "Islamabad West",
    "Rawalpindi, Punjab",
    "Faisalabad",
  ];

  console.log("Fetching operational delivery cities from PostEx...");
  const citiesRes = await PostExService.getOperationalCities();
  const citiesList = citiesRes?.dist || [];
  console.log("Total operational cities found:", citiesList.length);

  for (const raw of testCities) {
    const cleanPart = raw.split("-")[0].split(",")[0].trim().toLowerCase();
    
    // 1. Try exact match first
    let match = citiesList.find((c) => {
      const cName = (c.cityName || c.operationalCityName || c.name || String(c)).toLowerCase();
      return cName === cleanPart;
    });

    // 2. Fallback to startWith or substring match
    if (!match) {
      match = citiesList.find((c) => {
        const cName = (c.cityName || c.operationalCityName || c.name || String(c)).toLowerCase();
        return cName.startsWith(cleanPart) || cleanPart.startsWith(cName);
      });
    }

    const finalCity = match?.cityName || match?.operationalCityName || match?.name || cleanPart;
    console.log(`Raw: "${raw}" ➔ Cleaned & Matched: "${finalCity}"`);
  }
}

testCityMatch();
