import { POSTEX_CONFIG } from "../config/postex.config.js";
import CustomError from "../utils/customError.js";

/**
 * PostEx Courier Integration Service
 * Specification Version: M-v4.1.9
 */
class PostExService {
  /**
   * Helper method to perform HTTP requests to PostEx API
   */
  static async _request(endpoint, options = {}) {
    const token = POSTEX_CONFIG.API_TOKEN;

    if (!token) {
      throw new CustomError(
        "PostEx API token is not configured in environment variables (POSTEX_API_TOKEN).",
        500,
      );
    }

    const url = `${POSTEX_CONFIG.BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

    const headers = {
      token: token,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      POSTEX_CONFIG.TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        let errorMsg = `PostEx API HTTP ${response.status}`;

        try {
          const responseData = await response.json();

          errorMsg =
            responseData.statusMessage ||
            responseData.message ||
            responseData.error ||
            errorMsg;
        } catch {
          const text = await response.text().catch(() => "");

          if (text) errorMsg = text;
        }

        throw new CustomError(errorMsg, response.status || 400);
      }

      // Handle PDF Binary responses
      if (
        contentType.includes("application/pdf") ||
        options.responseType === "arraybuffer"
      ) {
        if (contentType.includes("application/json")) {
          const responseData = await response.json().catch(() => ({}));

          if (responseData.statusCode && responseData.statusCode !== "200") {
            const errorMsg =
              responseData.statusMessage ||
              responseData.message ||
              `PostEx API Error ${responseData.statusCode}`;

            throw new CustomError(errorMsg, 400);
          }

          return responseData;
        }

        const arrayBuffer = await response.arrayBuffer();

        return Buffer.from(arrayBuffer);
      }

      const responseData = await response.json().catch(() => ({}));

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new CustomError("PostEx API request timed out.", 504);
      }

      if (error instanceof CustomError) throw error;
      throw new CustomError(`PostEx Integration Error: ${error.message}`, 500);
    }
  }

  /**
   * Phone number format sanitizer (converts +923xx or 923xx to 03xxxxxxxxx)
   */
  static formatPhoneNumber(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/\D/g, "");

    if (cleaned.startsWith("923")) {
      cleaned = "0" + cleaned.substring(2);
    } else if (cleaned.startsWith("3") && cleaned.length === 10) {
      cleaned = "0" + cleaned;
    }

    return cleaned;
  }

  /**
   * Auto-resolves raw city names (e.g. 'Lahore - Garhi Shahu') to PostEx operational city names (e.g. 'Lahore')
   */
  static async resolveOperationalCity(cityName) {
    if (!cityName) return "";

    const cleanPart = String(cityName)
      .split("-")[0]
      .split(",")[0]
      .trim()
      .toLowerCase();

    try {
      const response = await this.getOperationalCities();

      const citiesList = Array.isArray(response?.dist)
        ? response.dist
        : Array.isArray(response)
          ? response
          : [];

      let match = citiesList.find((c) => {
        const cName = (
          c?.cityName ||
          c?.operationalCityName ||
          c?.name ||
          String(c)
        ).toLowerCase();

        return cName === cleanPart;
      });

      if (!match) {
        match = citiesList.find((c) => {
          const cName = (
            c?.cityName ||
            c?.operationalCityName ||
            c?.name ||
            String(c)
          ).toLowerCase();

          return cName.startsWith(cleanPart) || cleanPart.startsWith(cName);
        });
      }

      if (match) {
        return (
          match.cityName || match.operationalCityName || match.name || cleanPart
        );
      }
    } catch {
      /* fallback to clean string */
    }

    return String(cityName).split("-")[0].split(",")[0].trim();
  }

  /**
   * 3.1 Get Operational Cities API
   * @param {string} [type] - 'Pickup' | 'Delivery' | null
   */
  static async getOperationalCities(type = null) {
    const query = type
      ? `?operationalCityType=${encodeURIComponent(type)}`
      : "";

    return await this._request(
      `/services/integration/api/order/v2/get-operational-city${query}`,
    );
  }

  /**
   * 3.2 Get Pickup Address (Merchant Warehouse) API
   * @param {string} [cityName] - Filter by City
   */
  static async getPickupAddresses(cityName = "") {
    const query = cityName ? `?cityName=${encodeURIComponent(cityName)}` : "";

    return await this._request(
      `/services/integration/api/order/v1/get-merchant-address${query}`,
    );
  }

  /**
   * 3.3 Create Pickup Address API
   */
  static async createPickupAddress(data) {
    const {
      address,
      addressTypeId,
      cityName,
      contactPersonName,
      phone1,
      phone2,
      phone3,
      wareHouseManagerName,
    } = data;

    const body = {
      address,
      addressTypeId: Number(addressTypeId) || 2, // 1=Return, 2=Pickup
      cityName,
      contactPersonName,
      phone1: this.formatPhoneNumber(phone1),
      phone2: phone2 ? this.formatPhoneNumber(phone2) : "",
      phone3: phone3 ? this.formatPhoneNumber(phone3) : "",
      wareHouseManagerName: wareHouseManagerName || "",
    };

    return await this._request(
      "/services/integration/api/order/v2/create-merchant-address",
      {
        method: "POST",
        body,
      },
    );
  }

  /**
   * 3.4 Get Order Types API
   */
  static async getOrderTypes() {
    return await this._request(
      "/services/integration/api/order/v1/get-order-types",
    );
  }

  /**
   * 3.5 Create Order API
   */
  static async createOrder(orderPayload) {
    const formattedPhone = this.formatPhoneNumber(orderPayload.customerPhone);

    if (!/^03\d{9}$/.test(formattedPhone)) {
      throw new CustomError(
        "Invalid Customer Phone format for PostEx. Must be 11 digits (e.g. 03234111111)",
        400,
      );
    }

    const resolvedCity = await this.resolveOperationalCity(
      orderPayload.cityName,
    );

    const body = {
      cityName: resolvedCity || orderPayload.cityName,
      customerName: orderPayload.customerName,
      customerPhone: formattedPhone,
      deliveryAddress: orderPayload.deliveryAddress,
      invoiceDivision: Number(orderPayload.invoiceDivision) || 1,
      invoicePayment: String(orderPayload.invoicePayment || 0),
      items: Number(orderPayload.items) || 1,
      orderDetail: orderPayload.orderDetail || "",
      orderRefNumber: String(orderPayload.orderRefNumber),
      orderType: orderPayload.orderType || "Normal",
      transactionNotes: orderPayload.transactionNotes || "",
      pickupAddressCode:
        orderPayload.pickupAddressCode ||
        POSTEX_CONFIG.DEFAULT_PICKUP_ADDRESS_CODE ||
        "001",
      ...(orderPayload.storeAddressCode
        ? { storeAddressCode: orderPayload.storeAddressCode }
        : {}),
    };

    return await this._request(
      "/services/integration/api/order/v3/create-order",
      {
        method: "POST",
        body,
      },
    );
  }

  /**
   * 3.6 List Un-booked Orders API
   */
  static async getUnbookedOrders({ startDate, endDate, cityName = "" }) {
    const queryParams = new URLSearchParams({ startDate, endDate });

    if (cityName) queryParams.append("cityName", cityName);

    return await this._request(
      `/services/integration/api/order/v2/get-unbooked-orders?${queryParams.toString()}`,
    );
  }

  /**
   * 3.7 Generate Load Sheet API (Returns PDF Buffer)
   */
  static async generateLoadSheet({
    trackingNumbers,
    pickupAddress = "",
    pickupAddressCode = "",
  }) {
    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      throw new CustomError(
        "Tracking numbers list is required to generate load sheet.",
        400,
      );
    }

    let resolvedCode = pickupAddressCode;
    let resolvedAddress = pickupAddress;

    try {
      const addressesRes = await this.getPickupAddresses();

      const defaultAddr = Array.isArray(addressesRes?.dist)
        ? addressesRes.dist.find((a) => a.addressCode === "001") ||
          addressesRes.dist[0]
        : null;

      if (defaultAddr) {
        if (!resolvedCode) resolvedCode = defaultAddr.addressCode || "001";
        if (!resolvedAddress)
          resolvedAddress = defaultAddr.address || defaultAddr.cityName || "";
      }
    } catch {
      /* fallback */
    }

    if (!resolvedCode)
      resolvedCode = POSTEX_CONFIG.DEFAULT_PICKUP_ADDRESS_CODE || "001";
    if (!resolvedAddress) resolvedAddress = resolvedCode;

    const payloadVariants = [
      {
        pickupAddress: resolvedAddress,
        pickupAddressCode: resolvedCode,
        pickUpAddressCode: resolvedCode,
        trackingNumbers,
      },
      { pickupAddressCode: resolvedCode, trackingNumbers },
      { pickupAddress: resolvedAddress, trackingNumbers },
      { pickupAddress: resolvedCode, trackingNumbers },
      { trackingNumbers },
    ];

    let lastError = null;

    for (const body of payloadVariants) {
      try {
        const result = await this._request(
          "/services/integration/api/order/v2/generate-load-sheet",
          {
            method: "POST",
            body,
            responseType: "arraybuffer",
          },
        );

        if (Buffer.isBuffer(result) && result.length > 0) {
          return result;
        }
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || "").toUpperCase();

        if (msg.includes("INVALID TRACKING NUMBER")) {
          throw new CustomError(
            'PostEx Load Sheets can only be generated for active unbooked shipments. One or more tracking numbers have already been assigned to a load sheet or processed on PostEx. Use "Print Airway Bills PDF" to print shipping labels.',
            400,
          );
        }

        if (
          !msg.includes("PICKUP") &&
          !msg.includes("ADDRESS") &&
          !msg.includes("INVALID") &&
          !msg.includes("400")
        ) {
          throw err;
        }
      }
    }

    throw (
      lastError ||
      new CustomError("Failed to generate PostEx Load Sheet PDF", 400)
    );
  }

  /**
   * 3.8 Order Tracking API (Single Order)
   */
  static async trackOrder(trackingNumber) {
    if (!trackingNumber)
      throw new CustomError("Tracking number is required.", 400);

    return await this._request(
      `/services/integration/api/order/v1/track-order/${encodeURIComponent(trackingNumber)}`,
    );
  }

  /**
   * 3.9 Bulk Order Tracking API
   */
  static async trackBulkOrders(trackingNumbers) {
    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      throw new CustomError(
        "Tracking numbers list is required for bulk tracking.",
        400,
      );
    }

    return await this._request(
      "/services/integration/api/order/v1/track-bulk-order",
      {
        method: "POST",
        body: { trackingNumber: trackingNumbers },
      },
    );
  }

  /**
   * 3.10 Airway Bill API (Returns PDF Buffer - Max 10 tracking numbers per request)
   */
  static async getAirwayBillPDF(trackingNumbers) {
    const numbersArray = (
      Array.isArray(trackingNumbers) ? trackingNumbers : [trackingNumbers]
    )
      .map((tn) => String(tn).trim())
      .filter(Boolean);

    if (numbersArray.length === 0) {
      throw new CustomError(
        "At least one tracking number is required for Airway Bill.",
        400,
      );
    }

    if (numbersArray.length > 10) {
      throw new CustomError(
        "PostEx limits Airway Bill requests to a maximum of 10 tracking numbers per request.",
        400,
      );
    }

    // PostEx Airway Bill API requires literal commas in trackingNumbers query param
    const rawCommaJoined = numbersArray
      .map((tn) => encodeURIComponent(tn))
      .join(",");

    const query = `?trackingNumbers=${rawCommaJoined}`;

    // Primary endpoint path on PostEx API is `/services/integration/api/order/v1/get-invoice`
    const endpoints = [
      `/services/integration/api/order/v1/get-invoice${query}`,
      `/services/integration/api/order/v1/getinvoice${query}`,
    ];

    if (numbersArray.length === 1) {
      endpoints.push(
        `/services/integration/api/order/v1/get-invoice?trackingNumber=${encodeURIComponent(numbersArray[0])}`,
      );
    }

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await this._request(endpoint, {
          responseType: "arraybuffer",
        });

        if (Buffer.isBuffer(res) && res.length > 0) {
          return res;
        }
      } catch (err) {
        lastError = err;

        if (err && err.statusCode !== 404) {
          throw err;
        }
      }
    }

    throw (
      lastError ||
      new CustomError("Airway Bill PDF not found on PostEx servers.", 404)
    );
  }

  /**
   * 3.11 Save Shipper Advice API (PUT)
   * statusId: 1 = Mark Return Requested, 2 = Mark Retry Attempt
   */
  static async saveShipperAdvice({ trackingNumber, statusId, remarks }) {
    if (!trackingNumber || !statusId) {
      throw new CustomError(
        "trackingNumber and statusId are required for Shipper Advice.",
        400,
      );
    }

    const body = {
      trackingNumber,
      statusId: Number(statusId),
      remarks: remarks || "",
    };

    return await this._request(
      "/service/integration/api/order/v2/save-shipper-advice",
      {
        method: "PUT",
        body,
      },
    );
  }

  /**
   * 3.12 Get Shipper Advice API
   */
  static async getShipperAdvice(trackingNumber) {
    if (!trackingNumber)
      throw new CustomError("Tracking number is required.", 400);

    return await this._request(
      `/service/integration/api/order/v1/get-shipper-advice/${encodeURIComponent(trackingNumber)}`,
    );
  }

  /**
   * 3.13 Order Cancel API (PUT)
   */
  static async cancelOrder(trackingNumber) {
    if (!trackingNumber)
      throw new CustomError(
        "Tracking number is required for order cancellation.",
        400,
      );

    return await this._request(
      "/services/integration/api/order/v1/cancel-order",
      {
        method: "PUT",
        body: { trackingNumber },
      },
    );
  }

  /**
   * 3.14 Payment Status API
   */
  static async getPaymentStatus(trackingNumber) {
    if (!trackingNumber)
      throw new CustomError(
        "Tracking number is required for payment status.",
        400,
      );

    return await this._request(
      `/services/integration/api/order/v1/payment-status/${encodeURIComponent(trackingNumber)}`,
    );
  }

  /**
   * 3.15 Order Status List API
   */
  static async getOrderStatuses() {
    return await this._request(
      "/services/integration/api/order/v1/get-order-status",
    );
  }

  /**
   * 3.16 List All Orders API
   */
  static async listAllOrders({ orderStatusID = 0, fromDate, toDate }) {
    const queryParams = new URLSearchParams({
      orderStatusID: String(orderStatusID),
      fromDate,
      toDate,
    });

    return await this._request(
      `/services/integration/api/order/v1/get-all-order?${queryParams.toString()}`,
    );
  }
}

export default PostExService;
