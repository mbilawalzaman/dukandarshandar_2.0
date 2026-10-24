import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ObjectId } from "mongodb";

import { getAuthUser, requireAdmin, requireAuth } from "@/lib/auth";
import { throttleRequest } from "@/lib/rateLimit.server";
import { attachSessionCookies } from "@/lib/session";
import { CheckoutError } from "@/lib/checkoutValidation";
import {
  listOrdersService,
  getOrderByIdService,
  createOrderService,
  updateOrderStatusService,
  trackOrderService,
} from "@/services/orderService";
import { cancelCustomerOrder } from "@/services/orderCancelService";
import { getDb } from "@/lib/db";
import { hasReservedStock } from "@/lib/orderRules";
import {
  withOrderTransaction,
  releaseOrderStock,
} from "@/lib/orderTransaction";
import { releaseRedemptions } from "@/services/promotionService";

export type DeleteOrdersResult = {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: string;
};

/**
 * Controller: Handles GET /api/orders (Listing orders with filters & summary)
 */
export async function getOrders(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const result = await listOrdersService(user, searchParams);

    return NextResponse.json({
      success: true,
      orders: result.orders,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

/**
 * Controller: Handles GET /api/orders/[id] (Single order details)
 */
export async function getOrderById(
  req: NextRequest,
  id: string,
): Promise<NextResponse> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 },
      );
    }

    const result = await getOrderByIdService(id, user);

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 },
      );
    }

    if ("forbidden" in result && result.forbidden) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, order: result.order });
  } catch (error) {
    console.error("Error fetching order by ID:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

/**
 * Controller: Handles POST /api/orders (Checkout & order creation)
 */
export async function createOrder(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please login, sign up, or continue as guest to place an order",
        },
        { status: 401 },
      );
    }

    const limited = await throttleRequest(
      req,
      "orders",
      20,
      60 * 1000,
      user.userId,
    );

    if (limited) return limited;

    const rawBody = await req.json();
    const result = await createOrderService(rawBody, user, req);

    if (!result.created) {
      return NextResponse.json({
        success: true,
        order: result.order,
        message: result.message || "Order already placed",
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: result.order,
      ...(result.syncedSession
        ? { token: result.syncedSession.accessToken }
        : {}),
      profileSynced: result.profileSynced,
    });

    if (result.syncedSession) {
      attachSessionCookies(
        response,
        result.syncedSession.accessToken,
        result.syncedSession.refreshToken,
      );
    }

    return response;
  } catch (error) {
    console.error("Error creating order:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof CheckoutError
            ? error.message
            : "Failed to place order",
      },
      { status: error instanceof CheckoutError ? error.status : 500 },
    );
  }
}

/**
 * Controller: Handles PUT /api/orders (Status updates & fulfillment)
 */
export async function updateOrderStatus(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const admin = requireAdmin(req);

    if (!admin.ok) return admin.response;

    const body = (await req.json()) as { _id?: string; status?: string };
    const { _id, status } = body;

    if (!_id || !status) {
      return NextResponse.json(
        { success: false, message: "Order ID and status are required" },
        { status: 400 },
      );
    }

    const result = await updateOrderStatusService(_id, status, admin.user);

    return NextResponse.json(
      { success: result.success, message: result.message },
      { status: result.status },
    );
  } catch (error) {
    console.error("Error updating order:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof CheckoutError
            ? error.message
            : "Failed to update order",
      },
      { status: error instanceof CheckoutError ? error.status : 500 },
    );
  }
}

/**
 * Controller: Handles DELETE /api/orders and DELETE /api/orders/[id]
 */
