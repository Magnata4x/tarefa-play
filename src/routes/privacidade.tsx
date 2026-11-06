import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "privacidade — Tarefa-Play" }, { name: "description", content: "Tarefa-Play: privacidade." }, { property: "og:title", content: "privacidade — Tarefa-Play" }, { property: "og:description", content: "Tarefa-Play: privacidade." }] }),
  component: () => (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-muted-foreground">Documento em elaboração. Os ganhos variam e não são garantidos. Uso exclusivo para maiores de 18 anos.</p>
      <Link to="/" className="mt-4 inline-block text-primary-glow underline">Voltar</Link>
    </div>
  ),
});
