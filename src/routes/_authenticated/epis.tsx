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
import { Plus, ExternalLink, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel, SETORES } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/epis")({
  head: () => ({ meta: [{ title: "EPIs — TEC - SST" }] }),
  component: EpisPage,
});

type UnidadeTempo = "dias" | "meses" | "anos";

function toMonths(valor: number, unidade: UnidadeTempo): number | null {
  if (!valor) return null;
  if (unidade === "meses") return valor;
  if (unidade === "anos") return valor * 12;
  return Math.max(1, Math.round(valor / 30));
}

function addUnidade(base: Date, valor: number, unidade: UnidadeTempo): Date {
  const d = new Date(base);
  if (unidade === "dias") d.setDate(d.getDate() + valor);
  else if (unidade === "anos") d.setFullYear(d.getFullYear() + valor);
  else d.setMonth(d.getMonth() + valor);
  return d;
}

const emptyForm = {
  id: "",
  colaborador_id: "",
  tipo: "",
  ca_numero: "",
  data_entrega: "",
  vida_util_valor: "",
  vida_util_unidade: "meses" as UnidadeTempo,
  observacoes: "",
};

function EpisPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(emptyForm);
  const editing = Boolean(f.id);

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

  const colaboradorSel: any = (colabs ?? []).find((c: any) => c.id === f.colaborador_id);
  const setorAtual = colaboradorSel?.setor;
  const opcoesSetor: any[] = ((setorEpis as any[]) ?? []).filter((s: any) => s.setor === setorAtual);

  function onSelectTipo(tipo: string) {
    const item: any = opcoesSetor.find((x) => x.tipo_epi === tipo);
    setF((prev: any) => ({
      ...prev,
      tipo,
      ca_numero: item?.ca_padrao ?? prev.ca_numero,
      vida_util_valor: item?.vida_util_meses ? String(item.vida_util_meses) : prev.vida_util_valor,
      vida_util_unidade: item?.vida_util_meses ? "meses" : prev.vida_util_unidade,
    }));
  }

  function openNew() { setF(emptyForm); setOpen(true); }
  function openEdit(e: any) {
    setF({
      id: e.id,
      colaborador_id: e.colaborador_id,
      tipo: e.tipo ?? "",
      ca_numero: e.ca_numero ?? "",
      data_entrega: e.data_entrega ?? "",
      vida_util_valor: (e.vida_util_valor ?? e.vida_util_meses)?.toString() ?? "",
      vida_util_unidade: (e.vida_util_unidade ?? "meses") as UnidadeTempo,
      observacoes: e.observacoes ?? "",
    });
    setOpen(true);
  }

  const mut = useMutation({
    mutationFn: async () => {
      const valor = f.vida_util_valor ? Number(f.vida_util_valor) : null;
      const unidade = valor ? f.vida_util_unidade : null;
      let venc: string | null = null;
      if (valor && unidade && f.data_entrega) {
        venc = addUnidade(new Date(f.data_entrega), valor, unidade as UnidadeTempo).toISOString().slice(0, 10);
      }
      const payload: any = {
        colaborador_id: f.colaborador_id,
        tipo: f.tipo,
        ca_numero: f.ca_numero || null,
        data_entrega: f.data_entrega,
        vida_util_valor: valor,
        vida_util_unidade: unidade,
        vida_util_meses: valor && unidade ? toMonths(valor, unidade as UnidadeTempo) : null,
        data_vencimento: venc,
        observacoes: f.observacoes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("epis").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("epis").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(f.id ? "EPI atualizado" : "EPI registrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["epis-all"] });
      setF(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function removerEpi(id: string) {
    if (!confirm("Remover esta entrega?")) return;
    const { error } = await supabase.from("epis").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Entrega removida");
    qc.invalidateQueries({ queryKey: ["epis-all"] });
  }

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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setF(emptyForm); }}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Cadastrar EPI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar entrega de EPI" : "Registrar entrega de EPI"}</DialogTitle></DialogHeader>
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
              <div className="space-y-1.5">
                <Label>Vida útil</Label>
                <div className="flex gap-1">
                  <Input type="number" min="1" value={f.vida_util_valor} onChange={(e) => setF({ ...f, vida_util_valor: e.target.value })} />
                  <Select value={f.vida_util_unidade} onValueChange={(v) => setF({ ...f, vida_util_unidade: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                      <SelectItem value="anos">Anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                      <td className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removerEpi(e.id)} title="Remover"><Trash2 className="h-3.5 w-3.5" /></Button>
                        {e.colaborador?.id && (
                          <Button asChild size="icon" variant="ghost" title="Abrir colaborador">
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
  const [f, setF] = useState<any>({ id: "", setor: "", tipo_epi: "", ca_padrao: "", vida_util_meses: "" });
  const editing = Boolean(f.id);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        setor: f.setor,
        tipo_epi: f.tipo_epi,
        ca_padrao: f.ca_padrao || null,
        vida_util_meses: f.vida_util_meses ? Number(f.vida_util_meses) : null,
      };
      if (f.id) {
        const { error } = await supabase.from("epis_setor" as any).update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("epis_setor" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(f.id ? "EPI atualizado" : "EPI vinculado ao setor");
      setF({ id: "", setor: "", tipo_epi: "", ca_padrao: "", vida_util_meses: "" });
      onChanged();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<string, any[]> = {};
  (setorEpis as any[]).forEach((x) => { (grouped[x.setor] ||= []).push(x); });

  return (
    <Card>
      <CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 md:grid-cols-6 gap-2 w-full">
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
          <div className="flex items-end gap-1 md:col-span-2">
            <Button type="submit" className="flex-1" disabled={mut.isPending || !f.setor || !f.tipo_epi}>
              <Plus className="h-4 w-4 mr-1" /> {editing ? "Salvar" : "Adicionar"}
            </Button>
            {editing && <Button type="button" variant="outline" onClick={() => setF({ id: "", setor: "", tipo_epi: "", ca_padrao: "", vida_util_meses: "" })}>Cancelar</Button>}
          </div>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum EPI configurado por setor ainda.</p>}
        {Object.entries(grouped).map(([setor, itens]) => (
          <div key={setor}>
            <div className="font-semibold mb-2">{setor}</div>
            <div className="flex flex-wrap gap-2">
              {itens.map((it: any) => (
                <Badge key={it.id} variant="secondary" className="gap-1 pr-1">
                  {it.tipo_epi}{it.ca_padrao ? ` · CA ${it.ca_padrao}` : ""}{it.vida_util_meses ? ` · ${it.vida_util_meses}m` : ""}
                  <button type="button" onClick={() => setF({
                    id: it.id, setor: it.setor, tipo_epi: it.tipo_epi,
                    ca_padrao: it.ca_padrao ?? "", vida_util_meses: it.vida_util_meses?.toString() ?? "",
                  })} className="ml-1 hover:text-primary" title="Editar">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={async () => {
                    if (!confirm("Remover?")) return;
                    await supabase.from("epis_setor" as any).delete().eq("id", it.id);
                    onChanged();
                  }} className="ml-1 hover:text-destructive" title="Remover">
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