export async function deleteOrdersHandler(
  req: NextRequest,
  paramId?: string,
): Promise<NextResponse> {
  try {
    const admin = requireAdmin(req);

    if (!admin.ok) return admin.response;

    const body = (await req.json().catch(() => ({}))) as {
      orderIds?: unknown;
      orderId?: unknown;
    };

    const url = new URL(req.url);
    const queryId = url.searchParams.get("id");

    const rawIds = paramId
      ? [paramId]
      : Array.isArray(body?.orderIds)
        ? body.orderIds
        : typeof body?.orderId === "string"
          ? [body.orderId]
          : typeof queryId === "string"
            ? [queryId]
            : [];

    const orderIds = rawIds
      .filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
      .map((id) => id.trim());

    if (orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No order IDs provided" },
        { status: 400 },
      );
    }

    const result = await deleteOrders(orderIds);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error in deleteOrdersHandler:", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete order";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * Core business function for deleting orders from database with inventory safety
 */
export async function deleteOrders(
  rawOrderIds: string[],
): Promise<DeleteOrdersResult> {
  if (!Array.isArray(rawOrderIds) || rawOrderIds.length === 0) {
    return { success: false, message: "No order IDs provided" };
  }

  const validObjectIds = rawOrderIds
    .filter((id) => typeof id === "string" && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (validObjectIds.length === 0) {
    return { success: false, message: "No valid order IDs provided" };
  }

  const stringIds = validObjectIds.map((id) => id.toString());

  try {
    const deletedCount = await withOrderTransaction(async (tx) => {
      const orders = await tx.db
        .collection("orders")
        .find({ _id: { $in: validObjectIds } }, { session: tx.session })
        .toArray();

      if (orders.length === 0) return 0;

      for (const order of orders) {
        if (hasReservedStock(order) && order.status !== "cancelled") {
          await releaseOrderStock(tx, order);
        }

        if (order.promotions_recorded) {
          await releaseRedemptions(String(order._id), tx);
        }
      }

      const deleteResult = await tx.db
        .collection("orders")
        .deleteMany({ _id: { $in: validObjectIds } }, { session: tx.session });

      await tx.db
        .collection("promotion_redemptions")
        .deleteMany({ orderId: { $in: stringIds } }, { session: tx.session });

      await tx.db
        .collection("reviews")
        .deleteMany({ orderId: { $in: stringIds } }, { session: tx.session });

      await tx.db.collection("postex_shipments").deleteMany(
        {
          $or: [
            { orderId: { $in: stringIds } },
            { orderId: { $in: validObjectIds } },
          ],
        },
        { session: tx.session },
      );

      return deleteResult.deletedCount;
    });

    return {
      success: true,
      message: `Successfully deleted ${deletedCount} order(s)`,
      deletedCount,
    };
  } catch (error) {
    console.warn("Transactional delete failed, attempting fallback:", error);

    try {
      const db = await getDb();

      const orders = await db
        .collection("orders")
        .find({ _id: { $in: validObjectIds } })
        .toArray();

      if (orders.length === 0) {
        return {
          success: true,
          message: "No orders found to delete",
          deletedCount: 0,
        };
      }

      const deleteResult = await db
        .collection("orders")
        .deleteMany({ _id: { $in: validObjectIds } });

      await db
        .collection("promotion_redemptions")
        .deleteMany({ orderId: { $in: stringIds } });

      await db
        .collection("reviews")
        .deleteMany({ orderId: { $in: stringIds } });

      await db.collection("postex_shipments").deleteMany({
        $or: [
          { orderId: { $in: stringIds } },
          { orderId: { $in: validObjectIds } },
        ],
      });

      return {
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} order(s)`,
        deletedCount: deleteResult.deletedCount,
      };
    } catch (fallbackErr) {
      console.error("Error deleting orders:", fallbackErr);

      const msg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : "Failed to delete order(s)";

      return { success: false, message: msg };
    }
  }
}

/**
 * Controller: Handles GET /api/orders/track
 */
export async function trackOrder(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber");
    const orderId = searchParams.get("orderId");

    const result = await trackOrderService({ trackingNumber, orderId }, user);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Track order error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof CheckoutError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to track order",
      },
      { status: error instanceof CheckoutError ? error.status : 500 },
    );
  }
}

/**
 * Controller: Handles POST /api/orders/[id]/cancel
 */
export async function cancelOrder(
  req: NextRequest,
  id: string,
): Promise<NextResponse> {
  try {
    const auth = requireAuth(req);

    if (!auth.ok) return auth.response;

    const result = await cancelCustomerOrder(id, {
      userId: auth.user.userId,
      email: auth.user.email,
      role: auth.user.role,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.refunded
        ? "Order cancelled and refund initiated"
        : "Order cancelled successfully",
      orderId: result.orderId,
      refunded: result.refunded,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to cancel order" },
      { status: 500 },
    );
  }
}
