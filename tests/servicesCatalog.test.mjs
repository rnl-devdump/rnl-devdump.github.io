import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  verifyAdminAuthorization,
  normalizeSubdomainUrl,
  formatDisplayHost,
  mergeRemoteSublinks,
} from "../src/dashboard/config/servicesCatalog.js";

describe("Console Security & Subdomain Catalog", () => {
  test("verifyAdminAuthorization enforces custom claim or verified allowlist email", () => {
    assert.equal(verifyAdminAuthorization(null, null), false);

    // Unverified email on allowlist must be rejected
    assert.equal(
      verifyAdminAuthorization(
        { email: "admin@kiruu.xyz", emailVerified: false },
        { claims: {} }
      ),
      false
    );

    // Arbitrary @kiruu.xyz email without claim must be rejected (no wildcard regex)
    assert.equal(
      verifyAdminAuthorization(
        { email: "intruder@kiruu.xyz", emailVerified: true },
        { claims: {} }
      ),
      false
    );

    // Verified allowlist email is accepted
    assert.equal(
      verifyAdminAuthorization(
        { email: "iamk1ruu@gmail.com", emailVerified: true },
        { claims: {} }
      ),
      true
    );

    // Custom admin claim is accepted
    assert.equal(
      verifyAdminAuthorization(
        { email: "ops@example.com", emailVerified: false },
        { claims: { admin: true } }
      ),
      true
    );
  });

  test("normalizeSubdomainUrl converts legacy /<sublink> paths to https://<sublink>.kiruu.xyz", () => {
    assert.equal(normalizeSubdomainUrl("/tawir", "tawir"), "https://tawir.kiruu.xyz");
    assert.equal(normalizeSubdomainUrl("/tawir-beta", "tawir-beta"), "https://tawir.kiruu.xyz/beta/");
    assert.equal(normalizeSubdomainUrl("/tawir-dev", "tawir-dev"), "https://tawir.kiruu.xyz/beta/");
    assert.equal(normalizeSubdomainUrl("/dashboard", "dashboard"), "https://console.kiruu.xyz");
    assert.equal(normalizeSubdomainUrl("/anime/", "anime"), "https://anime.kiruu.xyz");
    assert.equal(normalizeSubdomainUrl("javascript:alert(1)", "movie"), "https://movie.kiruu.xyz");
  });

  test("formatDisplayHost returns clean host and path without trailing slash", () => {
    assert.equal(formatDisplayHost("https://tawir.kiruu.xyz", "tawir"), "tawir.kiruu.xyz");
    assert.equal(
      formatDisplayHost("https://tawir.kiruu.xyz/beta/", "tawir-beta"),
      "tawir.kiruu.xyz/beta"
    );
  });

  test("mergeRemoteSublinks consolidates tawir-dev into tawir-beta and strips retired console/convo entries", () => {
    const merged = mergeRemoteSublinks({
      "tawir-dev": { enabled: false, message: "Beta maintenance" },
      "tawir-convo": { enabled: true },
      dashboard: { enabled: true },
      anime: { enabled: false, offlineType: "forbidden", message: "Restricted" },
    });

    assert.equal(merged["tawir-beta"].enabled, false);
    assert.equal(merged["tawir-beta"].url, "https://tawir.kiruu.xyz/beta/");
    assert.equal(merged["tawir-convo"], undefined);
    assert.equal(merged.dashboard, undefined);
    assert.equal(merged.anime.enabled, false);
    assert.equal(merged.anime.offlineType, "forbidden");
    assert.equal(merged.anime.url, "https://anime.kiruu.xyz");
  });
});
