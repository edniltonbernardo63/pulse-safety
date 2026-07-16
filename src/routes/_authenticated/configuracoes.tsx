import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { maskCNPJ, maskFone } from "@/lib/sst";
import logoDefault from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — TEC - SST" }] }),
  component: ConfigPage,
});

const empty = {
  id: "",
  nome_empresa: "TEC - SST",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  logo_url: "",
  arte_sipat_url: "",
  tecnico_responsavel_nome: "",
  tecnico_responsavel_registro: "",
};

function ConfigPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["config-empresa-full"],
    queryFn: async () => (await supabase.from("configuracoes_empresa" as any).select("*").maybeSingle()).data,
  });
  const [f, setF] = useState<any>(empty);

  useEffect(() => { if (data) setF({ ...empty, ...(data as any) }); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...f };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      delete payload.id; delete payload.updated_at;
      if (f.id) {
        const { error } = await supabase.from("configuracoes_empresa" as any).update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("configuracoes_empresa" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["config-empresa-full"] }); qc.invalidateQueries({ queryKey: ["config-empresa"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da empresa</h1>
        <p className="text-sm text-muted-foreground">Dados usados nos certificados, listas de presença e cabeçalhos de impressão.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome da empresa</Label><Input required value={f.nome_empresa} onChange={(e) => setF({ ...f, nome_empresa: e.target.value })} /></div>
            <div><Label>CNPJ</Label><Input value={f.cnpj || ""} onChange={(e) => setF({ ...f, cnpj: maskCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Telefone</Label><Input value={f.telefone || ""} onChange={(e) => setF({ ...f, telefone: maskFone(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Label>E-mail</Label><Input type="email" value={f.email || ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Endereço</Label><Textarea rows={2} value={f.endereco || ""} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Imagens</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>URL do logotipo</Label>
              <Input value={f.logo_url || ""} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://..." />
              <div className="border rounded p-3 flex items-center justify-center bg-muted/30 h-32">
                <img src={f.logo_url || logoDefault} alt="Prévia do logo" className="max-h-24 object-contain" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL da arte da SIPAT / campanha</Label>
              <Input value={f.arte_sipat_url || ""} onChange={(e) => setF({ ...f, arte_sipat_url: e.target.value })} placeholder="https://..." />
              <div className="border rounded p-3 flex items-center justify-center bg-muted/30 h-32">
                {f.arte_sipat_url ? <img src={f.arte_sipat_url} alt="Arte SIPAT" className="max-h-24 object-contain" /> : <span className="text-xs text-muted-foreground">Sem arte cadastrada</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Técnico Responsável</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div><Label>Nome</Label><Input value={f.tecnico_responsavel_nome || ""} onChange={(e) => setF({ ...f, tecnico_responsavel_nome: e.target.value })} /></div>
            <div><Label>Registro profissional</Label><Input value={f.tecnico_responsavel_registro || ""} onChange={(e) => setF({ ...f, tecnico_responsavel_registro: e.target.value })} placeholder="Ex: TST 12345/SP" /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending} size="lg">Salvar configurações</Button>
        </div>
      </form>
    </div>
  );
}
