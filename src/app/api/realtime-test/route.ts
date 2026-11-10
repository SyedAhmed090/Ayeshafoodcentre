import { emit } from "@/lib/realtime";

// Phase 0 check only: delete with src/app/realtime-test once Phase 2's board uses live updates.
export async function POST() {
  emit(null, "ping", { at: new Date().toISOString() });
  return Response.json({ ok: true });
}
