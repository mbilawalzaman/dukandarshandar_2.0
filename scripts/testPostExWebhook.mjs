import dotenv from "dotenv";
dotenv.config();

async function testWebhookHandler() {
  console.log("=========================================");
  console.log("PostEx Webhook Endpoint Test Runner");
  console.log("=========================================\n");

  const secret = process.env.POSTEX_WEBHOOK_SECRET || "";
  console.log("🔑 Webhook Secret configured:", secret ? `${secret.slice(0, 8)}...` : "None");

  const mockWebhookPayload = [
    {
      trackingNumber: "CX-TEST-999999",
      orderStatusCode: "0005",
      orderStatus: "Delivered",
      message: "Package delivered to customer successfully",
      timestamp: new Date().toISOString(),
    },
  ];

  console.log("\n📦 Sending mock webhook payload:");
  console.log(JSON.stringify(mockWebhookPayload, null, 2));

  try {
    // Import Webhook handler directly or test locally
    const { POST } = await import("../src/app/api/webhooks/postex/route.ts");

    const req = new Request("http://localhost:3000/api/webhooks/postex", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: secret,
      },
      body: JSON.stringify(mockWebhookPayload),
    });

    const res = await POST(req);
    const result = await res.json();

    console.log("\n✅ Webhook Response Status:", res.status);
    console.log("✅ Response Body:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("❌ Webhook test failed:", err.message);
  }

  console.log("\n=========================================");
  console.log("PostEx Webhook Test Finished");
  console.log("=========================================");
}

testWebhookHandler();
