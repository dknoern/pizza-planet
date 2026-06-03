import { SimulatedPaymentProcessor } from "./simulator";
import type { PaymentProcessor } from "./processor";

let warned = false;

export function getPaymentProcessor(): PaymentProcessor {
  const mode = process.env.PAYMENT_SIM_MODE ?? "simulator";

  if (mode === "simulator") {
    if (!warned && process.env.NODE_ENV === "production") {
      console.warn(
        "[payments] WARNING: PAYMENT_SIM_MODE=simulator in production. " +
          "All charges are FAKE. Set PAYMENT_SIM_MODE to a real provider before processing real money.",
      );
      warned = true;
    }
    return new SimulatedPaymentProcessor();
  }

  throw new Error(
    `Unknown PAYMENT_SIM_MODE=${JSON.stringify(mode)}. v1 only supports "simulator".`,
  );
}
