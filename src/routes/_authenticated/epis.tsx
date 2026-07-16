import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/epis")({
  head: () => ({ meta: [{ title: "EPIs — TEC - SST" }] }),
  component: EpisPage,
});

function EpisPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["epis-all"],
    queryFn: async () => (await supabase.from("epis").select("*, colaborador:colaboradores(id, nome, setor)").order("data_vencimento")).data ?? [],
  });
  const { data: colabs } = useQuery({
    queryKey: ["colabs-min"],
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome").eq("status", "ativo").order("nome")).data ?? [],
  });

  const [f, setF] = useState<any>({ colaborador_id: "", tipo: "", ca_numero: "", data_entrega: "", vida_util_meses: "", observacoes: "" });
  const mut = useMutation({
    mutationFn: async () => {
      let venc: string | null = null;
      if (f.vida_util_meses && f.data_entrega) {
        const d = new Date(f.data_entrega);
        d.setMonth(d.getMonth() + Number(f.vida_util_meses));
        venc = d.toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("epis").insert({
        colaborador_id: f.colaborador_id,
        tipo: f.tipo,
        ca_numero: f.ca_numero || null,
        data_entrega: f.data_entrega,
        vida_util_meses: f.vida_util_meses ? Number(f.vida_util_meses) : null,
        data_vencimento: venc,
        observacoes: f.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("EPI registrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["epis-all"] });
      setF({ colaborador_id: "", tipo: "", ca_numero: "", data_entrega: "", vida_util_meses: "", observacoes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (data ?? []).map((e: any) => ({ ...e, _s: statusVencimento(e.data_vencimento) })).filter((e: any) => {
    if (statusF !== "todos" && e._s !== statusF) return false;
    if (q && !`${e.colaborador?.nome} ${e.tipo}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">EPIs</h1>
          <p className="text-sm text-muted-foreground">Entregas, CA e controle de vencimento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Cadastrar EPI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar entrega de EPI</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Colaborador</Label>
                <Select value={f.colaborador_id} onValueChange={(v) => setF({ ...f, colaborador_id: v })} required>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{(colabs ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label>Tipo de EPI</Label><Input required value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Ex: Luva de vaqueta, Capacete, Bota" /></div>
              <div className="space-y-1.5"><Label>Nº CA</Label><Input value={f.ca_numero} onChange={(e) => setF({ ...f, ca_numero: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Vida útil (meses)</Label><Input type="number" value={f.vida_util_meses} onChange={(e) => setF({ ...f, vida_util_meses: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Data de entrega</Label><Input type="date" required value={f.data_entrega} onChange={(e) => setF({ ...f, data_entrega: e.target.value })} /></div>
              <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending || !f.colaborador_id}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader className="flex flex-wrap gap-3">
          <Input className="max-w-sm" placeholder="Buscar por colaborador ou EPI..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="a_vencer">A vencer</SelectItem>
              <SelectItem value="valido">Válido</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{rows.length} registros</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Colaborador</th><th>Setor</th><th>EPI</th><th>CA</th><th>Entrega</th><th>Vencimento</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((e: any) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{e.colaborador?.nome}</td>
                  <td>{e.colaborador?.setor ?? "—"}</td>
                  <td>{e.tipo}</td>
                  <td>{e.ca_numero ?? "—"}</td>
                  <td>{fmtDate(e.data_entrega)}</td>
                  <td>{fmtDate(e.data_vencimento)}</td>
                  <td><Badge className={statusBadgeClass(e._s)}>{statusLabel(e._s)}</Badge></td>
                  <td className="text-right">
                    {e.colaborador?.id && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/colaboradores/$id" params={{ id: e.colaborador.id }} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum EPI.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
