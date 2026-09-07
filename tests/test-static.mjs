// Static, browser-free tests for the foundation layer (schema, identity
// comparison, cache, state machine, execution plan, duplicate detection)
// plus manifest/CSP checks.
//
// DOM-dependent behavior lives in separate jsdom-based test files:
// identityLock.readRtsIdentityFromPage() -> test-identity-lock.mjs,
// the Name Variations workflow -> test-name-variations.mjs. Everything
// else that still needs a real RTS DOM stays untested until evidenced
// (see docs/evidence-checklist.md).

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

import "../core/schema.js";
import "../core/identityLock.js";
import "../core/duplicates.js";
import "../core/cache.js";
import "../core/stateMachine.js";
import "../registry/businessEntity.nameVariations.js";
import "../registry/businessEntity.general.js";
import "../registry/company.sic.js";
import "../registry/index.js";
import "../core/promptBuilder.js";
import "../core/executionPlan.js";

const { schema, identityLock, duplicates, cache, stateMachine, registry, executionPlan, promptBuilder } = globalThis.SXRTS;

function validJson(overrides = {}) {
  return JSON.stringify({
    schemaVersion: "1.0",
    profileIdentity: { companyName: "Psypher", pbId: "PB-1", entityId: null, domain: "psypher.in" },
    businessEntity: {},
    company: {},
    ...overrides
  });
}

// ---- Manifest / CSP ----

test("manifest requests only activeTab, scripting, and storage", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.permissions.slice().sort(), ["activeTab", "scripting", "storage"]);
  assert.equal(manifest.manifest_version, 3);
});

test("CSP blocks remote script and network connections", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  const csp = manifest.content_security_policy.extension_pages;
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /object-src 'none'/);
});

// ---- Schema validation ----

test("accepts a minimal valid document", () => {
  const result = schema.validate(validJson());
  assert.equal(result.schemaVersion, "1.0");
  assert.equal(result.profileIdentity.companyName, "Psypher");
});

test("strips code fences before parsing", () => {
  const result = schema.validate("```json\n" + validJson() + "\n```");
  assert.equal(result.profileIdentity.pbId, "PB-1");
});

test("rejects wrong schemaVersion", () => {
  assert.throws(() => schema.validate(validJson({ schemaVersion: "2.0" })), schema.SchemaValidationError);
});

test("rejects malformed JSON", () => {
  assert.throws(() => schema.validate("{not json"), schema.SchemaValidationError);
});

test("rejects profileIdentity with no strong identifier", () => {
  assert.throws(() => schema.validate(validJson({ profileIdentity: { companyName: "X", pbId: null, entityId: null, domain: null } })));
});

test("reports unknown top-level keys as warnings, not errors", () => {
  const result = schema.validate(validJson({ unexpectedKey: "value" }));
  assert.ok(result.warnings.some((w) => w.includes("unexpectedKey")));
});

test("reports unknown nested keys as warnings", () => {
  const result = schema.validate(validJson({ company: { notARealField: true } }));
  assert.ok(result.warnings.some((w) => w.includes("company.notARealField")));
});

test("accepts null envelope value (unverified) but rejects wrong type", () => {
  const ok = schema.validate(validJson({ company: { briefDescription: { value: null, action: "skip" } } }));
  assert.equal(ok.company.briefDescription.value, null);
  assert.throws(() => schema.validate(validJson({ company: { briefDescription: { value: 42, action: "skip" } } })));
});

