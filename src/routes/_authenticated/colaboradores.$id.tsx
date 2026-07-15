import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Plus, Printer, FileBadge } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, tempoEmpresa, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";

export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  component: ColaboradorDetalhe,
});

function ColaboradorDetalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: c } = useQuery({
    queryKey: ["colab", id],
    queryFn: async () => (await supabase.from("colaboradores").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: historico } = useQuery({
    queryKey: ["hist", id],
    queryFn: async () => (await supabase.from("historico_funcoes").select("*").eq("colaborador_id", id).order("data_inicio", { ascending: false })).data ?? [],
  });

  const { data: treinamentos } = useQuery({
    queryKey: ["tr", id],
    queryFn: async () => (await supabase.from("treinamentos_realizados").select("*, treinamento:treinamentos(nome, carga_horaria, nr:normas_nr(codigo, titulo))").eq("colaborador_id", id).order("data_realizacao", { ascending: false })).data ?? [],
  });

  const { data: epis } = useQuery({
    queryKey: ["epis", id],
    queryFn: async () => (await supabase.from("epis").select("*").eq("colaborador_id", id).order("data_entrega", { ascending: false })).data ?? [],
  });

  const { data: catTr } = useQuery({
    queryKey: ["cat-tr"],
    queryFn: async () => (await supabase.from("treinamentos").select("*, nr:normas_nr(codigo, periodicidade_meses)").order("nome")).data ?? [],
  });

  const [openTr, setOpenTr] = useState(false);
  const [openEpi, setOpenEpi] = useState(false);
  const [openHist, setOpenHist] = useState(false);
  const [openQr, setOpenQr] = useState(false);

  const qrUrl = c ? `${typeof window !== "undefined" ? window.location.origin : ""}/qr/${c.qrcode_token}` : "";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/colaboradores"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{c?.nome ?? "..."}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="CPF" v={c?.cpf} />
            <Info label="Função" v={c?.funcao_atual} />
            <Info label="Setor" v={c?.setor} />
            <Info label="Status" v={c?.status} />
            <Info label="Admissão" v={fmtDate(c?.data_admissao)} />
            <Info label="Tempo de empresa" v={tempoEmpresa(c?.data_admissao)} />
            <Info label="Telefone" v={c?.telefone} />
            <Info label="E-mail" v={c?.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">QR Code</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {c && (
              <>
                <div className="p-3 bg-white rounded-lg">
                  <QRCodeSVG value={qrUrl} size={140} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenQr(true)}>Imprimir / Ver</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tr">
        <TabsList>
          <TabsTrigger value="tr">Treinamentos</TabsTrigger>
          <TabsTrigger value="epis">EPIs</TabsTrigger>
          <TabsTrigger value="hist">Histórico de funções</TabsTrigger>
        </TabsList>

        <TabsContent value="tr">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Treinamentos realizados</CardTitle>
              <Dialog open={openTr} onOpenChange={setOpenTr}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar treinamento</DialogTitle></DialogHeader>
                  <TrForm colaboradorId={id} catalogo={catTr ?? []} onDone={() => { setOpenTr(false); qc.invalidateQueries({ queryKey: ["tr", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">Treinamento</th><th>NR</th><th>Carga</th><th>Realização</th><th>Vencimento</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {(treinamentos ?? []).map((t: any) => {
                    const s = statusVencimento(t.data_vencimento);
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{t.treinamento?.nome}</td>
                        <td>{t.treinamento?.nr?.codigo ?? "—"}</td>
                        <td>{t.treinamento?.carga_horaria ?? "—"}h</td>
                        <td>{fmtDate(t.data_realizacao)}</td>
                        <td>{fmtDate(t.data_vencimento)}</td>
                        <td><Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge></td>
                        <td className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/certificados/$id" params={{ id: t.id }}><FileBadge className="h-4 w-4 mr-1" />Certificado</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!treinamentos || treinamentos.length === 0) && (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum treinamento registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="epis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">EPIs entregues</CardTitle>
              <Dialog open={openEpi} onOpenChange={setOpenEpi}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar entrega de EPI</DialogTitle></DialogHeader>
                  <EpiForm colaboradorId={id} onDone={() => { setOpenEpi(false); qc.invalidateQueries({ queryKey: ["epis", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">Tipo</th><th>CA</th><th>Entrega</th><th>Vida útil</th><th>Vencimento</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(epis ?? []).map((e: any) => {
                    const s = statusVencimento(e.data_vencimento);
                    return (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{e.tipo}</td>
                        <td>{e.ca_numero || "—"}</td>
                        <td>{fmtDate(e.data_entrega)}</td>
                        <td>{e.vida_util_meses ? `${e.vida_util_meses} meses` : "—"}</td>
                        <td>{fmtDate(e.data_vencimento)}</td>
                        <td><Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge></td>
                      </tr>
                    );
                  })}
                  {(!epis || epis.length === 0) && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum EPI registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hist">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Histórico de funções</CardTitle>
              <Dialog open={openHist} onOpenChange={setOpenHist}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar função</DialogTitle></DialogHeader>
                  <HistForm colaboradorId={id} onDone={() => { setOpenHist(false); qc.invalidateQueries({ queryKey: ["hist", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">Função</th><th>Início</th><th>Fim</th></tr>
                </thead>
                <tbody>
                  {(historico ?? []).map((h: any) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-2">{h.funcao}</td>
                      <td>{fmtDate(h.data_inicio)}</td>
                      <td>{fmtDate(h.data_fim) === "—" ? "Atual" : fmtDate(h.data_fim)}</td>
                    </tr>
                  ))}
                  {(!historico || historico.length === 0) && (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Sem histórico.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openQr} onOpenChange={setOpenQr}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Code — {c?.nome}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            {c && <QRCodeSVG value={qrUrl} size={280} />}
            <p className="text-xs text-muted-foreground break-all">{qrUrl}</p>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
          </div>
        </DialogContent>
      </Dialog>
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

function TrForm({ colaboradorId, catalogo, onDone }: any) {
  const [treinamentoId, setTreinamentoId] = useState("");
  const [data_realizacao, setData] = useState("");
  const [instrutor, setInstrutor] = useState("");
  const [local, setLocal] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      const t = catalogo.find((x: any) => x.id === treinamentoId);
      const per = t?.nr?.periodicidade_meses;
      let venc: string | null = null;
      if (per && data_realizacao) {
        const d = new Date(data_realizacao);
        d.setMonth(d.getMonth() + per);
        venc = d.toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("treinamentos_realizados").insert({
        colaborador_id: colaboradorId,
        treinamento_id: treinamentoId,
        data_realizacao,
        data_vencimento: venc,
        instrutor,
        local,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registrado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Treinamento</Label>
        <Select value={treinamentoId} onValueChange={setTreinamentoId} required>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{catalogo.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome} {t.nr?.codigo ? `(${t.nr.codigo})` : ""}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Data de realização</Label><Input type="date" required value={data_realizacao} onChange={(e) => setData(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Instrutor</Label><Input value={instrutor} onChange={(e) => setInstrutor(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Local</Label><Input value={local} onChange={(e) => setLocal(e.target.value)} /></div>
      <DialogFooter><Button type="submit" disabled={mut.isPending || !treinamentoId}>Salvar</Button></DialogFooter>
    </form>
  );
}

function EpiForm({ colaboradorId, onDone }: any) {
  const [f, setF] = useState<any>({ tipo: "", ca_numero: "", data_entrega: "", vida_util_meses: "" });
  const mut = useMutation({
    mutationFn: async () => {
      let venc: string | null = null;
      if (f.vida_util_meses && f.data_entrega) {
        const d = new Date(f.data_entrega);
        d.setMonth(d.getMonth() + Number(f.vida_util_meses));
        venc = d.toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("epis").insert({
        colaborador_id: colaboradorId,
        tipo: f.tipo,
        ca_numero: f.ca_numero || null,
        data_entrega: f.data_entrega,
        vida_util_meses: f.vida_util_meses ? Number(f.vida_util_meses) : null,
        data_vencimento: venc,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registrado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Tipo de EPI</Label><Input required value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>CA</Label><Input value={f.ca_numero} onChange={(e) => setF({ ...f, ca_numero: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Vida útil (meses)</Label><Input type="number" value={f.vida_util_meses} onChange={(e) => setF({ ...f, vida_util_meses: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Data de entrega</Label><Input type="date" required value={f.data_entrega} onChange={(e) => setF({ ...f, data_entrega: e.target.value })} /></div>
      <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
    </form>
  );
}

function HistForm({ colaboradorId, onDone }: any) {
  const [f, setF] = useState<any>({ funcao: "", data_inicio: "", data_fim: "" });
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("historico_funcoes").insert({
        colaborador_id: colaboradorId,
        funcao: f.funcao,
        data_inicio: f.data_inicio,
        data_fim: f.data_fim || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adicionado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Função</Label><Input required value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Início</Label><Input type="date" required value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Fim (opcional)</Label><Input type="date" value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })} /></div>
      <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
    </form>
  );
}
