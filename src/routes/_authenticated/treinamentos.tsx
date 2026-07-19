import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Pencil, ClipboardList, CheckCircle2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/sst";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({ meta: [{ title: "Treinamentos — TEC - SST" }] }),
  component: TreinamentosPage,
});

const emptyForm = {
  nome: "", tipo: "treinamento", nr_id: "", fornecedor_id: "",
  carga_horaria: "", validade_valor: "", validade_unidade: "meses", conteudo_programatico: "",
  data_hora: "", local: "", instrutor: "",
};

function TreinamentosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [presenca, setPresenca] = useState<any>(null);
  const [concluir, setConcluir] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: catalog } = useQuery({
    queryKey: ["cat-tr-full"],
    queryFn: async () => (await supabase.from("treinamentos").select("*, nr:normas_nr(id, codigo, titulo, periodicidade_meses), fornecedor:fornecedores(nome)").order("nome")).data ?? [],
  });
  const { data: nrs } = useQuery({
    queryKey: ["nrs"],
    queryFn: async () => (await supabase.from("normas_nr").select("id, codigo, titulo").order("codigo")).data ?? [],
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["forn"],
    queryFn: async () => (await supabase.from("fornecedores").select("id, nome").order("nome")).data ?? [],
  });

  // Deduplicated + naturally sorted NR options
  const nrOpts = (() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const n of (nrs ?? [])) { if (!seen.has(n.codigo)) { seen.add(n.codigo); out.push(n); } }
    return out.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  })();

  const save = useMutation({
    mutationFn: async () => {
      const valor = form.validade_valor ? Number(form.validade_valor) : null;
      const unidade = valor ? form.validade_unidade : null;
      // manter validade_meses coerente (para NRs/certificados que usam meses)
      let meses: number | null = null;
      if (valor && unidade) {
        if (unidade === "meses") meses = valor;
        else if (unidade === "anos") meses = valor * 12;
        else meses = Math.max(1, Math.round(valor / 30));
      }
      const payload: any = {
        nome: form.nome,
        tipo: form.tipo,
        nr_id: form.nr_id || null,
        fornecedor_id: form.fornecedor_id || null,
        carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
        validade_valor: valor,
        validade_unidade: unidade,
        validade_meses: meses,
        conteudo_programatico: form.conteudo_programatico || null,
        data_hora: form.data_hora || null,
        local: form.local || null,
        instrutor: form.instrutor || null,
      };
      if (editing) {
        const { error } = await supabase.from("treinamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("treinamentos").insert(payload).select("id").single();
        if (error) throw error;
        // Cria evento no calendário automaticamente se tiver data_hora
        if (payload.data_hora) {
          await supabase.from("eventos_calendario").insert({
            titulo: payload.nome,
            tipo: payload.tipo === "palestra" ? "palestra" : "treinamento",
            data_inicio: payload.data_hora,
            local: payload.local,
            treinamento_id: inserted?.id ?? null,
          } as any);
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Criado (e agendado no calendário)");
      setOpen(false); setEditing(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["cat-tr-full"] });
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(t: any) {
    setEditing(t);
    setForm({
      nome: t.nome ?? "",
      tipo: t.tipo ?? "treinamento",
      nr_id: t.nr_id ?? "",
      fornecedor_id: t.fornecedor_id ?? "",
      carga_horaria: t.carga_horaria?.toString() ?? "",
      validade_valor: (t.validade_valor ?? t.validade_meses)?.toString() ?? "",
      validade_unidade: t.validade_unidade ?? "meses",
      conteudo_programatico: t.conteudo_programatico ?? "",
      data_hora: t.data_hora ? t.data_hora.slice(0, 16) : "",
      local: t.local ?? "",
      instrutor: t.instrutor ?? "",
    });
    setOpen(true);
  }

  const treinamentos = (catalog ?? []).filter((t: any) => t.tipo === "treinamento");
  const palestras = (catalog ?? []).filter((t: any) => t.tipo === "palestra");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Treinamentos e palestras</h1>
          <p className="text-sm text-muted-foreground">Catálogo, agenda, presenças e conclusão de turmas.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
      </div>

      <Tabs defaultValue="treinamento">
        <TabsList>
          <TabsTrigger value="treinamento">Treinamentos</TabsTrigger>
          <TabsTrigger value="palestra">Palestras</TabsTrigger>
        </TabsList>
        <TabsContent value="treinamento">
          <ListaCatalogo items={treinamentos} onEdit={openEdit} onPresenca={setPresenca} onConcluir={setConcluir} />
        </TabsContent>
        <TabsContent value="palestra">
          <ListaCatalogo items={palestras} onEdit={openEdit} onPresenca={setPresenca} onConcluir={setConcluir} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} {form.tipo === "palestra" ? "palestra" : "treinamento"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="palestra">Palestra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NR</Label>
                <Select value={form.nr_id} onValueChange={(v) => setForm({ ...form, nr_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{nrOpts.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.titulo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data e horário</Label><Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} /></div>
              <div><Label>Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
              <div><Label>Instrutor</Label><Input value={form.instrutor} onChange={(e) => setForm({ ...form, instrutor: e.target.value })} /></div>
              <div><Label>Carga horária (h)</Label><Input type="number" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} /></div>
              <div>
                <Label>Validade</Label>
                <div className="flex gap-1">
                  <Input type="number" min="1" placeholder="Ex: 12" value={form.validade_valor} onChange={(e) => setForm({ ...form, validade_valor: e.target.value })} />
                  <Select value={form.validade_unidade} onValueChange={(v) => setForm({ ...form, validade_unidade: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                      <SelectItem value="anos">Anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(fornecedores ?? []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Conteúdo programático</Label><Textarea rows={4} value={form.conteudo_programatico} onChange={(e) => setForm({ ...form, conteudo_programatico: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Se a validade em meses não for informada, o sistema usa a periodicidade da NR. Ao criar com data/horário, um evento é agendado no calendário.</p>
            <DialogFooter><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {presenca && <ListaPresencaDialog treinamento={presenca} onClose={() => setPresenca(null)} />}
      {concluir && <ConcluirDialog treinamento={concluir} onClose={() => setConcluir(null)} onDone={() => { qc.invalidateQueries({ queryKey: ["cat-tr-full"] }); qc.invalidateQueries({ queryKey: ["tr"] }); qc.invalidateQueries({ queryKey: ["venc"] }); }} />}
    </div>
  );
}

function ListaCatalogo({ items, onEdit, onPresenca, onConcluir }: any) {
  return (
    <Card>
      <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t: any) => (
          <div key={t.id} className="border rounded-lg p-4 space-y-2 hover:border-primary/50 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{t.nome}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {t.nr?.codigo && <Badge variant="secondary" className="text-xs">{t.nr.codigo}</Badge>}
                  {t.concluido && <Badge className="text-xs bg-success text-success-foreground">Concluído</Badge>}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {t.data_hora && <div className="flex items-center gap-1"><CalIcon className="h-3 w-3" /> <b className="text-foreground">{fmtDate(t.data_hora)}</b> {new Date(t.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>}
              <div>Carga: <b className="text-foreground">{t.carga_horaria ? `${t.carga_horaria}h` : "—"}</b></div>
              <div>Validade: <b className="text-foreground">{t.validade_meses ?? t.nr?.periodicidade_meses ?? "—"} {(t.validade_meses ?? t.nr?.periodicidade_meses) ? "meses" : ""}</b></div>
              <div>Local: <b className="text-foreground">{t.local ?? "—"}</b></div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onPresenca(t)}>
                <ClipboardList className="h-3.5 w-3.5 mr-1" /> Presença
              </Button>
              <Button size="sm" className="flex-1" onClick={() => onConcluir(t)} disabled={t.concluido}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</div>}
      </CardContent>
    </Card>
  );
}

function ConcluirDialog({ treinamento, onClose, onDone }: any) {
  const { data: colabs } = useQuery({
    queryKey: ["colabs-conc"],
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome, setor, funcao_atual").eq("status", "ativo").order("nome")).data ?? [],
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dataReal, setDataReal] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (selected.size === 0) { toast.error("Selecione ao menos um participante"); return; }
    setSaving(true);
    try {
      // Insere registros de treinamento realizado (trigger calcula vencimento)
      const rows = Array.from(selected).map((cid) => ({
        colaborador_id: cid,
        treinamento_id: treinamento.id,
        data_realizacao: dataReal,
        instrutor: treinamento.instrutor ?? null,
        local: treinamento.local ?? null,
      }));
      const { data: inserted, error } = await supabase.from("treinamentos_realizados").insert(rows).select("id, colaborador_id, data_vencimento");
      if (error) throw error;

      // Atualiza vencimento em colaborador_nrs para a NR do treinamento (se houver)
      if (treinamento.nr?.id) {
        for (const r of inserted ?? []) {
          await supabase.from("colaborador_nrs" as any).upsert({
            colaborador_id: r.colaborador_id,
            nr_id: treinamento.nr.id,
            data_realizacao: dataReal,
            data_vencimento: r.data_vencimento,
          }, { onConflict: "colaborador_id,nr_id" });
        }
      }

      // Marca o treinamento como concluído
      await supabase.from("treinamentos").update({ concluido: true, data_conclusao: dataReal } as any).eq("id", treinamento.id);

      toast.success(`Treinamento concluído para ${selected.size} colaborador(es). Certificados prontos.`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Concluir treinamento — {treinamento.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de conclusão</Label><Input type="date" value={dataReal} onChange={(e) => setDataReal(e.target.value)} /></div>
            <div><Label>NR vinculada</Label><Input readOnly value={treinamento.nr?.codigo ?? "—"} /></div>
          </div>
          <div>
            <Label>Participantes ({selected.size})</Label>
            <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-0.5">
              {(colabs ?? []).map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 text-sm py-0.5">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => {
                    const s = new Set(selected);
                    if (e.target.checked) s.add(c.id); else s.delete(c.id);
                    setSelected(s);
                  }} />
                  <span className="flex-1">{c.nome}</span>
                  <span className="text-xs text-muted-foreground">{c.funcao_atual ?? ""}{c.setor ? ` · ${c.setor}` : ""}</span>
                </label>
              ))}
              {(colabs ?? []).length === 0 && <div className="text-sm text-muted-foreground py-2 text-center">Nenhum colaborador ativo.</div>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Ao concluir, o vencimento/reciclagem de cada participante é atualizado e os certificados ficam disponíveis em <b>Certificados</b>.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || selected.size === 0}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir e emitir certificados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListaPresencaDialog({ treinamento, onClose }: any) {
  const { data: colabs } = useQuery({
    queryKey: ["all-colabs"],
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome, cpf, funcao_atual, setor").eq("status", "ativo").order("nome")).data ?? [],
  });
  const { data: config } = useQuery({
    queryKey: ["config-empresa"],
    queryFn: async () => (await supabase.from("configuracoes_empresa" as any).select("*").maybeSingle()).data,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [data, setData] = useState(treinamento.data_hora ? treinamento.data_hora.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [instrutor, setInstrutor] = useState(treinamento.instrutor ?? "");
  const [local, setLocal] = useState(treinamento.local ?? "");
  const cfg: any = config ?? {};

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Lista de presença — {treinamento.nome}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Instrutor</Label><Input value={instrutor} onChange={(e) => setInstrutor(e.target.value)} /></div>
          <div><Label>Local</Label><Input value={local} onChange={(e) => setLocal(e.target.value)} /></div>
        </div>
        <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-1 no-print">
          {(colabs ?? []).map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => {
                const s = new Set(selected);
                if (e.target.checked) s.add(c.id); else s.delete(c.id);
                setSelected(s);
              }} />
              <span className="font-medium">{c.nome}</span>
              <span className="text-muted-foreground text-xs">— {c.funcao_atual ?? ""} {c.setor ? `· ${c.setor}` : ""}</span>
            </label>
          ))}
        </div>

        <div id="print-area" className="hidden print:block p-6">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <img src={cfg.logo_url || logo} alt="" className="h-14" />
            <div className="text-right">
              <div className="font-bold text-lg">{cfg.nome_empresa || "TEC - SST"}</div>
              {cfg.cnpj && <div className="text-xs">CNPJ: {cfg.cnpj}</div>}
            </div>
          </div>
          <h1 className="text-xl font-bold mb-1 text-center">LISTA DE PRESENÇA</h1>
          <p className="text-sm mb-4 text-center">{treinamento.nome} {treinamento.nr?.codigo ? `— ${treinamento.nr.codigo}` : ""}</p>
          <div className="grid grid-cols-4 gap-2 text-xs mb-4 border rounded p-2">
            <div><b>Data:</b> {data}</div>
            <div><b>Instrutor:</b> {instrutor || "—"}</div>
            <div><b>Local:</b> {local || "—"}</div>
            <div><b>Carga:</b> {treinamento.carga_horaria ?? "—"}h</div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left border p-1 w-8">#</th>
                <th className="text-left border p-1">Nome</th>
                <th className="text-left border p-1">CPF</th>
                <th className="text-left border p-1">Função</th>
                <th className="text-left border p-1 w-48">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {(colabs ?? []).filter((c: any) => selected.has(c.id)).map((c: any, i: number) => (
                <tr key={c.id}>
                  <td className="border p-1">{i + 1}</td>
                  <td className="border p-1">{c.nome}</td>
                  <td className="border p-1">{c.cpf ?? ""}</td>
                  <td className="border p-1">{c.funcao_atual ?? ""}</td>
                  <td className="border p-1 h-8"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 mt-16 text-xs">
            <div className="text-center">
              <div className="border-t border-black pt-1">{instrutor || "Instrutor"}</div>
              <div className="text-[10px] text-muted-foreground">Assinatura do Instrutor</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">{cfg.tecnico_responsavel_nome || "Técnico Responsável"}</div>
              <div className="text-[10px] text-muted-foreground">
                Técnico de Segurança{cfg.tecnico_responsavel_registro ? ` — ${cfg.tecnico_responsavel_registro}` : ""}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => window.print()} disabled={selected.size === 0}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
