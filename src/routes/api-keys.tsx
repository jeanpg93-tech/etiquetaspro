import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Copy, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [{ title: "API Keys · Etiquetas Pro" }] }),
  component: ApiKeysPage,
});

type Key = { id: string; name: string; key_prefix: string; last_used_at: string | null; revoked_at: string | null; created_at: string };

function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const { data, isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: () => create({ data: { name: name.trim() } }),
    onSuccess: (res) => {
      setCreatedKey(res.key);
      setCreateOpen(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Chave revogada");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    toast.success("Chave copiada");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground">Chaves para autenticar requisições à API REST <code className="text-xs">/api/public/v1/*</code>.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova chave</Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Prefixo</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : (data ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma chave criada.</TableCell></TableRow>
            ) : (
              (data as Key[]).map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">{k.key_prefix}…</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    {k.revoked_at
                      ? <Badge variant="secondary">Revogada</Badge>
                      : <Badge><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</Badge>}
                  </TableCell>
                  <TableCell>
                    {!k.revoked_at && (
                      <Button variant="ghost" size="sm" onClick={() => revokeMut.mutate(k.id)}>
                        <Ban className="h-4 w-4 mr-1" />Revogar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova API Key</DialogTitle></DialogHeader>
          <div>
            <Label>Nome / descrição</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Integração Nuvemshop" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>
              {createMut.isPending ? "Gerando..." : "Gerar chave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chave gerada</DialogTitle></DialogHeader>
          <p className="text-sm text-destructive font-medium">⚠ Copie a chave agora. Ela não será exibida novamente.</p>
          <div className="flex gap-2">
            <Input readOnly value={createdKey ?? ""} className="font-mono text-xs" />
            <Button onClick={copyKey}><Copy className="h-4 w-4" /></Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
