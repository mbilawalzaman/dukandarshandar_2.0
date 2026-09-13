import { ObjectId, type WithId, type Document } from "mongodb";
import { getDb } from "@/lib/db";
import { escapeRegex } from "@/lib/escapeRegex";
import presets from "@/data/promotionTypePresets.json";
import { PROMOTION_KINDS as KINDS, type PromotionType } from "@/types/apps/promotionTypes";

const COLLECTION = "promotion_types";

/** System presets live in src/data/promotionTypePresets.json (shared with scripts/seedPromotionTypes.mjs). */
export const SYSTEM_PROMOTION_TYPES = (presets as Array<Pick<PromotionType, "name" | "kind" | "description" | "defaults">>).map(
  (p) => ({ ...p, isSystem: true as const, isActive: true as const })
);

function serialize(doc: WithId<Document>): PromotionType {
  return {
    _id: String(doc._id),
    name: String(doc.name || ""),
    kind: KINDS.includes(doc.kind) ? doc.kind : "voucher",
    description: String(doc.description || ""),
    defaults: (doc.defaults && typeof doc.defaults === "object" ? doc.defaults : {}) as PromotionType["defaults"],
    isSystem: Boolean(doc.isSystem),
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

function validate(input: Partial<PromotionType>, partial = false) {
  if ((!partial || input.name !== undefined) && !String(input.name || "").trim()) throw new Error("Type name is required");
  if ((!partial || input.kind !== undefined) && (!input.kind || !KINDS.includes(input.kind))) throw new Error("Invalid promotion kind");
  const r = input.defaults?.reward;
  if (r?.type === "percentage" && r.value !== undefined && !(Number(r.value) > 0 && Number(r.value) <= 100)) {
    throw new Error("Percentage must be between 1 and 100");
  }
}

export async function listPromotionTypes(options: { includeInactive?: boolean } = {}): Promise<PromotionType[]> {
  const db = await getDb();
  const query: Record<string, unknown> = options.includeInactive ? {} : { isActive: { $ne: false } };
  const docs = await db.collection(COLLECTION).find(query).sort({ isSystem: -1, createdAt: 1 }).toArray();
  return docs.map(serialize);
}

export async function getPromotionTypeById(id: string): Promise<PromotionType | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  return doc ? serialize(doc) : null;
}

export async function createPromotionType(input: Partial<PromotionType>): Promise<PromotionType> {
  validate(input);
  const db = await getDb();
  const name = String(input.name).trim();
  const clash = await db.collection(COLLECTION).findOne({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
  if (clash) throw new Error(`A promotion type named "${name}" already exists`);

  const now = new Date();
  const doc = {
    name,
    kind: input.kind!,
    description: String(input.description || "").trim(),
    defaults: input.defaults || {},
    isSystem: false,
    isActive: input.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection(COLLECTION).insertOne(doc);
  return serialize({ _id: res.insertedId, ...doc });
}

export async function updatePromotionType(id: string, input: Partial<PromotionType>): Promise<PromotionType | null> {
  if (!ObjectId.isValid(id)) return null;
  validate(input, true);
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) {
    const name = String(input.name).trim();
    const clash = await db.collection(COLLECTION).findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      _id: { $ne: new ObjectId(id) },
    });
    if (clash) throw new Error(`A promotion type named "${name}" already exists`);
    set.name = name;
  }
  if (input.kind !== undefined) set.kind = input.kind;
  if (input.description !== undefined) set.description = String(input.description).trim();
  if (input.defaults !== undefined) set.defaults = input.defaults;
  if (input.isActive !== undefined) set.isActive = Boolean(input.isActive);

  const res = await db.collection(COLLECTION).findOneAndUpdate({ _id: new ObjectId(id) }, { $set: set }, { returnDocument: "after" });
  return res ? serialize(res) : null;
}

export async function deletePromotionType(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const target = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!target) return false;
  if (target.isSystem) throw new Error("System presets cannot be deleted. Deactivate it instead.");
  const res = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

/** Insert any missing system presets (idempotent). Used by the seed script and the admin "restore presets" action. */
export async function seedSystemPromotionTypes(): Promise<number> {
  const db = await getDb();
  let inserted = 0;
  for (const preset of SYSTEM_PROMOTION_TYPES) {
    const exists = await db.collection(COLLECTION).findOne({ name: preset.name, isSystem: true });
    if (exists) continue;
    const now = new Date();
    await db.collection(COLLECTION).insertOne({ ...preset, createdAt: now, updatedAt: now });
    inserted += 1;
  }
  return inserted;
}
