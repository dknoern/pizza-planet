import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { parseBody } from "@/lib/http/validate";
import { signupSchema, signup } from "@/lib/auth/signup";
import { setSessionCustomer } from "@/lib/auth/session";

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseBody(req, signupSchema);
  const customer = await signup(body);
  await setSessionCustomer(customer.id);
  return NextResponse.json({ customer }, { status: 201 });
});

export async function GET() {
  return methodNotAllowed(["POST"]);
}
