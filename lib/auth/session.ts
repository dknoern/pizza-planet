import { cookies } from "next/headers";
import { getIronSession, type SessionOptions, type IronSession } from "iron-session";

export type SessionData = {
  customerId?: string;
};

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters. See .env.example.",
    );
  }
  return {
    password,
    cookieName: "pp_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: THIRTY_DAYS,
    },
    ttl: THIRTY_DAYS,
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}

export async function setSessionCustomer(customerId: string): Promise<void> {
  const session = await getSession();
  session.customerId = customerId;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
