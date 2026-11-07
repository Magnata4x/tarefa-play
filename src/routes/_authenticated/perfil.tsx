import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { NETWORKS, errMsg, levelOf } from "@/lib/tp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle, Empty, useRefreshWorkspace } from "@/components/workspace-ui";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => pageHead("Meu perfil", "Gerencie seus dados e contas sociais no Tarefa-Play."), component: Profile,
});
function Profile() {
  const { data } = useSuspenseQuery(workspaceQuery); const refresh = useRefreshWorkspace(); const [name,setName] = useState(data.profile?.nome ?? ""); const [phone,setPhone] = useState(data.profile?.telefone ?? ""); const [network,setNetwork] = useState("instagram"); const [handle,setHandle] = useState(""); const [busy,setBusy] = useState(false);
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); try { const { error } = await supabase.from("profiles").update({ nome: name, telefone: phone }).eq("id",data.userId); if (error) throw error; toast.success("Perfil salvo."); await refresh(); } catch(e) { toast.error(errMsg(e)); } finally { setBusy(false); } }
  async function add(e: React.FormEvent) { e.preventDefault(); const { error } = await supabase.from("social_accounts").insert({ user_id: data.userId, rede: network, handle: handle.trim() }); if (error) { toast.error(error.message); return; } setHandle(""); await refresh(); toast.success("Conta social adicionada."); }
  return <><PageTitle title="Meu perfil" eyebrow={`${levelOf(data.profile?.tarefas_aprovadas ?? 0).name} · ${data.profile?.status ?? "ativo"}`} /><form onSubmit={save} className="grid max-w-2xl gap-5 border-y py-7 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>Nome</span><Input required value={name} onChange={e => setName(e.target.value)} /></label><label className="space-y-2 text-sm"><span>Telefone</span><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /><span className="text-xs text-gold">Verificação de telefone ainda indisponível no MVP.</span></label><Button type="submit" disabled={busy} className="justify-self-start"><Save />Salvar perfil</Button></form><section className="py-8"><h2 className="text-xl font-bold">Contas sociais</h2><form onSubmit={add} className="mt-5 flex max-w-2xl flex-wrap gap-3"><select aria-label="Rede social" value={network} onChange={e => setNetwork(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">{Object.entries(NETWORKS).filter(([k]) => k !== "site").map(([k,n]) => <option key={k} value={k}>{n.label}</option>)}</select><Input aria-label="Usuário da rede" required value={handle} onChange={e => setHandle(e.target.value)} placeholder="@seu_usuario" className="min-w-40 flex-1" /><Button type="submit"><Plus />Adicionar</Button></form><div className="mt-6 max-w-2xl">{data.social.length ? <div className="divide-y border-y">{data.social.map(s => <div key={s.id} className="flex items-center justify-between py-4"><div className="text-sm">{NETWORKS[s.rede]?.emoji} {NETWORKS[s.rede]?.label} · {s.handle}<p className="mt-1 text-xs text-muted-foreground">Não verificada</p></div><Button variant="ghost" size="icon" aria-label={`Remover ${s.handle}`} onClick={async () => { const { error } = await supabase.from("social_accounts").delete().eq("id",s.id); if (error) toast.error(error.message); else await refresh(); }}><Trash2 /></Button></div>)}</div> : <Empty>Nenhuma conta social adicionada.</Empty>}</div></section><section className="max-w-2xl border-t py-6"><h2 className="font-semibold">Privacidade e dados</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">A exclusão automática da conta e dos dados ainda não está disponível. Antes do lançamento público, o responsável pela plataforma deve disponibilizar um canal para solicitações LGPD.</p></section></>;
}
