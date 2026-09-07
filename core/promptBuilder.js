"use strict";

/*
 * Builds the ScraperX Rovo research prompt, mirroring the Conference
 * ScraperX prompt's style: exact required JSON shape + every enumerated
 * field's full supported-values list pulled directly from the registry
 * (single source of truth — never duplicated by hand), so Rovo cannot
 * invent a dropdown value.
 *
 * Deliberately scoped to v1.0 fields that are at least coded (ready or
 * in-review): profileIdentity, businessEntity.{nameVariations,
 * websiteAddresses, emailDefaultStructure, researchNotes},
 * company.sicCodes. Expand this as more fields come online rather than
 * asking Rovo to research fields nothing can apply yet.
 */
(() => {
  function catalogLabels(jsonPath, formKey) {
    const entry = globalThis.SXRTS.registry.getField(jsonPath);
    return entry?.form?.[formKey]?.options?.map((option) => option.label) ?? [];
  }

  function buildPrompt({ companyName, domain } = {}) {
    const nameTypeOptions = catalogLabels("businessEntity.nameVariations", "typeDropdown");
    const emailStructureOptions = catalogLabels("businessEntity.emailDefaultStructure", "select");
    const sicSourceOptions = catalogLabels("company.sicCodes", "sourceDropdown");

    const requiredShape = {
      schemaVersion: "1.0",
      meta: { generatedAt: "ISO 8601 timestamp", agent: "ScraperX/Rovo", inputFingerprint: null },
      profileIdentity: {
        companyName: "string|null", formalName: "string|null", domain: "string|null",
        pbId: "string|null", entityId: null, sourceRtsUrl: null
      },
      businessEntity: {
        nameVariations: [{
          name: "string", type: "exact Name Type value from the list below",
          action: "addIfMissing|updateIfBlank|replaceAfterConfirmation|skip",
          source: "https://...|null", sourceDate: "MM/DD/YYYY|null", confidence: "high|medium|low|null"
        }],
        websiteAddresses: [{
          value: "bare domain (e.g. www.example.com) or full https URL",
          action: "addIfMissing|updateIfBlank|replaceAfterConfirmation|skip",
          source: "https://...|null", confidence: "high|medium|low|null"
        }],
        emailDefaultStructure: {
          value: "exact Email Default Structure value from the list below, or null",
          action: "addIfMissing|updateIfBlank|replaceAfterConfirmation|skip",
          source: "https://...|null", confidence: "high|medium|low|null"
        },
        researchNotes: [{
          text: "string", action: "addIfMissing|updateIfBlank|replaceAfterConfirmation|skip", source: "https://...|null"
        }]
      },
      company: {
        sicCodes: [{
          code: "string", classificationSource: "Morningstar|PitchBook|SEC|null",
          action: "addIfMissing|updateIfBlank|replaceAfterConfirmation|skip", source: "https://...|null"
        }]
      }
    };

    return [
      "Research this company using the ScraperX process.",
      `Company name: ${companyName || ""}`,
      `Official website: ${domain || ""}`,
      "",
      "Return exactly one valid JSON object and no Markdown, commentary, or code fences.",
      "Use null when a value cannot be verified. Use MM/DD/YYYY for dates.",
      "Every \"source\" field must be a fully qualified HTTPS URL to where you found that specific value, or null — never invent a citation.",
      "Do not invent a Name Type, Email Default Structure, or SIC Source value that is not in the supported lists below — use null instead.",
      "\"action\" must be one of: addIfMissing, updateIfBlank, replaceAfterConfirmation, skip. Default to addIfMissing for anything new. Only use replaceAfterConfirmation when you are confident an existing RTS value is wrong, and explain why in a research note.",
      "\"confidence\" must be one of: high, medium, low.",
      "This is schema v1.0, scoped to the fields the ScraperX RTS Profile Assistant currently supports. Omit a key entirely (rather than guessing) if nothing applies — do not include fields outside this shape.",
      "",
      "Required JSON shape:",
      JSON.stringify(requiredShape, null, 2),
      "",
      `Supported Name Variation Types (businessEntity.nameVariations[].type):\n- ${nameTypeOptions.join("\n- ")}`,
      "",
      `Supported Email Default Structure values (businessEntity.emailDefaultStructure.value):\n- ${emailStructureOptions.join("\n- ")}`,
      "",
      `Supported SIC Source values (company.sicCodes[].classificationSource):\n- ${sicSourceOptions.join("\n- ")}`
    ].join("\n");
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.promptBuilder = { buildPrompt };
})();
