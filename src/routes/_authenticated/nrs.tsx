import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nrs")({
  head: () => ({ meta: [{ title: "Normas Regulamentadoras — TEC - SST" }] }),
  component: NRsPage,
});

function NRsPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["nrs-full"],
    queryFn: async () => (await supabase.from("normas_nr").select("*").order("codigo")).data ?? [],
  });
  const list = (data ?? []).filter((n: any) =>
    !q || `${n.codigo} ${n.titulo}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Normas Regulamentadoras</h1>
        <p className="text-sm text-muted-foreground">Consulta rápida com link oficial de cada NR.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por código ou título..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((n: any) => (
          <Card key={n.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                {n.link_oficial ? (
                  <a href={n.link_oficial} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    <Badge className="bg-primary text-primary-foreground">{n.codigo}</Badge>
                    <ExternalLink className="h-3 w-3 text-primary" />
                  </a>
                ) : (
                  <Badge className="bg-primary text-primary-foreground">{n.codigo}</Badge>
                )}
                {n.periodicidade_meses && <span className="text-xs text-muted-foreground">Renov. {n.periodicidade_meses}m</span>}
              </div>
              {n.link_oficial ? (
                <a href={n.link_oficial} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <CardTitle className="text-base mt-2 leading-tight">{n.titulo}</CardTitle>
                </a>
              ) : (
                <CardTitle className="text-base mt-2 leading-tight">{n.titulo}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2 flex-1 flex flex-col">
              <p className="flex-1">{n.resumo ?? ""}</p>
              {n.carga_horaria_minima && <p className="text-xs"><b className="text-foreground">Carga mínima:</b> {n.carga_horaria_minima}h</p>}
              {n.link_oficial && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a href={n.link_oficial} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Consultar norma oficial
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {list.length === 0 && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhuma NR encontrada.</div>}
      </div>
    </div>
  );
}
