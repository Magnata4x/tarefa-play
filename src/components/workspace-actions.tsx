import { useEffect, useState } from "react";
import { Check, Pause, Play, Square, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useRefreshWorkspace } from "@/components/workspace-ui";
import { brl, errMsg } from "@/lib/tp";

function ConfirmAction({ title, description, action, icon, label = title }: { title: string; description: string; action: () => Promise<void>; icon: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = useRefreshWorkspace();
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try { await action(); setOpen(false); toast.success("Alteração salva."); await refresh(); }
    catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogTrigger asChild><Button variant="outline" size="sm">{icon}{label}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><Button disabled={busy} onClick={confirm}>{busy ? "Salvando..." : "Confirmar"}</Button></DialogContent></Dialog>;
}

export function CampaignActions({ campaign, admin = false }: { campaign: Tables<"campaigns">; admin?: boolean }) {
  if (campaign.status === "encerrada") return null;
  async function change(status: "ativa" | "pausada" | "encerrada") {
    const { error } = await supabase.rpc("set_campaign_status", { _id: campaign.id, _status: status });
    if (error) throw error;
  }
  return <div className="flex flex-wrap gap-2">
    {(campaign.status === "pausada" || (admin && campaign.status === "em_analise")) && <ConfirmAction title={campaign.status === "em_analise" ? "Aprovar campanha" : "Retomar campanha"} description={campaign.titulo} icon={<Play className="size-4" />} action={() => change("ativa")} />}
    {campaign.status === "ativa" && <ConfirmAction title="Pausar campanha" description={campaign.titulo} icon={<Pause className="size-4" />} action={() => change("pausada")} />}
    <ConfirmAction title="Encerrar campanha" description={`Encerrar “${campaign.titulo}”? O saldo não utilizado será estornado conforme as regras da campanha.`} icon={<Square className="size-4" />} action={() => change("encerrada")} />
  </div>;
}

export function SubmissionReview({ submission, title }: { submission: Tables<"task_submissions">; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [proofError, setProofError] = useState(false);
  const refresh = useRefreshWorkspace();
  useEffect(() => {
    if (!open || !submission.prova_url) return;
    let active = true;
    setImage(null); setProofError(false);
    // Only request objects from the private proofs bucket; never embed a supplied external URL.
    supabase.storage.from("proofs").createSignedUrl(submission.prova_url, 300).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) setProofError(true); else setImage(data.signedUrl);
    }).catch(() => { if (active) setProofError(true); });
    return () => { active = false; };
  }, [open, submission.prova_url]);
  async function review(approve: boolean) {
    if (busy || (!approve && !reason.trim())) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_submission", { _sub_id: submission.id, _aprovar: approve, ...(approve ? {} : { _motivo: reason.trim() }) });
      if (error) throw error;
      setOpen(false); toast.success(approve ? "Comprovação aprovada." : "Comprovação rejeitada."); await refresh();
    } catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="size-4" />Analisar</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Analisar comprovação</DialogTitle><DialogDescription>{title} · {brl(submission.valor)}</DialogDescription></DialogHeader>
      {submission.comentario_texto && <p className="whitespace-pre-wrap break-words text-sm">{submission.comentario_texto}</p>}
      {submission.prova_url ? image ? <img src={image} alt="Comprovação enviada pelo validador" className="max-h-80 w-full object-contain" onError={() => { setImage(null); setProofError(true); }} /> : <p role="status" className="text-sm text-muted-foreground">{proofError ? "Não foi possível abrir a comprovação." : "Carregando comprovação..."}</p> : <p className="text-sm text-muted-foreground">Nenhuma imagem enviada.</p>}
      <p className="text-sm text-muted-foreground">Tempo registrado: {submission.tempo_gasto_seg}s</p>
      {submission.motivo_rejeicao && <p className="text-sm">Motivo anterior: {submission.motivo_rejeicao}</p>}
      <Label htmlFor={`reason-${submission.id}`}>Motivo da rejeição</Label><Textarea id={`reason-${submission.id}`} value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex flex-wrap gap-3"><Button disabled={busy || Boolean(submission.prova_url && !image)} onClick={() => review(true)}><Check className="size-4" />Aprovar</Button><Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => review(false)}>Rejeitar</Button></div>
    </DialogContent></Dialog>;
}

export function WithdrawalActions({ withdrawal }: { withdrawal: Tables<"withdrawals"> }) {
  async function change(status: "aprovado" | "recusado") {
    const { error } = await supabase.rpc("admin_set_withdrawal", { _id: withdrawal.id, _status: status });
    if (error) throw error;
  }
  return <div className="flex flex-wrap gap-2">
    {withdrawal.status === "solicitado" && <ConfirmAction title="Aprovar solicitação de saque" description={`${brl(withdrawal.valor)}. Esta aprovação não transfere dinheiro nem confirma pagamento Pix.`} label="Aprovar" icon={<Check className="size-4" />} action={() => change("aprovado")} />}
    <ConfirmAction title="Recusar saque" description={`${brl(withdrawal.valor)} serão devolvidos ao saldo do validador.`} label="Recusar" icon={<Square className="size-4" />} action={() => change("recusado")} />
  </div>;
}