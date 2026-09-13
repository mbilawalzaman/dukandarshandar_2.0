/** Parse an optional numeric field; "", null and undefined all mean "not set". */
export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Drop undefined keys so MongoDB does not persist them as null. */
export function compact<T extends Record<string, unknown>>(doc: T): T {
  return Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined)) as T;
}
