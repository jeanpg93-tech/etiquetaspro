import { createHash } from "node:crypto";
import { getSupabaseServer } from "@/integrations/supabase/server-client";

export async function authenticateApiKey(request: Request): Promise<
  { ok: true; keyId: string } | { ok: false; status: number; message: string }
> {
  const key = request.headers.get("x-api-key");
  if (!key) return { ok: false, status: 401, message: "Missing x-api-key header" };
  const key_hash = createHash("sha256").update(key).digest("hex");
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("api_keys")
    .select("id, revoked_at")
    .eq("key_hash", key_hash)
    .maybeSingle();
  if (error) return { ok: false, status: 500, message: error.message };
  if (!data || data.revoked_at) return { ok: false, status: 401, message: "Invalid API key" };
  await sb
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { ok: true, keyId: data.id };
}

export function jsonError(status: number, message: string, details?: unknown) {
  return Response.json({ error: message, ...(details ? { details } : {}) }, { status });
}
