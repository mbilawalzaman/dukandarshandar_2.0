import dotenv from "dotenv";

dotenv.config();

export const POSTEX_CONFIG = {
  BASE_URL: process.env.POSTEX_BASE_URL || "https://api.postex.pk",
  API_TOKEN: process.env.POSTEX_API_TOKEN || "",
  DEFAULT_PICKUP_ADDRESS_CODE:
    process.env.POSTEX_DEFAULT_PICKUP_ADDRESS_CODE || "",
  TIMEOUT_MS: parseInt(process.env.POSTEX_TIMEOUT_MS || "30000", 10),
};

export const POSTEX_ORDER_TYPES = {
  NORMAL: "Normal",
  REVERSED: "Reversed",
  REPLACEMENT: "Replacement",
};

export const POSTEX_STATUS_CODES = {
  "0001": "At Merchant's Warehouse",
  "0002": "Returned",
  "0003": "At PostEx Warehouse",
  "0004": "Package on Route",
  "0005": "Delivered",
  "0006": "Returned",
  "0007": "Returned",
  "0008": "Delivery Under Review",
  "0013": "Attempt Made",
};