test("rejects invalid date format", () => {
  const bad = validJson({
    businessEntity: { nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing", sourceDate: "2024-01-01" }] }
  });
  assert.throws(() => schema.validate(bad));
});

test("accepts valid MM/DD/YYYY date", () => {
  const good = validJson({
    businessEntity: { nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing", sourceDate: "01/15/2024" }] }
  });
  assert.doesNotThrow(() => schema.validate(good));
});

test("rejects non-HTTPS URL", () => {
  const bad = validJson({ businessEntity: { websiteAddresses: [{ value: "http://psypher.in", action: "addIfMissing" }] } });
  assert.throws(() => schema.validate(bad));
});

test("rejects unsupported action value", () => {
  const bad = validJson({ company: { keywords: [{ value: "fintech", action: "forceReplace" }] } });
  assert.throws(() => schema.validate(bad));
});

// ---- Identity lock ----

test("identity match when domain agrees", () => {
  const result = identityLock.compareIdentity({ domain: "www.psypher.in" }, { domain: "psypher.in" });
  assert.equal(result.status, "match");
});

test("identity mismatch when pbId disagrees", () => {
  const result = identityLock.compareIdentity({ pbId: "PB-1" }, { pbId: "PB-2" });
  assert.equal(result.status, "mismatch");
});

test("identity insufficient when no strong identifier overlaps", () => {
  const result = identityLock.compareIdentity({ companyName: "Psypher" }, {});
  assert.equal(result.status, "insufficient");
});

// ---- Duplicate detection ----

test("detects a duplicate name variation by normalized name+type", () => {
  const existing = [{ name: "Psypher  Inc.", type: "Legal Name" }];
  const isDup = duplicates.isDuplicateRecord(existing, { name: "psypher inc.", type: "legal name" }, ["name", "type"]);
  assert.equal(isDup, true);
});

test("does not flag different types as duplicates", () => {
  const existing = [{ name: "Psypher", type: "Legal Name" }];
  const isDup = duplicates.isDuplicateRecord(existing, { name: "Psypher", type: "Former Name" }, ["name", "type"]);
  assert.equal(isDup, false);
});

test("detects duplicate SMI by network+handle", () => {
  const existing = [{ network: "LinkedIn", handleOrUrl: "https://linkedin.com/company/psypher" }];
  const isDup = duplicates.isDuplicateRecord(existing, { network: "linkedin", handleOrUrl: "HTTPS://LINKEDIN.COM/COMPANY/PSYPHER" }, ["network", "handleOrUrl"]);
  assert.equal(isDup, true);
});

// ---- State machine ----

test("allows the full happy-path transition sequence", () => {
  const path = ["pending", "validated", "navigating", "editing", "valueVerified", "awaitingSave", "saving", "saved", "savedValueVerified"];
  let current = path[0];
  for (const next of path.slice(1)) {
    current = stateMachine.transition(current, next);
  }
  assert.equal(current, "savedValueVerified");
  assert.equal(stateMachine.isComplete(current), true);
});

test("rejects skipping straight from editing to saved", () => {
  assert.throws(() => stateMachine.transition("editing", "saved"));
});

test("valueVerified and editing are never treated as complete", () => {
  assert.equal(stateMachine.isComplete("editing"), false);
  assert.equal(stateMachine.isComplete("valueVerified"), false);
});

// ---- Cache separation ----

test("different profiles get different cache keys", () => {
  const keyA = cache.profileKeyFor({ pbId: "PB-1" });
  const keyB = cache.profileKeyFor({ pbId: "PB-2" });
  assert.notEqual(keyA, keyB);
});

test("cache key falls back to normalized domain when no pbId/entityId", () => {
  const key = cache.profileKeyFor({ domain: "WWW.Psypher.in/" });
  assert.match(key, /psypher\.in$/);
});

test("cache key throws when identity has no usable identifier", () => {
  assert.throws(() => cache.profileKeyFor({}));
});

test("input hash changes when the input changes", async () => {
  const hashA = await cache.computeInputHash({ a: 1 });
  const hashB = await cache.computeInputHash({ a: 2 });
  const hashA2 = await cache.computeInputHash({ a: 1 });
  assert.notEqual(hashA, hashB);
  assert.equal(hashA, hashA2);
});

test("profile cache get/set/clear round-trips through chrome.storage.local", async () => {
  const store = new Map();
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return store.has(key) ? { [key]: store.get(key) } : {}; },
        async set(obj) { for (const [k, v] of Object.entries(obj)) store.set(k, v); },
        async remove(key) { store.delete(key); }
      }
    }
  };
  const identity = { pbId: "PB-1" };
  assert.equal(await cache.getProfileCache(identity), null);
  await cache.setProfileCache(identity, { executionPlan: [] });
  const stored = await cache.getProfileCache(identity);
  assert.deepEqual(stored.executionPlan, []);
  await cache.clearProfileCache(identity);
  assert.equal(await cache.getProfileCache(identity), null);
});

