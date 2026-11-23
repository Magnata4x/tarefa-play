import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useSuspenseQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/lib/workspace";
import { canAccessArea } from "@/lib/user-access";
import { AreaDenied } from "@/components/area-denied";
import { PageTitle, Stat, Status, Empty, dateLabel } from "@/components/workspace-ui";
import { brl } from "@/lib/tp";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Administração", "Área de administração do Tarefa-Play."),
  component: Administration,
});

function Administration() {
  const { data } = useSuspenseQuery(workspaceQuery);
  if (!canAccessArea(data.roles, "admin")) return <AreaDenied />;
  const pending = data.submissions.filter(s => ["pendente", "contestada"].includes(s.status));
  const withdrawals = data.withdrawals.filter(w => w.status === "solicitado");
  return <>
    <PageTitle title="Administração" eyebrow="ADM" />
    <div className="grid gap-6 border-y py-7 sm:grid-cols-3">
      <Stat label="Comprovações em análise" value={pending.length} />
      <Stat label="Saques solicitados" value={withdrawals.length} />
      <Stat label="Campanhas ativas" value={data.campaigns.filter(c => c.status === "ativa").length} />
    </div>
    <section className="py-8"><h2 className="mb-5 text-xl font-bold">Comprovações e contestações</h2>
      {pending.length ? <div className="divide-y border-y">{pending.map(s => <article key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{data.campaigns.find(c => c.id === s.campaign_id)?.titulo ?? "Tarefa"}</h3><p className="mt-2 text-xs text-muted-foreground">{dateLabel(s.created_at)} · {brl(s.valor)}</p></div><Status value={s.status} /></article>)}</div> : <Empty>Nenhuma comprovação aguardando análise.</Empty>}
    </section>
    <section className="py-5"><h2 className="mb-5 text-xl font-bold">Saques aguardando revisão</h2>
      {withdrawals.length ? <div className="divide-y border-y">{withdrawals.map(w => <article key={w.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{brl(w.valor)}</h3><p className="mt-2 text-xs text-muted-foreground">{dateLabel(w.created_at)} · {w.tipo_chave}</p></div><Status value={w.status} /></article>)}</div> : <Empty>Nenhum saque aguardando revisão.</Empty>}
    </section>
  </>;
}
