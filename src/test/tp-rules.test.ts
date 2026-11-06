import { describe, expect, it } from "vitest";
import { campaignCost, levelOf } from "@/lib/tp";

describe("Tarefa-Play rules", () => {
  it("campaign cost adds the default 35% commission", () => {
    expect(campaignCost(0.5, 100, 35)).toEqual({ base: 50, comissao: 17.5, total: 67.5 });
  });
  it("levels: Prata at 20 approved, Ouro at 100, Diamante at 300", () => {
    expect(levelOf(19).name).toBe("Bronze");
    expect(levelOf(20).name).toBe("Prata");
    expect(levelOf(100).name).toBe("Ouro");
    expect(levelOf(300).name).toBe("Diamante");
  });
});
