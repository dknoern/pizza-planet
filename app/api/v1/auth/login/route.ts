import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { parseBody } from "@/lib/http/validate";
import { loginSchema, login } from "@/lib/auth/login";
import { setSessionCustomer } from "@/lib/auth/session";

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseBody(req, loginSchema);
  const customer = await login(body);
  await setSessionCustomer(customer.id);
  return NextResponse.json({ customer }, { status: 200 });
});

export async function GET() {
  return methodNotAllowed(["POST"]);
}
