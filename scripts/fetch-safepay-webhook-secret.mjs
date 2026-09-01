/**
 * Fetch webhook endpoint secret from Safepay API (does not print full secret).
 * Usage: node --env-file=.env scripts/fetch-safepay-webhook-secret.mjs
 */
import crypto from "crypto";

const secretKey = process.env.SAFEPAY_SECRET_KEY?.trim();
const envSecret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();

const bases = [
  "https://sandbox.api.getsafepay.com",
  "https://dev.api.getsafepay.com/raastwire",
];

function fingerprint(value) {
  if (!value) return "missing";
  return `${value.length} chars, sha256=${crypto.createHash("sha256").update(value).digest("hex").slice(0, 12)}...`;
}

async function tryList(base) {
  const urls = [
    `${base}/v1/aggregators/me/webhooks`,
    `${base}/v1/webhooks`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-SFPY-AGGREGATOR-SECRET-KEY": secretKey,
          "x-sfpy-merchant-secret": secretKey,
        },
      });
      const text = await res.text();
      console.log(`\n${url}`);
      console.log(`  HTTP ${res.status}`);
      if (!res.ok) {
        console.log(`  ${text.slice(0, 200)}`);
        continue;
      }

      const json = JSON.parse(text);
      const endpoints =
        json?.data?.endpoints ||
        json?.data?.webhooks ||
        (Array.isArray(json?.data) ? json.data : []);

      if (!Array.isArray(endpoints) || endpoints.length === 0) {
        console.log("  No endpoints in response");
        console.log(`  keys: ${Object.keys(json?.data || {}).join(", ") || "none"}`);
        continue;
      }

      for (const ep of endpoints) {
        const apiSecret = ep.secret || ep.shared_secret || ep.signing_secret;
        console.log(`  endpoint: ${ep.token || ep.id || "?"}`);
        console.log(`  url: ${ep.url}`);
        console.log(`  api secret: ${fingerprint(apiSecret)}`);
        console.log(`  .env secret matches api: ${apiSecret?.trim() === envSecret ? "EXACT" : "no"}`);

        if (apiSecret && envSecret) {
          const apiHex = /^[0-9a-fA-F]{64}$/.test(apiSecret.trim());
          const envHex = /^[0-9a-fA-F]{64}$/.test(envSecret);
          if (apiHex && envHex) {
            console.log(`  hex bytes equal: ${apiSecret.trim().toLowerCase() === envSecret.toLowerCase()}`);
          }
          if (!apiHex) {
            try {
              const decoded = Buffer.from(apiSecret.trim(), "base64");
              const envDecoded = envHex ? Buffer.from(envSecret, "hex") : Buffer.from(envSecret, "base64");
              console.log(
                `  decoded api vs env bytes equal: ${
                  decoded.length === envDecoded.length &&
                  crypto.timingSafeEqual(decoded, envDecoded)
                } (api ${decoded.length}b, env ${envDecoded.length}b)`
              );
            } catch (e) {
              console.log(`  decode compare failed: ${e.message}`);
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.log(`  error: ${err.message}`);
    }
  }
  return false;
}

if (!secretKey) {
  console.error("SAFEPAY_SECRET_KEY required");
  process.exit(1);
}

console.log("Env SAFEPAY_WEBHOOK_SECRET:", fingerprint(envSecret));

for (const base of bases) {
  console.log(`\n=== ${base} ===`);
  await tryList(base);
}
