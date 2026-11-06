import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Search = { redirect?: string | undefined; ref?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    ref: typeof s["ref"] === "string" ? s["ref"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Tarefa-Play" },
      { name: "description", content: "Entre ou crie sua conta no Tarefa-Play." },
      { property: "og:title", content: "Entrar — Tarefa-Play" },
      { property: "og:description", content: "Entre ou crie sua conta no Tarefa-Play." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard");

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

function AuthPage() {
  const { redirect, ref } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">(ref ? "up" : "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    if (ref) localStorage.setItem("tp_ref", ref);
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: target }));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: target });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        if (!aceite) throw new Error("Confirme que tem 18+ e aceita os termos.");
        const savedRef = localStorage.getItem("tp_ref");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { nome, aceite_termos: true, ...(savedRef ? { ref: savedRef } : {}) },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    sessionStorage.setItem("tp_after_login", target);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar agora.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-card/90 p-8 shadow-glow backdrop-blur">
        <Link to="/" className="font-display text-2xl font-extrabold">
          Tarefa<span className="text-gradient">-Play</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold">{mode === "in" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "Entre para continuar ganhando." : "Comece a fazer tarefas em minutos."}
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => oauth("google")}
            className="flex h-11 w-full items-center justify-center gap-[10px] rounded-xl border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]"
          >
            <GoogleG /> Continuar com Google
          </button>
          <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
            Continue with Lovable
          </button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou com e-mail <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {mode === "up" && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(!!v)} className="mt-0.5" />
              <span>
                Tenho 18 anos ou mais e aceito os <Link to="/termos" className="text-primary-glow underline">Termos de Uso</Link> e a{" "}
                <Link to="/privacidade" className="text-primary-glow underline">Política de Privacidade (LGPD)</Link>.
              </span>
            </label>
          )}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
