import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Home, ListChecks, Wallet, ClipboardList, Megaphone, Shield, LogOut, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { WorkspaceError, WorkspaceNotFound } from "@/components/workspace-ui";
import { brl } from "@/lib/tp";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/minhas-tarefas", label: "Minhas", icon: ClipboardList },
  { to: "/carteira", label: "Carteira", icon: Wallet },
] as const;

function Shell() {
  const { data } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = data?.roles.includes("admin");
  const linkCls =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  const active = { className: "bg-accent text-foreground" };
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/dashboard" className="font-display text-lg font-extrabold">
            Tarefa<span className="text-gradient">-Play</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={linkCls} activeProps={active}>
                <n.icon className="size-4" /> {n.label}
              </Link>
            ))}
            <Link to="/indicacoes" className={linkCls} activeProps={active}>
              <Users className="size-4" /> Indicações
            </Link>
            <Link to="/anunciante" className={linkCls} activeProps={active}>
              <Megaphone className="size-4" /> Anunciante
            </Link>
            {isAdmin && (
              <Link to="/admin" className={linkCls} activeProps={active}>
                <Shield className="size-4" /> Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/carteira" className="rounded-full bg-earn/15 px-3 py-1 text-sm font-bold text-earn">
              {brl(data?.wallet?.saldo_disponivel)}
            </Link>
            <Link to="/perfil" className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Perfil">
              <User className="size-4" />
            </Link>
            <Button variant="ghost" size="icon"
              aria-label="Sair"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary-glow" }}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
        <Link
          to="/anunciante"
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
          activeProps={{ className: "text-primary-glow" }}
        >
          <Megaphone className="size-5" />
          Anunciar
        </Link>
      </nav>
    </div>
  );
}
