import { NextRequest, NextResponse } from "next/server";
import { getUserMetadataByUserId } from "@/lib/actions/usermetadata.action";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const result = await getUserMetadataByUserId(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("API Error getting user metadata:", error);
    return NextResponse.json(
      { error: "Failed to get user metadata" },
      { status: 500 }
    );
  }
}
