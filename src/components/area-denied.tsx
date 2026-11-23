import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AreaDenied() {
  return <section role="alert" className="space-y-4 py-12">
    <ShieldAlert className="size-8 text-destructive" />
    <h1 className="text-2xl font-bold">Acesso restrito</h1>
    <p className="text-muted-foreground">Sua conta não possui permissão para esta área.</p>
    <Button asChild variant="outline"><Link to="/perfil">Meu perfil</Link></Button>
  </section>;
}