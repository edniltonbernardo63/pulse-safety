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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel, SETORES } from "@/lib/sst";

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
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome, setor").eq("status", "ativo").order("nome")).data ?? [],
  });
  const { data: setorEpis } = useQuery({
    queryKey: ["epis-setor-all"],
    queryFn: async () => (await supabase.from("epis_setor" as any).select("*").order("setor").order("tipo_epi")).data ?? [],
  });

  const [f, setF] = useState<any>({ colaborador_id: "", tipo: "", ca_numero: "", data_entrega: "", vida_util_meses: "", observacoes: "" });
  const colaboradorSel: any = (colabs ?? []).find((c: any) => c.id === f.colaborador_id);
  const setorAtual = colaboradorSel?.setor;
  const opcoesSetor: any[] = ((setorEpis as any[]) ?? []).filter((s: any) => s.setor === setorAtual);

  function onSelectTipo(tipo: string) {
    const item: any = opcoesSetor.find((x) => x.tipo_epi === tipo);
    setF((prev: any) => ({
      ...prev,
      tipo,
      ca_numero: item?.ca_padrao ?? prev.ca_numero,
      vida_util_meses: item?.vida_util_meses ? String(item.vida_util_meses) : prev.vida_util_meses,
    }));
  }

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
          <p className="text-sm text-muted-foreground">Entregas, CA, vencimento e obrigatoriedade por setor.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Cadastrar EPI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar entrega de EPI</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Colaborador</Label>
                <Select value={f.colaborador_id} onValueChange={(v) => setF({ ...f, colaborador_id: v, tipo: "", ca_numero: "" })} required>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{(colabs ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome} {c.setor ? `· ${c.setor}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Tipo de EPI {setorAtual ? `(setor: ${setorAtual})` : ""}</Label>
                {opcoesSetor.length > 0 ? (
                  <Select value={f.tipo} onValueChange={onSelectTipo}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {opcoesSetor.map((x: any) => (
                        <SelectItem key={x.id} value={x.tipo_epi}>{x.tipo_epi}{x.ca_padrao ? ` — CA ${x.ca_padrao}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input required value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Ex: Capacete, Luva de vaqueta" />
                )}
                {setorAtual && opcoesSetor.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Nenhum EPI cadastrado para este setor. Use a aba "EPIs por setor" para configurar.</p>
                )}
              </div>
              <div className="space-y-1.5"><Label>Nº CA</Label><Input value={f.ca_numero} onChange={(e) => setF({ ...f, ca_numero: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Vida útil (meses)</Label><Input type="number" value={f.vida_util_meses} onChange={(e) => setF({ ...f, vida_util_meses: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Data de entrega</Label><Input type="date" required value={f.data_entrega} onChange={(e) => setF({ ...f, data_entrega: e.target.value })} /></div>
              <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending || !f.colaborador_id}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="entregas">
        <TabsList>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="setor">EPIs por setor</TabsTrigger>
        </TabsList>

        <TabsContent value="entregas">
          <Card>
            <CardHeader className="flex flex-wrap gap-3">
              <Input className="max-w-sm" placeholder="Buscar por colaborador ou EPI..." value={q} onChange={(e) => setQ(e.target.value)} />
              <Select value={statusF} onValueChange={setStatusF}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="a_vencer">Atenção</SelectItem>
                  <SelectItem value="valido">Em dia</SelectItem>
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
        </TabsContent>

        <TabsContent value="setor">
          <EpiSetorConfig setorEpis={setorEpis ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ["epis-setor-all"] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EpiSetorConfig({ setorEpis, onChanged }: { setorEpis: any[]; onChanged: () => void }) {
  const [f, setF] = useState<any>({ setor: "", tipo_epi: "", ca_padrao: "", vida_util_meses: "" });
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("epis_setor" as any).insert({
        setor: f.setor,
        tipo_epi: f.tipo_epi,
        ca_padrao: f.ca_padrao || null,
        vida_util_meses: f.vida_util_meses ? Number(f.vida_util_meses) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("EPI vinculado ao setor"); setF({ setor: "", tipo_epi: "", ca_padrao: "", vida_util_meses: "" }); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<string, any[]> = {};
  (setorEpis as any[]).forEach((x) => { (grouped[x.setor] ||= []).push(x); });

  return (
    <Card>
      <CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
          <div>
            <Label>Setor</Label>
            <Select value={f.setor} onValueChange={(v) => setF({ ...f, setor: v })} required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tipo de EPI</Label><Input required value={f.tipo_epi} onChange={(e) => setF({ ...f, tipo_epi: e.target.value })} placeholder="Ex: Capacete" /></div>
          <div><Label>CA padrão</Label><Input value={f.ca_padrao} onChange={(e) => setF({ ...f, ca_padrao: e.target.value })} /></div>
          <div><Label>Vida útil (meses)</Label><Input type="number" value={f.vida_util_meses} onChange={(e) => setF({ ...f, vida_util_meses: e.target.value })} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full" disabled={mut.isPending || !f.setor || !f.tipo_epi}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button></div>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum EPI configurado por setor ainda.</p>}
        {Object.entries(grouped).map(([setor, itens]) => (
          <div key={setor}>
            <div className="font-semibold mb-2">{setor}</div>
            <div className="flex flex-wrap gap-2">
              {itens.map((it: any) => (
                <Badge key={it.id} variant="secondary" className="gap-1">
                  {it.tipo_epi}{it.ca_padrao ? ` · CA ${it.ca_padrao}` : ""}{it.vida_util_meses ? ` · ${it.vida_util_meses}m` : ""}
                  <button type="button" onClick={async () => {
                    if (!confirm("Remover?")) return;
                    await supabase.from("epis_setor" as any).delete().eq("id", it.id);
                    onChanged();
                  }} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
