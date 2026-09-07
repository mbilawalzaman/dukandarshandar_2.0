import { submitProductRating } from "@/controllers/productController";

/** Public storefront rating only — full product edits use PUT /api/products/[id] (admin). */
export async function PATCH(req: Request) {
  return await submitProductRating(req);
}
