import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, tempoEmpresa, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";
import { FileBadge } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/qr/$token")({
  head: () => ({ meta: [{ title: "Consulta do colaborador — TEC - SST" }, { name: "robots", content: "noindex" }] }),
  component: QrView,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">QR Code inválido.</div>
  ),
});

function QrView() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["qr", token],
    queryFn: async () => {
      const { data: c } = await supabase.from("colaboradores").select("*").eq("qrcode_token", token).maybeSingle();
      if (!c) throw notFound();
      const [{ data: tr }, { data: cnr }] = await Promise.all([
        supabase.from("treinamentos_realizados").select("*, treinamento:treinamentos(nome, nr:normas_nr(codigo))").eq("colaborador_id", c.id).order("data_realizacao", { ascending: false }),
        supabase.from("colaborador_nrs" as any).select("*, nr:normas_nr(codigo, titulo)").eq("colaborador_id", c.id),
      ]);
      return { c, tr: tr ?? [], cnr: (cnr as any[]) ?? [] };
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!data) return null;


  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <img src={logo} alt="TEC - SST" className="h-8 w-8" width={32} height={32} />
          <span className="font-bold">TEC - SST</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{data.c.nome}</CardTitle>
            <p className="text-sm text-muted-foreground">Consulta pública somente-leitura</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Função" v={data.c.funcao_atual} />
            <Info label="Setor" v={data.c.setor} />
            <Info label="Admissão" v={fmtDate(data.c.data_admissao)} />
            <Info label="Tempo de empresa" v={tempoEmpresa(data.c.data_admissao)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">NRs vinculadas</CardTitle></CardHeader>
          <CardContent>
            {data.cnr.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma NR vinculada.</p>}
            <div className="space-y-2">
              {data.cnr.map((n: any) => {
                const s = statusVencimento(n.data_vencimento);
                return (
                  <div key={n.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{n.nr?.codigo} — {n.nr?.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        Realizado {fmtDate(n.data_realizacao)} · Vence {fmtDate(n.data_vencimento)}
                      </div>
                    </div>
                    <Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Treinamentos</CardTitle></CardHeader>
          <CardContent>
            {data.tr.length === 0 && <p className="text-sm text-muted-foreground">Nenhum treinamento registrado.</p>}
            <div className="space-y-2">
              {data.tr.map((t: any) => {
                const s = statusVencimento(t.data_vencimento);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.treinamento?.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.treinamento?.nr?.codigo && <>{t.treinamento.nr.codigo} · </>}
                        Realizado {fmtDate(t.data_realizacao)} · Vence {fmtDate(t.data_vencimento)}
                      </div>
                    </div>
                    <Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function Info({ label, v }: { label: string; v?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{v || "—"}</div>
    </div>
  );
}
