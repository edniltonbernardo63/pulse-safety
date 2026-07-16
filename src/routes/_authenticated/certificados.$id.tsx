import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { fmtDate } from "@/lib/sst";
import logoDefault from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/certificados/$id")({
  component: Certificado,
});

function Certificado() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["cert", id],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("*, colaborador:colaboradores(nome, cpf, funcao_atual, qrcode_token), treinamento:treinamentos(nome, carga_horaria, conteudo_programatico, nr:normas_nr(codigo, titulo))").eq("id", id).maybeSingle()).data,
  });
  const { data: cfg } = useQuery({
    queryKey: ["config-empresa"],
    queryFn: async () => (await supabase.from("configuracoes_empresa" as any).select("*").maybeSingle()).data,
  });

  if (!data) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  const c: any = data;
  const empresa: any = cfg ?? {};
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/qr/${c.colaborador?.qrcode_token}` : "";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center no-print">
        <Button asChild variant="ghost" size="sm"><Link to="/certificados"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir / PDF</Button>
      </div>

      <div className="mx-auto max-w-4xl bg-card border-8 border-double border-primary p-10 print:border-primary print:shadow-none shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <img src={empresa.logo_url || logoDefault} alt="" className="h-16 max-w-32 object-contain" />
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{empresa.nome_empresa || "TEC - SST"}</div>
            <div className="text-sm font-semibold">Gestão de Segurança do Trabalho</div>
            {empresa.cnpj && <div className="text-[10px] text-muted-foreground">CNPJ: {empresa.cnpj}</div>}
          </div>
        </div>

        <h1 className="text-center text-4xl font-black tracking-wide">CERTIFICADO</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">de participação e conclusão</p>

        <div className="mt-10 text-center text-base leading-relaxed">
          Certificamos que
          <div className="my-3 text-3xl font-bold text-primary">{c.colaborador?.nome}</div>
          {c.colaborador?.cpf && <div className="text-sm text-muted-foreground">CPF: {c.colaborador.cpf}{c.colaborador?.funcao_atual ? ` · ${c.colaborador.funcao_atual}` : ""}</div>}
          <p className="mt-4 max-w-2xl mx-auto">
            concluiu com aproveitamento o treinamento <b>{c.treinamento?.nome}</b>
            {c.treinamento?.nr?.codigo && <> referente à <b>{c.treinamento.nr.codigo} — {c.treinamento.nr.titulo}</b></>},
            com carga horária de <b>{c.treinamento?.carga_horaria ?? "—"} horas</b>,
            realizado em <b>{fmtDate(c.data_realizacao)}</b>{c.local ? <> no local <b>{c.local}</b></> : null}.
          </p>
          {c.data_vencimento && <p className="text-xs text-muted-foreground mt-2">Válido até {fmtDate(c.data_vencimento)}.</p>}
        </div>

        {c.treinamento?.conteudo_programatico && (
          <div className="mt-8 text-xs">
            <div className="font-semibold mb-1">Conteúdo programático:</div>
            <p className="text-muted-foreground whitespace-pre-line">{c.treinamento.conteudo_programatico}</p>
          </div>
        )}

        <div className="mt-12 grid grid-cols-3 gap-6 items-end">
          <div className="text-center">
            <div className="border-t border-foreground pt-2 text-xs">{c.instrutor || "Instrutor"}</div>
            <div className="text-[10px] text-muted-foreground">Instrutor</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded">
              <QRCodeSVG value={verifyUrl} size={90} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Autenticação</div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground pt-2 text-xs">{empresa.tecnico_responsavel_nome || "Técnico Responsável"}</div>
            <div className="text-[10px] text-muted-foreground">
              Técnico de Segurança{empresa.tecnico_responsavel_registro ? ` — ${empresa.tecnico_responsavel_registro}` : ""}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-muted-foreground">
          Certificado nº {c.id.slice(0, 8).toUpperCase()} · Emitido em {fmtDate(new Date().toISOString().slice(0, 10))}
        </div>
      </div>
    </div>
  );
}
