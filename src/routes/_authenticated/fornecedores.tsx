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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — TEC - SST" }] }),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ nome: "", cnpj: "", contato: "", email: "", telefone: "", tipos_treinamento: "", observacoes: "" });
  const { data } = useQuery({ queryKey: ["forn"], queryFn: async () => (await supabase.from("fornecedores").select("*").order("nome")).data ?? [] });
  const mut = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("fornecedores").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Fornecedor criado"); setOpen(false); qc.invalidateQueries({ queryKey: ["forn"] }); setF({ nome: "", cnpj: "", contato: "", email: "", telefone: "", tipos_treinamento: "", observacoes: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Empresas parceiras de treinamento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo fornecedor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} /></div>
              <div><Label>Contato</Label><Input value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
              <div className="col-span-2"><Label>Tipos de treinamento</Label><Input value={f.tipos_treinamento} onChange={(e) => setF({ ...f, tipos_treinamento: e.target.value })} /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
              <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Nome</th><th>CNPJ</th><th>Contato</th><th>Telefone</th><th>Tipos</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((f: any) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{f.nome}</td>
                  <td>{f.cnpj ?? "—"}</td>
                  <td>{f.contato ?? "—"}</td>
                  <td>{f.telefone ?? "—"}</td>
                  <td className="text-muted-foreground">{f.tipos_treinamento ?? "—"}</td>
                </tr>
              ))}
              {(!data || data.length === 0) && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum fornecedor.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
