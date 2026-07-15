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
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({ meta: [{ title: "Treinamentos — TEC - SST" }] }),
  component: TreinamentosPage,
});

function TreinamentosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [presenca, setPresenca] = useState<any>(null);

  const { data: catalog } = useQuery({
    queryKey: ["cat-tr-full"],
    queryFn: async () => (await supabase.from("treinamentos").select("*, nr:normas_nr(codigo, titulo), fornecedor:fornecedores(nome)").order("nome")).data ?? [],
  });
  const { data: nrs } = useQuery({
    queryKey: ["nrs"],
    queryFn: async () => (await supabase.from("normas_nr").select("*").order("codigo")).data ?? [],
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["forn"],
    queryFn: async () => (await supabase.from("fornecedores").select("*").order("nome")).data ?? [],
  });

  const [form, setForm] = useState<any>({ nome: "", nr_id: "", fornecedor_id: "", carga_horaria: "", conteudo_programatico: "" });
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treinamentos").insert({
        nome: form.nome,
        nr_id: form.nr_id || null,
        fornecedor_id: form.fornecedor_id || null,
        carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
        conteudo_programatico: form.conteudo_programatico || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Treinamento criado"); setOpen(false); qc.invalidateQueries({ queryKey: ["cat-tr-full"] }); setForm({ nome: "", nr_id: "", fornecedor_id: "", carga_horaria: "", conteudo_programatico: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Treinamentos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de treinamentos disponíveis e listas de presença.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo treinamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo treinamento</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
              <div><Label>Nome</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>NR</Label>
                  <Select value={form.nr_id} onValueChange={(v) => setForm({ ...form, nr_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{(nrs ?? []).map((n: any) => <SelectItem key={n.id} value={n.id}>{n.codigo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Carga horária (h)</Label><Input type="number" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} /></div>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(fornecedores ?? []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conteúdo programático</Label><Textarea rows={4} value={form.conteudo_programatico} onChange={(e) => setForm({ ...form, conteudo_programatico: e.target.value })} /></div>
              <DialogFooter><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Catálogo</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Nome</th><th>NR</th><th>Carga</th><th>Fornecedor</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {(catalog ?? []).map((t: any) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{t.nome}</td>
                  <td>{t.nr?.codigo ?? "—"}</td>
                  <td>{t.carga_horaria ? `${t.carga_horaria}h` : "—"}</td>
                  <td>{t.fornecedor?.nome ?? "—"}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setPresenca(t)}>
                      <Printer className="h-4 w-4 mr-1" /> Lista de presença
                    </Button>
                  </td>
                </tr>
              ))}
              {(!catalog || catalog.length === 0) && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum treinamento cadastrado.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {presenca && <ListaPresencaDialog treinamento={presenca} onClose={() => setPresenca(null)} />}
    </div>
  );
}

function ListaPresencaDialog({ treinamento, onClose }: any) {
  const { data: colabs } = useQuery({
    queryKey: ["all-colabs"],
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome, cpf, funcao_atual").eq("status", "ativo").order("nome")).data ?? [],
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [instrutor, setInstrutor] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Lista de presença — {treinamento.nome}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 no-print">
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Instrutor</Label><Input value={instrutor} onChange={(e) => setInstrutor(e.target.value)} /></div>
        </div>
        <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-1 no-print">
          {(colabs ?? []).map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => {
                const s = new Set(selected);
                if (e.target.checked) s.add(c.id); else s.delete(c.id);
                setSelected(s);
              }} />
              {c.nome} <span className="text-muted-foreground">— {c.funcao_atual ?? ""}</span>
            </label>
          ))}
        </div>

        <div id="print-area" className="hidden print:block">
          <h1 className="text-xl font-bold mb-1">Lista de Presença</h1>
          <p className="text-sm mb-4">{treinamento.nome} {treinamento.nr?.codigo ? `(${treinamento.nr.codigo})` : ""}</p>
          <div className="grid grid-cols-3 gap-2 text-xs mb-4">
            <div><b>Data:</b> {data}</div>
            <div><b>Instrutor:</b> {instrutor}</div>
            <div><b>Carga:</b> {treinamento.carga_horaria ?? "—"}h</div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b"><th className="text-left py-1 border p-1">Nome</th><th className="text-left border p-1">CPF</th><th className="text-left border p-1">Função</th><th className="text-left border p-1">Assinatura</th></tr></thead>
            <tbody>
              {(colabs ?? []).filter((c: any) => selected.has(c.id)).map((c: any) => (
                <tr key={c.id}><td className="border p-1">{c.nome}</td><td className="border p-1">{c.cpf ?? ""}</td><td className="border p-1">{c.funcao_atual ?? ""}</td><td className="border p-1 h-8"></td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
