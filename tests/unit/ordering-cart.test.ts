import { describe, it, expect } from "vitest";
import { priceCartAgainst } from "@/lib/ordering/cart";
import type { MenuItemPublic } from "@/lib/menu/types";

const PIZZA: MenuItemPublic = {
  id: "p1",
  slug: "pep",
  name: "Pepperoni",
  description: "",
  category: "PIZZA",
  basePriceCents: 1000,
  sizes: [
    { id: "s", name: "S", priceDeltaCents: 0 },
    { id: "m", name: "M", priceDeltaCents: 300 },
  ],
  toppings: [{ id: "bacon", name: "Bacon", priceDeltaCents: 175 }],
  imageUrl: null,
  sauce: "red",
  tag: "classic",
  visualToppingIds: [],
};

const SODA: MenuItemPublic = {
  id: "d1",
  slug: "cola",
  name: "Cola",
  description: "",
  category: "DRINK",
  basePriceCents: 299,
  sizes: [],
  toppings: [],
  imageUrl: null,
  sauce: null,
  tag: null,
  visualToppingIds: [],
};

describe("priceCart", () => {
  it("computes subtotal, tax, delivery, and total", () => {
    const menu = new Map<string, MenuItemPublic>([
      ["p1", PIZZA],
      ["d1", SODA],
    ]);
    const priced = priceCartAgainst(
      {
        lines: [
          { menuItemId: "p1", sizeId: "m", toppingIds: ["bacon"], quantity: 1 },
          { menuItemId: "d1", sizeId: "", toppingIds: [], quantity: 2 },
        ],
      },
      menu,
    );

    // Pizza: 1000 + 300 + 175 = 1475, x1 = 1475
    // Soda:  299, x2 = 598
    const subtotal = 1475 + 598;
    expect(priced.subtotalCents).toBe(subtotal);
    expect(priced.taxCents).toBe(Math.round(subtotal * 0.08));
    expect(priced.deliveryFeeCents).toBe(399);
    expect(priced.totalCents).toBe(subtotal + priced.taxCents + priced.deliveryFeeCents);
  });

  it("throws ITEM_UNAVAILABLE when a line references a missing item", () => {
    const menu = new Map<string, MenuItemPublic>([["p1", PIZZA]]);
    expect(() =>
      priceCartAgainst(
        { lines: [{ menuItemId: "ghost", sizeId: "s", toppingIds: [], quantity: 1 }] },
        menu,
      ),
    ).toThrowError(/Menu item is no longer available/);
  });
});
