import { test, expect } from "@playwright/test";

// Smoke test: a guest visits the storefront, adds a pizza, fills checkout with
// the approve test card, and lands on a confirmation page with an order number.
//
// Prereqs:
//   - DATABASE_URL points to a Mongo instance
//   - `pnpm db:push && pnpm db:seed` has been run
//   - `pnpm dev` is running (Playwright will start it automatically per
//     playwright.config.ts when E2E_BASE_URL is unset)

test("guest can place an order with the approve test card", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();

  // Pick the first pizza card.
  await page.getByRole("link", { name: /Margherita|Pepperoni|Supreme|Hawaiian|Veggie|BBQ/ }).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole("link", { name: /Proceed to checkout/ }).click();

  await expect(page).toHaveURL(/\/checkout/);

  // Fill guest contact + delivery + payment.
  await page.getByLabel("Name", { exact: true }).fill("Guest Player");
  await page.getByLabel("Email", { exact: true }).fill("guest@example.com");
  await page.getByLabel("Phone").fill("555-0100");

  await page.getByLabel("Street address").fill("100 Pie St");
  await page.getByLabel("City").fill("Sliceville");
  await page.getByLabel("State").fill("NY");
  await page.getByLabel("Postal").fill("10001");

  // Defaults already include the approve test card 4111 1111 1111 1111.
  await page.getByRole("button", { name: /Place order/ }).click();

  await expect(page).toHaveURL(/\/checkout\/guest\//);
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await expect(page.getByText(/PP-\d{6}-/)).toBeVisible();
});
