import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { fmtDate, statusVencimento, statusLabel } from "@/lib/sst";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — TEC - SST" }] }),
  component: RelatoriosPage,
});

type Field = { key: string; label: string };
type Dataset = { id: string; title: string; description: string; fields: Field[]; rows: () => Record<string, any>[] };

function RelatoriosPage() {
  const { data: colabs } = useQuery({
    queryKey: ["rel-colabs"],
    queryFn: async () => (await supabase.from("colaboradores").select("*").order("nome")).data ?? [],
  });
  const { data: trs } = useQuery({
    queryKey: ["rel-trs"],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("*, colaborador:colaboradores(nome, setor, funcao_atual), treinamento:treinamentos(nome, tipo, carga_horaria, nr:normas_nr(codigo, titulo))").order("data_realizacao", { ascending: false })).data ?? [],
  });
  const { data: epis } = useQuery({
    queryKey: ["rel-epis"],
    queryFn: async () => (await supabase.from("epis").select("*, colaborador:colaboradores(nome, setor)").order("data_entrega", { ascending: false })).data ?? [],
  });

  const datasets: Dataset[] = [
    {
      id: "colaboradores",
      title: "Colaboradores",
      description: "Cadastro completo com setor, função e admissão.",
      fields: [
        { key: "nome", label: "Nome" }, { key: "cpf", label: "CPF" }, { key: "rg", label: "RG" },
        { key: "setor", label: "Setor" }, { key: "funcao", label: "Função" },
        { key: "admissao", label: "Admissão" }, { key: "nascimento", label: "Nascimento" },
        { key: "status", label: "Status" }, { key: "telefone", label: "Telefone" },
        { key: "email", label: "E-mail" }, { key: "email_corp", label: "E-mail corporativo" },
        { key: "endereco", label: "Endereço" },
      ],
      rows: () => (colabs ?? []).map((c: any) => ({
        nome: c.nome, cpf: c.cpf, rg: c.rg, setor: c.setor, funcao: c.funcao_atual,
        admissao: fmtDate(c.data_admissao), nascimento: fmtDate(c.data_nascimento),
        status: c.status, telefone: c.telefone, email: c.email, email_corp: c.email_corporativo,
        endereco: c.endereco,
      })),
    },
    {
      id: "treinamentos",
      title: "Treinamentos realizados",
      description: "Histórico de treinamentos e palestras por colaborador.",
      fields: [
        { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" }, { key: "funcao", label: "Função" },
        { key: "tipo", label: "Tipo" }, { key: "treinamento", label: "Treinamento" },
        { key: "nr", label: "NR" }, { key: "carga", label: "Carga (h)" },
        { key: "realizacao", label: "Realização" }, { key: "vencimento", label: "Vencimento" },
        { key: "status", label: "Status" }, { key: "instrutor", label: "Instrutor" },
        { key: "local", label: "Local" }, { key: "certificado", label: "Nº Certificado" },
      ],
      rows: () => (trs ?? []).map((t: any) => ({
        colaborador: t.colaborador?.nome, setor: t.colaborador?.setor, funcao: t.colaborador?.funcao_atual,
        tipo: t.treinamento?.tipo === "palestra" ? "Palestra" : "Treinamento",
        treinamento: t.treinamento?.nome, nr: t.treinamento?.nr?.codigo, carga: t.treinamento?.carga_horaria,
        realizacao: fmtDate(t.data_realizacao), vencimento: fmtDate(t.data_vencimento),
        status: statusLabel(statusVencimento(t.data_vencimento)),
        instrutor: t.instrutor, local: t.local, certificado: t.certificado_numero,
      })),
    },
    {
      id: "vencimentos",
      title: "Vencimentos",
      description: "Matriz com status de vencimento.",
      fields: [
        { key: "status", label: "Status" }, { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" },
        { key: "tipo", label: "Origem" }, { key: "nr", label: "NR" }, { key: "treinamento", label: "Descrição" },
        { key: "realizacao", label: "Realização" }, { key: "vencimento", label: "Vencimento" },
      ],
      rows: () => (trs ?? []).map((t: any) => ({
        status: statusLabel(statusVencimento(t.data_vencimento)),
        colaborador: t.colaborador?.nome, setor: t.colaborador?.setor,
        tipo: t.treinamento?.tipo === "palestra" ? "Palestra" : "Treinamento",
        nr: t.treinamento?.nr?.codigo, treinamento: t.treinamento?.nome,
        realizacao: fmtDate(t.data_realizacao), vencimento: fmtDate(t.data_vencimento),
      })),
    },
    {
      id: "epis",
      title: "EPIs entregues",
      description: "Fichas de entrega e controle de CA.",
      fields: [
        { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" },
        { key: "tipo", label: "EPI" }, { key: "ca", label: "CA" },
        { key: "entrega", label: "Entrega" }, { key: "vida_util", label: "Vida útil" },
        { key: "vencimento", label: "Vencimento" }, { key: "status", label: "Status" },
      ],
      rows: () => (epis ?? []).map((e: any) => ({
        colaborador: e.colaborador?.nome, setor: e.colaborador?.setor,
        tipo: e.tipo, ca: e.ca_numero, entrega: fmtDate(e.data_entrega),
        vida_util: e.vida_util_valor ? `${e.vida_util_valor} ${e.vida_util_unidade ?? ""}`.trim() : (e.vida_util_meses ? `${e.vida_util_meses} meses` : ""),
        vencimento: fmtDate(e.data_vencimento),
        status: statusLabel(statusVencimento(e.data_vencimento)),
      })),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Escolha os campos e exporte em Excel (.xlsx) ou PDF.</p>
      </div>

      <Tabs defaultValue={datasets[0].id}>
        <TabsList className="flex flex-wrap h-auto">
          {datasets.map((d) => <TabsTrigger key={d.id} value={d.id}>{d.title}</TabsTrigger>)}
        </TabsList>
        {datasets.map((d) => (
          <TabsContent key={d.id} value={d.id}>
            <DatasetPanel dataset={d} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function DatasetPanel({ dataset }: { dataset: Dataset }) {
  const [selected, setSelected] = useState<string[]>(dataset.fields.map((f) => f.key));

  function toggle(k: string) {
    setSelected((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  }
  function selectAll() { setSelected(dataset.fields.map((f) => f.key)); }
  function selectNone() { setSelected([]); }

  const activeFields = dataset.fields.filter((f) => selected.includes(f.key));

  function buildRows() {
    const rows = dataset.rows();
    return rows.map((r) => Object.fromEntries(activeFields.map((f) => [f.label, r[f.key] ?? ""])));
  }

  function exportXlsx() {
    if (activeFields.length === 0) { toast.error("Selecione ao menos um campo"); return; }
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dataset.title.slice(0, 30));
    XLSX.writeFile(wb, `${dataset.id}.xlsx`);
  }

  function exportPdf() {
    if (activeFields.length === 0) { toast.error("Selecione ao menos um campo"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${dataset.title} — TEC - SST`, 14, 14);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString("pt-BR"), 14, 20);
    const head = [activeFields.map((f) => f.label)];
    const body = dataset.rows().map((r) => activeFields.map((f) => String(r[f.key] ?? "")));
    autoTable(doc, {
      head, body, startY: 26, styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74] },
    });
    doc.save(`${dataset.id}.pdf`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{dataset.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{dataset.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{dataset.rows().length} registros disponíveis</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Campos ({selected.length}/{dataset.fields.length})</Label>
          <Button type="button" size="sm" variant="ghost" onClick={selectAll}>Todos</Button>
          <Button type="button" size="sm" variant="ghost" onClick={selectNone}>Nenhum</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {dataset.fields.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent">
              <Checkbox checked={selected.includes(f.key)} onCheckedChange={() => toggle(f.key)} />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Compat: export inutilizado, mantido apenas para não quebrar imports antigos
export const __unused = Download;
