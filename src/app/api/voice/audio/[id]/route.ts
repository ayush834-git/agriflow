export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { loadAudio } from "@/lib/voice/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const buffer = await loadAudio(id);

  if (!buffer) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
