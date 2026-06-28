import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderItemSchema = z.object({
  sku: z.string().min(1),
  product_name: z.string().nullable().optional(),
  quantity: z.number().positive().default(1),
});

const parsedOrderSchema = z.object({
  order_number: z.string().min(1),
  source: z.enum(["nfe", "excel", "manual"]),
  nfe_key: z.string().nullable().optional(),
  recipient_name: z.string().nullable().optional(),
  recipient_address: z.string().nullable().optional(),
  recipient_city: z.string().nullable().optional(),
  recipient_state: z.string().nullable().optional(),
  recipient_zip: z.string().nullable().optional(),
  items: z.array(orderItemSchema).min(1),
});

const importInput = z.object({
  orders: z.array(parsedOrderSchema).min(1),
});

export const importOrders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => importInput.parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();

    // Pre-load product id mapping by SKU for linking
    const skus = Array.from(new Set(data.orders.flatMap((o) => o.items.map((i) => i.sku))));
    const { data: products } = await sb.from("products").select("id, sku").in("sku", skus);
    const skuToId = new Map((products ?? []).map((p: any) => [p.sku as string, p.id as string]));

    const results: { order_number: string; status: "created" | "error"; message?: string }[] = [];

    for (const order of data.orders) {
      const { data: inserted, error } = await sb
        .from("orders")
        .insert({
          order_number: order.order_number,
          source: order.source,
          nfe_key: order.nfe_key ?? null,
          recipient_name: order.recipient_name ?? null,
          recipient_address: order.recipient_address ?? null,
          recipient_city: order.recipient_city ?? null,
          recipient_state: order.recipient_state ?? null,
          recipient_zip: order.recipient_zip ?? null,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        results.push({ order_number: order.order_number, status: "error", message: error?.message ?? "Falha ao inserir" });
        continue;
      }
      const items = order.items.map((it) => ({
        order_id: inserted.id,
        sku: it.sku,
        product_name: it.product_name ?? null,
        quantity: it.quantity,
        product_id: skuToId.get(it.sku) ?? null,
      }));
      const { error: itemsErr } = await sb.from("order_items").insert(items);
      if (itemsErr) {
        await sb.from("orders").delete().eq("id", inserted.id);
        results.push({ order_number: order.order_number, status: "error", message: itemsErr.message });
        continue;
      }
      results.push({ order_number: order.order_number, status: "created" });
    }

    const created = results.filter((r) => r.status === "created").length;
    return { created, total: results.length, results };
  });

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await sb
      .from("orders")
      .select("*, order_items(id, sku, product_name, quantity, product_id)", { count: "exact" })
      .order("imported_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSupabaseServer } = await import("@/integrations/supabase/server-client");
    const sb = getSupabaseServer();
    const { error } = await sb.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
