import dotenv from "dotenv";
dotenv.config();

async function discoverEndpoints() {
  const token = process.env.POSTEX_API_TOKEN;
  const baseUrl = "https://api.postex.pk";

  const endpointsToTest = [
    "/services/integration/api/order/v1/get-merchant-address",
    "/services/integration/api/order/v1/get-store-address",
    "/services/integration/api/order/v1/get-merchant-store",
    "/services/integration/api/order/v1/get-store",
    "/services/integration/api/order/v1/get-merchant-details",
    "/services/integration/api/order/v1/get-merchant-info",
  ];

  for (const ep of endpointsToTest) {
    try {
      const res = await fetch(`${baseUrl}${ep}`, {
        headers: { token, "Content-Type": "application/json" },
      });
      const data = await res.json();
      console.log(`Endpoint [${ep}] Status ${res.status}:`, JSON.stringify(data));
    } catch (err) {
      console.log(`Endpoint [${ep}] Failed:`, err.message);
    }
  }
}

discoverEndpoints();
