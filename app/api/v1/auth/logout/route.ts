import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { destroySession } from "@/lib/auth/session";

export const POST = withApi(async () => {
  await destroySession();
  return new NextResponse(null, { status: 204 });
});

export async function GET() {
  return methodNotAllowed(["POST"]);
}
