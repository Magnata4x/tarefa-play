import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageTitle, Stat, Empty, dateLabel } from "@/components/workspace-ui";
import { brl } from "@/lib/tp";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => pageHead("Indicações", "Convide amigos e acompanhe suas indicações qualificadas."), component: Referrals,
});
function Referrals() {
  const { data } = useSuspenseQuery(workspaceQuery); const [link,setLink] = useState("");
  useEffect(() => { setLink(`${window.location.origin}/auth?ref=${encodeURIComponent(data.profile?.referral_code ?? "")}`); }, [data.profile?.referral_code]);
  const paid = data.referrals.filter(r => r.bonus_pago).length;
  return <><PageTitle title="Boas oportunidades se compartilham" eyebrow="Indicações" /><div className="grid gap-7 border-y py-7 sm:grid-cols-3"><Stat label="Amigos indicados" value={data.referrals.length} /><Stat label="Indicações qualificadas" value={paid} /><Stat label="Bônus recebido" value={brl(paid * 2)} earn /></div><section className="py-9"><Users className="mb-4 size-8 text-primary-glow" /><h2 className="text-xl font-bold">Seu link de convite</h2><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">Receba R$ 2 quando um amigo cadastrado pelo seu link completar 10 tarefas aprovadas. Bônus único, sem multinível.</p><div className="mt-5 flex max-w-xl gap-2"><Input aria-label="Link de indicação" value={link} readOnly /><Button aria-label="Copiar link" size="icon" disabled={!link} onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copiado!"); } catch { toast.error("Não foi possível copiar o link."); } }}><Copy /></Button></div></section><h2 className="mb-4 text-xl font-bold">Histórico de indicações</h2>{data.referrals.length ? <div className="divide-y border-y">{data.referrals.map((r,i) => <div key={r.id} className="flex justify-between py-4 text-sm"><div>Amigo {i+1}<p className="mt-1 text-xs text-muted-foreground">{dateLabel(r.created_at)}</p></div><span className={r.bonus_pago ? "text-earn" : "text-gold"}>{r.bonus_pago ? "Bônus creditado" : "Aguardando 10 aprovações"}</span></div>)}</div> : <Empty>Seus amigos convidados aparecerão aqui.</Empty>}</>;
}
