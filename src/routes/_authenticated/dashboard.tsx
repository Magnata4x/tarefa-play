import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, Trophy } from "lucide-react";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { brl, levelOf } from "@/lib/tp";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageTitle, Stat, TaskCard, Empty } from "@/components/workspace-ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => pageHead("Meu início", "Seu saldo, nível, conquistas e novas tarefas no Tarefa-Play."),
  component: Dashboard,
});
function Dashboard() {
  const { data } = useSuspenseQuery(workspaceQuery); const profile = data.profile; const level = levelOf(profile?.tarefas_aprovadas ?? 0);
  const own = data.submissions.filter(s => s.user_id === data.userId); const available = data.campaigns.filter(c => c.status === "ativa" && c.advertiser_id !== data.userId && c.vagas_restantes > 0 && !own.some(s => s.campaign_id === c.id));
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const earnings = data.transactions.filter(t => ["ganho", "bonus"].includes(t.tipo) && new Date(t.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === today).reduce((sum,t) => sum + Number(t.valor),0);
  return <><PageTitle eyebrow="Seu próximo passo começa aqui" title={`Olá, ${profile?.nome?.split(" ")[0] || "vamos começar"}!`}><Button asChild variant="outline"><Link to="/carteira">Minha carteira<ArrowRight /></Link></Button></PageTitle><div className="grid grid-cols-2 gap-7 border-y py-7 md:grid-cols-4"><Stat label="Saldo disponível" value={brl(data.wallet?.saldo_disponivel)} earn /><Stat label="Saldo pendente" value={brl(data.wallet?.saldo_pendente)} /><Stat label="Ganhos de hoje" value={brl(earnings)} /><Stat label="Tarefas aprovadas" value={profile?.tarefas_aprovadas ?? 0} /></div><div className="my-9 grid gap-8 md:grid-cols-[1.3fr_1fr]"><section className="border-b pb-7"><p className="flex items-center gap-2 text-sm"><Trophy className="size-4 text-gold" />Sua jornada · {level.emoji} {level.name}</p><div className="my-4 flex justify-between text-xs text-muted-foreground"><span>{profile?.xp ?? 0} XP</span><span>{level.next ? `${profile?.tarefas_aprovadas ?? 0} / ${level.next.min} para ${level.next.name}` : "Nível máximo"}</span></div><Progress value={level.progress} className="h-2" /></section><section className="flex items-center justify-between border-b pb-7"><div><p className="flex items-center gap-2 text-sm"><Flame className="size-4 text-gold" />Sequência diária</p><p className="mt-3 text-2xl font-bold">{profile?.streak ?? 0} dias</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Confiança</p><p className="mt-3 text-xl font-semibold text-earn">{profile?.score_confianca ?? 0}/100</p></div></section></div><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Tarefas para você</h2><Button asChild variant="ghost"><Link to="/tarefas">Ver todas<ArrowRight /></Link></Button></div>{available.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.slice(0,6).map(c => <TaskCard key={c.id} campaign={c} />)}</div> : <Empty>Nenhuma tarefa disponível no momento.</Empty>}<p className="mt-8 text-xs text-muted-foreground">Os ganhos variam e não são garantidos.</p></>;
}
