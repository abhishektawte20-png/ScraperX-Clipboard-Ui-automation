"use strict";

/*
 * Selector registry. Each entry describes one RTS field/workflow. A field is
 * only executable once evidenceStatus is "ready" and its selector
 * candidates are filled in from real DOM extracts (see
 * docs/evidence-checklist.md). Until then the execution plan builder skips
 * it and reports the reason instead of guessing.
 *
 * jsonPath must match a path produced by core/schema.js (e.g.
 * "businessEntity.nameVariations").
 */
(() => {
  const REGISTRY = [
    {
      key: "businessEntity.nameVariations",
      jsonPath: "businessEntity.nameVariations",
      area: "Business Entity",
      section: "Entity",
      controlKind: "repeatableRecord",
      navigation: { candidates: [] },
      addButton: { candidates: [] },
      form: { nameInput: { candidates: [] }, typeDropdown: { candidates: [], options: [] } },
      saveButton: { scopedTo: "sectionSelector", candidates: [] },
      verification: { method: "readBackAfterSave", selector: null },
      duplicateRule: { normalize: "trim+collapseSpaces+lowercase", matchOn: ["name", "type"] },
      evidenceStatus: "missing",
      required: false
    }
    // Additional entries are added only once their full DOM evidence
    // (section, Add button, opened form, every open dropdown, Save button,
    // and the saved record) has been supplied and reviewed.
  ];

  function getField(key) {
    return REGISTRY.find((entry) => entry.key === key) || null;
  }

  function isReady(key) {
    return getField(key)?.evidenceStatus === "ready";
  }

  function listByArea(area) {
    return REGISTRY.filter((entry) => entry.area === area);
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.registry = { REGISTRY, getField, isReady, listByArea };
})();
