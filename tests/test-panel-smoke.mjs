// Smoke test for content/panel.js: mounts the real panel into a bare
// jsdom page (no RTS markup at all) and exercises the parts that don't
// require a live RTS DOM — validation, preview rendering, cache writes,
// and that Publish correctly blocks via the identity lock when no RTS
// identity can be read. This does NOT exercise the DOM-mutating
// workflows themselves (those have their own dedicated fixture tests).

import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

import "../core/schema.js";
import "../core/identityLock.js";
import "../core/duplicates.js";
import "../core/cache.js";
import "../core/stateMachine.js";
import "../core/adapters/textField.js";
import "../core/adapters/nativeSelect.js";
import "../core/adapters/contentEditable.js";
import "../registry/businessEntity.nameVariations.js";
import "../registry/businessEntity.general.js";
import "../registry/company.sic.js";
import "../registry/company.sites.js";
import "../registry/index.js";
import "../core/promptBuilder.js";
import "../core/executionPlan.js";
import "../core/workflows/businessEntityNameVariations.js";
import "../core/workflows/businessEntityGeneral.js";
import "../core/workflows/companySic.js";
import "../content/panel.js";

function setupDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.Event = window.Event;
  global.InputEvent = window.InputEvent;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.confirm = () => true;
  const store = new Map();
  global.chrome = {
    storage: {
      local: {
        async get(key) { return store.has(key) ? { [key]: store.get(key) } : {}; },
        async set(obj) { for (const [k, v] of Object.entries(obj)) store.set(k, v); },
        async remove(key) { store.delete(key); }
      }
    }
  };

  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  globalThis.SXRTS.panel.mount(shadow);
  return { dom, shadow };
}

function textOf(shadow, selector) {
  return shadow.querySelector(selector)?.textContent ?? "";
}

test("mounts without throwing and shows the ScraperX brand", () => {
  const { shadow } = setupDom();
  assert.match(textOf(shadow, ".brand-text h1"), /ScraperX/);
  assert.ok(shadow.querySelector("#sxrts-response"));
});

test("validating a valid response builds a preview with the expected row count", () => {
  const { shadow } = setupDom();
  const responseArea = shadow.querySelector("#sxrts-response");
  responseArea.value = JSON.stringify({
    schemaVersion: "1.0",
    profileIdentity: { companyName: "Psypher", pbId: "PB-1", domain: "psypher.in" },
    businessEntity: {
      nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing" }],
      websiteAddresses: [{ value: "www.psypher.in", action: "addIfMissing" }]
    }
  });
  responseArea.dispatchEvent(new window.Event("input", { bubbles: true }));

  const validateButton = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Validate JSON");
  validateButton.click();

  const rows = shadow.querySelectorAll(".action-card");
  assert.equal(rows.length, 2);
  const publishButton = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Publish selected to RTS");
  assert.equal(publishButton.disabled, false);
});

test("a record's proposed value renders as labeled, individually editable fields (not a raw JSON blob)", () => {
  const { shadow } = setupDom();
  const responseArea = shadow.querySelector("#sxrts-response");
  responseArea.value = JSON.stringify({
    schemaVersion: "1.0",
    profileIdentity: { companyName: "Psypher", pbId: "PB-1", domain: "psypher.in" },
    businessEntity: { nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing" }] }
  });
  Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Validate JSON").click();

  const card = shadow.querySelector(".action-card");
  const labels = Array.from(card.querySelectorAll(".value-field-label")).map((el) => el.textContent);
  assert.ok(labels.includes("name"));
  assert.ok(labels.includes("type"));

  const nameField = Array.from(card.querySelectorAll(".value-field")).find((f) => f.querySelector(".value-field-label").textContent === "name");
  const nameInput = nameField.querySelector("input, textarea");
  assert.equal(nameInput.value, "Psypher Inc");
  nameInput.value = "Psypher Incorporated"; // simulate a manual correction
  assert.equal(nameInput.value, "Psypher Incorporated"); // no JSON parsing involved, nothing to silently discard
});

test("rejects invalid JSON without building a preview", () => {
  const { shadow } = setupDom();
  const responseArea = shadow.querySelector("#sxrts-response");
  responseArea.value = "{not valid json";
  const validateButton = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Validate JSON");
  validateButton.click();
  const previewCard = Array.from(shadow.querySelectorAll(".card")).find((c) => c.textContent.includes("Preview, edit"));
  assert.ok(previewCard.classList.contains("hidden"));
});

test("publish blocks via the identity lock when no RTS page is present", async () => {
  const { shadow } = setupDom();
  const responseArea = shadow.querySelector("#sxrts-response");
  responseArea.value = JSON.stringify({
    schemaVersion: "1.0",
    profileIdentity: { companyName: "Psypher", pbId: "PB-1", domain: "psypher.in" },
    businessEntity: { nameVariations: [{ name: "Psypher Inc", type: "Legal Name", action: "addIfMissing" }] }
  });
  Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Validate JSON").click();

  const publishButton = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Publish selected to RTS");
  publishButton.click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const statuses = shadow.querySelectorAll(".status");
  const publishStatus = statuses[statuses.length - 1];
  assert.match(publishStatus.textContent, /Blocked:/);
});

test("clear cache button does not throw when no cache exists yet", async () => {
  const { shadow } = setupDom();
  const clearButton = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Clear cache for this profile");
  assert.doesNotThrow(() => clearButton.click());
});

test("copy agent setup instructions button exists and does not throw without a clipboard API", () => {
  const { shadow } = setupDom();
  const button = Array.from(shadow.querySelectorAll("button")).find((b) => b.textContent === "Copy agent setup instructions");
  assert.ok(button);
  assert.doesNotThrow(() => button.click());
});
