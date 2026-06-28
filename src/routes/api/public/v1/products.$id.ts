import { createFileRoute } from "@tanstack/react-router";
import { productInputSchema } from "@/lib/validators";

export const Route = createFileRoute("/api/public/v1/products/$id")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const { authenticateApiKey, jsonError } = await import("@/lib/api-auth.server");
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonError(auth.status, auth.message);
        const body = await request.json().catch(() => null);
        const parsed = productInputSchema.partial().safeParse(body);
        if (!parsed.success) return jsonError(400, "Validation error", parsed.error.flatten());
        const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
        const sb = getSupabaseServer();
        if (parsed.data.sku) {
          const { data: conflict } = await sb
            .from("products").select("id").eq("sku", parsed.data.sku).neq("id", params.id).maybeSingle();
          if (conflict) return jsonError(409, `SKU "${parsed.data.sku}" already exists`);
        }
        const { data, error } = await sb
          .from("products").update(parsed.data).eq("id", params.id).select("*").single();
        if (error) return jsonError(500, error.message);
        if (!data) return jsonError(404, "Product not found");
        return Response.json({ data });
      },
      DELETE: async ({ request, params }) => {
        const { authenticateApiKey, jsonError } = await import("@/lib/api-auth.server");
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonError(auth.status, auth.message);
        const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
        const sb = getSupabaseServer();
        const { error } = await sb.from("products").delete().eq("id", params.id);
        if (error) return jsonError(500, error.message);
        return new Response(null, { status: 204 });
      },
    },
  },
});
