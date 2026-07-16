import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Pencil, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({ meta: [{ title: "Treinamentos — TEC - SST" }] }),
  component: TreinamentosPage,
});

const emptyForm = { nome: "", tipo: "treinamento", nr_id: "", fornecedor_id: "", carga_horaria: "", validade_meses: "", conteudo_programatico: "" };

function TreinamentosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [presenca, setPresenca] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: catalog } = useQuery({
    queryKey: ["cat-tr-full"],
    queryFn: async () => (await supabase.from("treinamentos").select("*, nr:normas_nr(codigo, titulo, periodicidade_meses), fornecedor:fornecedores(nome)").order("nome")).data ?? [],
  });
  const { data: nrs } = useQuery({
    queryKey: ["nrs"],
    queryFn: async () => (await supabase.from("normas_nr").select("*").order("codigo")).data ?? [],
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["forn"],
    queryFn: async () => (await supabase.from("fornecedores").select("*").order("nome")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: form.nome,
        tipo: form.tipo,
        nr_id: form.nr_id || null,
        fornecedor_id: form.fornecedor_id || null,
        carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
        validade_meses: form.validade_meses ? Number(form.validade_meses) : null,
        conteudo_programatico: form.conteudo_programatico || null,
      };
      if (editing) {
        const { error } = await supabase.from("treinamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("treinamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Treinamento atualizado" : "Treinamento criado");
      setOpen(false); setEditing(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["cat-tr-full"] });
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
      validade_meses: t.validade_meses?.toString() ?? "",
      conteudo_programatico: t.conteudo_programatico ?? "",
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
          <p className="text-sm text-muted-foreground">Catálogo, validade e listas de presença.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
      </div>

      <Tabs defaultValue="treinamento">
        <TabsList>
          <TabsTrigger value="treinamento">Treinamentos</TabsTrigger>
          <TabsTrigger value="palestra">Palestras</TabsTrigger>
        </TabsList>
        <TabsContent value="treinamento">
          <ListaCatalogo items={treinamentos} onEdit={openEdit} onPresenca={setPresenca} />
        </TabsContent>
        <TabsContent value="palestra">
          <ListaCatalogo items={palestras} onEdit={openEdit} onPresenca={setPresenca} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
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
                  <SelectContent>{(nrs ?? []).map((n: any) => <SelectItem key={n.id} value={n.id}>{n.codigo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Carga horária (h)</Label><Input type="number" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} /></div>
              <div><Label>Validade (meses)</Label><Input type="number" placeholder="Ex: 12, 24" value={form.validade_meses} onChange={(e) => setForm({ ...form, validade_meses: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(fornecedores ?? []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Conteúdo programático</Label><Textarea rows={4} value={form.conteudo_programatico} onChange={(e) => setForm({ ...form, conteudo_programatico: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Se a validade em meses não for preenchida, o sistema usa a periodicidade da NR vinculada para calcular o vencimento.</p>
            <DialogFooter><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {presenca && <ListaPresencaDialog treinamento={presenca} onClose={() => setPresenca(null)} />}
    </div>
  );
}

function ListaCatalogo({ items, onEdit, onPresenca }: any) {
  return (
    <Card>
      <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t: any) => (
          <div key={t.id} className="border rounded-lg p-4 space-y-2 hover:border-primary/50 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{t.nome}</div>
                {t.nr?.codigo && <Badge variant="secondary" className="mt-1 text-xs">{t.nr.codigo}</Badge>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Carga: <b className="text-foreground">{t.carga_horaria ? `${t.carga_horaria}h` : "—"}</b></div>
              <div>Validade: <b className="text-foreground">{t.validade_meses ?? t.nr?.periodicidade_meses ?? "—"} {(t.validade_meses ?? t.nr?.periodicidade_meses) ? "meses" : ""}</b></div>
              <div>Fornecedor: <b className="text-foreground">{t.fornecedor?.nome ?? "—"}</b></div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => onPresenca(t)}>
              <ClipboardList className="h-4 w-4 mr-1" /> Lista de presença
            </Button>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</div>}
      </CardContent>
    </Card>
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
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [instrutor, setInstrutor] = useState("");
  const [local, setLocal] = useState("");

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
