import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { productInputSchema, productUpdateSchema } from "./validators";

const listInput = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.search && data.search.trim()) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`sku.ilike.${s},name.ilike.${s}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => productInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { data: existing } = await sb
      .from("products")
      .select("id")
      .eq("sku", data.sku)
      .maybeSingle();
    if (existing) throw new Error(`SKU "${data.sku}" já existe`);
    const { data: row, error } = await sb
      .from("products")
      .insert(data)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => productUpdateSchema.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { id, ...patch } = data;
    if (patch.sku) {
      const { data: conflict } = await sb
        .from("products")
        .select("id")
        .eq("sku", patch.sku)
        .neq("id", id)
        .maybeSingle();
      if (conflict) throw new Error(`SKU "${patch.sku}" já existe`);
    }
    const { data: row, error } = await sb
      .from("products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { error } = await sb.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
