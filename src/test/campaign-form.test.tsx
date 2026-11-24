import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignForm } from "@/components/campaign-form";

const { rpc, refresh } = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/components/workspace-ui", () => ({ useRefreshWorkspace: () => refresh }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  rpc.mockReset(); refresh.mockReset(); rpc.mockResolvedValue({ data: "campaign-1", error: null });
});

function fillCampaign() {
  fireEvent.click(screen.getByRole("button", { name: "Nova campanha" }));
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Visitar página do produto" } });
  fireEvent.change(screen.getByLabelText("Link da tarefa"), { target: { value: "https://example.com/product" } });
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Conhecer o produto" } });
  fireEvent.change(screen.getByLabelText("Instruções para comprovação"), { target: { value: "Enviar imagem da página" } });
  return screen.getByRole("button", { name: "Confirmar e enviar para análise" });
}

describe("Advertiser campaign creation", () => {
  it("submits the advertiser's task through the existing operation and refreshes saved data", async () => {
    render(<CampaignForm balance={10} commission={35} />);
    fireEvent.click(fillCampaign());
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("create_campaign", {
      _titulo: "Visitar página do produto", _descricao: "Conhecer o produto", _rede: "site", _tipo: "visitar",
      _url: "https://example.com/product", _recompensa: 0.5, _quantidade: 10, _tempo: 30,
      _exige_prova: true, _instrucoes: "Enviar imagem da página",
    }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
  it("does not spend a R$ 5 balance on a R$ 6.75 campaign with the 35% commission", () => {
    render(<CampaignForm balance={5} commission={35} />);
    const submit = fillCampaign();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(rpc).not.toHaveBeenCalled();
  });
});