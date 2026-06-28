import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, FileSpreadsheet, Trash2, ChevronDown, ChevronRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { parseNFeXml, type ParsedOrder } from "@/lib/parsers/nfe";
import { parseOrdersExcel } from "@/lib/parsers/excel-orders";
import { importOrders, listOrders, deleteOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos · Etiquetas Pro" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [preview, setPreview] = useState<ParsedOrder[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useServerFn(listOrders);
  const importFn = useServerFn(importOrders);
  const del = useServerFn(deleteOrder);

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => list({ data: { page: 1, pageSize: 50 } }),
  });

  const importMut = useMutation({
    mutationFn: (orders: ParsedOrder[]) => importFn({ data: { orders } }),
    onSuccess: (res) => {
      toast.success(`${res.created} de ${res.total} pedido(s) importado(s)`);
      const failed = res.results.filter((r) => r.status === "error");
      if (failed.length) {
        toast.error(`${failed.length} falharam: ${failed.map((f) => `${f.order_number} (${f.message})`).join("; ")}`);
      }
      setPreview([]);
      setErrors([]);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao importar"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Pedido excluído");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  async function handleFiles(files: FileList | null, kind: "nfe" | "excel") {
    if (!files || files.length === 0) return;
    const collected: ParsedOrder[] = [];
    const errs: string[] = [];
    for (const file of Array.from(files)) {
      try {
        if (kind === "nfe") {
          const text = await file.text();
          collected.push(parseNFeXml(text));
        } else {
          const buf = await file.arrayBuffer();
          const orders = parseOrdersExcel(buf);
          collected.push(...orders);
        }
      } catch (e: any) {
        errs.push(`${file.name}: ${e?.message ?? "Erro ao processar"}`);
      }
    }
    setPreview(collected);
    setErrors(errs);
    if (collected.length === 0 && errs.length === 0) {
      toast.error("Nenhum pedido extraído");
    } else if (collected.length > 0) {
      toast.success(`${collected.length} pedido(s) extraído(s) — revise e confirme`);
    }
  }

  const orders = data?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Importe pedidos de NFe (XML) ou planilha Excel.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Importar</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="nfe">
            <TabsList>
              <TabsTrigger value="nfe"><FileText className="h-4 w-4 mr-2" />NFe (XML)</TabsTrigger>
              <TabsTrigger value="excel"><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</TabsTrigger>
            </TabsList>
            <TabsContent value="nfe" className="pt-4">
              <FileDrop accept=".xml,text/xml,application/xml" multiple onFiles={(f) => handleFiles(f, "nfe")}>
                Solte arquivos .xml (NFe) aqui ou clique para selecionar
              </FileDrop>
            </TabsContent>
            <TabsContent value="excel" className="pt-4">
              <FileDrop accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple onFiles={(f) => handleFiles(f, "excel")}>
                Solte .xlsx aqui ou clique para selecionar
              </FileDrop>
              <p className="text-xs text-muted-foreground mt-3">
                Colunas esperadas (cabeçalho na 1ª linha): <code className="text-foreground">order_number</code> (ou <code>numero_pedido</code>),
                <code className="text-foreground"> sku</code>, <code className="text-foreground">quantidade</code>, e opcionalmente
                <code> product_name, destinatario, endereco, cidade, uf, cep</code>. Cada linha = um item; itens com mesmo número de pedido são agrupados.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{e}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prévia ({preview.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setPreview([]); setErrors([]); }}>Cancelar</Button>
              <Button onClick={() => importMut.mutate(preview)} disabled={importMut.isPending}>
                <Check className="h-4 w-4 mr-2" />
                {importMut.isPending ? "Importando..." : `Importar ${preview.length}`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((o, i) => (
                  <TableRow key={`${o.order_number}-${i}`}>
                    <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                    <TableCell><Badge variant="secondary">{o.source}</Badge></TableCell>
                    <TableCell>{o.recipient_name ?? "—"}</TableCell>
                    <TableCell>{[o.recipient_city, o.recipient_state].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell className="text-right">{o.items.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Pedidos importados ({data?.total ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda. Importe um arquivo acima.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Pedido</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Importado em</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => {
                  const isOpen = expanded === o.id;
                  return (
                    <>
                      <TableRow key={o.id}>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(isOpen ? null : o.id)}>
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                        <TableCell><Badge variant="secondary">{o.source}</Badge></TableCell>
                        <TableCell>{o.recipient_name ?? "—"}</TableCell>
                        <TableCell>{[o.recipient_city, o.recipient_state].filter(Boolean).join("/") || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(o.imported_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{o.order_items?.length ?? 0}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(o.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={o.id + "-items"}>
                          <TableCell />
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="text-xs space-y-1 py-2">
                              {o.recipient_address && <div><span className="text-muted-foreground">Endereço:</span> {o.recipient_address} — CEP {o.recipient_zip ?? "—"}</div>}
                              <div className="mt-2 font-medium">Itens:</div>
                              {(o.order_items ?? []).map((it: any) => (
                                <div key={it.id} className="flex gap-4 font-mono">
                                  <span className="text-muted-foreground w-32 truncate">{it.sku}</span>
                                  <span className="flex-1 truncate">{it.product_name ?? "—"}</span>
                                  <span>×{it.quantity}</span>
                                  {it.product_id ? (
                                    <Badge variant="outline" className="text-[10px]">vinculado</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">SKU não cadastrado</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Os itens deste pedido também serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FileDrop({ accept, multiple, onFiles, children }: { accept: string; multiple?: boolean; onFiles: (f: FileList) => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-8 text-sm cursor-pointer transition-colors ${hover ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/60"}`}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <span className="text-muted-foreground text-center">{children}</span>
      <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </label>
  );
}
