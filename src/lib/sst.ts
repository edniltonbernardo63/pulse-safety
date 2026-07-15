import { differenceInDays, differenceInMonths, differenceInYears, format, parseISO } from "date-fns";

export type VencStatus = "vencido" | "a_vencer" | "valido" | "sem_data";

export function statusVencimento(dataVencimento: string | null | undefined): VencStatus {
  if (!dataVencimento) return "sem_data";
  const d = typeof dataVencimento === "string" ? parseISO(dataVencimento) : dataVencimento;
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return "vencido";
  if (diff <= 30) return "a_vencer";
  return "valido";
}

export function diasAteVencimento(data: string | null | undefined): number | null {
  if (!data) return null;
  return differenceInDays(parseISO(data), new Date());
}

export function tempoEmpresa(dataAdmissao?: string | null): string {
  if (!dataAdmissao) return "—";
  const d = parseISO(dataAdmissao);
  const anos = differenceInYears(new Date(), d);
  const meses = differenceInMonths(new Date(), d) - anos * 12;
  if (anos <= 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"}${meses > 0 ? ` e ${meses} ${meses === 1 ? "mês" : "meses"}` : ""}`;
}

export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return format(parseISO(d), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export function statusLabel(s: VencStatus): string {
  return { vencido: "Vencido", a_vencer: "A vencer", valido: "Válido", sem_data: "Sem data" }[s];
}

export function statusBadgeClass(s: VencStatus): string {
  return {
    vencido: "bg-destructive text-destructive-foreground",
    a_vencer: "bg-warning text-warning-foreground",
    valido: "bg-success text-success-foreground",
    sem_data: "bg-muted text-muted-foreground",
  }[s];
}
