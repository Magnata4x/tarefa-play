import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { workspaceQuery } from "@/lib/workspace";
import { pageHead } from "@/lib/page-head";
import { NETWORKS, TASK_TYPES } from "@/lib/tp";
import { Input } from "@/components/ui/input";
import { PageTitle, TaskCard, Empty } from "@/components/workspace-ui";

export const Route = createFileRoute("/_authenticated/tarefas")({
  validateSearch: (s: Record<string, unknown>): { rede?: string | undefined; tipo?: string | undefined; q?: string | undefined; sort?: string | undefined } => ({ rede: typeof s['rede'] === 'string' ? s['rede'] : undefined, tipo: typeof s['tipo'] === 'string' ? s['tipo'] : undefined, q: typeof s['q'] === 'string' ? s['q'] : undefined, sort: typeof s['sort'] === 'string' ? s['sort'] : undefined }),
  head: () => pageHead("Tarefas disponíveis", "Encontre microtarefas por rede, tipo e recompensa."), component: Tasks,
});
function Tasks() {
  const { data } = useSuspenseQuery(workspaceQuery); const search = Route.useSearch(); const navigate = Route.useNavigate();
  const mine = data.submissions.filter(s => s.user_id === data.userId);
  const tasks = data.campaigns.filter(c => c.status === "ativa" && c.advertiser_id !== data.userId && c.vagas_restantes > 0 && !mine.some(s => s.campaign_id === c.id) && (!search.rede || c.rede === search.rede) && (!search.tipo || c.tipo_tarefa === search.tipo) && (!search.q || c.titulo.toLowerCase().includes(search.q.toLowerCase()))).sort((a,b) => search.sort === "valor" ? Number(b.recompensa_usuario)-Number(a.recompensa_usuario) : search.sort === "tempo" ? a.tempo_minimo_seg-b.tempo_minimo_seg : b.created_at.localeCompare(a.created_at));
  const update = (key: keyof typeof search, value: string) => navigate({ search: prev => ({ ...prev, [key]: value || undefined }), replace: true });
  return <><PageTitle eyebrow="Explore · Participe · Conquiste" title="Tarefas disponíveis"><span className="text-sm text-muted-foreground">{tasks.length} oportunidades</span></PageTitle><div className="mb-7 grid gap-3 border-y py-5 sm:grid-cols-2 lg:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar tarefas" value={search.q ?? ""} onChange={e => update("q", e.target.value)} placeholder="Buscar tarefa" className="pl-9" /></div><select aria-label="Filtrar por rede" className="h-10 rounded-md border bg-background px-3 text-sm" value={search.rede ?? ""} onChange={e => update("rede",e.target.value)}><option value="">Todas as redes</option>{Object.entries(NETWORKS).map(([key,n]) => <option key={key} value={key}>{n.label}</option>)}</select><select aria-label="Filtrar por tipo" className="h-10 rounded-md border bg-background px-3 text-sm" value={search.tipo ?? ""} onChange={e => update("tipo",e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TASK_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select><div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-muted-foreground" /><select aria-label="Ordenar tarefas" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={search.sort ?? ""} onChange={e => update("sort",e.target.value)}><option value="">Mais recentes</option><option value="valor">Maior recompensa</option><option value="tempo">Menor tempo</option></select></div></div>{tasks.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tasks.map(c => <TaskCard key={c.id} campaign={c} />)}</div> : <Empty>Nenhuma tarefa encontrada para estes filtros.</Empty>}</>;
}
