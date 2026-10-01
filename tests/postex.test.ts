import { describe, it } from "node:test";
import assert from "node:assert/strict";
import PostExService from "../src/services/postex.service.js";

describe("PostEx Service Unit Tests", () => {
  it("should format Pakistani phone numbers to standard 11-digit format starting with 03", () => {
    assert.equal(PostExService.formatPhoneNumber("+923001234567"), "03001234567");
    assert.equal(PostExService.formatPhoneNumber("923001234567"), "03001234567");
    assert.equal(PostExService.formatPhoneNumber("3001234567"), "03001234567");
    assert.equal(PostExService.formatPhoneNumber("03001234567"), "03001234567");
  });

  it("should throw error if order payload contains invalid phone number", async () => {
    const invalidPayload = {
      cityName: "Lahore",
      customerName: "Test User",
      customerPhone: "12345", // Invalid
      deliveryAddress: "Test Address",
      orderRefNumber: "TEST-001",
    };

    await assert.rejects(
      async () => {
        await PostExService.createOrder(invalidPayload);
      },
      (err: unknown) => {
        return (err as Error).message.includes("Invalid Customer Phone format");
      }
    );
  });

  it("should reject airway bill requests exceeding 10 tracking numbers", async () => {
    const elevenTrackingNumbers = Array.from({ length: 11 }, (_, i) => `CX-${i + 1}`);

    await assert.rejects(
      async () => {
        await PostExService.getAirwayBillPDF(elevenTrackingNumbers);
      },
      (err: unknown) => {
        return (err as Error).message.includes("maximum of 10 tracking numbers");
      }
    );
  });
});
