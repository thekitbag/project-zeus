import { NextResponse } from "next/server";
import { interpretTranscript } from "@/lib/voice/interpret";
import { getListNames, getVoiceResult, saveVoiceRequest } from "@/lib/voice/store";
import { MAX_TRANSCRIPT_LENGTH } from "@/lib/voice/types";

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

// The app has no auth, and each new command costs an API call, so cap the rate.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
let recentCalls: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  recentCalls = recentCalls.filter((time) => now - time < RATE_WINDOW_MS);
  if (recentCalls.length >= RATE_LIMIT) return true;
  recentCalls.push(now);
  return false;
}

export async function POST(req: Request) {
  let body: { requestId?: unknown; transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { requestId, transcript } = body;
  if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }
  if (typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    return NextResponse.json({ error: "That was too long. Try a shorter one." }, { status: 400 });
  }

  const existing = getVoiceResult(requestId);
  if (existing) return NextResponse.json(existing);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Voice isn't set up: the API key is missing." }, { status: 503 });
  }
  if (isRateLimited()) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let interpretation;
  try {
    interpretation = await interpretTranscript(transcript.trim(), getListNames());
  } catch (error) {
    console.error("Voice interpretation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't understand that just now. Nothing was added." }, { status: 502 });
  }

  try {
    return NextResponse.json(saveVoiceRequest(requestId, interpretation));
  } catch (error) {
    console.error("Voice save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't save that. Nothing was added." }, { status: 500 });
  }
}
