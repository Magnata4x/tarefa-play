import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/migrations/0004_f04_rpc_pix_validation.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("F-04 RPC and Pix hardening migration", () => {
  it("limits identity-dependent RPCs to authenticated end-user calls", () => {
    expect(migration).toMatch(/revoke all on function public\.release_my_pending\(\) from public, anon, service_role/i);
    expect(migration).toMatch(/revoke all on function public\.has_role\(uuid, public\.app_role\) from public, anon, service_role/i);
    expect(migration).toMatch(/revoke all on function public\.request_withdrawal\(numeric, text, text\) from public, anon, service_role/i);
    expect(migration).toMatch(/grant execute on function public\.request_withdrawal[\s\S]*to authenticated/i);
  });

  it("validates Pix key type and value before touching wallet balances", () => {
    const validation = migration.split("PERFORM public.release_my_pending()")[0] ?? "";
    expect(validation).toMatch(/Tipo de chave Pix inválido/);
    expect(validation).toMatch(/Informe a chave Pix/);
    expect(validation).toMatch(/Chave Pix CPF inválida/);
    expect(validation).toMatch(/Chave Pix e-mail inválida/);
    expect(validation).toMatch(/Chave Pix telefone inválida/);
    expect(validation).toMatch(/Chave Pix aleatória inválida/);
  });

  it("keeps the wallet lock before the 24-hour limit and debit", () => {
    expect(migration).toMatch(/FROM public\.wallets[\s\S]*FOR UPDATE[\s\S]*created_at > now\(\) - interval '24 hours'[\s\S]*saldo_disponivel = saldo_disponivel - _valor/i);
  });

  it("does not mutate financial rows while applying the migration", () => {
    const setup = migration.split("CREATE OR REPLACE FUNCTION public.request_withdrawal")[0] ?? "";
    expect(migration).not.toMatch(/\b(TRUNCATE|DROP TABLE|DELETE FROM public\.(wallets|wallet_transactions|withdrawals))\b/i);
    expect(setup).not.toMatch(/\b(INSERT INTO|UPDATE|DELETE FROM) public\.(wallets|wallet_transactions|withdrawals)\b/i);
  });
});
