import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { fmtDate, labelTipoTreinamento } from "@/lib/sst";
import logoDefault from "@/assets/logo.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/certificados/$id")({
  component: Certificado,
});

function Certificado() {
  const { id } = Route.useParams();
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["cert", id],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select(`
      *,
      colaborador:colaboradores(nome, cpf, funcao_atual, setor, empresa, qrcode_token),
      treinamento:treinamentos(nome, tipo, carga_horaria, conteudo_programatico,
        nr:normas_nr(codigo, titulo),
        fornecedor:fornecedores(nome, razao_social, nome_fantasia, cnpj, endereco, telefone, email, logo_url)
      )
    `).eq("id", id).maybeSingle()).data,
  });
  const { data: cfg } = useQuery({
    queryKey: ["config-empresa"],
    queryFn: async () => (await supabase.from("configuracoes_empresa" as any).select("*").maybeSingle()).data,
  });

  if (!data) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  const c: any = data;
  const empresa: any = cfg ?? {};
  const fornecedor: any = c.treinamento?.fornecedor ?? {};
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/qr/${c.colaborador?.qrcode_token}` : "";
  const ministrante = fornecedor.nome || fornecedor.razao_social || empresa.nome_empresa || "TEC - SST";

  async function downloadPdf() {
    if (!ref.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(img, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      const nome = String(c.colaborador?.nome ?? "certificado").replace(/\s+/g, "-").toLowerCase();
      pdf.save(`certificado-${nome}.pdf`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar PDF");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center no-print gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/certificados"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
          <Button onClick={downloadPdf} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Baixar PDF
          </Button>
        </div>
      </div>

      <div ref={ref} className="mx-auto max-w-4xl bg-white text-neutral-900 border-8 border-double border-primary p-10 print:border-primary print:shadow-none shadow-lg">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            {fornecedor.logo_url && <img src={fornecedor.logo_url} alt="" className="h-14 max-w-28 object-contain" crossOrigin="anonymous" />}
          </div>
          <div className="text-center flex-1">
            <div className="text-xs uppercase tracking-widest text-neutral-500">Empresa formadora</div>
            <div className="text-sm font-bold">{ministrante}</div>
            {fornecedor.cnpj && <div className="text-[10px] text-neutral-500">CNPJ: {fornecedor.cnpj}</div>}
            {fornecedor.endereco && <div className="text-[10px] text-neutral-500">{fornecedor.endereco}</div>}
          </div>
          <div className="flex items-center gap-3">
            <img src={empresa.logo_url || logoDefault} alt="" className="h-14 max-w-28 object-contain" crossOrigin="anonymous" />
          </div>
        </div>

        <h1 className="text-center text-4xl font-black tracking-wide">CERTIFICADO</h1>
        <p className="text-center text-sm text-neutral-500 mt-1">de participação e conclusão</p>

        <div className="mt-8 text-center text-base leading-relaxed">
          Certificamos que
          <div className="my-3 text-3xl font-bold text-primary">{c.colaborador?.nome}</div>
          <div className="text-sm text-neutral-600">
            {c.colaborador?.cpf && <>CPF: {c.colaborador.cpf}</>}
            {c.colaborador?.funcao_atual && <> · {c.colaborador.funcao_atual}</>}
            {c.colaborador?.setor && <> · Setor {c.colaborador.setor}</>}
            {c.colaborador?.empresa && <> · {c.colaborador.empresa}</>}
          </div>
          <p className="mt-4 max-w-3xl mx-auto">
            concluiu com aproveitamento o {labelTipoTreinamento(c.treinamento?.tipo).toLowerCase()} <b>{c.treinamento?.nome}</b>
            {c.treinamento?.nr?.codigo && <> referente à <b>{c.treinamento.nr.codigo} — {c.treinamento.nr.titulo}</b></>},
            com carga horária de <b>{c.treinamento?.carga_horaria ?? "—"} horas</b>,
            realizado em <b>{fmtDate(c.data_realizacao)}</b>{c.local ? <> no local <b>{c.local}</b></> : null}.
          </p>
          {c.data_vencimento && <p className="text-xs text-neutral-500 mt-2">Válido até <b>{fmtDate(c.data_vencimento)}</b>.</p>}
        </div>

        {c.treinamento?.conteudo_programatico && (
          <div className="mt-6 text-xs">
            <div className="font-semibold mb-1">Conteúdo programático:</div>
            <p className="text-neutral-600 whitespace-pre-line">{c.treinamento.conteudo_programatico}</p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-4 gap-4 items-end">
          <div className="text-center">
            <div className="border-t border-neutral-800 pt-2 text-xs">{c.instrutor || c.treinamento?.instrutor || "Instrutor"}</div>
            <div className="text-[10px] text-neutral-500">Instrutor</div>
          </div>
          <div className="text-center">
            <div className="border-t border-neutral-800 pt-2 text-xs">{empresa.tecnico_responsavel_nome || "Técnico de Segurança"}</div>
            <div className="text-[10px] text-neutral-500">
              Téc. Segurança do Trabalho{empresa.tecnico_responsavel_registro ? ` — ${empresa.tecnico_responsavel_registro}` : ""}
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-neutral-800 pt-2 text-xs">{c.colaborador?.nome}</div>
            <div className="text-[10px] text-neutral-500">Colaborador</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded border">
              <QRCodeSVG value={verifyUrl} size={70} />
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">Autenticação</div>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-neutral-500">
          Certificado nº {c.id.slice(0, 8).toUpperCase()} · Emitido em {fmtDate(new Date().toISOString().slice(0, 10))}
          {empresa.cnpj && <> · Empresa contratante: {empresa.nome_empresa} — CNPJ {empresa.cnpj}</>}
        </div>
      </div>
    </div>
  );
}
