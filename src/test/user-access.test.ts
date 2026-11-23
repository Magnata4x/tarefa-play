import { describe, expect, it } from "vitest";
import { accountHome, canAccessArea } from "@/lib/user-access";

describe("Three system user types", () => {
  it("restricts the ADM page to an assigned admin role", () => {
    expect(canAccessArea(["admin"], "admin")).toBe(true);
    expect(canAccessArea(["user", "advertiser"], "admin")).toBe(false);
    expect(canAccessArea([], "admin")).toBe(false);
  });
  it("keeps the validator task area distinct from the advertiser area", () => {
    expect(canAccessArea(["user"], "user")).toBe(true);
    expect(canAccessArea(["user"], "advertiser")).toBe(false);
    expect(canAccessArea(["advertiser"], "user")).toBe(false);
  });
  it("requires advertiser permission for the advertiser page", () => {
    expect(canAccessArea(["advertiser"], "advertiser")).toBe(true);
    expect(canAccessArea(["admin"], "advertiser")).toBe(false);
  });
  it("opens the assigned user's area without granting additional roles", () => {
    expect(accountHome(["user"])).toBe("/dashboard");
    expect(accountHome(["advertiser"])).toBe("/anunciante");
    expect(accountHome(["admin"])).toBe("/admin");
  });
});