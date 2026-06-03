import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { parseBody, parseQuery } from "@/lib/http/validate";
import { resolveCustomer, requireCustomer } from "@/lib/auth/requireCustomer";
import { placeOrder, placeOrderInputSchema } from "@/lib/ordering/placeOrder";
import { listOrdersForCustomer } from "@/lib/ordering/queries";
import { issueGuestOrderToken } from "@/lib/ordering/guestToken";

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const GET = withApi(async (req: NextRequest) => {
  const { customer } = await requireCustomer(req);
  const q = parseQuery(req, listQuerySchema);
  const page = await listOrdersForCustomer(customer.id, q);
  return NextResponse.json(page);
});

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseBody(req, placeOrderInputSchema);
  const auth = await resolveCustomer(req);
  const order = await placeOrder({
    input: body,
    customerId: auth?.customer.id ?? null,
  });
  // Guests get a signed lookup token so they can retrieve the order later.
  const guestToken = auth ? undefined : await issueGuestOrderToken(order.id);
  if (!auth) {
    console.log(
      `[orders] guest order placed orderNumber=${order.orderNumber} email=${order.guestContact?.email ?? "?"} (stub: receipt email would be sent)`,
    );
  }
  return NextResponse.json({ order, guestToken }, { status: 201 });
});

export async function PUT() {
  return methodNotAllowed(["GET", "POST"]);
}
