import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useSuspenseQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/lib/workspace";
import { canAccessArea } from "@/lib/user-access";
import { AreaDenied } from "@/components/area-denied";
import { PageTitle, Stat, Status, Empty } from "@/components/workspace-ui";
import { brl } from "@/lib/tp";

export const Route = createFileRoute("/_authenticated/anunciante")({
  head: () => pageHead("Anunciante", "Área de campanhas do anunciante no Tarefa-Play."),
  component: Advertiser,
});

function Advertiser() {
  const { data } = useSuspenseQuery(workspaceQuery);
  if (!canAccessArea(data.roles, "advertiser")) return <AreaDenied />;
  const campaigns = data.campaigns.filter(c => c.advertiser_id === data.userId);
  const ids = new Set(campaigns.map(c => c.id));
  const submissions = data.submissions.filter(s => ids.has(s.campaign_id));
  return <>
    <PageTitle title="Minhas campanhas" eyebrow="Anunciante" />
    <div className="grid gap-6 border-y py-7 sm:grid-cols-3">
      <Stat label="Saldo do anunciante" value={brl(data.advertiserWallet?.saldo)} />
      <Stat label="Campanhas ativas" value={campaigns.filter(c => c.status === "ativa").length} />
      <Stat label="Participações aprovadas" value={submissions.filter(s => s.status === "aprovada").length} />
    </div>
    <section className="py-8"><h2 className="mb-5 text-xl font-bold">Campanhas</h2>
      {campaigns.length ? <div className="divide-y border-y">{campaigns.map(c => <article key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-6"><div className="min-w-0"><h3 className="break-words font-semibold">{c.titulo}</h3><p className="mt-2 text-sm text-muted-foreground">{brl(c.recompensa_usuario)} por aprovação · {c.vagas_restantes} vagas restantes</p></div><Status value={c.status} /></article>)}</div> : <Empty>Nenhuma campanha cadastrada para sua conta.</Empty>}
    </section>
    <p className="text-xs text-muted-foreground">Pagamentos Pix automáticos não estão disponíveis neste MVP.</p>
  </>;
}
