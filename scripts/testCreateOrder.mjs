import dotenv from "dotenv";
dotenv.config();
import PostExService from "../src/services/postex.service.js";

async function testCombinations() {
  const basePayload = {
    cityName: "Lahore",
    customerName: "Test Customer",
    customerPhone: "03001234567",
    deliveryAddress: "Test House 123 Street 4 Lahore",
    invoiceDivision: 1,
    invoicePayment: "550",
    items: 1,
    orderDetail: "Test Item x1",
    orderType: "Normal",
    transactionNotes: "Test booking",
  };

  const variations = [
    { name: "Empty codes", pickup: "", store: "" },
    { name: "Pickup='001', Store=''", pickup: "001", store: "" },
    { name: "Pickup='', Store='001'", pickup: "", store: "001" },
    { name: "Pickup='135031' (merchantAddressId)", pickup: "135031", store: "" },
    { name: "Store='135031' (merchantAddressId)", pickup: "", store: "135031" },
  ];

  for (const v of variations) {
    console.log(`\nTesting variation: ${v.name}...`);
    try {
      const payload = {
        ...basePayload,
        orderRefNumber: "TEST-" + Math.floor(Math.random() * 1000000),
        pickupAddressCode: v.pickup,
        storeAddressCode: v.store,
      };
      const response = await PostExService.createOrder(payload);
      console.log(`✅ SUCCESS for [${v.name}]! Response:`, JSON.stringify(response));
    } catch (err) {
      console.log(`❌ FAILED for [${v.name}]:`, err.message);
    }
  }
}

testCombinations();
