"use strict";

/*
 * Foundation-stage panel: paste JSON, validate it against the schema, and
 * build/preview an execution plan. No field is applied to the page yet —
 * every action in the preview is "skipped" until its registry entry is
 * marked evidenceStatus: "ready" (see docs/evidence-checklist.md).
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
    body.appendChild(element("p", { className: "notice", text: "Foundation build: JSON validation and execution-plan preview only. No RTS field is automated yet — every field is added after its selectors are evidenced." }));

    const label = element("label", { text: "Paste ScraperX Rovo JSON response" });
    const textarea = element("textarea", { placeholder: "Paste one JSON object here." });
    body.appendChild(element("div", { className: "field" }, [label, textarea]));

    const validateButton = element("button", { text: "Validate JSON", type: "button" });
    const previewButton = element("button", { text: "Build execution plan", type: "button" });
    body.appendChild(element("div", { className: "buttons" }, [validateButton, previewButton]));

    const status = element("div", { className: "status" });
    body.appendChild(status);

    const table = element("table", { className: "hidden" });
    body.appendChild(table);

    let lastValidated = null;

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

    previewButton.addEventListener("click", () => {
      if (!lastValidated) {
        setStatus("Validate the JSON first.", "error");
        return;
      }
      const actions = globalThis.SXRTS.executionPlan.buildExecutionPlan(lastValidated);
      table.replaceChildren();
      table.appendChild(element("thead", {}, [element("tr", {}, [
        element("th", { text: "Field" }), element("th", { text: "Area" }), element("th", { text: "Status" }), element("th", { text: "Reason" })
      ])]));
      const tbody = element("tbody");
      for (const action of actions) {
        tbody.appendChild(element("tr", {}, [
          element("td", { text: `${action.jsonPath}${action.recordIndex !== null ? `[${action.recordIndex}]` : ""}` }),
          element("td", { text: action.area || "(unregistered)" }),
          element("td", { className: action.executionStatus === "skipped" ? "skipped" : "", text: action.executionStatus }),
          element("td", { text: action.skipReason || "" })
        ]));
      }
      table.appendChild(tbody);
      table.classList.remove("hidden");
      const skippedCount = actions.filter((a) => a.executionStatus === "skipped").length;
      setStatus(`Built ${actions.length} action(s): ${skippedCount} skipped (no evidenced selector yet), ${actions.length - skippedCount} pending.`, actions.length ? "" : "error");
    });

    closeButton.addEventListener("click", () => document.getElementById("sxrts-assistant-root")?.remove());

    panel.appendChild(body);
    shadow.appendChild(panel);
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.panel = { mount };
})();
