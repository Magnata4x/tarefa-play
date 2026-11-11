import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/termos")({
  head: () => pageHead("Termos de uso", "Termos de uso e condições de participação no Tarefa-Play."),
  component: () => (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-muted-foreground">Documento em elaboração. Os ganhos variam e não são garantidos. Uso exclusivo para maiores de 18 anos.</p>
      <Link to="/" className="mt-4 inline-block text-primary-glow underline">Voltar</Link>
    </div>
  ),
});