// ---- Execution plan ----

test("skips fields with no registry entry at all", () => {
  const validated = schema.validate(validJson({ company: { briefDescription: { value: "A company.", action: "addIfMissing" } } }));
  const actions = executionPlan.buildExecutionPlan(validated);
  const action = actions.find((a) => a.jsonPath === "company.briefDescription");
  assert.equal(action.executionStatus, "skipped");
  assert.match(action.skipReason, /No selector registry entry/);
});

test("businessEntity.nameVariations is evidenced and ready", () => {
  assert.equal(registry.isReady("businessEntity.nameVariations"), true);
});

test("skips fields registered but not yet evidenced", () => {
  // Register a throwaway "missing" entry under a jsonPath no real
  // registry file uses, so this test doesn't depend on — or collide
  // with — which real fields happen to be evidenced.
  globalThis.SXRTS.registryEntries.push({
    key: "company.employeeHistory",
    area: "Company",
    evidenceStatus: "missing",
    saveButton: {}
  });
  const validated = schema.validate(validJson({
    company: { employeeHistory: [{ count: 10, action: "addIfMissing" }] }
  }));
  const actions = executionPlan.buildExecutionPlan(validated);
  const action = actions.find((a) => a.jsonPath === "company.employeeHistory");
  assert.equal(action.executionStatus, "skipped");
  assert.match(action.skipReason, /marked "missing"/);
});

test("builds a pending (not skipped) action for an evidenced, ready field", () => {
  const validated = schema.validate(validJson({
    businessEntity: { nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing" }] }
  }));
  const actions = executionPlan.buildExecutionPlan(validated);
  const action = actions.find((a) => a.jsonPath === "businessEntity.nameVariations");
  assert.equal(action.executionStatus, "pending");
  assert.equal(action.area, "Business Entity");
});

test("does not build an action for an explicit skip", () => {
  const validated = schema.validate(validJson({ company: { keywords: [{ value: "fintech", action: "skip" }] } }));
  const actions = executionPlan.buildExecutionPlan(validated);
  assert.equal(actions.some((a) => a.jsonPath === "company.keywords"), false);
});

test("does not build an action for an unset envelope value", () => {
  const validated = schema.validate(validJson({ company: { startDate: { value: null, action: "updateIfBlank" } } }));
  const actions = executionPlan.buildExecutionPlan(validated);
  assert.equal(actions.some((a) => a.jsonPath === "company.startDate"), false);
});

// ---- Prompt builder ----

test("prompt includes the company name and website", () => {
  const prompt = promptBuilder.buildPrompt({ companyName: "Psypher", domain: "www.psypher.in" });
  assert.match(prompt, /Company name: Psypher/);
  assert.match(prompt, /Official website: www\.psypher\.in/);
});

test("prompt lists every evidenced Name Type, Email Default Structure, and SIC Source option", () => {
  const prompt = promptBuilder.buildPrompt({});
  for (const label of registry.getField("businessEntity.nameVariations").form.typeDropdown.options.map((o) => o.label)) {
    assert.ok(prompt.includes(label), `missing Name Type "${label}"`);
  }
  assert.equal((registry.getField("businessEntity.emailDefaultStructure").form.select.options.map((o) => o.label))
    .filter((label) => !prompt.includes(label)).length, 0);
  for (const label of ["Morningstar", "PitchBook", "SEC"]) {
    assert.ok(prompt.includes(label), `missing SIC Source "${label}"`);
  }
});

test("prompt output is itself accepted by the schema validator once wrapped in real values", () => {
  const sample = JSON.stringify({
    schemaVersion: "1.0",
    profileIdentity: { companyName: "Psypher", pbId: null, entityId: null, domain: "psypher.in" },
    businessEntity: {
      nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing", source: "https://psypher.in/about", sourceDate: null, confidence: "high" }],
      emailDefaultStructure: { value: "FirstName@domain.com", action: "addIfMissing", source: null, confidence: "medium" }
    },
    company: {
      sicCodes: [{ code: "7372", classificationSource: "PitchBook", action: "addIfMissing", source: null }]
    }
  });
  assert.doesNotThrow(() => schema.validate(sample));
});
