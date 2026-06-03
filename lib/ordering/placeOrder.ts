import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { ApiError } from "../http/errors";
import { priceCart, cartInputSchema, type PricedCart } from "./cart";
import type { CardInput, PaymentProcessor } from "../payments/processor";
import { getPaymentProcessor } from "../payments/factory";

export const deliveryAddressSchema = z
  .object({
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(80),
    postalCode: z.string().min(2).max(20),
  })
  .strict();

export const guestContactSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(5).max(40),
  })
  .strict();

export const paymentInputSchema = z
  .object({
    number: z.string().min(13).max(25),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(2024).max(2099),
    cvv: z.string().min(3).max(4),
    holderName: z.string().max(120).optional(),
  })
  .strict();

export const placeOrderInputSchema = z
  .object({
    cart: cartInputSchema,
    deliveryAddress: deliveryAddressSchema,
    guestContact: guestContactSchema.optional(),
    payment: paymentInputSchema,
  })
  .strict();

export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

function generateOrderNumber(): string {
  // Human-friendly: PP-YYMMDD-XXXX
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PP-${yy}${mm}${dd}-${rand}`;
}

export type PlaceOrderArgs = {
  input: PlaceOrderInput;
  customerId: string | null; // null = guest order
  // Allow tests to inject a processor; production paths use the factory.
  processor?: PaymentProcessor;
};

export async function placeOrder(args: PlaceOrderArgs) {
  const { input, customerId } = args;
  const processor = args.processor ?? getPaymentProcessor();

  if (!customerId && !input.guestContact) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Guest orders require contact info.",
      400,
      { fields: { guestContact: ["REQUIRED_FOR_GUEST"] } },
    );
  }

  // Re-price authoritatively on the server. This also detects items that have
  // gone unavailable between cart-add and checkout (priceCart throws
  // ITEM_UNAVAILABLE in that case).
  const priced: PricedCart = await priceCart(input.cart);

  // Authorize the payment. The raw card data is used here and then dropped.
  const card: CardInput = {
    number: input.payment.number,
    expMonth: input.payment.expMonth,
    expYear: input.payment.expYear,
    cvv: input.payment.cvv,
    holderName: input.payment.holderName,
  };
  const auth = await processor.authorize(priced.totalCents, card, {
    customerId: customerId ?? "guest",
  });

  if (auth.status === "DECLINED") {
    throw new ApiError("PAYMENT_DECLINED", `Payment declined: ${auth.reason}.`, 402, {
      reason: auth.reason,
    });
  }

  const orderNumber = generateOrderNumber();

  // Persist the order as a single atomic document write. The `payment` block
  // contains ONLY safe fields — last4, brand, authorizationId, amountCents.
  // The full PAN, CVV, and expiry are never persisted.
  const created = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customerId ?? null,
      guestContact: customerId ? null : input.guestContact ?? null,
      deliveryAddress: input.deliveryAddress,
      lines: priced.lines.map((l) => ({
        menuItemId: l.menuItemId,
        menuItemName: l.menuItemName,
        sizeId: l.sizeId,
        sizeName: l.sizeName,
        toppingIds: l.toppingIds,
        toppingNames: l.toppingNames,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        lineTotalCents: l.lineTotalCents,
      })),
      subtotalCents: priced.subtotalCents,
      taxCents: priced.taxCents,
      deliveryFeeCents: priced.deliveryFeeCents,
      totalCents: priced.totalCents,
      payment: {
        last4: auth.last4,
        brand: auth.brand,
        authorizationId: auth.authorizationId,
        amountCents: priced.totalCents,
      },
      status: "PLACED",
      events: [{ at: new Date(), kind: "PLACED", message: null }],
    },
  });

  return created;
}
