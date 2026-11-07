import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/migrations/0005_f05_authenticated_rpc_acl_and_task_limit.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("F-05 authenticated RPC ACL and task limit migration", () => {
  it("removes anonymous and service-role execution from user-context RPCs", () => {
    for (const signature of [
      "start_task(uuid)",
      "submit_task(uuid, text, text, text)",
      "contest_submission(uuid)",
      "admin_set_withdrawal(uuid, public.withdrawal_status)",
      "become_advertiser()",
      "create_campaign(text, text, text, text, text, numeric, integer, integer, boolean, text)",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon, service_role`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${signature} TO authenticated`);
    }
  });

  it("serializes daily starts by locking the caller profile and preserves protected streak updates", () => {
    expect(migration).toMatch(/FROM public\.profiles[\s\S]*FOR UPDATE[\s\S]*SELECT count\(\)::integer[\s\S]*daily_limit/i);
    expect(migration).toMatch(/SELECT started_at[\s\S]*IF t IS NOT NULL THEN\s+RETURN t/i);
    expect(migration).toMatch(/set_config\('app\.trusted', '1', true\)[\s\S]*UPDATE public\.profiles/i);
  });

  it("requires an authenticated owner and locks a submission before contesting", () => {
    expect(migration).toMatch(/IF auth\.uid\(\) IS NULL[\s\S]*FOR UPDATE[\s\S]*status <> 'rejeitada'/i);
  });

  it("does not delete or truncate business data", () => {
    expect(migration).not.toMatch(/\b(TRUNCATE|DROP TABLE|DELETE FROM)\b/i);
  });
});
