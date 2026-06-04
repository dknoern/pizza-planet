import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ApiError, toResponse } from "@/lib/http/errors";
import { exchangeCode, fetchProfile, isSafeNextPath } from "@/lib/auth/amazon";
import { readLwaCookie, clearLwaCookie } from "@/lib/auth/lwaCookie";
import { isLwaConfigured, readLwaEnv } from "@/lib/auth/amazonEnv";
import { linkOrCreateAmazonCustomer } from "@/lib/auth/amazonLink";
import { setSessionCustomer } from "@/lib/auth/session";

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!isLwaConfigured()) {
    return toResponse(
      new ApiError("LWA_NOT_CONFIGURED", "Login with Amazon is not configured.", 503),
    );
  }
  const env = readLwaEnv();

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    await clearLwaCookie();
    return toResponse(
      new ApiError("LWA_EXCHANGE_FAILED", `Amazon returned an error: ${errorParam}`, 400),
    );
  }

  const scratch = await readLwaCookie();

  if (
    !code ||
    !stateParam ||
    !scratch.state ||
    !scratch.codeVerifier ||
    !constantTimeEqual(stateParam, scratch.state)
  ) {
    await clearLwaCookie();
    return toResponse(
      new ApiError("INVALID_STATE", "Invalid or expired OAuth state.", 400),
    );
  }

  try {
    const { accessToken } = await exchangeCode({
      code,
      codeVerifier: scratch.codeVerifier,
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      redirectUri: env.redirectUri,
    });
    const profile = await fetchProfile(accessToken);
    const customer = await linkOrCreateAmazonCustomer({
      amazonUserId: profile.userId,
      email: profile.email,
      name: profile.name,
    });
    await setSessionCustomer(customer.id);
    await clearLwaCookie();

    const next = isSafeNextPath(scratch.next) ? scratch.next! : "/";
    return NextResponse.redirect(new URL(next, req.nextUrl.origin), { status: 302 });
  } catch (err) {
    await clearLwaCookie();
    if (err instanceof ApiError) return toResponse(err);
    return toResponse(new ApiError("INTERNAL", "Unexpected error during sign-in.", 500));
  }
}
