import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Administração", "Área de administração do Tarefa-Play."),
  component: () => (
    <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Em construção.</div>
  ),
});
