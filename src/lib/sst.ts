import { differenceInDays, differenceInMonths, differenceInYears, format, parseISO } from "date-fns";

export type VencStatus = "vencido" | "a_vencer" | "valido" | "sem_data";

export const SETORES = [
  "Administrativo",
  "Cozinha",
  "Limpeza",
  "Manutenção",
  "Motoristas",
  "Operação",
  "RH",
] as const;

export const STATUS_COLAB = ["ativo", "inativo", "afastado", "ferias"] as const;

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

// Máscaras
export function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskFone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}

// CSV export
export function toCSV(rows: Record<string, any>[], headers: { key: string; label: string }[]): string {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",;\n]/.test(s) ? `"${s}"` : s;
  };
  const head = headers.map((h) => esc(h.label)).join(";");
  const body = rows.map((r) => headers.map((h) => esc(r[h.key])).join(";")).join("\n");
  return "\ufeff" + head + "\n" + body;
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
