import { describe, it, expect, vi } from "vitest";
import type { MenuItemPublic } from "@/lib/menu/types";

// vi.mock factories are hoisted to the top of the file, so any references
// inside must also be hoisted via vi.hoisted (not top-level consts).
const mocks = vi.hoisted(() => ({
  createMock: vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: "ord_1",
    ...args.data,
    createdAt: new Date(),
  })),
}));

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      order: { create: mocks.createMock },
      menuItem: {
        findMany: vi.fn(async () => [
          {
            id: "p1",
            slug: "pep",
            name: "Pep",
            description: "",
            category: "PIZZA",
            basePriceCents: 1000,
            sizes: [{ id: "s", name: "S", priceDeltaCents: 0 }],
            toppings: [],
            imageUrl: null,
            sauce: "red",
            tag: "classic",
            visualToppingIds: [],
          } satisfies MenuItemPublic & Record<string, unknown>,
        ]),
      },
    },
  };
});

import { placeOrder } from "@/lib/ordering/placeOrder";
import type { PaymentProcessor } from "@/lib/payments/processor";

const APPROVING: PaymentProcessor = {
  async authorize() {
    return {
      status: "APPROVED",
      authorizationId: "sim_test",
      last4: "1111",
      brand: "VISA",
    };
  },
};

describe("placeOrder persists only safe payment fields", () => {
  it("never writes PAN, CVV, expiry, or holderName to prisma.order.create", async () => {
    mocks.createMock.mockClear();
    await placeOrder({
      input: {
        cart: { lines: [{ menuItemId: "p1", sizeId: "s", toppingIds: [], quantity: 1 }] },
        deliveryAddress: {
          line1: "1 Pie St",
          city: "Slice",
          state: "NY",
          postalCode: "10001",
        },
        guestContact: { name: "Guest", email: "g@x.com", phone: "555" },
        payment: {
          number: "4111111111111111",
          expMonth: 12,
          expYear: new Date().getFullYear() + 1,
          cvv: "123",
          holderName: "Guest Person",
        },
      },
      customerId: null,
      processor: APPROVING,
    });

    expect(mocks.createMock).toHaveBeenCalledTimes(1);
    const writtenData = mocks.createMock.mock.calls[0][0].data;
    const payment = (writtenData.payment ?? {}) as Record<string, unknown>;

    expect(Object.keys(payment).sort()).toEqual(
      ["amountCents", "authorizationId", "brand", "last4"].sort(),
    );
    expect(payment.last4).toBe("1111");

    // The serialized form must contain no trace of the PAN, CVV, or expiry.
    const serialized = JSON.stringify(writtenData);
    expect(serialized).not.toContain("4111111111111111");
    expect(serialized).not.toContain("123"); // CVV
    expect(serialized).not.toMatch(/expYear/);
    expect(serialized).not.toMatch(/expMonth/);
    expect(serialized).not.toContain("Guest Person"); // holderName
  });
});
