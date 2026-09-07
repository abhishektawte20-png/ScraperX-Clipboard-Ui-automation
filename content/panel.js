"use strict";

/*
 * Panel: paste JSON, validate it, preview the execution plan, and apply
 * pending actions for fields whose workflow is wired up (currently only
 * businessEntity.nameVariations). Applying always runs the profile
 * identity lock first and blocks with a clear message on any mismatch or
 * insufficient identifiers, per the project's identity-lock requirement.
 */
(() => {
  function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.id) node.id = options.id;
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.type) node.type = options.type;
    for (const child of children) node.appendChild(child);
    return node;
  }

  function mount(shadow) {
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .panel { position: fixed; z-index: 2147483647; right: 18px; top: 18px; width: min(560px, calc(100vw - 36px)); max-height: calc(100vh - 36px); overflow: auto; background: #fff; color: #172b4d; border: 1px solid #dfe1e6; border-radius: 12px; box-shadow: 0 14px 38px rgba(9,30,66,.28); font: 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      .head { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #0c3b66; color: #fff; border-radius: 11px 11px 0 0; }
      .head h1 { flex: 1; margin: 0; font-size: 16px; }
      .close { width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: #fff; font-size: 22px; cursor: pointer; }
      .body { padding: 16px; }
      .notice { margin: 0 0 14px; padding: 10px 12px; border-left: 4px solid #974f0c; background: #fff4e5; color: #6a3b0a; }
      .field { margin: 0 0 12px; }
      label { display: block; margin: 0 0 5px; font-weight: 650; }
      textarea { width: 100%; min-height: 160px; resize: vertical; border: 1px solid #8590a2; border-radius: 6px; padding: 8px 9px; font: inherit; }
      .buttons { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 16px; }
      button { border: 1px solid #0c66e4; border-radius: 6px; padding: 8px 12px; background: #0c66e4; color: #fff; font: 650 14px/1.2 inherit; cursor: pointer; }
      .status { min-height: 20px; margin: 8px 0; color: #44546f; white-space: pre-wrap; }
      .status.error { color: #ae2a19; }
      .status.success { color: #216e4e; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
      th, td { padding: 7px 6px; border-bottom: 1px solid #dfe1e6; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      .skipped { color: #974f0c; }
      .hidden { display: none; }
    `;
    shadow.appendChild(style);

    const panel = element("div", { className: "panel" });
    const closeButton = element("button", { className: "close", text: "×", type: "button" });
    panel.appendChild(element("div", { className: "head" }, [
      element("h1", { text: "ScraperX RTS Profile Assistant" }),
      closeButton
    ]));

    const body = element("div", { className: "body" });
    body.appendChild(element("p", { className: "notice", text: "Business Entity > Name Variations is fully wired up, including the profile identity lock. All other fields remain preview-only until their DOM is evidenced — see docs/evidence-checklist.md." }));

    let readIdentity = { companyName: "", domain: "" };
    try {
      const rts = globalThis.SXRTS.identityLock.readRtsIdentityFromPage();
      readIdentity = { companyName: rts.companyName || "", domain: rts.domain || "" };
    } catch {
      // Not on a recognizable RTS Business Entity page yet; leave fields blank for manual entry.
    }

    const companyNameInput = element("input", { id: "sxrts-company-name" });
    companyNameInput.value = readIdentity.companyName;
    const companyNameLabel = element("label", { text: "Company name" });
    companyNameLabel.htmlFor = "sxrts-company-name";
    body.appendChild(element("div", { className: "field" }, [companyNameLabel, companyNameInput]));

    const domainInput = element("input", { id: "sxrts-domain" });
    domainInput.value = readIdentity.domain;
    const domainLabel = element("label", { text: "Official website" });
    domainLabel.htmlFor = "sxrts-domain";
    body.appendChild(element("div", { className: "field" }, [domainLabel, domainInput]));

    const promptLabel = element("label", { text: "Prompt for ScraperX" });
    const promptArea = element("textarea", { id: "sxrts-prompt" });
    promptArea.readOnly = true;
    body.appendChild(element("div", { className: "field" }, [promptLabel, promptArea]));

    function regeneratePrompt() {
      promptArea.value = globalThis.SXRTS.promptBuilder.buildPrompt({
        companyName: companyNameInput.value.trim(),
        domain: domainInput.value.trim()
      });
    }
    regeneratePrompt();
    companyNameInput.addEventListener("input", regeneratePrompt);
    domainInput.addEventListener("input", regeneratePrompt);

    const copyPromptButton = element("button", { text: "Copy prompt", type: "button" });
    const openRovoButton = element("button", { text: "Open Rovo", type: "button" });
    body.appendChild(element("div", { className: "buttons" }, [copyPromptButton, openRovoButton]));

    copyPromptButton.addEventListener("click", async () => {
      regeneratePrompt();
      try {
        await navigator.clipboard.writeText(promptArea.value);
        setStatus("Prompt copied. Paste it into ScraperX in Rovo.", "success");
      } catch {
        promptArea.focus();
        promptArea.select();
        setStatus("Copy was blocked by the browser. The prompt is selected; press Ctrl+C.", "error");
      }
    });
    openRovoButton.addEventListener("click", () => {
      window.open("https://pitchbook.atlassian.net/", "_blank", "noopener,noreferrer");
    });

    const label = element("label", { text: "Paste ScraperX Rovo JSON response" });
    const textarea = element("textarea", { placeholder: "Paste one JSON object here." });
    body.appendChild(element("div", { className: "field" }, [label, textarea]));

    const validateButton = element("button", { text: "Validate JSON", type: "button" });
    const previewButton = element("button", { text: "Build execution plan", type: "button" });
    const applyButton = element("button", { text: "Apply pending actions", type: "button" });
    body.appendChild(element("div", { className: "buttons" }, [validateButton, previewButton, applyButton]));

    const status = element("div", { className: "status" });
    body.appendChild(status);

    const table = element("table", { className: "hidden" });
    body.appendChild(table);

    let lastValidated = null;
    let lastActions = [];

    function setStatus(text, type = "") {
      status.textContent = text;
      status.className = `status${type ? ` ${type}` : ""}`;
    }

    validateButton.addEventListener("click", () => {
      try {
        lastValidated = globalThis.SXRTS.schema.validate(textarea.value);
        const warningText = lastValidated.warnings.length ? `\nWarnings:\n- ${lastValidated.warnings.join("\n- ")}` : "";
        setStatus(`JSON is valid against schema ${lastValidated.schemaVersion}.${warningText}`, "success");
      } catch (error) {
        lastValidated = null;
        table.classList.add("hidden");
        setStatus(error instanceof globalThis.SXRTS.schema.SchemaValidationError ? error.errors.join("\n") : String(error), "error");
      }
    });

    const rowsByActionId = new Map();

    function renderActionRow(action) {
      const row = element("tr", {}, [
        element("td", { text: `${action.jsonPath}${action.recordIndex !== null ? `[${action.recordIndex}]` : ""}` }),
        element("td", { text: action.area || "(unregistered)" }),
        element("td", { className: action.executionStatus === "skipped" ? "skipped" : "", text: action.executionStatus }),
        element("td", { text: action.skipReason || "" })
      ]);
      rowsByActionId.set(action.actionId, { row, action });
      return row;
    }

    function setRowStatus(actionId, statusText, reasonText) {
      const entry = rowsByActionId.get(actionId);
      if (!entry) return;
      const statusCell = entry.row.children[2];
      const reasonCell = entry.row.children[3];
      statusCell.textContent = statusText;
      statusCell.className = statusText === "failed" || statusText === "skipped" ? "skipped" : "";
      reasonCell.textContent = reasonText || "";
    }

    previewButton.addEventListener("click", () => {
      if (!lastValidated) {
        setStatus("Validate the JSON first.", "error");
        return;
      }
      lastActions = globalThis.SXRTS.executionPlan.buildExecutionPlan(lastValidated);
      rowsByActionId.clear();
      table.replaceChildren();
      table.appendChild(element("thead", {}, [element("tr", {}, [
        element("th", { text: "Field" }), element("th", { text: "Area" }), element("th", { text: "Status" }), element("th", { text: "Reason" })
      ])]));
      const tbody = element("tbody");
      for (const action of lastActions) tbody.appendChild(renderActionRow(action));
      table.appendChild(tbody);
      table.classList.remove("hidden");
      const skippedCount = lastActions.filter((a) => a.executionStatus === "skipped").length;
      setStatus(`Built ${lastActions.length} action(s): ${skippedCount} skipped (no evidenced selector yet), ${lastActions.length - skippedCount} pending.`, lastActions.length ? "" : "error");
    });

    applyButton.addEventListener("click", async () => {
      if (!lastActions.length) {
        setStatus("Build the execution plan first.", "error");
        return;
      }

      let rtsIdentity;
      try {
        rtsIdentity = globalThis.SXRTS.identityLock.readRtsIdentityFromPage();
      } catch (error) {
        setStatus(`Blocked: ${error.message}`, "error");
        return;
      }

      const identityResult = globalThis.SXRTS.identityLock.compareIdentity(lastValidated.profileIdentity, rtsIdentity);
      if (identityResult.status === "mismatch" || identityResult.status === "insufficient") {
        setStatus(`Blocked by identity lock:\n${identityResult.reasons.join("\n")}`, "error");
        return;
      }

      const pending = lastActions.filter((a) => a.executionStatus === "pending");
      let applied = 0;
      let skipped = 0;
      let failed = 0;

      const nameVariationActions = pending.filter((a) => a.jsonPath === "businessEntity.nameVariations");
      const generalJsonPaths = ["businessEntity.websiteAddresses", "businessEntity.emailDefaultStructure", "businessEntity.researchNotes"];
      const generalActions = pending.filter((a) => generalJsonPaths.includes(a.jsonPath));
      const sicActions = pending.filter((a) => a.jsonPath === "company.sicCodes");

      for (const action of nameVariationActions) {
        try {
          const result = await globalThis.SXRTS.workflows.businessEntityNameVariations.applyNameVariation(action.proposedValue);
          if (result.status === "savedValueVerified") {
            applied += 1;
            setRowStatus(action.actionId, "savedValueVerified", "");
          } else {
            skipped += 1;
            setRowStatus(action.actionId, "skipped", result.detail || result.reason);
          }
        } catch (error) {
          failed += 1;
          setRowStatus(action.actionId, "failed", error.message);
        }
      }

      // Website Address, Email Default Structure, and Research Notes share
      // one Save button, so they're populated and saved together as one
      // group rather than one action at a time.
      if (generalActions.length) {
        const fields = {};
        const websiteActions = generalActions.filter((a) => a.jsonPath === "businessEntity.websiteAddresses");
        if (websiteActions.length) fields.websiteAddresses = websiteActions.map((a) => a.proposedValue);
        const emailAction = generalActions.find((a) => a.jsonPath === "businessEntity.emailDefaultStructure");
        if (emailAction) fields.emailDefaultStructure = emailAction.proposedValue;
        const notesActions = generalActions.filter((a) => a.jsonPath === "businessEntity.researchNotes");
        if (notesActions.length) fields.researchNotes = notesActions.map((a) => a.proposedValue);

        try {
          const groupResult = await globalThis.SXRTS.workflows.businessEntityGeneral.applyBusinessEntityGeneral(fields);
          const fieldKeyByJsonPath = {
            "businessEntity.websiteAddresses": "websiteAddresses",
            "businessEntity.emailDefaultStructure": "emailDefaultStructure",
            "businessEntity.researchNotes": "researchNotes"
          };
          for (const action of generalActions) {
            const fieldResult = groupResult.results?.[fieldKeyByJsonPath[action.jsonPath]];
            const status = fieldResult?.status ?? groupResult.status;
            const reason = fieldResult?.reason ?? groupResult.reason ?? "";
            setRowStatus(action.actionId, status, reason);
            if (status === "savedValueVerified") applied += 1;
            else if (status === "skipped") skipped += 1;
            else failed += 1;
          }
        } catch (error) {
          failed += generalActions.length;
          for (const action of generalActions) setRowStatus(action.actionId, "failed", error.message);
        }
      }

      for (const action of sicActions) {
        try {
          const result = await globalThis.SXRTS.workflows.companySic.applySicCode(action.proposedValue);
          if (result.status === "savedValueVerified") {
            applied += 1;
            setRowStatus(action.actionId, "savedValueVerified", "");
          } else {
            skipped += 1;
            setRowStatus(action.actionId, "skipped", result.detail || result.reason);
          }
        } catch (error) {
          failed += 1;
          setRowStatus(action.actionId, "failed", error.message);
        }
      }

      const warningText = identityResult.reasons.length ? `\nIdentity warnings:\n${identityResult.reasons.join("\n")}` : "";
      setStatus(`Applied ${applied}, skipped ${skipped}, failed ${failed}.${warningText}`, failed ? "error" : "success");
    });

    closeButton.addEventListener("click", () => document.getElementById("sxrts-assistant-root")?.remove());

    panel.appendChild(body);
    shadow.appendChild(panel);
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.panel = { mount };
})();
