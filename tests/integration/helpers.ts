import { prisma } from "@/lib/db";

export async function resetDb(): Promise<void> {
  await Promise.all([
    prisma.order.deleteMany({}),
    prisma.cart.deleteMany({}),
    prisma.apiKey.deleteMany({}),
    prisma.customer.deleteMany({}),
    prisma.menuItem.deleteMany({}),
  ]);
}

export async function seedSinglePizza(): Promise<string> {
  const item = await prisma.menuItem.create({
    data: {
      slug: "test-pizza",
      name: "Test Pizza",
      description: "For tests",
      category: "PIZZA",
      basePriceCents: 1000,
      available: true,
      sizes: [{ id: "m", name: "Medium", priceDeltaCents: 0 }],
      toppings: [],
    },
  });
  return item.id;
}
