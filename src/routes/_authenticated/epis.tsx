import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/epis")({
  head: () => ({ meta: [{ title: "EPIs — TEC - SST" }] }),
  component: EpisPage,
});

function EpisPage() {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const { data } = useQuery({
    queryKey: ["epis-all"],
    queryFn: async () => (await supabase.from("epis").select("*, colaborador:colaboradores(nome, setor)").order("data_vencimento")).data ?? [],
  });
  const rows = (data ?? []).map((e: any) => ({ ...e, _s: statusVencimento(e.data_vencimento) })).filter((e: any) => {
    if (statusF !== "todos" && e._s !== statusF) return false;
    if (q && !`${e.colaborador?.nome} ${e.tipo}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">EPIs</h1>
        <p className="text-sm text-muted-foreground">Entregas, CA e controle de troca.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-wrap gap-3">
          <Input className="max-w-sm" placeholder="Buscar por colaborador ou EPI..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="a_vencer">A vencer</SelectItem>
              <SelectItem value="valido">Válido</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{rows.length} registros</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Colaborador</th><th>Setor</th><th>EPI</th><th>CA</th><th>Entrega</th><th>Vencimento</th><th>Status</th></tr>
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
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum EPI.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
