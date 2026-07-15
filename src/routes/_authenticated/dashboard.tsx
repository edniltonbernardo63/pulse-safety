import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, AlertTriangle, HardHat, FileBadge, Calendar } from "lucide-react";
import { fmtDate, statusVencimento, statusBadgeClass, statusLabel, diasAteVencimento } from "@/lib/sst";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TEC - SST" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [colabs, trReal, epis, eventos] = await Promise.all([
        supabase.from("colaboradores").select("id, nome, setor, status"),
        supabase.from("treinamentos_realizados").select("id, data_vencimento, data_realizacao, colaborador_id, treinamento:treinamentos(nome, nr:normas_nr(codigo))"),
        supabase.from("epis").select("id, data_vencimento, tipo"),
        supabase.from("eventos_calendario").select("id, titulo, tipo, data_inicio").gte("data_inicio", new Date().toISOString()).order("data_inicio").limit(5),
      ]);
      return {
        colabs: colabs.data ?? [],
        trReal: trReal.data ?? [],
        epis: epis.data ?? [],
        eventos: eventos.data ?? [],
      };
    },
  });

  const colabs = data?.colabs ?? [];
  const trReal = data?.trReal ?? [];
  const epis = data?.epis ?? [];
  const eventos = data?.eventos ?? [];

  const ativos = colabs.filter((c) => c.status === "ativo").length;
  const vencidos = trReal.filter((t) => statusVencimento(t.data_vencimento) === "vencido").length;
  const em15 = trReal.filter((t) => {
    const d = diasAteVencimento(t.data_vencimento);
    return d !== null && d >= 0 && d <= 15;
  }).length;
  const em30 = trReal.filter((t) => {
    const d = diasAteVencimento(t.data_vencimento);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const em60 = trReal.filter((t) => {
    const d = diasAteVencimento(t.data_vencimento);
    return d !== null && d >= 0 && d <= 60;
  }).length;
  const episVenc = epis.filter((e) => ["vencido", "a_vencer"].includes(statusVencimento(e.data_vencimento))).length;

  const now = new Date();
  const certMes = trReal.filter((t) => {
    if (!t.data_realizacao) return false;
    const d = new Date(t.data_realizacao);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const setores: Record<string, number> = {};
  colabs.forEach((c) => {
    const s = c.setor || "Sem setor";
    setores[s] = (setores[s] ?? 0) + 1;
  });
  const chartData = Object.entries(setores).map(([setor, total]) => ({ setor, total }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de gestão de SST.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Colaboradores ativos" value={ativos} />
        <StatCard icon={AlertTriangle} label="Treinamentos vencidos" value={vencidos} tone="destructive" />
        <StatCard icon={GraduationCap} label="Vencem em 15 dias" value={em15} tone="warning" />
        <StatCard icon={GraduationCap} label="Vencem em 30 dias" value={em30} />
        <StatCard icon={HardHat} label="EPIs a vencer/vencidos" value={episVenc} tone="warning" />
        <StatCard icon={FileBadge} label="Certificados no mês" value={certMes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Colaboradores por setor</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhum colaborador cadastrado ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Próximos eventos</CardTitle>
            <Link to="/calendario" className="text-xs text-primary hover:underline">ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>}
            {eventos.map((e) => (
              <div key={e.id} className="flex items-start gap-3 text-sm">
                <div className="w-1 self-stretch bg-primary rounded" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{e.titulo}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(e.data_inicio)} · {e.tipo}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Treinamentos vencendo em breve</CardTitle>
          <Link to="/vencimentos" className="text-xs text-primary hover:underline">ver matriz</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 font-medium">Treinamento</th>
                  <th className="py-2 font-medium">NR</th>
                  <th className="py-2 font-medium">Vencimento</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trReal
                  .filter((t) => ["vencido", "a_vencer"].includes(statusVencimento(t.data_vencimento)))
                  .slice(0, 10)
                  .map((t: any) => {
                    const s = statusVencimento(t.data_vencimento);
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2">{t.treinamento?.nome ?? "—"}</td>
                        <td className="py-2 text-muted-foreground">{t.treinamento?.nr?.codigo ?? "—"}</td>
                        <td className="py-2">{fmtDate(t.data_vencimento)}</td>
                        <td className="py-2">
                          <Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                {trReal.filter((t) => ["vencido", "a_vencer"].includes(statusVencimento(t.data_vencimento))).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Nada a vencer no momento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "destructive" | "warning" }) {
  const toneClass = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
          <Icon className={`h-4 w-4 ${toneClass}`} />
          <span className="truncate">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
