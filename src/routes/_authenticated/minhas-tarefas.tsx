import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { brl, errMsg } from "@/lib/tp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTitle, Empty, Status, dateLabel, useRefreshWorkspace } from "@/components/workspace-ui";

export const Route = createFileRoute("/_authenticated/minhas-tarefas")({
  head: () => pageHead("Minhas tarefas", "Acompanhe suas comprovações, aprovações e contestações."), component: Mine,
});
function Mine() {
  const { data } = useSuspenseQuery(workspaceQuery); const refresh = useRefreshWorkspace(); const mine = data.submissions.filter(s => s.user_id === data.userId);
  return <><PageTitle title="Minhas tarefas" eyebrow="Cada participação conta" />{mine.length ? <div className="divide-y border-y">{mine.map(s => <article key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-6"><div className="min-w-0"><Status value={s.status} /><h2 className="mt-2 font-semibold">{data.campaigns.find(c => c.id === s.campaign_id)?.titulo ?? "Tarefa enviada"}</h2><p className="mt-2 text-xs text-muted-foreground">{dateLabel(s.created_at)} · {s.tempo_gasto_seg}s</p>{s.motivo_rejeicao && <p className="mt-3 text-sm text-destructive">{s.motivo_rejeicao}</p>}{s.status === "rejeitada" && <Button variant="outline" className="mt-3" onClick={async () => { try { const { error } = await supabase.rpc("contest_submission", { _sub_id: s.id }); if (error) throw error; toast.success("Contestação enviada."); await refresh(); } catch(e) { toast.error(errMsg(e)); } }}>Contestar rejeição</Button>}</div><span className="font-display text-xl font-bold text-earn">{brl(s.valor)}</span></article>)}</div> : <Empty>Você ainda não enviou nenhuma tarefa.</Empty>}<p className="mt-5 text-xs text-muted-foreground">Rejeições podem ser contestadas em até 48 horas da revisão.</p></>;
}
