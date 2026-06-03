import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { placeOrder } from "@/lib/ordering/placeOrder";
import type { PaymentProcessor } from "@/lib/payments/processor";
import { resetDb, seedSinglePizza } from "./helpers";

const APPROVING: PaymentProcessor = {
  async authorize() {
    return { status: "APPROVED", authorizationId: "sim", last4: "1111", brand: "VISA" };
  },
};

const FUTURE_YEAR = new Date().getFullYear() + 2;

describe("checkout rejects unavailable items", () => {
  let pizzaId: string;

  beforeAll(async () => {
    await resetDb();
    pizzaId = await seedSinglePizza();
    // Take the item out of stock between cart-add and checkout.
    await prisma.menuItem.update({
      where: { id: pizzaId },
      data: { available: false },
    });
  });

  it("throws ITEM_UNAVAILABLE with the offending menuItemId", async () => {
    await expect(
      placeOrder({
        input: {
          cart: { lines: [{ menuItemId: pizzaId, sizeId: "m", toppingIds: [], quantity: 1 }] },
          deliveryAddress: { line1: "1 A St", city: "X", state: "NY", postalCode: "10001" },
          guestContact: { name: "G", email: "g@x.com", phone: "555" },
          payment: { number: "4111111111111111", expMonth: 12, expYear: FUTURE_YEAR, cvv: "123" },
        },
        customerId: null,
        processor: APPROVING,
      }),
    ).rejects.toMatchObject({
      code: "ITEM_UNAVAILABLE",
      status: 409,
      details: { menuItemId: pizzaId },
    });
  });
});
