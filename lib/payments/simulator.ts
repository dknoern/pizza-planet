import crypto from "node:crypto";
import { isLuhnValid } from "./luhn";
import { maskPan } from "./redact";
import type {
  AuthorizeResult,
  CardInput,
  PaymentProcessor,
} from "./processor";

const APPROVE_CARD = "4111111111111111";
const DECLINE_CARD = "4000000000000002";

function digitsOnly(s: string): string {
  return (s ?? "").replace(/\s|-/g, "");
}

function detectBrand(pan: string): string {
  if (/^4/.test(pan)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(pan)) return "MASTERCARD";
  if (/^3[47]/.test(pan)) return "AMEX";
  if (/^6(?:011|5)/.test(pan)) return "DISCOVER";
  return "UNKNOWN";
}

function isExpiryValid(month: number, year: number): boolean {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year)) return false;
  const now = new Date();
  // Treat the card as valid through the end of its expiration month.
  const expEnd = new Date(year, month, 1);
  return expEnd > now;
}

function isCvvValid(cvv: string, pan: string): boolean {
  if (typeof cvv !== "string") return false;
  if (/^3[47]/.test(pan)) return /^\d{4}$/.test(cvv);
  return /^\d{3}$/.test(cvv);
}

export class SimulatedPaymentProcessor implements PaymentProcessor {
  async authorize(
    amountCents: number,
    card: CardInput,
    metadata: Record<string, string> = {},
  ): Promise<AuthorizeResult> {
    const pan = digitsOnly(card.number);
    const masked = maskPan(card.number);

    // Validate up front. Invalid cards never reach the "outcome" logic.
    if (
      !Number.isInteger(amountCents) ||
      amountCents <= 0 ||
      !isLuhnValid(pan) ||
      !isExpiryValid(card.expMonth, card.expYear) ||
      !isCvvValid(card.cvv, pan)
    ) {
      console.log(
        `[payments:simulator] DECLINE INVALID_CARD card=${masked} meta=${JSON.stringify(metadata)}`,
      );
      return { status: "DECLINED", reason: "INVALID_CARD" };
    }

    if (pan === DECLINE_CARD) {
      console.log(
        `[payments:simulator] DECLINE INSUFFICIENT_FUNDS card=${masked} meta=${JSON.stringify(metadata)}`,
      );
      return { status: "DECLINED", reason: "INSUFFICIENT_FUNDS" };
    }

    // APPROVE_CARD is explicitly approved; any other Luhn-valid card also
    // approves so demos and tests aren't constrained to a single PAN.
    const authorizationId = "sim_" + crypto.randomBytes(8).toString("hex");
    const last4 = pan.slice(-4);
    const brand = detectBrand(pan);
    void APPROVE_CARD;
    console.log(
      `[payments:simulator] APPROVE auth=${authorizationId} card=${masked} amount=${amountCents}`,
    );
    return { status: "APPROVED", authorizationId, last4, brand };
  }
}
