import { describe, it, expect, beforeAll } from "vitest";
import { placeOrder } from "@/lib/ordering/placeOrder";
import {
  issueGuestOrderToken,
  resolveGuestOrderToken,
} from "@/lib/ordering/guestToken";
import { getOrderById } from "@/lib/ordering/queries";
import type { PaymentProcessor } from "@/lib/payments/processor";
import { resetDb, seedSinglePizza } from "./helpers";

const APPROVING: PaymentProcessor = {
  async authorize() {
    return { status: "APPROVED", authorizationId: "sim", last4: "1111", brand: "VISA" };
  },
};

const FUTURE_YEAR = new Date().getFullYear() + 2;

describe("guest order placement and token-based lookup", () => {
  let pizzaId: string;

  beforeAll(async () => {
    await resetDb();
    pizzaId = await seedSinglePizza();
  });

  it("places an order with customerId=null and the guest contact info", async () => {
    const order = await placeOrder({
      input: {
        cart: { lines: [{ menuItemId: pizzaId, sizeId: "m", toppingIds: [], quantity: 1 }] },
        deliveryAddress: { line1: "10 Pie Ln", city: "X", state: "NY", postalCode: "10001" },
        guestContact: { name: "Guest", email: "guest@example.com", phone: "555-0100" },
        payment: { number: "4111111111111111", expMonth: 12, expYear: FUTURE_YEAR, cvv: "123" },
      },
      customerId: null,
      processor: APPROVING,
    });

    expect(order.customerId).toBeNull();
    expect(order.guestContact?.email).toBe("guest@example.com");

    const token = await issueGuestOrderToken(order.id);
    expect(token.length).toBeGreaterThan(20);

    const resolved = await resolveGuestOrderToken(token);
    expect(resolved).toBe(order.id);

    const fetched = await getOrderById(order.id);
    expect(fetched.id).toBe(order.id);
  });

  it("returns null for tampered or unknown tokens", async () => {
    expect(await resolveGuestOrderToken("not-a-token")).toBeNull();
    expect(await resolveGuestOrderToken("")).toBeNull();
  });
});
