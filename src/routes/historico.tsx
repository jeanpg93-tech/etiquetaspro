import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Printer, History, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listPrintLogs, deletePrintLog, clearPrintLogs, getOrdersByIds, createPrintLog } from "@/lib/print-logs.functions";
import { downloadLabelsPdf, type LabelOrder } from "@/lib/labels/pdf";
import { loadSettings, PRESETS } from "@/lib/labels/settings";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico · Etiquetas Pro" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPrintLogs);
  const del = useServerFn(deletePrintLog);
  const clear = useServerFn(clearPrintLogs);
  const fetchOrders = useServerFn(getOrdersByIds);
  const log = useServerFn(createPrintLog);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["print-logs"],
    queryFn: () => list({ data: { page: 1, pageSize: 100 } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["print-logs"] });
    },
  });

  const clearMut = useMutation({
    mutationFn: () => clear({ data: {} }),
    onSuccess: () => {
      toast.success("Histórico limpo");
      qc.invalidateQueries({ queryKey: ["print-logs"] });
    },
  });

  const reprintMut = useMutation({
    mutationFn: async (entry: any) => {
      if (!entry.order_ids?.length) throw new Error("Sem pedidos para reimpressão");
      const orders = await fetchOrders({ data: { ids: entry.order_ids } });
      if (!orders.length) throw new Error("Pedidos originais não encontrados");
      const settings = loadSettings();
      downloadLabelsPdf(orders as LabelOrder[], `reimpressao-${Date.now()}.pdf`, settings);
      await log({
        data: {
          order_ids: orders.map((o: any) => o.id),
          order_count: orders.length,
          label_count: orders.length,
          preset: settings.preset,
          source: "manual",
          filename: `reimpressao-${Date.now()}.pdf`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Reimpressão concluída");
      qc.invalidateQueries({ queryKey: ["print-logs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reimprimir"),
  });

  const items = data?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <History className="h-6 w-6" /> Histórico de Impressões
          </h1>
          <p className="text-sm text-muted-foreground">Cada PDF gerado é registrado aqui. Você pode reimprimir ou limpar registros.</p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Limpar tudo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registros ({data?.total ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma impressão registrada ainda. Gere etiquetas em "Pedidos" para começar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Preset</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Etiquetas</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row: any) => {
                  const presetName = row.preset && PRESETS[row.preset as keyof typeof PRESETS]?.name;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{new Date(row.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant={row.source === "batch" ? "default" : "secondary"}>
                          {row.source === "batch" ? "Lote" : row.source === "individual" ? "Individual" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{presetName ?? row.preset ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.order_count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.label_count}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{row.filename ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Reimprimir"
                            disabled={!row.order_ids?.length || reprintMut.isPending}
                            onClick={() => reprintMut.mutate(row)}
                          >
                            {reprintMut.isPending ? <RotateCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>Apenas o registro do histórico será removido. Os pedidos não são afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>Todos os registros de impressão serão removidos. Os pedidos não são afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearMut.mutate(); setConfirmClear(false); }}>Limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
