import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/vencimentos")({
  head: () => ({ meta: [{ title: "Vencimentos — TEC - SST" }] }),
  component: VencimentosPage,
});

function VencimentosPage() {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [nrF, setNrF] = useState("todas");

  const { data } = useQuery({
    queryKey: ["venc"],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("*, colaborador:colaboradores(nome, setor, funcao_atual), treinamento:treinamentos(nome, nr:normas_nr(codigo))").order("data_vencimento")).data ?? [],
  });
  const { data: nrs } = useQuery({
    queryKey: ["nrs-list"],
    queryFn: async () => (await supabase.from("normas_nr").select("codigo").order("codigo")).data ?? [],
  });

  const rows = useMemo(() => {
    return (data ?? []).map((t: any) => ({ ...t, _status: statusVencimento(t.data_vencimento) })).filter((t: any) => {
      if (statusF !== "todos" && t._status !== statusF) return false;
      if (nrF !== "todas" && t.treinamento?.nr?.codigo !== nrF) return false;
      if (q && !`${t.colaborador?.nome} ${t.colaborador?.setor} ${t.treinamento?.nome}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, statusF, nrF, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vencimentos de treinamentos</h1>
        <p className="text-sm text-muted-foreground">Matriz colaborador × NR com alerta automático.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap gap-3 items-center">
          <Input placeholder="Buscar por colaborador ou treinamento..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="a_vencer">A vencer</SelectItem>
              <SelectItem value="valido">Válido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={nrF} onValueChange={setNrF}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas NRs</SelectItem>
              {(nrs ?? []).map((n: any) => <SelectItem key={n.codigo} value={n.codigo}>{n.codigo}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{rows.length} registros</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Colaborador</th><th>Setor</th><th>Treinamento</th><th>NR</th><th>Realização</th><th>Vencimento</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.colaborador?.nome}</td>
                  <td>{r.colaborador?.setor ?? "—"}</td>
                  <td>{r.treinamento?.nome}</td>
                  <td>{r.treinamento?.nr?.codigo ?? "—"}</td>
                  <td>{fmtDate(r.data_realizacao)}</td>
                  <td>{fmtDate(r.data_vencimento)}</td>
                  <td><Badge className={statusBadgeClass(r._status)}>{statusLabel(r._status)}</Badge></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Sem registros para o filtro.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
