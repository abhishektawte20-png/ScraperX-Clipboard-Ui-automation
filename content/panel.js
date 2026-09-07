"use strict";

/*
 * ScraperX RTS Profile Assistant panel: identify the profile, build a
 * Rovo prompt, validate the pasted response, preview every proposed
 * change (editable, selectable), then publish only after explicit
 * confirmation. Every publish is profile-scoped-cached so it can be
 * cleared or reviewed later; nothing is ever applied without a fresh
 * identity-lock check first.
 */
(() => {
  function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.id) node.id = options.id;
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.type) node.type = options.type;
    if (options.title) node.title = options.title;
    if (options.value !== undefined) node.value = options.value;
    if (options.checked !== undefined) node.checked = options.checked;
    if (options.disabled !== undefined) node.disabled = options.disabled;
    if (options.rows) node.rows = options.rows;
    for (const child of children) node.appendChild(child);
    return node;
  }

  function formatTimestamp(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function mount(shadow) {
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .panel {
        position: fixed; z-index: 2147483647; right: 18px; top: 18px;
        width: min(600px, calc(100vw - 36px)); max-height: calc(100vh - 36px); overflow: auto;
        background: #ffffff; color: #1b2430; border: 1px solid #e2e6ed; border-radius: 14px;
        box-shadow: 0 20px 48px rgba(15, 30, 60, .22), 0 2px 8px rgba(15,30,60,.10);
        font: 13.5px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .head {
        position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px;
        padding: 16px 18px; background: linear-gradient(135deg, #0b2f52, #124a80); color: #fff;
        border-radius: 13px 13px 0 0;
      }
      .brand { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
      .brand-mark {
        width: 30px; height: 30px; border-radius: 8px; background: rgba(255,255,255,.14);
        display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
        letter-spacing: -0.5px; flex-shrink: 0;
      }
      .brand-text h1 { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: .1px; }
      .brand-text p { margin: 1px 0 0; font-size: 11px; color: rgba(255,255,255,.72); }
      .close {
        width: 28px; height: 28px; border: 0; border-radius: 7px; background: rgba(255,255,255,.12);
        color: #fff; font-size: 18px; line-height: 1; cursor: pointer; flex-shrink: 0;
      }
      .close:hover { background: rgba(255,255,255,.22); }

      .steps { display: flex; padding: 12px 18px 0; gap: 4px; }
      .step {
        flex: 1; text-align: center; font-size: 10.5px; font-weight: 650; color: #8993a4;
        padding: 7px 4px; border-bottom: 2.5px solid #e2e6ed; text-transform: uppercase; letter-spacing: .3px;
      }
      .step.active { color: #124a80; border-bottom-color: #124a80; }
      .step.done { color: #1a8a5f; border-bottom-color: #1a8a5f; }

      .body { padding: 16px 18px 20px; }
      .card {
        border: 1px solid #e6e9ef; border-radius: 10px; padding: 14px; margin: 0 0 14px; background: #fbfcfe;
      }
      .card h2 {
        margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
        color: #47536b;
      }
      .notice {
        margin: 0 0 14px; padding: 10px 12px; border-radius: 8px; border-left: 3px solid #b8860b;
        background: #fff8e6; color: #6b5100; font-size: 12px;
      }
      .cache-notice {
        margin: 0 0 14px; padding: 10px 12px; border-radius: 8px; border-left: 3px solid #124a80;
        background: #eef5fc; color: #0b2f52; font-size: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      }
      .cache-notice .spacer { flex: 1; }

      .field { margin: 0 0 10px; }
      .field:last-child { margin-bottom: 0; }
      label { display: block; margin: 0 0 4px; font-weight: 650; font-size: 12px; color: #33405a; }
      input[type="text"], input:not([type]), textarea, select {
        width: 100%; border: 1px solid #ccd3de; border-radius: 7px; padding: 7px 9px; font: inherit;
        background: #fff; color: #1b2430;
      }
      input:focus, textarea:focus, select:focus { outline: 2px solid #124a80; outline-offset: 1px; }
      textarea { min-height: 96px; resize: vertical; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11.5px; }
      #sxrts-response { min-height: 130px; }

      .row { display: flex; gap: 8px; }
      .row > * { flex: 1; }

      .buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      button.btn {
        border: 1px solid #124a80; border-radius: 7px; padding: 8px 14px; background: #124a80; color: #fff;
        font: 650 12.5px/1.2 inherit; cursor: pointer; transition: background .12s;
      }
      button.btn:hover:not(:disabled) { background: #0d3a66; }
      button.btn.secondary { background: #fff; color: #124a80; }
      button.btn.secondary:hover:not(:disabled) { background: #eef5fc; }
      button.btn.danger { background: #fff; color: #a3291c; border-color: #d8b3ac; }
      button.btn.danger:hover:not(:disabled) { background: #fdf1ef; }
      button.btn.primary-cta { background: #1a8a5f; border-color: #1a8a5f; padding: 10px 18px; font-size: 13px; }
      button.btn.primary-cta:hover:not(:disabled) { background: #166f4c; }
      button.btn:disabled { opacity: .45; cursor: not-allowed; }

      .status { min-height: 18px; margin: 4px 0 0; color: #47536b; white-space: pre-wrap; font-size: 12px; }
      .status.error { color: #a3291c; }
      .status.success { color: #166f4c; }

      table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 4px; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; color: #7a869c; padding: 6px 6px; border-bottom: 1px solid #dde2ea; }
      td { padding: 7px 6px; border-bottom: 1px solid #eef0f4; vertical-align: top; overflow-wrap: anywhere; }
      td.value-cell textarea { min-height: 44px; font-size: 11px; }
      tr.row-skipped { opacity: .55; }
      .badge { display: inline-block; padding: 2px 7px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .2px; }
      .badge-pending { background: #eef5fc; color: #124a80; }
      .badge-skipped { background: #eef0f4; color: #7a869c; }
      .badge-saved { background: #e5f6ee; color: #166f4c; }
      .badge-failed { background: #fdecea; color: #a3291c; }
      .hidden { display: none; }
      .helptext { font-size: 11px; color: #7a869c; margin-top: 6px; }
    `;
    shadow.appendChild(style);

    // ---------- Header ----------
    const panel = element("div", { className: "panel" });
    const closeButton = element("button", { className: "close", text: "×", type: "button", title: "Close" });
    panel.appendChild(element("div", { className: "head" }, [
      element("div", { className: "brand" }, [
        element("div", { className: "brand-mark", text: "SX" }),
        element("div", { className: "brand-text" }, [
          element("h1", { text: "ScraperX" }),
          element("p", { text: "RTS Profile Assistant" })
        ])
      ]),
      closeButton
    ]));

    const stepBar = element("div", { className: "steps" });
    const steps = ["Identify", "Research", "Validate", "Preview & publish"];
    const stepEls = steps.map((label) => element("div", { className: "step", text: label }));
    for (const el of stepEls) stepBar.appendChild(el);
    panel.appendChild(stepBar);

    function setStep(index) {
      stepEls.forEach((el, i) => {
        el.classList.toggle("active", i === index);
        el.classList.toggle("done", i < index);
      });
    }
    setStep(0);

    const body = element("div", { className: "body" });
    body.appendChild(element("p", { className: "notice", text: "5 fields are live end to end: Name Variations, Website Address, Email Default Structure, Research Notes, and SIC codes. Everything else previews only — see docs/evidence-checklist.md." }));

    const cacheNotice = element("div", { className: "cache-notice hidden" });
    body.appendChild(cacheNotice);

    // ---------- Card 1: identity + prompt ----------
    const identityCard = element("div", { className: "card" });
    identityCard.appendChild(element("h2", { text: "1 · Identify the company" }));

    let readIdentity = { companyName: "", domain: "" };
    try {
      const rts = globalThis.SXRTS.identityLock.readRtsIdentityFromPage();
      readIdentity = { companyName: rts.companyName || "", domain: rts.domain || "" };
    } catch {
      // Not on a recognizable RTS Business Entity page yet; leave blank for manual entry.
    }

    const companyNameInput = element("input", { id: "sxrts-company-name", value: readIdentity.companyName });
    const companyNameLabel = element("label", { text: "Company name" });
    companyNameLabel.htmlFor = "sxrts-company-name";
    const domainInput = element("input", { id: "sxrts-domain", value: readIdentity.domain });
    const domainLabel = element("label", { text: "Official website" });
    domainLabel.htmlFor = "sxrts-domain";
    identityCard.appendChild(element("div", { className: "row" }, [
      element("div", { className: "field" }, [companyNameLabel, companyNameInput]),
      element("div", { className: "field" }, [domainLabel, domainInput])
    ]));

    const promptLabel = element("label", { text: "Prompt for ScraperX" });
    const promptArea = element("textarea", { id: "sxrts-prompt" });
    promptArea.readOnly = true;
    identityCard.appendChild(element("div", { className: "field" }, [promptLabel, promptArea]));

    function regeneratePrompt() {
      promptArea.value = globalThis.SXRTS.promptBuilder.buildPrompt({
        companyName: companyNameInput.value.trim(),
        domain: domainInput.value.trim()
      });
    }
    regeneratePrompt();
    companyNameInput.addEventListener("input", regeneratePrompt);
    domainInput.addEventListener("input", regeneratePrompt);

    const copyPromptButton = element("button", { className: "btn", text: "Copy prompt", type: "button" });
    const openRovoButton = element("button", { className: "btn secondary", text: "Open Rovo", type: "button" });
    identityCard.appendChild(element("div", { className: "buttons" }, [copyPromptButton, openRovoButton]));
    body.appendChild(identityCard);

    // ---------- Card 2: paste + validate ----------
    const jsonCard = element("div", { className: "card" });
    jsonCard.appendChild(element("h2", { text: "2-3 · Research in Rovo, then paste the result" }));
    const responseLabel = element("label", { text: "Paste ScraperX Rovo JSON response" });
    const textarea = element("textarea", { id: "sxrts-response", placeholder: "Paste one JSON object here. Nothing is read from your clipboard automatically." });
    jsonCard.appendChild(element("div", { className: "field" }, [responseLabel, textarea]));
    const validateButton = element("button", { className: "btn", text: "Validate JSON", type: "button" });
    jsonCard.appendChild(element("div", { className: "buttons" }, [validateButton]));
    const validateStatus = element("div", { className: "status" });
    jsonCard.appendChild(validateStatus);
    body.appendChild(jsonCard);

    // ---------- Card 3: preview + publish ----------
    const previewCard = element("div", { className: "card hidden" });
    previewCard.appendChild(element("h2", { text: "4 · Preview, edit if needed, then publish" }));
    previewCard.appendChild(element("p", { className: "helptext", text: "Uncheck anything you don't want applied. Edit a proposed value directly if only a small correction is needed — it's re-validated when you publish." }));
    const table = element("table");
    previewCard.appendChild(table);
    const selectAllButton = element("button", { className: "btn secondary", text: "Select all pending", type: "button" });
    const publishButton = element("button", { className: "btn primary-cta", text: "Publish selected to RTS", type: "button" });
    const clearCacheButton = element("button", { className: "btn danger", text: "Clear cache for this profile", type: "button" });
    previewCard.appendChild(element("div", { className: "buttons" }, [selectAllButton, publishButton, clearCacheButton]));
    const publishStatus = element("div", { className: "status" });
    previewCard.appendChild(publishStatus);
    body.appendChild(previewCard);

    let lastValidated = null;
    let lastActions = [];
    const rowsByActionId = new Map();

    function setStatus(el, text, type = "") {
      el.textContent = text;
      el.className = `status${type ? ` ${type}` : ""}`;
    }

    function currentIdentity() {
      return lastValidated?.profileIdentity ?? { companyName: companyNameInput.value.trim(), domain: domainInput.value.trim() };
    }

    async function refreshCacheNotice() {
      try {
        const identity = currentIdentity();
        const cached = await globalThis.SXRTS.cache.getProfileCache(identity);
        if (cached) {
          cacheNotice.replaceChildren(
            element("span", { text: `Cached plan found for this profile (last updated ${formatTimestamp(cached.lastUpdated)}).` }),
            element("span", { className: "spacer" }),
          );
        } else {
          cacheNotice.classList.add("hidden");
        }
        cacheNotice.classList.toggle("hidden", !cached);
      } catch {
        cacheNotice.classList.add("hidden");
      }
    }
    refreshCacheNotice();

    copyPromptButton.addEventListener("click", async () => {
      regeneratePrompt();
      try {
        await navigator.clipboard.writeText(promptArea.value);
        setStatus(validateStatus, "Prompt copied. Paste it into ScraperX in Rovo.", "success");
      } catch {
        promptArea.focus();
        promptArea.select();
        setStatus(validateStatus, "Copy was blocked by the browser. The prompt is selected; press Ctrl+C.", "error");
      }
      setStep(1);
    });
    openRovoButton.addEventListener("click", () => {
      window.open("https://pitchbook.atlassian.net/", "_blank", "noopener,noreferrer");
      setStep(1);
    });

    function renderActionRow(action) {
      const isRunnable = action.executionStatus === "pending";
      const checkbox = element("input", { type: "checkbox", checked: isRunnable, disabled: !isRunnable });

      const valueText = typeof action.proposedValue === "string" ? action.proposedValue : JSON.stringify(action.proposedValue);
      const valueBox = element("textarea", { value: valueText, rows: 2 });
      if (!isRunnable) valueBox.disabled = true;

      const statusBadge = element("span", { className: `badge badge-${isRunnable ? "pending" : "skipped"}`, text: action.executionStatus });
      const reasonCell = element("td", { text: action.skipReason || "" });

      const row = element("tr", { className: isRunnable ? "" : "row-skipped" }, [
        element("td", {}, [checkbox]),
        element("td", { text: `${action.jsonPath}${action.recordIndex !== null ? `[${action.recordIndex}]` : ""}` }),
        element("td", { text: action.area || "(unregistered)" }),
        element("td", { className: "value-cell" }, [valueBox]),
        element("td", {}, [statusBadge]),
        reasonCell
      ]);

      rowsByActionId.set(action.actionId, {
        row, action, checkbox, valueBox, statusBadge, reasonCell,
        getEditedValue() {
          if (typeof action.proposedValue === "string") return valueBox.value;
          try { return JSON.parse(valueBox.value); } catch { return action.proposedValue; }
        }
      });
      return row;
    }

    function setRowStatus(actionId, statusText, reasonText) {
      const entry = rowsByActionId.get(actionId);
      if (!entry) return;
      entry.action.executionStatus = statusText;
      entry.statusBadge.textContent = statusText;
      entry.statusBadge.className = `badge badge-${statusText === "savedValueVerified" ? "saved" : statusText === "failed" ? "failed" : "skipped"}`;
      entry.reasonCell.textContent = reasonText || "";
      entry.checkbox.checked = false;
      entry.checkbox.disabled = true;
      entry.valueBox.disabled = true;
    }

    async function persistToCache() {
      try {
        await globalThis.SXRTS.cache.setProfileCache(currentIdentity(), {
          schemaVersion: lastValidated?.schemaVersion ?? "1.0",
          executionPlan: lastActions.map((a) => ({ actionId: a.actionId, jsonPath: a.jsonPath, area: a.area, executionStatus: a.executionStatus, skipReason: a.skipReason }))
        });
        refreshCacheNotice();
      } catch {
        // Identity not resolvable yet (e.g. manual entry without a strong identifier) — cache is best-effort.
      }
    }

    function buildPlan() {
      lastActions = globalThis.SXRTS.executionPlan.buildExecutionPlan(lastValidated);
      rowsByActionId.clear();
      table.replaceChildren();
      table.appendChild(element("thead", {}, [element("tr", {}, [
        element("th", { text: "Use" }), element("th", { text: "Field" }), element("th", { text: "Area" }),
        element("th", { text: "Proposed value" }), element("th", { text: "Status" }), element("th", { text: "Reason" })
      ])]));
      const tbody = element("tbody");
      for (const action of lastActions) tbody.appendChild(renderActionRow(action));
      table.appendChild(tbody);
      previewCard.classList.remove("hidden");
      const skippedCount = lastActions.filter((a) => a.executionStatus === "skipped").length;
      const runnable = lastActions.length - skippedCount;
      setStatus(publishStatus, `${lastActions.length} proposed change(s): ${runnable} ready to publish, ${skippedCount} skipped (not yet supported for automation).`, "");
      publishButton.disabled = runnable === 0;
      setStep(3);
      persistToCache();
    }

    validateButton.addEventListener("click", () => {
      try {
        lastValidated = globalThis.SXRTS.schema.validate(textarea.value);
        const warningText = lastValidated.warnings.length ? `\nWarnings:\n- ${lastValidated.warnings.join("\n- ")}` : "";
        setStatus(validateStatus, `Valid (schema ${lastValidated.schemaVersion}). Building preview...${warningText}`, "success");
        setStep(2);
        buildPlan();
      } catch (error) {
        lastValidated = null;
        previewCard.classList.add("hidden");
        setStatus(validateStatus, error instanceof globalThis.SXRTS.schema.SchemaValidationError ? error.errors.join("\n") : String(error), "error");
      }
    });

    selectAllButton.addEventListener("click", () => {
      for (const { checkbox, action } of rowsByActionId.values()) {
        if (action.executionStatus === "pending") checkbox.checked = true;
      }
    });

    clearCacheButton.addEventListener("click", async () => {
      try {
        await globalThis.SXRTS.cache.clearProfileCache(currentIdentity());
        setStatus(publishStatus, "Cache cleared for this profile.", "success");
        cacheNotice.classList.add("hidden");
      } catch (error) {
        setStatus(publishStatus, `Could not clear cache: ${error.message}`, "error");
      }
    });

    publishButton.addEventListener("click", async () => {
      const selected = Array.from(rowsByActionId.values()).filter((entry) => entry.checkbox.checked && !entry.checkbox.disabled);
      if (!selected.length) {
        setStatus(publishStatus, "Nothing selected to publish.", "error");
        return;
      }
      if (!window.confirm(`Publish ${selected.length} field(s) to RTS now? This makes live changes.`)) {
        return;
      }

      publishButton.disabled = true;
      clearCacheButton.disabled = true;

      let rtsIdentity;
      try {
        rtsIdentity = globalThis.SXRTS.identityLock.readRtsIdentityFromPage();
      } catch (error) {
        setStatus(publishStatus, `Blocked: ${error.message}`, "error");
        publishButton.disabled = false;
        clearCacheButton.disabled = false;
        return;
      }

      const identityResult = globalThis.SXRTS.identityLock.compareIdentity(lastValidated.profileIdentity, rtsIdentity);
      if (identityResult.status === "mismatch" || identityResult.status === "insufficient") {
        setStatus(publishStatus, `Blocked by identity lock:\n${identityResult.reasons.join("\n")}`, "error");
        publishButton.disabled = false;
        clearCacheButton.disabled = false;
        return;
      }

      let applied = 0, skipped = 0, failed = 0;
      const selectedIds = new Set(selected.map((entry) => entry.action.actionId));
      const isSelected = (a) => selectedIds.has(a.actionId);
      const valueFor = (a) => rowsByActionId.get(a.actionId).getEditedValue();

      const nameVariationActions = selected.filter((entry) => entry.action.jsonPath === "businessEntity.nameVariations");
      for (const entry of nameVariationActions) {
        try {
          const result = await globalThis.SXRTS.workflows.businessEntityNameVariations.applyNameVariation(valueFor(entry.action));
          if (result.status === "savedValueVerified") { applied++; setRowStatus(entry.action.actionId, "savedValueVerified", ""); }
          else { skipped++; setRowStatus(entry.action.actionId, "skipped", result.detail || result.reason); }
        } catch (error) {
          failed++; setRowStatus(entry.action.actionId, "failed", error.message);
        }
      }

      const generalJsonPaths = ["businessEntity.websiteAddresses", "businessEntity.emailDefaultStructure", "businessEntity.researchNotes"];
      const generalEntries = selected.filter((entry) => generalJsonPaths.includes(entry.action.jsonPath));
      if (generalEntries.length) {
        const fields = {};
        const websiteEntries = generalEntries.filter((e) => e.action.jsonPath === "businessEntity.websiteAddresses");
        if (websiteEntries.length) fields.websiteAddresses = websiteEntries.map((e) => valueFor(e.action));
        const emailEntry = generalEntries.find((e) => e.action.jsonPath === "businessEntity.emailDefaultStructure");
        if (emailEntry) fields.emailDefaultStructure = valueFor(emailEntry.action);
        const notesEntries = generalEntries.filter((e) => e.action.jsonPath === "businessEntity.researchNotes");
        if (notesEntries.length) fields.researchNotes = notesEntries.map((e) => valueFor(e.action));

        try {
          const groupResult = await globalThis.SXRTS.workflows.businessEntityGeneral.applyBusinessEntityGeneral(fields);
          const fieldKeyByJsonPath = {
            "businessEntity.websiteAddresses": "websiteAddresses",
            "businessEntity.emailDefaultStructure": "emailDefaultStructure",
            "businessEntity.researchNotes": "researchNotes"
          };
          for (const entry of generalEntries) {
            const fieldResult = groupResult.results?.[fieldKeyByJsonPath[entry.action.jsonPath]];
            const status = fieldResult?.status ?? groupResult.status;
            const reason = fieldResult?.reason ?? groupResult.reason ?? "";
            setRowStatus(entry.action.actionId, status, reason);
            if (status === "savedValueVerified") applied++; else if (status === "skipped") skipped++; else failed++;
          }
        } catch (error) {
          failed += generalEntries.length;
          for (const entry of generalEntries) setRowStatus(entry.action.actionId, "failed", error.message);
        }
      }

      const sicEntries = selected.filter((entry) => entry.action.jsonPath === "company.sicCodes");
      for (const entry of sicEntries) {
        try {
          const result = await globalThis.SXRTS.workflows.companySic.applySicCode(valueFor(entry.action));
          if (result.status === "savedValueVerified") { applied++; setRowStatus(entry.action.actionId, "savedValueVerified", ""); }
          else { skipped++; setRowStatus(entry.action.actionId, "skipped", result.detail || result.reason); }
        } catch (error) {
          failed++; setRowStatus(entry.action.actionId, "failed", error.message);
        }
      }

      const warningText = identityResult.reasons.length ? `\nIdentity warnings:\n${identityResult.reasons.join("\n")}` : "";
      setStatus(publishStatus, `Published ${applied}, skipped ${skipped}, failed ${failed}.${warningText}`, failed ? "error" : "success");
      publishButton.disabled = false;
      clearCacheButton.disabled = false;
      persistToCache();
    });

    closeButton.addEventListener("click", () => document.getElementById("sxrts-assistant-root")?.remove());

    panel.appendChild(body);
    shadow.appendChild(panel);
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.panel = { mount };
})();
