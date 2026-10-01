import PostExService from "../src/services/postex.service.js";

async function runLiveApiTest() {
  console.log("=========================================");
  console.log("PostEx Live API Integration Test Runner");
  console.log("=========================================\n");

  const token = process.env.POSTEX_API_TOKEN;
  if (!token) {
    console.warn("⚠️ POSTEX_API_TOKEN is not set in environment variables.");
    console.warn("Please set POSTEX_API_TOKEN in .env to test live PostEx API endpoints.\n");
  } else {
    console.log("🔑 POSTEX_API_TOKEN detected.");
  }

  try {
    console.log("1️⃣ Testing Operational Cities API...");
    const citiesResponse = await PostExService.getOperationalCities();
    console.log("✅ Operational Cities (All) success! Total cities found:", citiesResponse?.dist?.length || 0);
  } catch (err) {
    console.error("❌ Operational Cities Test Failed:", err.message);
  }

  try {
    console.log("\n2️⃣ Testing Order Types API...");
    const orderTypes = await PostExService.getOrderTypes();
    console.log("✅ Order Types success:", JSON.stringify(orderTypes));
  } catch (err) {
    console.error("❌ Order Types Test Failed:", err.message);
  }

  try {
    console.log("\n3️⃣ Testing Pickup Addresses API...");
    const addresses = await PostExService.getPickupAddresses();
    console.log("✅ Pickup Addresses success:", JSON.stringify(addresses));
  } catch (err) {
    console.error("❌ Pickup Addresses Test Failed:", err.message);
  }

  console.log("\n=========================================");
  console.log("PostEx API Live Test Finished");
  console.log("=========================================");
}

runLiveApiTest();
