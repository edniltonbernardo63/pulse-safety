import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, QrCode } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, tempoEmpresa } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — TEC - SST" }] }),
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ nome: "", cpf: "", funcao_atual: "", setor: "", data_admissao: "", status: "ativo", telefone: "", email: "" });

  const { data: list } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => (await supabase.from("colaboradores").select("*").order("nome")).data ?? [],
  });

  const mut = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("colaboradores").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador cadastrado");
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
      setOpen(false);
      setForm({ nome: "", cpf: "", funcao_atual: "", setor: "", data_admissao: "", status: "ativo", telefone: "", email: "" });
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
          <p className="text-sm text-muted-foreground">Cadastro completo com histórico de funções e QR Code.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo colaborador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = { ...form };
                if (!payload.data_admissao) delete payload.data_admissao;
                mut.mutate(payload);
              }}
              className="grid grid-cols-2 gap-3"
            >
              <Field label="Nome" required className="col-span-2" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
              <Field label="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
              <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
              <Field label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Função" value={form.funcao_atual} onChange={(v) => setForm({ ...form, funcao_atual: v })} />
              <Field label="Setor" value={form.setor} onChange={(v) => setForm({ ...form, setor: v })} />
              <Field label="Data de admissão" type="date" value={form.data_admissao} onChange={(v) => setForm({ ...form, data_admissao: v })} />
              <DialogFooter className="col-span-2">
                <Button type="submit" disabled={mut.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou setor..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} registros</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 font-medium">Nome</th>
                <th className="py-2 font-medium">Função</th>
                <th className="py-2 font-medium">Setor</th>
                <th className="py-2 font-medium">Admissão</th>
                <th className="py-2 font-medium">Tempo</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2 font-medium">{c.nome}</td>
                  <td className="py-2">{c.funcao_atual || "—"}</td>
                  <td className="py-2">{c.setor || "—"}</td>
                  <td className="py-2">{fmtDate(c.data_admissao)}</td>
                  <td className="py-2">{tempoEmpresa(c.data_admissao)}</td>
                  <td className="py-2"><Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge></td>
                  <td className="py-2 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/colaboradores/$id" params={{ id: c.id }}>
                        <QrCode className="h-4 w-4 mr-1" /> Detalhes
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
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
