import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Plus, Printer, FileBadge, Pencil, QrCode as QrIcon, Copy, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, tempoEmpresa, statusVencimento, statusBadgeClass, statusLabel } from "@/lib/sst";
import { ColaboradorForm } from "./colaboradores";

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

  const { data: nrsAll } = useQuery({
    queryKey: ["nrs-all"],
    queryFn: async () => (await supabase.from("normas_nr").select("id, codigo, titulo, periodicidade_meses").order("codigo")).data ?? [],
  });

  const { data: colabNRs } = useQuery({
    queryKey: ["colab-nrs", id],
    queryFn: async () => (await supabase.from("colaborador_nrs" as any).select("*, nr:normas_nr(codigo, titulo, periodicidade_meses)").eq("colaborador_id", id).order("created_at")).data ?? [],
  });

  const [openTr, setOpenTr] = useState(false);
  const [openEpi, setOpenEpi] = useState(false);
  const [openHist, setOpenHist] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openQr, setOpenQr] = useState(false);
  const [openNr, setOpenNr] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const qrUrl = c ? `${typeof window !== "undefined" ? window.location.origin : ""}/qr/${c.qrcode_token}` : "";

  const editMut = useMutation({
    mutationFn: async () => {
      const payload: any = { ...editForm };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.qrcode_token;
      const { error } = await supabase.from("colaboradores").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador atualizado");
      qc.invalidateQueries({ queryKey: ["colab", id] });
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
      setOpenEdit(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const episPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    (epis ?? []).forEach((e: any) => { map[e.tipo] = (map[e.tipo] ?? 0) + 1; });
    return map;
  }, [epis]);

  const resumo = useMemo(() => {
    const list = treinamentos ?? [];
    let vigente = 0, vencer = 0, vencido = 0, semData = 0;
    list.forEach((t: any) => {
      const s = statusVencimento(t.data_vencimento);
      if (s === "valido") vigente++;
      else if (s === "a_vencer") vencer++;
      else if (s === "vencido") vencido++;
      else semData++;
    });
    const ordenados = [...list].sort((a: any, b: any) => (b.data_realizacao ?? "").localeCompare(a.data_realizacao ?? ""));
    return { total: list.length, vigente, vencer, vencido, semData, ultimo: ordenados[0] };
  }, [treinamentos]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/colaboradores"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl truncate">{c?.nome ?? "..."}</CardTitle>
              <div className="text-sm text-muted-foreground">{c?.funcao_atual ?? "—"}{c?.setor ? ` · ${c.setor}` : ""}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => { setEditForm({ ...c }); setOpenEdit(true); }}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button size="sm" onClick={() => setOpenQr(true)}>
                <QrIcon className="h-4 w-4 mr-1" /> Gerar QR Code
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="CPF" v={c?.cpf} />
              <Info label="RG" v={c?.rg} />
              <Info label="Nascimento" v={fmtDate(c?.data_nascimento)} />
              <Info label="Status" v={c?.status} />
              <Info label="Admissão" v={fmtDate(c?.data_admissao)} />
              <Info label="Tempo de empresa" v={tempoEmpresa(c?.data_admissao)} />
              <Info label="Telefone" v={c?.telefone} />
              <Info label="E-mail pessoal" v={c?.email} />
              <Info label="E-mail corporativo" v={(c as any)?.email_corporativo} className="sm:col-span-2" />
              <Info label="Endereço" v={c?.endereco} className="sm:col-span-2" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrIcon className="h-4 w-4" /> Crachá virtual</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {c && (
              <>
                <div className="p-3 bg-white rounded-lg border">
                  <QRCodeCanvas value={qrUrl} size={140} />
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenQr(true)}>
                  Ver / baixar / copiar link
                </Button>
                <p className="text-[10px] text-muted-foreground break-all text-center">{qrUrl}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="nrs">
        <TabsList>
          <TabsTrigger value="nrs">NRs vinculadas</TabsTrigger>
          <TabsTrigger value="tr">Treinamentos</TabsTrigger>
          <TabsTrigger value="epis">EPIs</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="nrs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">NRs que o colaborador precisa cumprir</CardTitle>
              <Dialog open={openNr} onOpenChange={setOpenNr}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Vincular NR</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Vincular NR</DialogTitle></DialogHeader>
                  <ColabNrForm colaboradorId={id} nrs={nrsAll ?? []} vinculadas={(colabNRs ?? []).map((x: any) => x.nr_id)} onDone={() => { setOpenNr(false); qc.invalidateQueries({ queryKey: ["colab-nrs", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">NR</th><th>Título</th><th>Realização</th><th>Reciclagem</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {(colabNRs ?? []).map((n: any) => {
                    const s = statusVencimento(n.data_vencimento);
                    return (
                      <tr key={n.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{n.nr?.codigo}</td>
                        <td className="max-w-xs truncate">{n.nr?.titulo}</td>
                        <td>{fmtDate(n.data_realizacao)}</td>
                        <td>{fmtDate(n.data_vencimento)}</td>
                        <td><Badge className={statusBadgeClass(s)}>{statusLabel(s)}</Badge></td>
                        <td className="text-right">
                          <Button size="icon" variant="ghost" onClick={async () => {
                            if (!confirm("Remover vínculo?")) return;
                            await supabase.from("colaborador_nrs" as any).delete().eq("id", n.id);
                            qc.invalidateQueries({ queryKey: ["colab-nrs", id] });
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!colabNRs || colabNRs.length === 0) && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma NR vinculada.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tr">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Treinamentos concluídos</CardTitle>
              <Dialog open={openTr} onOpenChange={setOpenTr}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar treinamento</DialogTitle></DialogHeader>
                  <TrForm colaboradorId={id} catalogo={catTr ?? []} onDone={() => { setOpenTr(false); qc.invalidateQueries({ queryKey: ["tr", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">EPIs entregues</CardTitle>
                {Object.keys(episPorTipo).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(episPorTipo).map(([tipo, qtd]) => (
                      <Badge key={tipo} variant="secondary" className="text-xs">{tipo}: {qtd}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Dialog open={openEpi} onOpenChange={setOpenEpi}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar entrega de EPI</DialogTitle></DialogHeader>
                  <EpiForm colaboradorId={id} setor={c?.setor} onDone={() => { setOpenEpi(false); qc.invalidateQueries({ queryKey: ["epis", id] }); }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2">
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
                      <td>{h.data_fim ? fmtDate(h.data_fim) : "Atual"}</td>
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

      {editForm && (
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Editar colaborador</DialogTitle></DialogHeader>
            <ColaboradorForm form={editForm} setForm={setEditForm} onSubmit={() => editMut.mutate()} loading={editMut.isPending} />
          </DialogContent>
        </Dialog>
      )}

      {c && <QrCodeModal open={openQr} onClose={() => setOpenQr(false)} url={qrUrl} nome={c.nome} />}
    </div>
  );
}

function QrCodeModal({ open, onClose, url, nome }: { open: boolean; onClose: () => void; url: string; nome: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function download() {
    const canvas = ref.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${nome.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code — {nome}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div ref={ref} className="p-4 bg-white rounded-lg border">
            <QRCodeCanvas value={url} size={220} />
          </div>
          <p className="text-[10px] text-muted-foreground break-all text-center">{url}</p>
          <div className="flex gap-2 w-full">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
              <Copy className="h-4 w-4 mr-1" /> Copiar link
            </Button>
            <Button size="sm" className="flex-1" onClick={download}>
              <Download className="h-4 w-4 mr-1" /> Baixar imagem
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { const w = window.open(url, "_blank"); if (w) setTimeout(() => w.print(), 800); }}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, v, className }: { label: string; v?: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{v || "—"}</dd>
    </div>
  );
}

function ColabNrForm({ colaboradorId, nrs, vinculadas, onDone }: any) {
  const [nrId, setNrId] = useState("");
  const [dataReal, setDataReal] = useState("");
  const [dataVenc, setDataVenc] = useState("");
  const disponiveis = (nrs as any[]).filter((n) => !vinculadas.includes(n.id));

  function onSelectNr(id: string) {
    setNrId(id);
    const nr = (nrs as any[]).find((n) => n.id === id);
    if (nr?.periodicidade_meses && dataReal) {
      const d = new Date(dataReal);
      d.setMonth(d.getMonth() + nr.periodicidade_meses);
      setDataVenc(d.toISOString().slice(0, 10));
    }
  }
  function onSelectData(v: string) {
    setDataReal(v);
    const nr = (nrs as any[]).find((n) => n.id === nrId);
    if (nr?.periodicidade_meses && v) {
      const d = new Date(v);
      d.setMonth(d.getMonth() + nr.periodicidade_meses);
      setDataVenc(d.toISOString().slice(0, 10));
    }
  }

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("colaborador_nrs" as any).insert({
        colaborador_id: colaboradorId,
        nr_id: nrId,
        data_realizacao: dataReal || null,
        data_vencimento: dataVenc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("NR vinculada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
      <div className="space-y-1.5">
        <Label>NR</Label>
        <Select value={nrId} onValueChange={onSelectNr} required>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{disponiveis.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.titulo}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Data de realização</Label><Input type="date" value={dataReal} onChange={(e) => onSelectData(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Reciclagem (vencimento)</Label><Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">O vencimento é sugerido pela periodicidade da NR, mas pode ser ajustado.</p>
      <DialogFooter><Button type="submit" disabled={mut.isPending || !nrId}>Vincular</Button></DialogFooter>
    </form>
  );
}

function TrForm({ colaboradorId, catalogo, onDone }: any) {
  const [treinamentoId, setTreinamentoId] = useState("");
  const [data_realizacao, setData] = useState("");
  const [instrutor, setInstrutor] = useState("");
  const [local, setLocal] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treinamentos_realizados").insert({
        colaborador_id: colaboradorId,
        treinamento_id: treinamentoId,
        data_realizacao,
        instrutor: instrutor || null,
        local: local || null,
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

function EpiForm({ colaboradorId, setor, onDone }: any) {
  const [f, setF] = useState<any>({ tipo: "", ca_numero: "", data_entrega: "", vida_util_meses: "" });
  const { data: episDoSetor } = useQuery({
    queryKey: ["epis-setor", setor],
    enabled: !!setor,
    queryFn: async () => (await supabase.from("epis_setor" as any).select("*").eq("setor", setor).order("tipo_epi")).data ?? [],
  });

  function onSelectTipo(tipo: string) {
    const item: any = (episDoSetor as any[] | undefined)?.find((x: any) => x.tipo_epi === tipo);
    setF((prev: any) => ({
      ...prev,
      tipo,
      ca_numero: item?.ca_padrao ?? prev.ca_numero,
      vida_util_meses: item?.vida_util_meses ? String(item.vida_util_meses) : prev.vida_util_meses,
    }));
  }


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
  const hasSetorOpts = (episDoSetor ?? []).length > 0;
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Tipo de EPI {setor ? `(setor: ${setor})` : ""}</Label>
        {hasSetorOpts ? (
          <Select value={f.tipo} onValueChange={onSelectTipo}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {(episDoSetor ?? []).map((x: any) => (
                <SelectItem key={x.id} value={x.tipo_epi}>{x.tipo_epi}{x.ca_padrao ? ` — CA ${x.ca_padrao}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input required value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Ex: Capacete, Luva de vaqueta" />
        )}
        {setor && !hasSetorOpts && <p className="text-[11px] text-muted-foreground">Cadastre EPIs obrigatórios em Configurações › EPIs por setor para escolher pela lista.</p>}
      </div>
      <div className="space-y-1.5"><Label>Nº CA</Label><Input value={f.ca_numero} onChange={(e) => setF({ ...f, ca_numero: e.target.value })} /></div>
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
