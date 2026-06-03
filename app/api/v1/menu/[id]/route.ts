import { NextResponse } from "next/server";
import { withApi, methodNotAllowed } from "@/lib/http/handler";
import { getMenuItem } from "@/lib/menu/queries";

export const GET = withApi(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const item = await getMenuItem(id);
    return NextResponse.json({ item });
  },
);

export async function POST() {
  return methodNotAllowed(["GET"]);
}
