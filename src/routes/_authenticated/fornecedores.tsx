import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Building2, Mail, Phone, User, X } from "lucide-react";
import { toast } from "sonner";
import { maskCNPJ, maskFone } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — TEC - SST" }] }),
  component: FornecedoresPage,
});

const emptyForm = { nome: "", cnpj: "", contato: "", email: "", telefone: "", tipos_treinamento: "", observacoes: "" };

function FornecedoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [f, setF] = useState<any>(emptyForm);
  const [novoTipo, setNovoTipo] = useState("");

  const { data } = useQuery({ queryKey: ["forn"], queryFn: async () => (await supabase.from("fornecedores").select("*").order("nome")).data ?? [] });

  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = { ...f };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      if (editing) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Fornecedor criado");
      setOpen(false); setEditing(null); setF(emptyForm); setNovoTipo("");
      qc.invalidateQueries({ queryKey: ["forn"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setF(emptyForm); setOpen(true); }
  function openEdit(item: any) { setEditing(item); setF({ ...emptyForm, ...item }); setOpen(true); }

  const tipos = (f.tipos_treinamento || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  function addTipo() {
    if (!novoTipo.trim()) return;
    const set = new Set(tipos); set.add(novoTipo.trim());
    setF({ ...f, tipos_treinamento: Array.from(set).join(", ") });
    setNovoTipo("");
  }
  function removeTipo(t: string) {
    setF({ ...f, tipos_treinamento: tipos.filter((x: string) => x !== t).join(", ") });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Empresas parceiras de treinamento.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo fornecedor</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((it: any) => {
          const its = (it.tipos_treinamento || "").split(",").map((s: string) => s.trim()).filter(Boolean);
          return (
            <Card key={it.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{it.nome}</div>
                      <div className="text-xs text-muted-foreground">{it.cnpj ?? "Sem CNPJ"}</div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="text-sm space-y-1">
                  {it.contato && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{it.contato}</div>}
                  {it.telefone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{it.telefone}</div>}
                  {it.email && <div className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{it.email}</span></div>}
                </div>
                {its.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Treinamentos oferecidos:</div>
                    <div className="flex flex-wrap gap-1">
                      {its.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(!data || data.length === 0) && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</div>}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} fornecedor</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Nome / Razão social</Label><Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div><Label>CNPJ</Label><Input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: maskCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: maskFone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
            <div><Label>Pessoa de contato</Label><Input maxLength={80} value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label>Tipos de treinamento fornecidos</Label>
              <div className="flex gap-2">
                <Input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} placeholder="Ex: NR-35, NR-10, Brigada..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTipo(); } }} />
                <Button type="button" variant="outline" onClick={addTipo}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {tipos.map((t: string) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTipo(t)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
            <DialogFooter className="sm:col-span-2"><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
