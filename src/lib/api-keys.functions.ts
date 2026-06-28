import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiKeyCreateSchema } from "./validators";

export const listApiKeys = createServerFn({ method: "GET" }).handler(async () => {
  const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => apiKeyCreateSchema.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const crypto = await import("node:crypto");
    const raw = "ep_" + crypto.randomBytes(24).toString("base64url");
    const key_hash = crypto.createHash("sha256").update(raw).digest("hex");
    const key_prefix = raw.slice(0, 11);
    const { data: row, error } = await sb
      .from("api_keys")
      .insert({ name: data.name, key_hash, key_prefix })
      .select("id, name, key_prefix, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, key: raw };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { error } = await sb
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
