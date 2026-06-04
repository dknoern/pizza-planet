export type LwaEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieSecret: string;
};

export function isLwaConfigured(): boolean {
  return !!process.env.LWA_CLIENT_ID;
}

export function readLwaEnv(): LwaEnv {
  const clientId = process.env.LWA_CLIENT_ID;
  const clientSecret = process.env.LWA_CLIENT_SECRET;
  const redirectUri = process.env.LWA_REDIRECT_URI;
  const cookieSecret = process.env.LWA_COOKIE_SECRET;
  const missing: string[] = [];
  if (!clientId) missing.push("LWA_CLIENT_ID");
  if (!clientSecret) missing.push("LWA_CLIENT_SECRET");
  if (!redirectUri) missing.push("LWA_REDIRECT_URI");
  if (!cookieSecret || cookieSecret.length < 32) {
    missing.push("LWA_COOKIE_SECRET (must be ≥32 chars)");
  }
  if (missing.length > 0) {
    throw new Error(`Login with Amazon is not fully configured. Missing: ${missing.join(", ")}`);
  }
  return { clientId: clientId!, clientSecret: clientSecret!, redirectUri: redirectUri!, cookieSecret: cookieSecret! };
}
