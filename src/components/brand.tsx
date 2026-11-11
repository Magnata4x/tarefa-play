import icon from "@/assets/tarefa-play-icon.png.asset.json";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-display font-extrabold">
      <img src={icon.url} alt="" width={large ? 44 : 32} height={large ? 44 : 32} className={large ? "size-11 shrink-0 object-contain" : "size-8 shrink-0 object-contain"} />
      <span>Tarefa<span className="text-primary-glow">-Play</span></span>
    </span>
  );
}