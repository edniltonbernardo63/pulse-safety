import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtDate } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados — TEC - SST" }] }),
  component: CertificadosList,
});

function CertificadosList() {
  const { data } = useQuery({
    queryKey: ["certs-list"],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("id, data_realizacao, colaborador:colaboradores(nome), treinamento:treinamentos(nome, nr:normas_nr(codigo))").order("data_realizacao", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Certificados</h1>
        <p className="text-sm text-muted-foreground">Emita ou reemita certificados a partir dos treinamentos concluídos.</p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">Colaborador</th><th>Treinamento</th><th>NR</th><th>Realização</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((t: any) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{t.colaborador?.nome}</td>
                  <td>{t.treinamento?.nome}</td>
                  <td>{t.treinamento?.nr?.codigo ?? "—"}</td>
                  <td>{fmtDate(t.data_realizacao)}</td>
                  <td className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/certificados/$id" params={{ id: t.id }}><Printer className="h-4 w-4 mr-1" /> Emitir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum treinamento concluído.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
