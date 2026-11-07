import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock3, ArrowUpRight, ListChecks, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { brl, NETWORKS, TASK_TYPES, STATUS_LABEL } from "@/lib/tp";

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-glow">{eyebrow}</p>}<h1 className="text-2xl font-bold md:text-3xl">{title}</h1></div>{children}</div>;
}
export function Stat({ label, value, children, earn = false }: { label: string; value: ReactNode; children?: ReactNode; earn?: boolean }) {
  return <div className="border-l-2 border-border pl-5 py-2"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-2 font-display text-2xl font-bold ${earn ? "text-earn" : "text-foreground"}`}>{value}</p>{children && <div className="mt-2 text-xs text-muted-foreground">{children}</div>}</div>;
}
export function Status({ value }: { value: string }) {
  const success = ["aprovada", "ativa", "pago", "aprovado"].includes(value);
  const danger = ["rejeitada", "recusado", "banido", "suspenso"].includes(value);
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${success ? "text-earn" : danger ? "text-destructive" : "text-gold"}`}><span className="size-1.5 rounded-full bg-current" />{STATUS_LABEL[value] ?? value}</span>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-3 border-y border-dashed py-8 text-center text-sm text-muted-foreground"><ListChecks className="size-7 opacity-50" />{children}</div>;
}
export function TaskCard({ campaign }: { campaign: Tables<"campaigns"> }) {
  const network = NETWORKS[campaign.rede];
  return <article className="group flex min-h-64 flex-col rounded-lg border bg-card p-5 transition-colors hover:border-primary-glow/60"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="grid size-9 place-items-center rounded-md bg-secondary text-lg">{network?.emoji ?? "🌐"}</span>{network?.label ?? campaign.rede}</span><span className="text-xs text-muted-foreground">{campaign.vagas_restantes} vagas</span></div><h3 className="mt-5 text-base font-semibold leading-relaxed">{campaign.titulo}</h3><p className="mt-1 text-xs text-muted-foreground">{TASK_TYPES[campaign.tipo_tarefa] ?? campaign.tipo_tarefa}</p><div className="mt-auto flex items-end justify-between pt-5"><div><p className="font-display text-xl font-bold text-earn">{brl(campaign.recompensa_usuario)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{campaign.tempo_minimo_seg}s mín.</p></div><Button variant="secondary" size="icon" asChild><Link to="/tarefas/$id" params={{ id: campaign.id }} aria-label={`Ver tarefa: ${campaign.titulo}`}><ArrowUpRight /></Link></Button></div></article>;
}
export function WorkspaceError({ error }: { error: Error }) {
  const router = useRouter();
  return <div role="alert" className="space-y-4 py-12"><CircleAlert className="text-destructive" /><h1 className="text-xl font-bold">Não foi possível carregar esta página</h1><p className="text-sm text-muted-foreground">{error.message}</p><Button onClick={() => router.invalidate()}>Tentar novamente</Button></div>;
}
export function WorkspaceNotFound() { return <Empty>Esta tarefa não está disponível.</Empty>; }
export function useRefreshWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => { await queryClient.invalidateQueries({ queryKey: ["workspace"] }); await router.invalidate(); };
}
export const dateLabel = (date: string) => new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });