/**
 * Local Safepay webhook signature tester.
 *
 * Usage:
 *   node --env-file=.env scripts/test-webhook-signature.mjs
 *
 * With a real failed delivery from Safepay Dashboard → Endpoints → Deliveries:
 *   node --env-file=.env scripts/test-webhook-signature.mjs --verify-only \
 *     --timestamp "2026-09-01T10:00:00.000Z" \
 *     --signature "sha256=abc..." \
 *     --body-file delivery-body.json
 */
import crypto from "crypto";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || "http://localhost:3000/api/webhooks/safepay";
const secret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();

if (!secret) {
  console.error("Missing SAFEPAY_WEBHOOK_SECRET. Run with: node --env-file=.env scripts/test-webhook-signature.mjs");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { verifyOnly: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--body-file") opts.bodyFile = args[++i];
    else if (args[i] === "--timestamp") opts.timestamp = args[++i];
    else if (args[i] === "--signature") opts.signature = args[++i];
    else if (args[i] === "--verify-only") opts.verifyOnly = true;
  }
  return opts;
}

const keyStrategies = {
  "hex-decode (64-char hex secret)": (s) =>
    /^[0-9a-fA-F]{64}$/.test(s) ? Buffer.from(s, "hex") : null,
  "base64-decode": (s) => {
    try {
      const buf = Buffer.from(s, "base64");
      return buf.length > 0 ? buf : null;
    } catch {
      return null;
    }
  },
  "utf8-bytes (secret as plain string)": (s) => Buffer.from(s, "utf8"),
};

function sign(timestamp, rawBody, key) {
  const payload = `${timestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", key).update(payload).digest("hex");
  return { prefixed: `sha256=${digest}`, bare: digest };
}

function signaturesMatch(computed, provided) {
  const normalized = provided.trim();
  return [computed.prefixed, computed.bare].some((candidate) => {
    const a = Buffer.from(candidate);
    const b = Buffer.from(normalized);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function curlPost(rawBody, timestamp, signature) {
  const tmpBody = `/tmp/safepay-webhook-body-${process.pid}.json`;
  writeFileSync(tmpBody, rawBody);

  try {
    const httpCode = execSync(
      [
        `curl -sS -o /tmp/safepay-webhook-response-${process.pid}.json -w '%{http_code}'`,
        `-X POST "${WEBHOOK_URL}"`,
        `-H "Content-Type: application/json"`,
        `-H "x-sfpy-timestamp: ${timestamp}"`,
        `-H "x-sfpy-signature: ${signature}"`,
        `-H "x-sfpy-event-type: payment.completed"`,
        `-H "x-sfpy-event-id: test-event-id"`,
        `--data-binary @${tmpBody}`,
      ].join(" "),
      { encoding: "utf8" }
    ).trim();

    const body = readFileSync(`/tmp/safepay-webhook-response-${process.pid}.json`, "utf8");
    return { httpCode, body };
  } finally {
    try {
      unlinkSync(tmpBody);
    } catch {}
  }
}

const opts = parseArgs();

const sampleBody =
  opts.bodyFile != null
    ? readFileSync(opts.bodyFile, "utf8")
    : JSON.stringify({
        type: "payment.completed",
        data: {
          tracker: "track_test_signature_probe",
          status: "completed",
          metadata: { order_id: "000000000000000000000000" },
        },
      });

const timestamp = opts.timestamp || new Date().toISOString();

console.log("Safepay webhook signature probe");
console.log(`Target: ${WEBHOOK_URL}`);
console.log(`Secret format: ${/^[0-9a-fA-F]{64}$/.test(secret) ? "64-char hex" : "other"}`);
console.log(`Timestamp: ${timestamp}`);
console.log(`Body length: ${sampleBody.length} bytes\n`);

const results = [];

for (const [name, deriveKey] of Object.entries(keyStrategies)) {
  const key = deriveKey(secret);
  if (!key) {
    console.log(`[skip] ${name} — not applicable`);
    continue;
  }

  const sig = sign(timestamp, sampleBody, key);
  console.log(`--- ${name} (key ${key.length} bytes) ---`);
  console.log(`  computed sha256=...${sig.prefixed.slice(-16)}`);

  if (opts.signature) {
    const matches = signaturesMatch(sig, opts.signature);
    console.log(`  matches Safepay delivery signature: ${matches ? "YES" : "no"}`);
    results.push({ name, matches });
    continue;
  }

  if (opts.verifyOnly) continue;

  for (const [label, signature] of [
    ["prefixed (sha256=...)", sig.prefixed],
    ["bare hex", sig.bare],
  ]) {
    try {
      const { httpCode, body } = curlPost(sampleBody, timestamp, signature);
      const sigOk = httpCode !== "401";
      console.log(
        `  curl ${label}: HTTP ${httpCode} — signature ${sigOk ? "ACCEPTED" : "rejected"} — ${body.slice(0, 80)}`
      );
      results.push({ name, label, httpCode, signatureOk: sigOk });
    } catch (err) {
      console.log(`  curl ${label}: FAILED (${err.message})`);
    }
  }

  if (name === "hex-decode (64-char hex secret)" && !opts.signature && !opts.verifyOnly) {
    console.log("\n  Example curl (hex key, sha256= prefix):");
    console.log(
      `  curl -X POST "${WEBHOOK_URL}" \\\n` +
        `    -H "Content-Type: application/json" \\\n` +
        `    -H "x-sfpy-timestamp: ${timestamp}" \\\n` +
        `    -H "x-sfpy-signature: ${sig.prefixed}" \\\n` +
        `    -H "x-sfpy-event-type: payment.completed" \\\n` +
        `    -H "x-sfpy-event-id: test-event-id" \\\n` +
        `    --data-binary '${sampleBody.replace(/'/g, "'\\''")}'`
    );
  }
  console.log("");
}

if (opts.signature) {
  const winner = results.find((r) => r.matches);
  if (winner) {
    console.log(`\n✓ Correct key encoding: ${winner.name}`);
    console.log("\nReplay Safepay delivery with curl:");
    console.log(
      `curl -X POST "${WEBHOOK_URL}" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -H "x-sfpy-timestamp: ${timestamp}" \\\n` +
        `  -H "x-sfpy-signature: ${opts.signature}" \\\n` +
        `  -H "x-sfpy-event-type: payment.completed" \\\n` +
        `  --data-binary @delivery-body.json`
    );
  } else {
    console.log("\n✗ No key encoding matched the Safepay delivery signature.");
    console.log("Double-check secret, timestamp, and raw body bytes from the delivery log.");
  }
} else if (!opts.verifyOnly) {
  const ok = results.filter((r) => r.signatureOk);
  if (ok.length) {
    console.log("\n✓ Signature verification passed (401 = rejected; 200/500 = accepted):");
    ok.forEach((r) => console.log(`  - ${r.name} / ${r.label} → HTTP ${r.httpCode}`));
  } else {
    console.log("\nAll curl probes returned non-200 for signature verification.");
    console.log("Use a real delivery from Safepay dashboard:");
    console.log("  node --env-file=.env scripts/test-webhook-signature.mjs --verify-only \\");
    console.log('    --timestamp "<x-sfpy-timestamp>" --signature "<x-sfpy-signature>" --body-file delivery.json');
  }
}
