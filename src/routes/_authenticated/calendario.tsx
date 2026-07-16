import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — TEC - SST" }] }),
  component: CalendarioPage,
});

const tipos = [
  { v: "treinamento", label: "Treinamento" },
  { v: "reciclagem", label: "Reciclagem" },
  { v: "palestra", label: "Palestra" },
  { v: "sipat", label: "SIPAT" },
  { v: "integracao", label: "Integração" },
  { v: "outro", label: "Outro" },
];

function CalendarioPage() {
  const qc = useQueryClient();
  const [ref, setRef] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [f, setF] = useState<any>({ titulo: "", tipo: "treinamento", data_inicio: "", descricao: "", local: "", treinamento_id: "", colaboradores_convocados: [] as string[] });

  const { data } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => (await supabase.from("eventos_calendario").select("*").order("data_inicio")).data ?? [],
  });
  const { data: colabs } = useQuery({
    queryKey: ["colabs-conv"],
    queryFn: async () => (await supabase.from("colaboradores").select("id, nome, email_corporativo, email, setor").eq("status", "ativo").order("nome")).data ?? [],
  });
  const { data: treins } = useQuery({
    queryKey: ["trs-cat-cal"],
    queryFn: async () => (await supabase.from("treinamentos").select("id, nome").order("nome")).data ?? [],
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("eventos_calendario").insert({
        titulo: f.titulo, tipo: f.tipo, data_inicio: f.data_inicio,
        descricao: f.descricao || null, local: f.local || null,
        treinamento_id: f.treinamento_id || null,
        colaboradores_convocados: f.colaboradores_convocados.length ? f.colaboradores_convocados : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["eventos"] });
      setF({ titulo: "", tipo: "treinamento", data_inicio: "", descricao: "", local: "", treinamento_id: "", colaboradores_convocados: [] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(ref), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(ref), { weekStartsOn: 0 });
    const out: Date[] = [];
    let d = start;
    while (d <= end) { out.push(d); d = addDays(d, 1); }
    return out;
  }, [ref]);

  const eventosPorDia = (d: Date) => (data ?? []).filter((e: any) => isSameDay(parseISO(e.data_inicio), d));

  function toggleColab(id: string) {
    const set = new Set(f.colaboradores_convocados);
    if (set.has(id)) set.delete(id); else set.add(id);
    setF({ ...f, colaboradores_convocados: Array.from(set) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground">Treinamentos, palestras, SIPAT e demais eventos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo evento</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
              <div><Label>Título</Label><Input required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipos.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data / hora</Label><Input type="datetime-local" required value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} /></div>
              </div>
              <div>
                <Label>Vincular treinamento (opcional)</Label>
                <Select value={f.treinamento_id} onValueChange={(v) => setF({ ...f, treinamento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(treins ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Local</Label><Input value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
              <div>
                <Label>Convocar colaboradores</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-0.5">
                  {(colabs ?? []).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm py-0.5">
                      <input type="checkbox" checked={f.colaboradores_convocados.includes(c.id)} onChange={() => toggleColab(c.id)} />
                      <span className="flex-1">{c.nome}</span>
                      <span className="text-xs text-muted-foreground">{c.email_corporativo || c.email || "sem e-mail"}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{f.colaboradores_convocados.length} selecionado(s)</p>
              </div>
              <DialogFooter><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="capitalize text-base sm:text-lg">{format(ref, "MMMM 'de' yyyy", { locale: ptBR })}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setRef(subMonths(ref, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setRef(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => setRef(addMonths(ref, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, ref);
              const evs = eventosPorDia(d);
              return (
                <div key={i} className={`min-h-20 sm:min-h-24 p-1.5 rounded border text-xs ${inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground"} ${isSameDay(d, new Date()) ? "ring-2 ring-primary" : ""}`}>
                  <div className="font-medium">{format(d, "d")}</div>
                  <div className="space-y-0.5 mt-1">
                    {evs.slice(0, 3).map((e: any) => (
                      <button key={e.id} onClick={() => setDetail(e)} className="w-full text-left truncate rounded bg-primary/15 text-primary px-1 py-0.5 hover:bg-primary/25">
                        {e.titulo}
                      </button>
                    ))}
                    {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {detail && <EventoDetalhe evento={detail} colabs={colabs ?? []} onClose={() => setDetail(null)} onDeleted={() => qc.invalidateQueries({ queryKey: ["eventos"] })} />}
    </div>
  );
}

function EventoDetalhe({ evento, colabs, onClose, onDeleted }: any) {
  const convocados = (colabs as any[]).filter((c) => (evento.colaboradores_convocados ?? []).includes(c.id));
  const emails = convocados.map((c) => c.email_corporativo || c.email).filter(Boolean).join("; ");

  async function excluir() {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await supabase.from("eventos_calendario").delete().eq("id", evento.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Evento excluído"); onDeleted(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{evento.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{evento.tipo}</Badge>
            <Badge variant="outline">{format(parseISO(evento.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</Badge>
          </div>
          {evento.local && <div><b>Local:</b> {evento.local}</div>}
          {evento.descricao && <div><b>Descrição:</b> {evento.descricao}</div>}
          {convocados.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Convocados ({convocados.length})</div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {convocados.map((c) => (
                  <div key={c.id} className="flex justify-between gap-2 text-xs">
                    <span>{c.nome}</span>
                    <span className="text-muted-foreground truncate">{c.email_corporativo || c.email || "sem e-mail"}</span>
                  </div>
                ))}
              </div>
              {emails && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(emails); toast.success("E-mails copiados"); }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar e-mails
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(evento.titulo)}`}>
                      <Mail className="h-3.5 w-3.5 mr-1" /> Enviar convite
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="destructive" size="sm" onClick={excluir}>Excluir</Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
