import { z } from "zod";
import { getMenuItemsByIds } from "../menu/queries";
import { priceLine } from "../menu/pricing";
import { ApiError } from "../http/errors";
import type { MenuItemPublic } from "../menu/types";

// Pricing knobs — kept in code for v1; could move to config later.
const TAX_RATE = 0.08;
const DELIVERY_FEE_CENTS = 399;

export const cartLineInputSchema = z
  .object({
    menuItemId: z.string().min(1),
    sizeId: z.string(),
    toppingIds: z.array(z.string()).default([]),
    quantity: z.number().int().min(1).max(50),
  })
  .strict();

export const cartInputSchema = z
  .object({
    lines: z.array(cartLineInputSchema).min(1),
  })
  .strict();

export type CartLineInput = z.infer<typeof cartLineInputSchema>;
export type CartInput = z.infer<typeof cartInputSchema>;

export type PricedCartLine = CartLineInput & {
  menuItemName: string;
  sizeName: string;
  toppingNames: string[];
  unitPriceCents: number;
  lineTotalCents: number;
};

export type PricedCart = {
  lines: PricedCartLine[];
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  totalCents: number;
};

export async function priceCart(cart: CartInput): Promise<PricedCart> {
  const ids = cart.lines.map((l) => l.menuItemId);
  const menuMap = await getMenuItemsByIds(ids);

  const pricedLines: PricedCartLine[] = [];
  for (const line of cart.lines) {
    const item: MenuItemPublic | undefined = menuMap.get(line.menuItemId);
    if (!item) {
      throw new ApiError("ITEM_UNAVAILABLE", "Menu item is no longer available.", 409, {
        menuItemId: line.menuItemId,
      });
    }
    const priced = priceLine({
      menuItem: item,
      sizeId: line.sizeId,
      toppingIds: line.toppingIds,
      quantity: line.quantity,
    });
    pricedLines.push({
      ...line,
      menuItemName: item.name,
      sizeName: priced.sizeName,
      toppingNames: priced.toppingNames,
      unitPriceCents: priced.unitPriceCents,
      lineTotalCents: priced.lineTotalCents,
    });
  }

  const subtotalCents = pricedLines.reduce((acc, l) => acc + l.lineTotalCents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const deliveryFeeCents = DELIVERY_FEE_CENTS;
  const totalCents = subtotalCents + taxCents + deliveryFeeCents;

  return { lines: pricedLines, subtotalCents, taxCents, deliveryFeeCents, totalCents };
}

// Pure version for tests: prices a cart against a caller-supplied menu map,
// no DB roundtrip. The "real" priceCart() is just (load menu) + (this).
export function priceCartAgainst(cart: CartInput, menuMap: Map<string, MenuItemPublic>): PricedCart {
  const pricedLines: PricedCartLine[] = [];
  for (const line of cart.lines) {
    const item = menuMap.get(line.menuItemId);
    if (!item) {
      throw new ApiError("ITEM_UNAVAILABLE", "Menu item is no longer available.", 409, {
        menuItemId: line.menuItemId,
      });
    }
    const priced = priceLine({
      menuItem: item,
      sizeId: line.sizeId,
      toppingIds: line.toppingIds,
      quantity: line.quantity,
    });
    pricedLines.push({
      ...line,
      menuItemName: item.name,
      sizeName: priced.sizeName,
      toppingNames: priced.toppingNames,
      unitPriceCents: priced.unitPriceCents,
      lineTotalCents: priced.lineTotalCents,
    });
  }
  const subtotalCents = pricedLines.reduce((acc, l) => acc + l.lineTotalCents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const deliveryFeeCents = DELIVERY_FEE_CENTS;
  const totalCents = subtotalCents + taxCents + deliveryFeeCents;
  return { lines: pricedLines, subtotalCents, taxCents, deliveryFeeCents, totalCents };
}
