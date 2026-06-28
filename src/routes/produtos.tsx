import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProducts, createProduct, updateProduct, deleteProduct } from "@/lib/products.functions";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos · Etiquetas Pro" }] }),
  component: ProductsPage,
});

type Product = {
  id: string; sku: string; name: string; description: string | null;
  width_cm: number | null; height_cm: number | null; length_cm: number | null; weight_g: number | null;
};

const empty = { sku: "", name: "", description: "", width_cm: "", height_cm: "", length_cm: "", weight_g: "" };

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useServerFn(listProducts);
  const create = useServerFn(createProduct);
  const update = useServerFn(updateProduct);
  const del = useServerFn(deleteProduct);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, page],
    queryFn: () => list({ data: { search, page, pageSize: 20 } }),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        weight_g: form.weight_g ? Number(form.weight_g) : null,
      };
      return editing
        ? await update({ data: { id: editing.id, ...payload } })
        : await create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Produto atualizado" : "Produto criado");
      setDialogOpen(false);
      setEditing(null);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Produto excluído");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, description: p.description ?? "",
      width_cm: p.width_cm?.toString() ?? "", height_cm: p.height_cm?.toString() ?? "",
      length_cm: p.length_cm?.toString() ?? "", weight_g: p.weight_g?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de produtos para geração de etiquetas.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo produto</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por SKU ou nome"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Dimensões (cm)</TableHead>
              <TableHead>Peso (g)</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</TableCell></TableRow>
            ) : (
              data?.items.map((p: Product) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[p.width_cm, p.height_cm, p.length_cm].filter(Boolean).join(" × ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.weight_g ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} produtos</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="px-3 py-1">{page} / {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Largura (cm)</Label><Input type="number" step="0.01" value={form.width_cm} onChange={(e) => setForm({ ...form, width_cm: e.target.value })} /></div>
              <div><Label>Altura (cm)</Label><Input type="number" step="0.01" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
              <div><Label>Comp. (cm)</Label><Input type="number" step="0.01" value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} /></div>
              <div><Label>Peso (g)</Label><Input type="number" step="0.01" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.sku || !form.name}>
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && delMut.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
