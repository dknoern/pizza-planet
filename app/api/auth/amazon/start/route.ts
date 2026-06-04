import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ApiError, toResponse } from "@/lib/http/errors";
import {
  generatePkce,
  generateState,
  buildAuthorizeUrl,
  isSafeNextPath,
} from "@/lib/auth/amazon";
import { setLwaCookie } from "@/lib/auth/lwaCookie";
import { isLwaConfigured, readLwaEnv } from "@/lib/auth/amazonEnv";

export async function GET(req: NextRequest): Promise<Response> {
  if (!isLwaConfigured()) {
    return toResponse(
      new ApiError("LWA_NOT_CONFIGURED", "Login with Amazon is not configured.", 503),
    );
  }
  const env = readLwaEnv();
  const rawNext = req.nextUrl.searchParams.get("next");
  const next = isSafeNextPath(rawNext) ? rawNext! : "/";

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  await setLwaCookie({ state, codeVerifier: verifier, next });

  const url = buildAuthorizeUrl({
    clientId: env.clientId,
    redirectUri: env.redirectUri,
    state,
    challenge,
  });
  return NextResponse.redirect(url, { status: 302 });
}
