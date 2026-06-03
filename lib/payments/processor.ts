export type CardInput = {
  // Full card data is accepted at the interface boundary, used once for the
  // authorization call, and then dropped. NEVER persist these raw fields.
  number: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  holderName?: string;
};

export type AuthorizeApproved = {
  status: "APPROVED";
  authorizationId: string;
  last4: string;
  brand: string;
};

export type AuthorizeDeclined = {
  status: "DECLINED";
  reason: string;
};

export type AuthorizeResult = AuthorizeApproved | AuthorizeDeclined;

export interface PaymentProcessor {
  authorize(
    amountCents: number,
    card: CardInput,
    metadata?: Record<string, string>,
  ): Promise<AuthorizeResult>;
}
