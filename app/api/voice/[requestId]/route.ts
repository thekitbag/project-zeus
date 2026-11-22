import { NextResponse } from "next/server";
import { undoVoiceRequest } from "@/lib/voice/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const result = undoVoiceRequest(requestId);
  if (!result) return NextResponse.json({ error: "Nothing to undo" }, { status: 404 });
  return NextResponse.json(result);
}
