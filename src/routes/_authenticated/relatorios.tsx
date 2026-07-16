import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, GraduationCap, HardHat, CalendarClock } from "lucide-react";
import { fmtDate, statusVencimento, statusLabel, toCSV, downloadCSV } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — TEC - SST" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: colabs } = useQuery({
    queryKey: ["rel-colabs"],
    queryFn: async () => (await supabase.from("colaboradores").select("*").order("nome")).data ?? [],
  });
  const { data: trs } = useQuery({
    queryKey: ["rel-trs"],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("*, colaborador:colaboradores(nome, setor, funcao_atual), treinamento:treinamentos(nome, carga_horaria, nr:normas_nr(codigo, titulo))").order("data_realizacao", { ascending: false })).data ?? [],
  });
  const { data: epis } = useQuery({
    queryKey: ["rel-epis"],
    queryFn: async () => (await supabase.from("epis").select("*, colaborador:colaboradores(nome, setor)").order("data_entrega", { ascending: false })).data ?? [],
  });

  function exportColabs() {
    const rows = (colabs ?? []).map((c: any) => ({
      nome: c.nome, cpf: c.cpf, rg: c.rg, setor: c.setor, funcao: c.funcao_atual,
      admissao: fmtDate(c.data_admissao), nascimento: fmtDate(c.data_nascimento),
      status: c.status, telefone: c.telefone, email: c.email, email_corp: c.email_corporativo, endereco: c.endereco,
    }));
    downloadCSV("colaboradores.csv", toCSV(rows, [
      { key: "nome", label: "Nome" }, { key: "cpf", label: "CPF" }, { key: "rg", label: "RG" },
      { key: "setor", label: "Setor" }, { key: "funcao", label: "Função" },
      { key: "admissao", label: "Admissão" }, { key: "nascimento", label: "Nascimento" }, { key: "status", label: "Status" },
      { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" }, { key: "email_corp", label: "E-mail corporativo" },
      { key: "endereco", label: "Endereço" },
    ]));
  }

  function exportTreinamentos() {
    const rows = (trs ?? []).map((t: any) => ({
      colaborador: t.colaborador?.nome, setor: t.colaborador?.setor, funcao: t.colaborador?.funcao_atual,
      treinamento: t.treinamento?.nome, nr: t.treinamento?.nr?.codigo, carga: t.treinamento?.carga_horaria,
      realizacao: fmtDate(t.data_realizacao), vencimento: fmtDate(t.data_vencimento),
      status: statusLabel(statusVencimento(t.data_vencimento)),
      instrutor: t.instrutor, local: t.local, certificado: t.certificado_numero,
    }));
    downloadCSV("treinamentos-realizados.csv", toCSV(rows, [
      { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" }, { key: "funcao", label: "Função" },
      { key: "treinamento", label: "Treinamento" }, { key: "nr", label: "NR" }, { key: "carga", label: "Carga (h)" },
      { key: "realizacao", label: "Realização" }, { key: "vencimento", label: "Vencimento" }, { key: "status", label: "Status" },
      { key: "instrutor", label: "Instrutor" }, { key: "local", label: "Local" }, { key: "certificado", label: "Nº Certificado" },
    ]));
  }

  function exportVencimentos() {
    const rows = (trs ?? []).map((t: any) => ({
      status: statusLabel(statusVencimento(t.data_vencimento)),
      colaborador: t.colaborador?.nome, setor: t.colaborador?.setor,
      nr: t.treinamento?.nr?.codigo, treinamento: t.treinamento?.nome,
      realizacao: fmtDate(t.data_realizacao), vencimento: fmtDate(t.data_vencimento),
    }));
    downloadCSV("vencimentos.csv", toCSV(rows, [
      { key: "status", label: "Status" }, { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" },
      { key: "nr", label: "NR" }, { key: "treinamento", label: "Treinamento" },
      { key: "realizacao", label: "Realização" }, { key: "vencimento", label: "Vencimento" },
    ]));
  }

  function exportEpis() {
    const rows = (epis ?? []).map((e: any) => ({
      colaborador: e.colaborador?.nome, setor: e.colaborador?.setor,
      tipo: e.tipo, ca: e.ca_numero, entrega: fmtDate(e.data_entrega),
      vida_util: e.vida_util_meses, vencimento: fmtDate(e.data_vencimento),
      status: statusLabel(statusVencimento(e.data_vencimento)),
    }));
    downloadCSV("epis-entregues.csv", toCSV(rows, [
      { key: "colaborador", label: "Colaborador" }, { key: "setor", label: "Setor" },
      { key: "tipo", label: "EPI" }, { key: "ca", label: "CA" }, { key: "entrega", label: "Entrega" },
      { key: "vida_util", label: "Vida útil (meses)" }, { key: "vencimento", label: "Vencimento" }, { key: "status", label: "Status" },
    ]));
  }

  const cards = [
    { icon: Users, title: "Colaboradores", desc: "Cadastro completo com setor, função e admissão.", count: colabs?.length ?? 0, action: exportColabs },
    { icon: GraduationCap, title: "Treinamentos realizados", desc: "Histórico de treinamentos por colaborador.", count: trs?.length ?? 0, action: exportTreinamentos },
    { icon: CalendarClock, title: "Vencimentos", desc: "Matriz com status de vencimento.", count: trs?.length ?? 0, action: exportVencimentos },
    { icon: HardHat, title: "EPIs entregues", desc: "Fichas de entrega e controle de CA.", count: epis?.length ?? 0, action: exportEpis },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exporte planilhas (.csv) que abrem no Excel e Google Sheets.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary"><c.icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{c.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{c.count}</span>
            </CardHeader>
            <CardContent>
              <Button onClick={c.action} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
