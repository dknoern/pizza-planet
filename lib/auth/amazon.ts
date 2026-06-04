import crypto from "node:crypto";
import { ApiError } from "../http/errors";

const AUTHORIZE_URL = "https://www.amazon.com/ap/oa";
const TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const PROFILE_URL = "https://api.amazon.com/user/profile";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(crypto.randomBytes(32));
}

export type BuildAuthorizeUrlArgs = {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  scope?: string;
};

export function buildAuthorizeUrl(args: BuildAuthorizeUrlArgs): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    scope: args.scope ?? "profile",
    response_type: "code",
    redirect_uri: args.redirectUri,
    state: args.state,
    code_challenge: args.challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type ExchangeCodeArgs = {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type ExchangeCodeResult = {
  accessToken: string;
  expiresIn: number;
};

export async function exchangeCode(args: ExchangeCodeArgs): Promise<ExchangeCodeResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code_verifier: args.codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.warn("LWA token exchange failed", { status: res.status, body: text.slice(0, 500) });
    throw new ApiError("LWA_EXCHANGE_FAILED", "Login with Amazon token exchange failed.", 400);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new ApiError("LWA_EXCHANGE_FAILED", "Login with Amazon token exchange returned no access_token.", 400);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 0 };
}

export type AmazonProfile = {
  userId: string;
  email: string;
  name: string;
};

export async function fetchProfile(accessToken: string): Promise<AmazonProfile> {
  const res = await fetch(PROFILE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new ApiError("LWA_PROFILE_UNAVAILABLE", "Failed to fetch Amazon profile.", 502);
  }
  const json = (await res.json()) as { user_id?: string; email?: string; name?: string };
  if (!json.user_id || !json.email) {
    throw new ApiError("LWA_PROFILE_UNAVAILABLE", "Amazon profile response missing required fields.", 502);
  }
  return {
    userId: json.user_id,
    email: json.email,
    name: json.name ?? json.email,
  };
}

export function isSafeNextPath(next: string | null | undefined): boolean {
  if (!next) return false;
  if (next.length > 512) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//") || next.startsWith("/\\")) return false;
  // Reject any scheme-like prefix (e.g. "javascript:" smuggled with a leading "/").
  // Only allow chars in path/query/fragment; URLSearchParams already URL-decodes the value
  // we receive, so a literal ":" or control char shouldn't appear in a safe path.
  for (let i = 0; i < next.length; i++) {
    const c = next.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}
