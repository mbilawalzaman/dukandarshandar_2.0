export function parsePageLimit(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {}
) {
  const page = Math.max(1, parseInt(searchParams.get("page") || String(defaults.page ?? 1), 10) || 1);
  const maxLimit = defaults.maxLimit ?? 50;
  const rawLimit =
    parseInt(searchParams.get("limit") || String(defaults.limit ?? 10), 10) || (defaults.limit ?? 10);
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}
