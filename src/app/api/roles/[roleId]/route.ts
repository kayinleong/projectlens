import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/actions/role.action";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const { roleId } = await params;
    const result = await getRole(roleId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("API Error getting role:", error);
    return NextResponse.json({ error: "Failed to get role" }, { status: 500 });
  }
}
