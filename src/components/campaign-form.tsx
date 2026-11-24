import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, campaignCost, NETWORKS, TASK_TYPES, errMsg } from "@/lib/tp";
import { useRefreshWorkspace } from "@/components/workspace-ui";

export function CampaignForm({ balance, commission }: { balance: number; commission: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [network, setNetwork] = useState("site");
  const [type, setType] = useState("visitar");
  const [reward, setReward] = useState("0.50");
  const [quantity, setQuantity] = useState("10");
  const [proof, setProof] = useState(true);
  const refresh = useRefreshWorkspace();
  const cost = campaignCost(Number(reward), Number(quantity), commission);
  const valid = Number.isFinite(cost.total) && Number(reward) >= 0.05 && Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) <= 100000;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || cost.total > balance || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_campaign", {
        _titulo: String(form.get("title") ?? "").trim(), _descricao: String(form.get("description") ?? "").trim(),
        _rede: network, _tipo: type, _url: String(form.get("url") ?? "").trim(),
        _recompensa: Number(reward), _quantidade: Number(quantity), _tempo: Number(form.get("time")),
        _exige_prova: proof, _instrucoes: String(form.get("instructions") ?? "").trim(),
      });
      if (error) throw error;
      setOpen(false);
      toast.success("Campanha enviada para análise.");
      await refresh();
    } catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button><Plus className="size-4" />Nova campanha</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Nova campanha</DialogTitle><DialogDescription>O custo será descontado do saldo. A campanha aguarda aprovação do ADM.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="campaign-title">Título</Label><Input id="campaign-title" name="title" required maxLength={160} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="campaign-network">Rede</Label><Select value={network} onValueChange={setNetwork}><SelectTrigger id="campaign-network"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NETWORKS).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="campaign-type">Tipo de tarefa</Label><Select value={type} onValueChange={setType}><SelectTrigger id="campaign-type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TASK_TYPES).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label htmlFor="campaign-url">Link da tarefa</Label><Input id="campaign-url" name="url" type="url" pattern="https?://.*" required /></div>
        <div className="space-y-2"><Label htmlFor="campaign-description">Descrição</Label><Textarea id="campaign-description" name="description" required /></div>
        <div className="space-y-2"><Label htmlFor="campaign-instructions">Instruções para comprovação</Label><Textarea id="campaign-instructions" name="instructions" required /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="campaign-reward">Recompensa (R$)</Label><Input id="campaign-reward" type="number" min="0.05" step="0.01" required value={reward} onChange={e => setReward(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="campaign-quantity">Quantidade</Label><Input id="campaign-quantity" type="number" min="1" max="100000" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="campaign-time">Tempo mínimo (s)</Label><Input id="campaign-time" name="time" type="number" min="5" step="1" defaultValue="30" required /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={proof} onCheckedChange={value => setProof(value === true)} />Exigir imagem de comprovação</label>
        <dl className="space-y-2 border-y py-4 text-sm"><div className="flex justify-between"><dt>Recompensas</dt><dd>{brl(valid ? cost.base : 0)}</dd></div><div className="flex justify-between"><dt>Comissão ({commission}%)</dt><dd>{brl(valid ? cost.comissao : 0)}</dd></div><div className="flex justify-between font-bold"><dt>Custo total</dt><dd>{brl(valid ? cost.total : 0)}</dd></div><div className="flex justify-between text-muted-foreground"><dt>Saldo disponível</dt><dd>{brl(balance)}</dd></div></dl>
        {valid && cost.total > balance && <p role="alert" className="text-sm text-destructive">Saldo insuficiente. Depósitos estão indisponíveis até a integração de pagamentos.</p>}
        <Button type="submit" className="w-full" disabled={busy || !valid || cost.total > balance}>{busy ? "Enviando..." : "Confirmar e enviar para análise"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}