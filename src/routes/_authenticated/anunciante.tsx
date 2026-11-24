import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useSuspenseQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/lib/workspace";
import { canAccessArea } from "@/lib/user-access";
import { AreaDenied } from "@/components/area-denied";
import { PageTitle, Stat, Status, Empty } from "@/components/workspace-ui";
import { brl } from "@/lib/tp";
import { CampaignForm } from "@/components/campaign-form";
import { CampaignActions, SubmissionReview } from "@/components/workspace-actions";

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
    <PageTitle title="Minhas campanhas" eyebrow="Anunciante"><CampaignForm balance={data.advertiserWallet?.saldo ?? 0} commission={data.settings?.comissao_pct ?? 35} /></PageTitle>
    <div className="grid gap-6 border-y py-7 sm:grid-cols-3">
      <Stat label="Saldo do anunciante" value={brl(data.advertiserWallet?.saldo)} />
      <Stat label="Campanhas ativas" value={campaigns.filter(c => c.status === "ativa").length} />
      <Stat label="Participações aprovadas" value={submissions.filter(s => s.status === "aprovada").length} />
    </div>
    <section className="py-8"><h2 className="mb-5 text-xl font-bold">Campanhas</h2>
      {campaigns.length ? <div className="divide-y border-y">{campaigns.map(c => <article key={c.id} className="space-y-4 py-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><h3 className="break-words font-semibold">{c.titulo}</h3><p className="mt-2 text-sm text-muted-foreground">{brl(c.recompensa_usuario)} por aprovação · {c.vagas_restantes} vagas restantes</p></div><Status value={c.status} /></div><CampaignActions campaign={c} /></article>)}</div> : <Empty>Nenhuma campanha cadastrada para sua conta.</Empty>}
    </section>
    <section className="py-5"><h2 className="mb-5 text-xl font-bold">Comprovações em análise</h2>{submissions.filter(s => s.status === "pendente").length ? <div className="divide-y border-y">{submissions.filter(s => s.status === "pendente").map(s => <article key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{campaigns.find(c => c.id === s.campaign_id)?.titulo ?? "Tarefa"}</h3><p className="mt-2 text-sm text-muted-foreground">{brl(s.valor)}</p></div><SubmissionReview submission={s} title={campaigns.find(c => c.id === s.campaign_id)?.titulo ?? "Tarefa"} /></article>)}</div> : <Empty>Nenhuma comprovação aguardando análise.</Empty>}</section>
    <p className="text-xs text-muted-foreground">Depósitos indisponíveis. Pagamentos Pix automáticos não estão disponíveis neste MVP.</p>
  </>;
}
