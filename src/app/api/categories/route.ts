import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/controllers/categoryController";

export const maxDuration = 60;

export async function GET(req: Request) {
  return getCategories(req);
}

export async function POST(req: Request) {
  return createCategory(req);
}

export async function PUT(req: Request) {
  return updateCategory(req);
}

export async function DELETE(req: Request) {
  return deleteCategory(req);
}
