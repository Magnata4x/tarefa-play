export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const LEVELS = [
  { name: "Bronze", min: 0, emoji: "🥉" },
  { name: "Prata", min: 20, emoji: "🥈" },
  { name: "Ouro", min: 100, emoji: "🥇" },
  { name: "Diamante", min: 300, emoji: "💎" },
] as const;

export function levelOf(aprovadas: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (aprovadas >= l.min) idx = i;
  });
  const cur = LEVELS[idx] ?? LEVELS[0];
  const next = LEVELS[idx + 1];
  const progress = next ? ((aprovadas - cur.min) / (next.min - cur.min)) * 100 : 100;
  return { idx, name: cur.name as string, min: cur.min as number, emoji: cur.emoji as string, next, progress };
}

export const NETWORKS: Record<string, { label: string; emoji: string }> = {
  instagram: { label: "Instagram", emoji: "📸" },
  tiktok: { label: "TikTok", emoji: "🎵" },
  youtube: { label: "YouTube", emoji: "▶️" },
  facebook: { label: "Facebook", emoji: "👍" },
  x: { label: "X", emoji: "✖️" },
  kwai: { label: "Kwai", emoji: "🎬" },
  site: { label: "Site", emoji: "🌐" },
};

export const TASK_TYPES: Record<string, string> = {
  assistir: "Assistir vídeo",
  visitar: "Visitar site",
  curtir: "Curtir",
  comentar: "Comentar",
  compartilhar: "Compartilhar",
  seguir: "Seguir",
  avaliar: "Avaliar",
  pesquisa: "Responder pesquisa",
};

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  contestada: "Contestada",
  em_analise: "Em análise",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
  rascunho: "Rascunho",
  solicitado: "Solicitado",
  aprovado: "Aprovado",
  pago: "Pago",
  recusado: "Recusado",
};

/** Cost shown to advertisers: (reward × quantity) + platform commission. */
export function campaignCost(recompensa: number, quantidade: number, comissaoPct: number) {
  const base = Math.round(recompensa * quantidade * 100) / 100;
  const total = Math.round(base * (1 + comissaoPct / 100) * 100) / 100;
  return { base, comissao: Math.round((total - base) * 100) / 100, total };
}

export async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Algo deu errado";
}
