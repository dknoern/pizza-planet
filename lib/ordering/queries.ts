import { prisma } from "../db";
import { ApiError } from "../http/errors";

export type OrderListPage = {
  orders: Awaited<ReturnType<typeof prisma.order.findMany>>;
  page: number;
  pageSize: number;
  total: number;
};

export async function listOrdersForCustomer(
  customerId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<OrderListPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: { customerId } }),
  ]);
  return { orders, page, pageSize, total };
}

// Returns 404 on ANY non-match — never 403 — so we don't leak the existence
// of an order that belongs to a different customer.
export async function getOrderForCustomer(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== customerId) {
    throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return order;
}

export async function getOrderById(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return order;
}

export async function getOrderByNumber(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) {
    throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return order;
}
