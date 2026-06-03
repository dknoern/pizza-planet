import { prisma } from "../db";
import { ApiError } from "../http/errors";
import type { MenuItemPublic } from "./types";

function toPublic(m: {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  basePriceCents: number;
  sizes: { id: string; name: string; priceDeltaCents: number }[];
  toppings: { id: string; name: string; priceDeltaCents: number }[];
  imageUrl: string | null;
  sauce: string | null;
  tag: string | null;
  visualToppingIds: string[];
}): MenuItemPublic {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    description: m.description,
    category: m.category as MenuItemPublic["category"],
    basePriceCents: m.basePriceCents,
    sizes: m.sizes,
    toppings: m.toppings,
    imageUrl: m.imageUrl,
    sauce: m.sauce as MenuItemPublic["sauce"],
    tag: m.tag as MenuItemPublic["tag"],
    visualToppingIds: m.visualToppingIds ?? [],
  };
}

export async function listAvailableMenu(): Promise<MenuItemPublic[]> {
  const items = await prisma.menuItem.findMany({
    where: { available: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return items.map(toPublic);
}

export async function getMenuItem(id: string): Promise<MenuItemPublic> {
  const item = await prisma.menuItem.findFirst({ where: { id, available: true } });
  if (!item) {
    throw new ApiError("MENU_ITEM_NOT_FOUND", "Menu item not found.", 404);
  }
  return toPublic(item);
}

// Fetch many at once, returning only the available ones. Used by checkout to
// detect items that have gone unavailable between cart-add and place-order.
export async function getMenuItemsByIds(ids: string[]): Promise<Map<string, MenuItemPublic>> {
  if (ids.length === 0) return new Map();
  const uniq = Array.from(new Set(ids));
  const items = await prisma.menuItem.findMany({
    where: { id: { in: uniq }, available: true },
  });
  const map = new Map<string, MenuItemPublic>();
  for (const item of items) {
    map.set(item.id, toPublic(item));
  }
  return map;
}
