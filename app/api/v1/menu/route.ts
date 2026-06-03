import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { listAvailableMenu } from "@/lib/menu/queries";

export const GET = withApi(async () => {
  const items = await listAvailableMenu();
  return NextResponse.json({ items });
});

export async function POST() {
  return methodNotAllowed(["GET"]);
}
