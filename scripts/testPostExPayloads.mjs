import dotenv from "dotenv";
dotenv.config();

async function testPayloadVariations() {
  const token = process.env.POSTEX_API_TOKEN;
  const baseUrl = "https://api.postex.pk";

  const baseOrder = {
    cityName: "Lahore",
    customerName: "Muhammad Bilawal Zaman",
    customerPhone: "03009437476",
    deliveryAddress: "34-B Prime Homes Nishtar Colony Ferozpur Road Lahore",
    invoiceDivision: 1,
    invoicePayment: "550",
    items: 1,
    orderDetail: "Test Order Item",
    orderType: "Normal",
    transactionNotes: "Test delivery",
  };

  const payloadOptions = [
    {
      label: "Only pickupAddressCode: '001'",
      body: { ...baseOrder, pickupAddressCode: "001" },
    },
    {
      label: "pickupAddressCode: '001' and storeAddressCode: undefined",
      body: { ...baseOrder, pickupAddressCode: "001", storeAddressCode: undefined },
    },
    {
      label: "Only pickupAddressCode: '135031' (merchantAddressId)",
      body: { ...baseOrder, pickupAddressCode: "135031" },
    },
    {
      label: "pickupAddressCode: '001' and merchantAddressId: 135031",
      body: { ...baseOrder, pickupAddressCode: "001", merchantAddressId: 135031 },
    },
  ];

  for (const opt of payloadOptions) {
    const orderRefNumber = "TEST-DS-" + Math.floor(100000 + Math.random() * 900000);
    const body = { ...opt.body, orderRefNumber };

    console.log(`\n-----------------------------------------`);
    console.log(`Testing: ${opt.label}`);
    console.log(`Payload:`, JSON.stringify(body, null, 2));

    try {
      const res = await fetch(`${baseUrl}/services/integration/api/order/v3/create-order`, {
        method: "POST",
        headers: {
          token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log(`HTTP ${res.status} Response:`, JSON.stringify(data, null, 2));

      if (res.ok && (data.statusCode === "200" || data.dist?.trackingNumber)) {
        console.log(`🎉 SUCCESS! Created Order Tracking Number:`, data.dist?.trackingNumber || data.trackingNumber);
        break;
      }
    } catch (err) {
      console.error(`❌ Request Error:`, err.message);
    }
  }
}

testPayloadVariations();
