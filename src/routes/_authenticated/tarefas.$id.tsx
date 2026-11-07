import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Timer, Upload, ShieldCheck, Flag } from "lucide-react";
import { toast } from "sonner";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageTitle, Status, useRefreshWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/workspace-ui";
import { brl, NETWORKS, TASK_TYPES, sha256, errMsg } from "@/lib/tp";

export const Route = createFileRoute("/_authenticated/tarefas/$id")({
  loader: async ({ context, params }) => { const data = await context.queryClient.ensureQueryData(workspaceQuery); if (!data.campaigns.some(c => c.id === params.id)) throw notFound(); },
  head: () => pageHead("Executar tarefa", "Instruções, tempo mínimo e envio de comprovação da sua tarefa."),
  errorComponent: WorkspaceError, notFoundComponent: WorkspaceNotFound, component: TaskDetail,
});
function TaskDetail() {
  const { id } = Route.useParams(); const { data } = useSuspenseQuery(workspaceQuery);
  const campaign = data.campaigns.find(c => c.id === id);
  const previous = data.submissions.find(s => s.campaign_id === id && s.user_id === data.userId);
  const [startedAt, setStartedAt] = useState(data.starts.find(s => s.campaign_id === id)?.started_at ?? "");
  const [elapsed, setElapsed] = useState(0); const [file, setFile] = useState<File | null>(null); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = useRefreshWorkspace(); const navigate = useNavigate();
  useEffect(() => { if (!startedAt) return; const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))); tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval); }, [startedAt]);
  if (!campaign) return <WorkspaceNotFound />;
  const remaining = Math.max(0, campaign.tempo_minimo_seg - elapsed);
  async function start() {
    if (!campaign) return;
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    setBusy(true);
    try { const { data: timestamp, error } = await supabase.rpc("start_task", { _campaign_id: id }); if (error) throw error; setStartedAt(timestamp); if (tab) tab.location.href = campaign.url_alvo; else toast.info("Permita novas abas e abra o link da tarefa."); }
    catch (e) { tab?.close(); toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function complete(e: React.FormEvent) {
    e.preventDefault(); if (!campaign) return; setBusy(true); let path = "";
    try {
      let hash = "";
      if (file) { if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Envie uma imagem de até 5 MB."); hash = await sha256(file); path = `${data.userId}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`; const uploaded = await supabase.storage.from("proofs").upload(path, file, { contentType: file.type }); if (uploaded.error) throw uploaded.error; }
      const result = await supabase.rpc("submit_task", { _campaign_id: id, _prova_url: path, _prova_hash: hash, _comentario: comment });
      if (result.error) throw result.error;
      toast.success(result.data === "aprovada" ? "Tarefa aprovada! Confira o crédito na carteira." : "Comprovação enviada para análise."); await refresh(); navigate({ to: "/minhas-tarefas" });
    } catch (e) { if (path) await supabase.storage.from("proofs").remove([path]); toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  return <><Button variant="ghost" asChild className="mb-5"><Link to="/tarefas"><ArrowLeft />Tarefas</Link></Button><PageTitle eyebrow={`${NETWORKS[campaign.rede]?.label} · ${TASK_TYPES[campaign.tipo_tarefa]}`} title={campaign.titulo} /><div className="grid gap-10 md:grid-cols-[1fr_300px]"><section><p className="leading-relaxed text-muted-foreground">{campaign.descricao}</p><h2 className="mt-8 text-lg font-bold">Instruções da tarefa</h2><p className="mt-4 whitespace-pre-line leading-8 text-muted-foreground">{campaign.instrucoes || "Abra o link, realize a tarefa indicada e envie a comprovação."}</p><p className="mt-5 border-l-2 border-gold pl-4 text-sm text-muted-foreground">Respeite as regras da rede. Escreva uma opinião própria; não copie comentários nem envie spam.</p>{previous ? <div className="mt-8 space-y-3"><Status value={previous.status} /><Button asChild variant="outline"><Link to="/minhas-tarefas">Ver minha comprovação</Link></Button></div> : <form onSubmit={complete} className="mt-8 space-y-5"><div className="flex flex-wrap gap-3"><Button type="button" onClick={start} disabled={busy} variant="hero"><ExternalLink />{startedAt ? "Reabrir tarefa" : "Iniciar tarefa"}</Button>{startedAt && <span className="flex items-center gap-2 text-sm text-gold"><Timer className="size-4" />{remaining > 0 ? `Aguarde ${remaining}s` : "Tempo mínimo cumprido"}</span>}</div><label className="block space-y-2 text-sm"><span className="flex items-center gap-2"><Upload className="size-4" />Print da tarefa {campaign.exige_prova ? "(obrigatório)" : "(opcional)"}</span><Input type="file" accept="image/*" required={campaign.exige_prova} onChange={e => setFile(e.target.files?.[0] ?? null)} /><span className="text-xs text-muted-foreground">Imagem de até 5 MB · armazenamento privado</span></label><label className="block space-y-2 text-sm"><span>Comentário ou observação</span><Textarea value={comment} onChange={e => setComment(e.target.value)} required={campaign.tipo_tarefa === "comentar"} minLength={campaign.tipo_tarefa === "comentar" ? 10 : undefined} /></label><Button type="submit" variant="earn" disabled={busy || !startedAt || remaining > 0 || (campaign.exige_prova && !file)}><ShieldCheck />{busy ? "Enviando…" : "Concluir e enviar comprovação"}</Button></form>}</section><aside className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"><p className="text-sm text-muted-foreground">Recompensa por aprovação</p><p className="mt-2 font-display text-4xl font-bold text-earn">{brl(campaign.recompensa_usuario)}</p><div className="mt-7 space-y-4 text-sm"><p>{campaign.vagas_restantes} vagas restantes</p><p>{campaign.tempo_minimo_seg} segundos mínimos</p><p>Uma execução por pessoa</p></div><p className="mt-7 text-xs leading-6 text-muted-foreground">Os ganhos variam e não são garantidos. Contas novas podem receber o crédito em saldo pendente.</p><Button variant="ghost" className="mt-5" onClick={async () => { const reason = window.prompt("Qual o motivo da denúncia?"); if (!reason?.trim()) return; const { error } = await supabase.from("reports").insert({ campaign_id: id, reporter_id: data.userId, motivo: reason }); error ? toast.error(error.message) : toast.success("Denúncia recebida."); }}><Flag />Denunciar tarefa</Button></aside></div></>;
}