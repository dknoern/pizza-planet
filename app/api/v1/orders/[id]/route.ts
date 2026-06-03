import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { getOrderForCustomer, getOrderById } from "@/lib/ordering/queries";
import { resolveGuestOrderToken } from "@/lib/ordering/guestToken";

export const GET = withApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    const auth = await resolveCustomer(req);
    if (auth) {
      const order = await getOrderForCustomer(id, auth.customer.id);
      return NextResponse.json({ order });
    }

    if (token) {
      const tokenOrderId = await resolveGuestOrderToken(token);
      if (tokenOrderId !== id) {
        throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
      }
      const order = await getOrderById(id);
      return NextResponse.json({ order });
    }

    throw new ApiError("UNAUTHENTICATED", "Authentication required.", 401);
  },
);

export async function POST() {
  return methodNotAllowed(["GET"]);
}
