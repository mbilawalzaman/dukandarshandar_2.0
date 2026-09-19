const { ObjectId } = require('mongodb');
const clone = value => {
  if (value instanceof ObjectId) return new ObjectId(value.toHexString());
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
};
const equal = (a,b) => a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b;
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(q => matches(row, q));
    if (key === '$and') return value.every(q => matches(row, q));
    const actual = row[key];
    if (value === null) return actual == null;
    if (value && typeof value === 'object' && !(value instanceof ObjectId) && !(value instanceof Date)) {
      return Object.entries(value).every(([op,v]) => ({ $gte: () => actual >= v, $ne: () => !equal(actual,v), $nin: () => !v.includes(actual), $in: () => v.includes(actual) }[op]?.() ?? false));
    }
    return equal(actual,value);
  });
}
module.exports = function orderStore(initial) {
  let rows = clone(initial), queue = Promise.resolve();
  const db = { collection(name) {
    rows[name] ||= [];
    const find = q => rows[name].find(r => matches(r,q));
    return {
      async findOne(q) { return clone(find(q) || null); },
      async updateOne(q, update) {
        const row = find(q); if (!row) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(row, clone(update.$set || {}));
        for (const [k,v] of Object.entries(update.$inc || {})) row[k] = (row[k] || 0) + v;
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async findOneAndUpdate(q, update) { const before = clone(find(q)); await this.updateOne(q, update); return before ? clone(find({ _id: before._id })) : null; },
      async insertOne(row) { if (find({ _id: row._id })) throw Object.assign(new Error('duplicate'), { code: 11000 }); rows[name].push(clone(row)); return { insertedId: row._id }; },
    };
  } };
  const client = { db: () => db, startSession: () => ({
    async withTransaction(work) {
      const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
      const before = clone(rows);
      try { return await work(); } catch (e) { rows = before; throw e; } finally { release(); }
    }, async endSession() {},
  }) };
  return { db, client, snapshot: () => clone(rows) };
};
