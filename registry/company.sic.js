"use strict";

/*
 * Company > SIC records. Evidenced from Protocol DMC Spain: a code input
 * (name="code", class "numberField", plus a per-row codeid attribute on
 * existing rows) paired with a Source <select name="source"> (blank /
 * Morningstar / PitchBook / SEC), an Add button with a stable onclick
 * hook (companySic.add()), and a Save button (#saveSicIndustryPath,
 * data-free but a stable id) that starts disabled="disabled".
 *
 * evidenceStatus is "in-review", not "ready": no before/after-save
 * screenshot pair was supplied, so — as with
 * registry/businessEntity.general.js — the "Save button returns to
 * disabled" verification signal is inferred from its initial state, not
 * directly confirmed. It's also unconfirmed whether "Add New Sic
 * Industry Path" adds a simple inline row (assumed here, matching the
 * code/source fields as given) or opens its own hierarchy popup like
 * Industries/Verticals.
 */
(() => {
  const SOURCE_OPTIONS = [
    { code: "1", label: "Morningstar" },
    { code: "2", label: "PitchBook" },
    { code: "3", label: "SEC" }
  ];

  const ENTRY = {
    key: "company.sicCodes",
    jsonPath: "company.sicCodes",
    area: "Company",
    section: "SIC",
    controlKind: "repeatableRecord",
    addButton: { candidates: ['[onclick="companySic.add()"]'] },
    form: {
      codeInput: { candidates: ["input.numberField[name=\"code\"]"] },
      sourceDropdown: { candidates: ['select[name="source"]'], options: SOURCE_OPTIONS }
    },
    saveButton: { scopedTo: "Company > SIC", candidates: ["#saveSicIndustryPath"] },
    verification: { method: "disabledAfterSaveAndValueMatch" },
    duplicateRule: { normalize: "trim+collapseSpaces+lowercase", matchOn: ["code"] },
    evidenceStatus: "in-review",
    required: false
  };

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.registryEntries = globalThis.SXRTS.registryEntries || [];
  globalThis.SXRTS.registryEntries.push(ENTRY);
})();
