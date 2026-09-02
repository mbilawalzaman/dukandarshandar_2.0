import { getDb } from "@/lib/db";
import {
  DEFAULT_DELIVERY_SETTINGS,
  DELIVERY_SETTINGS_KEY,
  type DeliverySettings,
} from "@/lib/deliverySettings";

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ key: DELIVERY_SETTINGS_KEY });

  if (!doc) return { ...DEFAULT_DELIVERY_SETTINGS };

  const fee = Number(doc.fee);
  return {
    feeEnabled: doc.feeEnabled !== false,
    fee: Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_SETTINGS.fee,
    updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined,
    updatedBy: doc.updated_by || undefined,
  };
}

export async function updateDeliverySettings(
  input: Pick<DeliverySettings, "feeEnabled" | "fee">,
  updatedBy: string
): Promise<DeliverySettings> {
  const db = await getDb();
  const fee = Math.max(0, Number(input.fee) || 0);

  await db.collection("settings").updateOne(
    { key: DELIVERY_SETTINGS_KEY },
    {
      $set: {
        key: DELIVERY_SETTINGS_KEY,
        feeEnabled: Boolean(input.feeEnabled),
        fee,
        updated_at: new Date(),
        updated_by: updatedBy,
      },
    },
    { upsert: true }
  );

  return getDeliverySettings();
}
