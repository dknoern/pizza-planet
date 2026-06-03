import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { signup } from "@/lib/auth/signup";
import { login, _resetRateLimitForTests } from "@/lib/auth/login";
import { placeOrder } from "@/lib/ordering/placeOrder";
import { listOrdersForCustomer } from "@/lib/ordering/queries";
import type { PaymentProcessor } from "@/lib/payments/processor";
import { resetDb, seedSinglePizza } from "./helpers";

const APPROVING: PaymentProcessor = {
  async authorize() {
    return { status: "APPROVED", authorizationId: "sim_test", last4: "1111", brand: "VISA" };
  },
};

const FUTURE_YEAR = new Date().getFullYear() + 2;

describe("signup → login → place order", () => {
  let pizzaId: string;

  beforeAll(async () => {
    await resetDb();
    pizzaId = await seedSinglePizza();
  });

  beforeEach(() => {
    _resetRateLimitForTests();
  });

  it("creates a customer, authenticates, and lists the order under that customer", async () => {
    const c = await signup({
      email: "alice@example.com",
      password: "ProTip77",
      name: "Alice",
    });
    expect(c.email).toBe("alice@example.com");

    const logged = await login({ email: "alice@example.com", password: "ProTip77" });
    expect(logged.id).toBe(c.id);

    const order = await placeOrder({
      input: {
        cart: { lines: [{ menuItemId: pizzaId, sizeId: "m", toppingIds: [], quantity: 1 }] },
        deliveryAddress: { line1: "1 A St", city: "X", state: "NY", postalCode: "10001" },
        payment: {
          number: "4111111111111111",
          expMonth: 12,
          expYear: FUTURE_YEAR,
          cvv: "123",
        },
      },
      customerId: c.id,
      processor: APPROVING,
    });
    expect(order.customerId).toBe(c.id);
    expect(order.status).toBe("PLACED");

    const list = await listOrdersForCustomer(c.id);
    expect(list.orders).toHaveLength(1);
    expect(list.orders[0].id).toBe(order.id);
  });
});
