import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { parseBody } from "@/lib/http/validate";
import { requireCustomer } from "@/lib/auth/requireCustomer";
import { cartInputSchema, priceCart } from "@/lib/ordering/cart";
import { prisma } from "@/lib/db";

export const POST = withApi(async (req: NextRequest) => {
  const { customer } = await requireCustomer(req);
  const body = await parseBody(req, cartInputSchema);

  // Server-side re-pricing — clients never get to declare totals.
  const priced = await priceCart(body);

  await prisma.cart.upsert({
    where: { customerId: customer.id },
    create: {
      customerId: customer.id,
      lines: body.lines.map((l) => ({
        menuItemId: l.menuItemId,
        sizeId: l.sizeId,
        toppingIds: l.toppingIds,
        quantity: l.quantity,
      })),
    },
    update: {
      lines: body.lines.map((l) => ({
        menuItemId: l.menuItemId,
        sizeId: l.sizeId,
        toppingIds: l.toppingIds,
        quantity: l.quantity,
      })),
    },
  });

  return NextResponse.json({ cart: priced });
});

export async function GET() {
  return methodNotAllowed(["POST"]);
}
