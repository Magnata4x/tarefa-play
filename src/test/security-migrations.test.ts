import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/migrations/0002_security_rpc_guards.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("privileged RPC security migration", () => {
  it("requires an authenticated actor before reviewing submissions", () => {
    const body = migration.split("create or replace function public.review_submission")[1]
      ?.split("--> statement-breakpoint")[0] ?? "";

    expect(body).toMatch(/v_user_id\s+is\s+null/i);
    expect(body).toMatch(/v_owner\s+is\s+distinct\s+from\s+v_user_id/i);
    expect(body).toMatch(/revoke all on function public\.review_submission[\s\S]*from public, anon/i);
    expect(body).toMatch(/grant execute on function public\.review_submission[\s\S]*to authenticated/i);
  });

  it("requires an authenticated owner or admin before changing campaign status", () => {
    const body = migration.split("create or replace function public.set_campaign_status")[1]
      ?.split("--> statement-breakpoint")[0] ?? "";

    expect(body).toMatch(/v_user_id\s+is\s+null/i);
    expect(body).toMatch(/not v_is_admin and c\.advertiser_id is distinct from v_user_id/i);
    expect(body).toMatch(/if not found then[\s\S]*Campanha não encontrada/i);
    expect(body).toMatch(/revoke all on function public\.set_campaign_status[\s\S]*from public, anon/i);
    expect(body).toMatch(/grant execute on function public\.set_campaign_status[\s\S]*to authenticated/i);
  });

  it("does not allow simulated deposits to credit balances", () => {
    const body = migration.split("create or replace function public.mock_deposit")[1] ?? "";

    expect(body).toMatch(/raise exception 'Depósitos simulados desativados/i);
    expect(body).not.toMatch(/update public\.advertiser_wallets set saldo\s*=\s*saldo\s*\+/i);
    expect(body).toMatch(/revoke all on function public\.mock_deposit[\s\S]*from public, anon, authenticated, service_role/i);
  });
});
