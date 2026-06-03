import { describe, it, expect } from "vitest";
import { priceLine } from "@/lib/menu/pricing";
import type { MenuItemPublic } from "@/lib/menu/types";

const PIZZA: MenuItemPublic = {
  id: "pizza-1",
  slug: "pep",
  name: "Pepperoni",
  description: "",
  category: "PIZZA",
  basePriceCents: 1000,
  sizes: [
    { id: "s", name: "S", priceDeltaCents: 0 },
    { id: "m", name: "M", priceDeltaCents: 300 },
    { id: "l", name: "L", priceDeltaCents: 600 },
  ],
  toppings: [
    { id: "pep", name: "Pepperoni", priceDeltaCents: 150 },
    { id: "mush", name: "Mushrooms", priceDeltaCents: 100 },
  ],
  imageUrl: null,
  sauce: "red",
  tag: "classic",
  visualToppingIds: [],
};

describe("priceLine", () => {
  it("prices base + size + toppings × quantity", () => {
    const result = priceLine({
      menuItem: PIZZA,
      sizeId: "m",
      toppingIds: ["pep", "mush"],
      quantity: 2,
    });
    expect(result.unitPriceCents).toBe(1000 + 300 + 150 + 100);
    expect(result.lineTotalCents).toBe(result.unitPriceCents * 2);
    expect(result.sizeName).toBe("M");
    expect(result.toppingNames).toEqual(["Pepperoni", "Mushrooms"]);
  });

  it("handles items with no sizes (sides/drinks)", () => {
    const soda: MenuItemPublic = { ...PIZZA, sizes: [], toppings: [], basePriceCents: 299 };
    const result = priceLine({ menuItem: soda, sizeId: "", toppingIds: [], quantity: 3 });
    expect(result.unitPriceCents).toBe(299);
    expect(result.lineTotalCents).toBe(897);
  });

  it("rejects unknown size with ITEM_UNAVAILABLE", () => {
    expect(() =>
      priceLine({ menuItem: PIZZA, sizeId: "xl", toppingIds: [], quantity: 1 }),
    ).toThrowError(/Selected size/);
  });

  it("rejects unknown topping with ITEM_UNAVAILABLE", () => {
    expect(() =>
      priceLine({ menuItem: PIZZA, sizeId: "s", toppingIds: ["bacon"], quantity: 1 }),
    ).toThrowError(/topping/);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      priceLine({ menuItem: PIZZA, sizeId: "s", toppingIds: [], quantity: 0 }),
    ).toThrowError();
  });
});
