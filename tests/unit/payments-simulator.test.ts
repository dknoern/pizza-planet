import { describe, it, expect } from "vitest";
import { SimulatedPaymentProcessor } from "@/lib/payments/simulator";

const FUTURE_YEAR = new Date().getFullYear() + 3;

const okCard = (overrides: Partial<{ number: string; cvv: string; expMonth: number; expYear: number }> = {}) => ({
  number: "4111 1111 1111 1111",
  expMonth: 12,
  expYear: FUTURE_YEAR,
  cvv: "123",
  ...overrides,
});

describe("SimulatedPaymentProcessor", () => {
  const proc = new SimulatedPaymentProcessor();

  it("approves the 4111… test card", async () => {
    const r = await proc.authorize(1500, okCard());
    expect(r.status).toBe("APPROVED");
    if (r.status === "APPROVED") {
      expect(r.last4).toBe("1111");
      expect(r.brand).toBe("VISA");
      expect(r.authorizationId).toMatch(/^sim_[0-9a-f]+$/);
    }
  });

  it("declines the 4000…0002 card with INSUFFICIENT_FUNDS", async () => {
    const r = await proc.authorize(1500, okCard({ number: "4000 0000 0000 0002" }));
    expect(r.status).toBe("DECLINED");
    if (r.status === "DECLINED") expect(r.reason).toBe("INSUFFICIENT_FUNDS");
  });

  it("approves other Luhn-valid cards", async () => {
    // 5555555555554444 is a Mastercard test PAN that is Luhn-valid.
    const r = await proc.authorize(1500, okCard({ number: "5555 5555 5555 4444" }));
    expect(r.status).toBe("APPROVED");
    if (r.status === "APPROVED") expect(r.brand).toBe("MASTERCARD");
  });

  it("declines INVALID_CARD when Luhn fails", async () => {
    const r = await proc.authorize(1500, okCard({ number: "4111 1111 1111 1112" }));
    expect(r.status).toBe("DECLINED");
    if (r.status === "DECLINED") expect(r.reason).toBe("INVALID_CARD");
  });

  it("declines INVALID_CARD when expired", async () => {
    const r = await proc.authorize(1500, okCard({ expYear: 2000 }));
    expect(r.status).toBe("DECLINED");
    if (r.status === "DECLINED") expect(r.reason).toBe("INVALID_CARD");
  });

  it("declines INVALID_CARD on malformed CVV", async () => {
    const r = await proc.authorize(1500, okCard({ cvv: "12" }));
    expect(r.status).toBe("DECLINED");
    if (r.status === "DECLINED") expect(r.reason).toBe("INVALID_CARD");
  });

  it("declines INVALID_CARD on non-positive amount", async () => {
    const r = await proc.authorize(0, okCard());
    expect(r.status).toBe("DECLINED");
    if (r.status === "DECLINED") expect(r.reason).toBe("INVALID_CARD");
  });
});
