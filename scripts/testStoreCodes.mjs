import dotenv from "dotenv";
dotenv.config();
import PostExService from "../src/services/postex.service.js";

async function testStoreCodes() {
  const codes = ["73662", "0", "1", "01", "DEFAULT", "Default", "MAIN", "PRIMARY", "STORE1", "001"];

  for (const code of codes) {
    console.log(`Testing pickupAddressCode='${code}' and storeAddressCode='${code}'...`);
    try {
      const payload = {
        cityName: "Lahore",
        customerName: "Test Customer",
        customerPhone: "03001234567",
        deliveryAddress: "Test House 123 Street 4 Lahore",
        invoiceDivision: 1,
        invoicePayment: "550",
        items: 1,
        orderDetail: "Test Item x1",
        orderRefNumber: "TEST-" + Math.floor(Math.random() * 1000000),
        orderType: "Normal",
        transactionNotes: "Test booking",
        pickupAddressCode: code,
        storeAddressCode: code,
      };
      const response = await PostExService.createOrder(payload);
      console.log(`🎉 SUCCESS for code '${code}'! Response:`, JSON.stringify(response));
      break;
    } catch (err) {
      console.log(`❌ FAILED for code '${code}':`, err.message);
    }
  }
}

testStoreCodes();
