import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel, SETORES } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/vencimentos")({
  head: () => ({ meta: [{ title: "Vencimentos — TEC - SST" }] }),
  component: VencimentosPage,
});

type Row = {
  key: string;
  origem: "treinamento" | "palestra";
  colaborador_id: string;
  colaborador_nome: string;
  setor: string | null;
  funcao: string | null;
  descricao: string;
  nr: string | null;
  data_realizacao: string | null;
  data_vencimento: string | null;
};

function VencimentosPage() {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [nrF, setNrF] = useState("todas");
  const [setorF, setSetorF] = useState("todos");
  const [origemF, setOrigemF] = useState("todos");

  const { data: trReal } = useQuery({
    queryKey: ["venc-tr"],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("id, data_realizacao, data_vencimento, colaborador:colaboradores(id, nome, setor, funcao_atual), treinamento:treinamentos(nome, tipo, nr:normas_nr(codigo))")).data ?? [],
  });
  const { data: nrs } = useQuery({
    queryKey: ["nrs-list"],
    queryFn: async () => (await supabase.from("normas_nr").select("codigo").order("codigo")).data ?? [],
  });

  const rows: Row[] = useMemo(() => (trReal ?? []).map((t: any) => ({
    key: "t-" + t.id,
    origem: (t.treinamento?.tipo === "palestra" ? "palestra" : "treinamento") as "treinamento" | "palestra",
    colaborador_id: t.colaborador?.id,
    colaborador_nome: t.colaborador?.nome ?? "—",
    setor: t.colaborador?.setor ?? null,
    funcao: t.colaborador?.funcao_atual ?? null,
    descricao: t.treinamento?.nome ?? "—",
    nr: t.treinamento?.nr?.codigo ?? null,
    data_realizacao: t.data_realizacao,
    data_vencimento: t.data_vencimento,
  })), [trReal]);

  const filtered = useMemo(() => rows.filter((r) => {
    const s = statusVencimento(r.data_vencimento);
    if (statusF !== "todos" && s !== statusF) return false;
    if (origemF !== "todos" && r.origem !== origemF) return false;
    if (nrF !== "todas" && r.nr !== nrF) return false;
    if (setorF !== "todos" && r.setor !== setorF) return false;
    if (q && !`${r.colaborador_nome} ${r.setor ?? ""} ${r.descricao} ${r.nr ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((x, y) => (x.data_vencimento ?? "9").localeCompare(y.data_vencimento ?? "9")), [rows, q, statusF, nrF, setorF, origemF]);

  const nrOpts = (() => {
    const seen = new Set<string>();
    for (const n of (nrs ?? [])) seen.add(n.codigo);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vencimentos</h1>
        <p className="text-sm text-muted-foreground">Treinamentos concluídos e NRs vinculadas com status calculado automaticamente.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap gap-3 items-center">
          <Input placeholder="Buscar por colaborador, NR ou treinamento..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="a_vencer">Atenção</SelectItem>
              <SelectItem value="valido">Em dia</SelectItem>
              <SelectItem value="sem_data">Sem data</SelectItem>
            </SelectContent>
          </Select>
          <Select value={setorF} onValueChange={setSetorF}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os setores</SelectItem>
              {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={nrF} onValueChange={setNrF}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas NRs</SelectItem>
              {nrOpts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} registros</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Colaborador</th><th>Setor</th><th>Origem</th><th>Descrição</th><th>NR</th><th>Realização</th><th>Vencimento</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = statusVencimento(r.data_vencimento);
                return (
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.colaborador_nome}</td>
                    <td className="text-muted-foreground">{r.setor ?? "—"}</td>
                    <td><Badge variant="outline" className="text-[10px] capitalize">{r.origem === "nr" ? "NR" : "Treinamento"}</Badge></td>
                    <td className="max-w-xs truncate">{r.descricao}</td>
                    <td>{r.nr ?? "—"}</td>
                    <td>{fmtDate(r.data_realizacao)}</td>
                    <td>{fmtDate(r.data_vencimento)}</td>
                    <td><Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Sem registros para o filtro.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
