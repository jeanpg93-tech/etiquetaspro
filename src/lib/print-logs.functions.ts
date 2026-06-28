import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createInput = z.object({
  order_ids: z.array(z.string().uuid()).default([]),
  order_count: z.number().int().min(0),
  label_count: z.number().int().min(0),
  preset: z.string().nullable().optional(),
  source: z.enum(["batch", "individual", "manual"]).default("manual"),
  filename: z.string().nullable().optional(),
});

export const createPrintLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { data: row, error } = await sb
      .from("print_logs")
      .insert({
        order_ids: data.order_ids,
        order_count: data.order_count,
        label_count: data.label_count,
        preset: data.preset ?? null,
        source: data.source,
        filename: data.filename ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export const listPrintLogs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await sb
      .from("print_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const deletePrintLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { error } = await sb.from("print_logs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearPrintLogs = createServerFn({ method: "POST" })
  .inputValidator(() => ({}))
  .handler(async () => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { error } = await sb.from("print_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ordersByIdsInput = z.object({ ids: z.array(z.string().uuid()).min(1) });

export const getOrdersByIds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ordersByIdsInput.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { data: rows, error } = await sb
      .from("orders")
      .select("*")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
