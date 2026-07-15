import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/nrs")({
  head: () => ({ meta: [{ title: "Normas Regulamentadoras — TEC - SST" }] }),
  component: NRsPage,
});

function NRsPage() {
  const { data } = useQuery({
    queryKey: ["nrs-full"],
    queryFn: async () => (await supabase.from("normas_nr").select("*").order("codigo")).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Normas Regulamentadoras</h1>
        <p className="text-sm text-muted-foreground">Consulta rápida das NRs aplicáveis à empresa.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((n: any) => (
          <Card key={n.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary text-primary-foreground">{n.codigo}</Badge>
                {n.carga_horaria_minima && <span className="text-xs text-muted-foreground">{n.carga_horaria_minima}h mínimas</span>}
              </div>
              <CardTitle className="text-base mt-2">{n.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>{n.resumo ?? "—"}</p>
              <p className="text-xs">
                <b className="text-foreground">Periodicidade:</b> {n.periodicidade_meses ? `${n.periodicidade_meses} meses` : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
