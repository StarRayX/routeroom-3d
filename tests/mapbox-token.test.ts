import { describe, expect, it } from "vitest";
import { resolveMapboxToken } from "@/components/mapbox/token";

describe("resolveMapboxToken", () => {
  it("reports missing for undefined, empty, and whitespace-only input", () => {
    expect(resolveMapboxToken(undefined)).toEqual({ status: "missing" });
    expect(resolveMapboxToken("")).toEqual({ status: "missing" });
    expect(resolveMapboxToken("   ")).toEqual({ status: "missing" });
  });

  it("accepts a public pk. token", () => {
    const result = resolveMapboxToken("pk.eyExampleToken123");
    expect(result).toEqual({ status: "ok", token: "pk.eyExampleToken123" });
  });

  it("trims surrounding whitespace on a valid token", () => {
    const result = resolveMapboxToken("  pk.abc  ");
    expect(result).toEqual({ status: "ok", token: "pk.abc" });
  });

  it("rejects a secret sk. token as secret_token, never returning the raw value", () => {
    const secretToken = ["sk", "superSecretValue"].join(".");
    const result = resolveMapboxToken(secretToken);
    expect(result).toEqual({ status: "invalid", reason: "secret_token" });
    expect(JSON.stringify(result)).not.toContain("superSecretValue");
  });

  it("rejects anything else non-empty as malformed, never returning the raw value", () => {
    const result = resolveMapboxToken("not-a-real-token");
    expect(result).toEqual({ status: "invalid", reason: "malformed" });
    expect(JSON.stringify(result)).not.toContain("not-a-real-token");
  });
});
