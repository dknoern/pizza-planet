import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cosmic menu copy from the Pizza Planet design.
// Visual fields (sauce, toppings, tag) drive the procedural PizzaVisual.
// Size deltas are derived per-pizza from the design's base × multiplier model
// (S = 0.80×, M = 1.00×, L = 1.30×) and rounded to cents.

type DesignTopping = string; // matches keys in PizzaVisual.TOPPING_STYLES

type CosmicPizza = {
  slug: string;
  name: string;
  description: string;
  tag: "classic" | "hot" | "veg";
  basePriceDollars: number; // = Medium price in the design
  sauce: "red" | "pesto" | "bbq" | "white";
  toppings: DesignTopping[];
};

const PIZZAS: CosmicPizza[] = [
  {
    slug: "nebula-veggie",
    name: "Nebula Veggie",
    description:
      "Roasted peppers, kalamata, baby spinach, sun-dried tomato on a galaxy-swirl pesto base.",
    tag: "veg",
    basePriceDollars: 14.5,
    sauce: "pesto",
    toppings: [
      "pepper-red",
      "pepper-green",
      "olive-black",
      "spinach",
      "sun-dried",
      "pepper-red",
      "olive-black",
      "spinach",
      "pepper-green",
      "sun-dried",
    ],
  },
  {
    slug: "asteroid-pepperoni",
    name: "Asteroid Pepperoni",
    description:
      "Double cup-and-char pepperoni, aged mozz, vine-ripe red sauce. Crater-finished crust.",
    tag: "classic",
    basePriceDollars: 15.0,
    sauce: "red",
    toppings: [
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
      "pepperoni",
    ],
  },
  {
    slug: "supernova-supreme",
    name: "Supernova Supreme",
    description:
      "Pepperoni, italian sausage, onions, peppers, mushrooms, olives. The full main-sequence loadout.",
    tag: "hot",
    basePriceDollars: 17.5,
    sauce: "red",
    toppings: [
      "pepperoni",
      "sausage",
      "pepper-green",
      "onion",
      "mushroom",
      "olive-black",
      "pepperoni",
      "sausage",
      "pepper-green",
      "mushroom",
      "onion",
      "olive-black",
    ],
  },
  {
    slug: "black-hole-bbq",
    name: "Black Hole BBQ",
    description:
      "Smoked brisket, charred onion, sharp cheddar, smoky BBQ swirl. Event-horizon flavor density.",
    tag: "hot",
    basePriceDollars: 18.0,
    sauce: "bbq",
    toppings: [
      "brisket",
      "onion",
      "cheddar",
      "brisket",
      "onion",
      "cheddar",
      "brisket",
      "onion",
      "cheddar",
    ],
  },
  {
    slug: "cosmic-quattro",
    name: "Cosmic Quattro",
    description:
      "Four cheeses from four quadrants: mozz, fontina, gorgonzola, parmesan. Constellation-cut.",
    tag: "classic",
    basePriceDollars: 16.5,
    sauce: "white",
    toppings: [
      "mozz-ball",
      "gorgonzola",
      "parmesan",
      "mozz-ball",
      "gorgonzola",
      "parmesan",
      "mozz-ball",
      "gorgonzola",
      "parmesan",
    ],
  },
  {
    slug: "solar-flare",
    name: "Solar Flare",
    description:
      "Calabrian chili, hot honey, soppressata, fresh mozz. Surface temperature: 5,500K-ish.",
    tag: "hot",
    basePriceDollars: 17.0,
    sauce: "red",
    toppings: [
      "soppressata",
      "mozz-ball",
      "chili-flake",
      "soppressata",
      "mozz-ball",
      "chili-flake",
      "soppressata",
      "mozz-ball",
      "chili-flake",
      "chili-flake",
    ],
  },
  {
    slug: "milky-way-margherita",
    name: "Milky Way Margherita",
    description:
      "San Marzano, hand-pulled mozzarella, basil galaxies, drizzled stardust olive oil.",
    tag: "veg",
    basePriceDollars: 13.5,
    sauce: "red",
    toppings: ["mozz-ball", "basil", "mozz-ball", "basil", "mozz-ball", "basil", "mozz-ball", "basil"],
  },
  {
    slug: "meteor-meatlovers",
    name: "Meteor Meat Lovers",
    description: "Pepperoni, sausage, bacon, ham. High-density carnivore mass.",
    tag: "hot",
    basePriceDollars: 18.5,
    sauce: "red",
    toppings: [
      "pepperoni",
      "sausage",
      "bacon",
      "ham",
      "pepperoni",
      "sausage",
      "bacon",
      "ham",
      "pepperoni",
      "sausage",
      "bacon",
    ],
  },
];

const SIZE_MULTIPLIERS = [
  { id: "S", name: 'Small (10")', mult: 0.8 },
  { id: "M", name: 'Medium (12")', mult: 1.0 },
  { id: "L", name: 'Large (14")', mult: 1.3 },
];

function sizesForBase(baseDollars: number) {
  // Medium = base price. Convert deltas to cents.
  const baseCents = Math.round(baseDollars * 100);
  return SIZE_MULTIPLIERS.map((s) => ({
    id: s.id,
    name: s.name,
    priceDeltaCents: Math.round(baseDollars * s.mult * 100) - baseCents,
  }));
}

function toppingsForVisual(slugs: string[]) {
  // Visual-only — no surcharge in v1. We dedupe so the topping list shown on
  // the detail page is concise even when the visual repeats sprites.
  const seen = new Set<string>();
  const out: { id: string; name: string; priceDeltaCents: number }[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ id: slug, name: prettyToppingName(slug), priceDeltaCents: 0 });
  }
  return out;
}

function prettyToppingName(id: string): string {
  const overrides: Record<string, string> = {
    "pepper-red": "Red Bell Pepper",
    "pepper-green": "Green Bell Pepper",
    "olive-black": "Black Olives",
    "sun-dried": "Sun-Dried Tomato",
    "mozz-ball": "Fresh Mozzarella",
    "chili-flake": "Chili Flakes",
    "soppressata": "Soppressata",
    "gorgonzola": "Gorgonzola",
    "parmesan": "Parmesan",
    "cheddar": "Sharp Cheddar",
    "brisket": "Smoked Brisket",
    "spinach": "Baby Spinach",
    "basil": "Fresh Basil",
    "pepperoni": "Pepperoni",
    "sausage": "Italian Sausage",
    "mushroom": "Mushrooms",
    "onion": "Charred Onion",
    "bacon": "Bacon",
    "ham": "Ham",
  };
  return overrides[id] ?? id;
}

async function main(): Promise<void> {
  console.log("Seeding cosmic menu...");

  await prisma.menuItem.deleteMany({});

  for (const p of PIZZAS) {
    await prisma.menuItem.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: "PIZZA",
        basePriceCents: Math.round(p.basePriceDollars * 100),
        available: true,
        sauce: p.sauce,
        tag: p.tag,
        sizes: sizesForBase(p.basePriceDollars),
        toppings: toppingsForVisual(p.toppings),
        visualToppingIds: p.toppings,
      },
    });
  }

  const total = await prisma.menuItem.count();
  console.log(`Seed complete: ${total} cosmic pizzas inserted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
