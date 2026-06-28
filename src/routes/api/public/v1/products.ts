import { createFileRoute } from "@tanstack/react-router";
import { productInputSchema } from "@/lib/validators";

export const Route = createFileRoute("/api/public/v1/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateApiKey, jsonError } = await import("@/lib/api-auth.server");
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonError(auth.status, auth.message);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
        const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));
        const from = (page - 1) * pageSize;
        const { data, count, error } = await supabaseAdmin
          .from("products")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) return jsonError(500, error.message);
        return Response.json({ data, page, pageSize, total: count ?? 0 });
      },
      POST: async ({ request }) => {
        const { authenticateApiKey, jsonError } = await import("@/lib/api-auth.server");
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonError(auth.status, auth.message);
        const body = await request.json().catch(() => null);
        const parsed = productInputSchema.safeParse(body);
        if (!parsed.success) return jsonError(400, "Validation error", parsed.error.flatten());
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin
          .from("products").select("id").eq("sku", parsed.data.sku).maybeSingle();
        if (existing) return jsonError(409, `SKU "${parsed.data.sku}" already exists`);
        const { data, error } = await supabaseAdmin
          .from("products").insert(parsed.data).select("*").single();
        if (error) return jsonError(500, error.message);
        return Response.json({ data }, { status: 201 });
      },
    },
  },
});
