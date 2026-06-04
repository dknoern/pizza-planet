import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { readLwaEnv } from "./amazonEnv";

export type LwaScratch = {
  state?: string;
  codeVerifier?: string;
  next?: string;
};

const TEN_MINUTES = 60 * 10;

function lwaCookieOptions(): SessionOptions {
  const { cookieSecret } = readLwaEnv();
  return {
    password: cookieSecret,
    cookieName: "pp_lwa",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/amazon",
      maxAge: TEN_MINUTES,
    },
    ttl: TEN_MINUTES,
  };
}

export async function setLwaCookie(payload: LwaScratch): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<LwaScratch>(cookieStore, lwaCookieOptions());
  session.state = payload.state;
  session.codeVerifier = payload.codeVerifier;
  session.next = payload.next;
  await session.save();
}

export async function readLwaCookie(): Promise<LwaScratch> {
  const cookieStore = await cookies();
  const session = await getIronSession<LwaScratch>(cookieStore, lwaCookieOptions());
  return { state: session.state, codeVerifier: session.codeVerifier, next: session.next };
}

export async function clearLwaCookie(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<LwaScratch>(cookieStore, lwaCookieOptions());
  session.destroy();
}
