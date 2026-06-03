import { SignJWT, jwtVerify } from "jose";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const ISSUER = "pizza-planet";
const AUDIENCE = "guest-order";

function getSecret(): Uint8Array {
  const raw = process.env.GUEST_TOKEN_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "GUEST_TOKEN_SECRET must be set to a string of at least 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function issueGuestOrderToken(orderId: string): Promise<string> {
  return new SignJWT({ orderId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS_SECONDS}s`)
    .sign(getSecret());
}

export async function resolveGuestOrderToken(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const orderId = payload.orderId;
    return typeof orderId === "string" ? orderId : null;
  } catch {
    return null;
  }
}
