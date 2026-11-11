import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/anunciante")({
  head: () => pageHead("Anunciante", "Área de campanhas do anunciante no Tarefa-Play."),
  component: () => (
    <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Em construção.</div>
  ),
});
