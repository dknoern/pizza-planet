import { describe, it, expect, beforeAll } from "vitest";
import { signup } from "@/lib/auth/signup";
import { placeOrder } from "@/lib/ordering/placeOrder";
import { getOrderForCustomer } from "@/lib/ordering/queries";
import type { PaymentProcessor } from "@/lib/payments/processor";
import { resetDb, seedSinglePizza } from "./helpers";

const APPROVING: PaymentProcessor = {
  async authorize() {
    return { status: "APPROVED", authorizationId: "sim", last4: "1111", brand: "VISA" };
  },
};

const FUTURE_YEAR = new Date().getFullYear() + 2;

describe("cross-customer order access", () => {
  let aliceId: string;
  let bobId: string;
  let aliceOrderId: string;

  beforeAll(async () => {
    await resetDb();
    const pizzaId = await seedSinglePizza();

    const alice = await signup({ email: "alice@x.com", password: "Pass1234", name: "Alice" });
    const bob = await signup({ email: "bob@x.com", password: "Pass1234", name: "Bob" });
    aliceId = alice.id;
    bobId = bob.id;

    const order = await placeOrder({
      input: {
        cart: { lines: [{ menuItemId: pizzaId, sizeId: "m", toppingIds: [], quantity: 1 }] },
        deliveryAddress: { line1: "1 A St", city: "X", state: "NY", postalCode: "10001" },
        payment: { number: "4111111111111111", expMonth: 12, expYear: FUTURE_YEAR, cvv: "123" },
      },
      customerId: aliceId,
      processor: APPROVING,
    });
    aliceOrderId = order.id;
  });

  it("returns ORDER_NOT_FOUND (404, not 403) when Bob tries to read Alice's order", async () => {
    await expect(getOrderForCustomer(aliceOrderId, bobId)).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
      status: 404,
    });
  });

  it("returns the order for its owner", async () => {
    const order = await getOrderForCustomer(aliceOrderId, aliceId);
    expect(order.id).toBe(aliceOrderId);
  });
});
