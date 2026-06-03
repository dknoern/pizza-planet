// Shared menu types. These are the public shapes used by both the storefront
// (server components) and the public REST API. They are derived from Prisma
// records by `lib/menu/queries.ts` and never include internal fields.

export type SizeOption = {
  id: string;
  name: string;
  priceDeltaCents: number;
};

export type ToppingOption = {
  id: string;
  name: string;
  priceDeltaCents: number;
};

export type MenuItemPublic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "PIZZA" | "SIDE" | "DRINK";
  basePriceCents: number;
  sizes: SizeOption[];
  toppings: ToppingOption[];
  imageUrl: string | null;
  // Cosmic-design visual metadata
  sauce: "red" | "pesto" | "bbq" | "white" | null;
  tag: "classic" | "hot" | "veg" | null;
  visualToppingIds: string[];
};
