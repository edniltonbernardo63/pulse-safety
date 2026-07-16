import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, tempoEmpresa, SETORES, STATUS_COLAB, maskCPF, maskFone } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — TEC - SST" }] }),
  component: ColaboradoresPage,
});

const emptyForm = {
  nome: "", cpf: "", rg: "", funcao_atual: "", setor: "", data_admissao: "", data_nascimento: "",
  status: "ativo", telefone: "", email: "", email_corporativo: "", endereco: "",
};

function ColaboradoresPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: list } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => (await supabase.from("colaboradores").select("*").order("nome")).data ?? [],
  });

  const mut = useMutation({
    mutationFn: async (payload: any) => {
      const clean: any = { ...payload };
      Object.keys(clean).forEach((k) => { if (clean[k] === "") clean[k] = null; });
      const { error } = await supabase.from("colaboradores").insert(clean);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador cadastrado");
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (list ?? []).filter((c: any) =>
    !q || c.nome?.toLowerCase().includes(q.toLowerCase()) || c.cpf?.includes(q) || c.setor?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">Cadastro completo com histórico, EPIs e treinamentos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo colaborador</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
            <ColaboradorForm form={form} setForm={setForm} onSubmit={() => mut.mutate(form)} loading={mut.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou setor..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground sm:ml-auto">{filtered.length} registros</span>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c: any) => (
              <Link key={c.id} to="/colaboradores/$id" params={{ id: c.id }} className="block">
                <div className="border rounded-lg p-4 hover:border-primary/60 hover:bg-muted/40 transition h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.funcao_atual || "Sem função"}</div>
                    </div>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"} className="shrink-0 capitalize">{c.status}</Badge>
                  </div>
                  <dl className="space-y-1 text-xs">
                    <Row k="Setor" v={c.setor} />
                    <Row k="CPF" v={c.cpf} />
                    <Row k="Admissão" v={fmtDate(c.data_admissao)} />
                    <Row k="Tempo" v={tempoEmpresa(c.data_admissao)} />
                    {c.email_corporativo && <Row k="E-mail corp." v={c.email_corporativo} />}
                  </dl>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">Nenhum colaborador encontrado.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground shrink-0">{k}</dt>
      <dd className="font-medium truncate text-right">{v || "—"}</dd>
    </div>
  );
}

export function ColaboradorForm({ form, setForm, onSubmit, loading }: any) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <Field label="Nome completo" required className="sm:col-span-2" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
      <Field label="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: maskCPF(v) })} />
      <Field label="RG" value={form.rg} onChange={(v) => setForm({ ...form, rg: v })} />
      <Field label="Data de nascimento" type="date" value={form.data_nascimento} onChange={(v) => setForm({ ...form, data_nascimento: v })} />
      <Field label="Data de admissão" type="date" value={form.data_admissao} onChange={(v) => setForm({ ...form, data_admissao: v })} />
      <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: maskFone(v) })} />
      <Field label="E-mail pessoal" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <Field label="E-mail corporativo" type="email" className="sm:col-span-2" value={form.email_corporativo} onChange={(v) => setForm({ ...form, email_corporativo: v })} />
      <Field label="Função" value={form.funcao_atual} onChange={(v) => setForm({ ...form, funcao_atual: v })} />
      <div className="space-y-1.5">
        <Label>Setor</Label>
        <Select value={form.setor || ""} onValueChange={(v) => setForm({ ...form, setor: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status || "ativo"} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_COLAB.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Endereço completo</Label>
        <Textarea rows={2} value={form.endereco || ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
      </div>
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={loading}>Salvar</Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, className }: any) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
