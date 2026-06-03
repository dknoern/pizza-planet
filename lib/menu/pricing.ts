import { ApiError } from "../http/errors";
import type { MenuItemPublic } from "./types";

export type PriceLineInput = {
  menuItem: MenuItemPublic;
  sizeId: string;
  toppingIds: string[];
  quantity: number;
};

export type PricedLine = {
  unitPriceCents: number;
  lineTotalCents: number;
  sizeName: string;
  toppingNames: string[];
};

export function priceLine(input: PriceLineInput): PricedLine {
  const { menuItem, sizeId, toppingIds, quantity } = input;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new ApiError("ITEM_UNAVAILABLE", "Line quantity must be a positive integer.", 409, {
      menuItemId: menuItem.id,
    });
  }

  // Pizzas require a size; sides/drinks don't (sizeId may be "").
  let sizeDelta = 0;
  let sizeName = "";
  if (menuItem.sizes.length > 0) {
    const size = menuItem.sizes.find((s) => s.id === sizeId);
    if (!size) {
      throw new ApiError("ITEM_UNAVAILABLE", "Selected size is unavailable.", 409, {
        menuItemId: menuItem.id,
        sizeId,
      });
    }
    sizeDelta = size.priceDeltaCents;
    sizeName = size.name;
  }

  let toppingsDelta = 0;
  const toppingNames: string[] = [];
  for (const tid of toppingIds) {
    const t = menuItem.toppings.find((x) => x.id === tid);
    if (!t) {
      throw new ApiError("ITEM_UNAVAILABLE", "Selected topping is unavailable.", 409, {
        menuItemId: menuItem.id,
        toppingId: tid,
      });
    }
    toppingsDelta += t.priceDeltaCents;
    toppingNames.push(t.name);
  }

  const unitPriceCents = menuItem.basePriceCents + sizeDelta + toppingsDelta;
  const lineTotalCents = unitPriceCents * quantity;

  return { unitPriceCents, lineTotalCents, sizeName, toppingNames };
}
