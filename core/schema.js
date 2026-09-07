"use strict";

/*
 * Canonical Rovo -> RTS JSON contract (schema v1.0).
 * This module only checks JSON shape, types, and formats. It never checks a
 * value against a live RTS dropdown catalog — that happens later, per field,
 * in the execution plan builder, against the selector registry.
 */
(() => {
  const SCHEMA_VERSION = "1.0";
  const ACTIONS = new Set(["addIfMissing", "updateIfBlank", "replaceAfterConfirmation", "skip"]);
  const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

  class SchemaValidationError extends Error {
    constructor(errors) {
      super(errors.join(" "));
      this.name = "SchemaValidationError";
      this.errors = errors;
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isNullableString(value) {
    return value === null || typeof value === "string";
  }

  function isHttpsUrl(value) {
    if (typeof value !== "string") return false;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }

  // RTS's "Website Address" field stores a bare host (e.g. "www.dmcspain.com"),
  // not a full https URL, so this accepts either form.
  function isWebsiteAddressValue(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    if (isHttpsUrl(value)) return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(value.trim());
  }

  function isValidDate(value) {
    return typeof value === "string" && DATE_RE.test(value);
  }

  function isValidConfidence(value) {
    return value === null || (typeof value === "string" && CONFIDENCE_LEVELS.has(value.toLowerCase()));
  }

  function isValidAction(value) {
    return typeof value === "string" && ACTIONS.has(value);
  }

  // path: human-readable location for error/warning messages.
  function pushError(errors, path, message) {
    errors.push(`${path}: ${message}`);
  }

  function checkEnvelope(record, path, errors, { valueCheck, valueLabel, requireAction = true }) {
    if (!isPlainObject(record)) {
      pushError(errors, path, "must be an object.");
      return null;
    }
    const safe = {};
    if (!("value" in record) || !valueCheck(record.value)) {
      pushError(errors, path, `value must be ${valueLabel}.`);
    } else {
      safe.value = record.value;
    }
    if (requireAction) {
      if (!isValidAction(record.action)) {
        pushError(errors, path, "action must be one of addIfMissing, updateIfBlank, replaceAfterConfirmation, skip.");
      } else {
        safe.action = record.action;
      }
    }
    if ("source" in record && record.source !== null && !isHttpsUrl(record.source)) {
      pushError(errors, path, "source must be a valid HTTPS URL or null.");
    } else {
      safe.source = record.source ?? null;
    }
    if ("sourceDate" in record && record.sourceDate !== null && !isValidDate(record.sourceDate)) {
      pushError(errors, path, "sourceDate must use MM/DD/YYYY or be null.");
    } else if ("sourceDate" in record) {
      safe.sourceDate = record.sourceDate ?? null;
    }
    if ("confidence" in record && !isValidConfidence(record.confidence)) {
      pushError(errors, path, "confidence must be high, medium, low, or null.");
    } else {
      safe.confidence = record.confidence ? record.confidence.toLowerCase() : null;
    }
    return safe;
  }

  function checkRecordArray(value, path, errors, fieldChecks) {
    if (!Array.isArray(value)) {
      pushError(errors, path, "must be an array.");
      return [];
    }
    return value.map((record, index) => {
      const recordPath = `${path}[${index}]`;
      if (!isPlainObject(record)) {
        pushError(errors, recordPath, "must be an object.");
        return null;
      }
      const safe = {};
      for (const [key, check] of Object.entries(fieldChecks)) {
        const required = check.required !== false;
        if (!(key in record)) {
          if (required) pushError(errors, `${recordPath}.${key}`, "is required.");
          safe[key] = null;
          continue;
        }
        const fieldValue = record[key];
        if (!check.test(fieldValue)) {
          pushError(errors, `${recordPath}.${key}`, check.message);
          continue;
        }
        safe[key] = fieldValue;
      }
      return safe;
    }).filter(Boolean);
  }

  const nameVariationFields = {
    name: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    type: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string (exact catalog match is checked at execution time)." },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false },
    sourceDate: { test: (v) => v === null || isValidDate(v), message: "must be MM/DD/YYYY or null.", required: false },
    confidence: { test: isValidConfidence, message: "must be high, medium, low, or null.", required: false }
  };

  const socialMediaFields = {
    network: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    handleOrUrl: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false },
    confidence: { test: isValidConfidence, message: "must be high, medium, low, or null.", required: false }
  };

  const researchNoteFields = {
    text: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const keywordFields = {
    value: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    action: { test: isValidAction, message: "must be a supported action." }
  };

  const industryFields = {
    sector: { test: (v) => v === null || typeof v === "string", message: "must be a string or null." },
    group: { test: (v) => v === null || typeof v === "string", message: "must be a string or null." },
    code: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    isPrimary: { test: (v) => typeof v === "boolean" || v === null, message: "must be a boolean or null.", required: false },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const verticalFields = {
    value: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const employeeHistoryFields = {
    count: { test: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0, message: "must be a non-negative number." },
    asOfDate: { test: (v) => v === null || isValidDate(v), message: "must be MM/DD/YYYY or null.", required: false },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const codeFields = {
    code: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    action: { test: isValidAction, message: "must be a supported action." }
  };

  const SIC_CLASSIFICATION_SOURCES = new Set(["Morningstar", "PitchBook", "SEC"]);
  // Distinct from the generic "source" (provenance URL) already on every
  // record: this is RTS's own SIC "Source" dropdown (who classified it).
  const sicCodeFields = {
    code: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    classificationSource: { test: (v) => v === null || SIC_CLASSIFICATION_SOURCES.has(v), message: "must be Morningstar, PitchBook, SEC, or null.", required: false },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const siteFields = {
    siteName: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    siteType: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    address1: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    address2: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    city: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    state: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    country: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    zip: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    phone: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    fax: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    email: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    status: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  const managementFields = {
    firstName: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    lastName: { test: (v) => typeof v === "string" && v.trim().length > 0, message: "must be a non-empty string." },
    title: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    startDate: { test: (v) => v === null || isValidDate(v), message: "must be MM/DD/YYYY or null.", required: false },
    endDate: { test: (v) => v === null || isValidDate(v), message: "must be MM/DD/YYYY or null.", required: false },
    status: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    existingPersonPbId: { test: (v) => v === null || typeof v === "string", message: "must be a string or null.", required: false },
    action: { test: isValidAction, message: "must be a supported action." },
    source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false }
  };

  // Markdown auto-linkification (e.g. a chat UI turning a bare URL into
  // "[text](url)" before it's copied out) can eat trailing JSON
  // punctuation unpredictably. Rather than guess how to repair it — which
  // risks silently producing a wrong or duplicated value — this fails
  // fast with a specific, actionable message.
  function detectMarkdownLinkCorruption(text) {
    if (/\]\(https?:\/\/[^)]*\)/.test(text)) {
      throw new SchemaValidationError([
        "The pasted text contains markdown link syntax (e.g. \"[text](https://...)\") inside what should be raw JSON. " +
        "This usually happens when copying from a chat UI that auto-linkifies URLs, and it can silently corrupt values. " +
        "Please re-copy the raw JSON text (e.g. a \"copy raw\" / \"view source\" option, or paste into a plain-text editor first) and try again."
      ]);
    }
  }

  function parseRawJson(raw) {
    if (typeof raw !== "string" || !raw.trim()) {
      throw new SchemaValidationError(["Paste the ScraperX Rovo JSON response first."]);
    }
    detectMarkdownLinkCorruption(raw);
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new SchemaValidationError(["No JSON object was found in the pasted response."]);
    }
    let parsed;
    try {
      parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch (error) {
      throw new SchemaValidationError([`The pasted response is not valid JSON: ${error.message}`]);
    }
    if (!isPlainObject(parsed)) {
      throw new SchemaValidationError(["The response must be one JSON object."]);
    }
    return parsed;
  }

  function validateProfileIdentity(value, errors) {
    if (!isPlainObject(value)) {
      pushError(errors, "profileIdentity", "is required and must be an object.");
      return null;
    }
    const safe = {};
    for (const key of ["companyName", "formalName", "domain", "pbId", "entityId", "sourceRtsUrl"]) {
      if (key in value && !isNullableString(value[key])) {
        pushError(errors, `profileIdentity.${key}`, "must be a string or null.");
      } else {
        safe[key] = value[key] ?? null;
      }
    }
    if (!safe.companyName) {
      pushError(errors, "profileIdentity.companyName", "is required.");
    }
    if (!safe.pbId && !safe.entityId && !safe.domain) {
      pushError(errors, "profileIdentity", "must include at least one of pbId, entityId, or domain to support the identity lock.");
    }
    return safe;
  }

  function validateBusinessEntity(value, errors, warnings) {
    if (value === undefined) return undefined;
    if (!isPlainObject(value)) {
      pushError(errors, "businessEntity", "must be an object.");
      return null;
    }
    const safe = {};
    const known = new Set(["nameVariations", "emailDefaultStructure", "websiteAddresses", "socialMediaIdentifiers", "researchNotes"]);
    for (const key of Object.keys(value)) {
      if (!known.has(key)) warnings.push(`businessEntity.${key} is not a recognized field and was ignored.`);
    }
    if ("nameVariations" in value) {
      safe.nameVariations = checkRecordArray(value.nameVariations, "businessEntity.nameVariations", errors, nameVariationFields);
    }
    if ("emailDefaultStructure" in value) {
      safe.emailDefaultStructure = checkEnvelope(value.emailDefaultStructure, "businessEntity.emailDefaultStructure", errors, {
        valueCheck: isNullableString, valueLabel: "a string or null"
      });
    }
    if ("websiteAddresses" in value) {
      // RTS has exactly one Website Address field; the workflow uses the
      // first array entry and reports a warning for any additional ones.
      safe.websiteAddresses = checkRecordArray(value.websiteAddresses, "businessEntity.websiteAddresses", errors, {
        value: { test: isWebsiteAddressValue, message: "must be a valid URL or bare domain (e.g. www.example.com)." },
        action: { test: isValidAction, message: "must be a supported action." },
        source: { test: (v) => v === null || isHttpsUrl(v), message: "must be an HTTPS URL or null.", required: false },
        confidence: { test: isValidConfidence, message: "must be high, medium, low, or null.", required: false }
      });
    }
    if ("socialMediaIdentifiers" in value) {
      safe.socialMediaIdentifiers = checkRecordArray(value.socialMediaIdentifiers, "businessEntity.socialMediaIdentifiers", errors, socialMediaFields);
    }
    if ("researchNotes" in value) {
      safe.researchNotes = checkRecordArray(value.researchNotes, "businessEntity.researchNotes", errors, researchNoteFields);
    }
    return safe;
  }

  function validateCompany(value, errors, warnings) {
    if (value === undefined) return undefined;
    if (!isPlainObject(value)) {
      pushError(errors, "company", "must be an object.");
      return null;
    }
    const safe = {};
    const known = new Set([
      "startDate", "briefDescription", "fullDescription", "keywords", "searchKeywords", "industries", "verticals",
      "employeeHistory", "sicCodes", "naicsCodes", "sites", "management"
    ]);
    for (const key of Object.keys(value)) {
      if (!known.has(key)) warnings.push(`company.${key} is not a recognized field and was ignored.`);
    }
    if ("startDate" in value) {
      safe.startDate = checkEnvelope(value.startDate, "company.startDate", errors, { valueCheck: (v) => v === null || isValidDate(v), valueLabel: "MM/DD/YYYY or null" });
    }
    if ("briefDescription" in value) {
      safe.briefDescription = checkEnvelope(value.briefDescription, "company.briefDescription", errors, { valueCheck: isNullableString, valueLabel: "a string or null" });
    }
    if ("fullDescription" in value) {
      safe.fullDescription = checkEnvelope(value.fullDescription, "company.fullDescription", errors, { valueCheck: isNullableString, valueLabel: "a string or null" });
    }
    if ("keywords" in value) {
      safe.keywords = checkRecordArray(value.keywords, "company.keywords", errors, keywordFields);
    }
    if ("searchKeywords" in value) {
      // A single free-text field in RTS, not a repeatable tag list like keywords.
      safe.searchKeywords = checkEnvelope(value.searchKeywords, "company.searchKeywords", errors, { valueCheck: isNullableString, valueLabel: "a string or null" });
    }
    if ("industries" in value) {
      safe.industries = checkRecordArray(value.industries, "company.industries", errors, industryFields);
    }
    if ("verticals" in value) {
      safe.verticals = checkRecordArray(value.verticals, "company.verticals", errors, verticalFields);
    }
    if ("employeeHistory" in value) {
      safe.employeeHistory = checkRecordArray(value.employeeHistory, "company.employeeHistory", errors, employeeHistoryFields);
    }
    if ("sicCodes" in value) {
      safe.sicCodes = checkRecordArray(value.sicCodes, "company.sicCodes", errors, sicCodeFields);
    }
    if ("naicsCodes" in value) {
      safe.naicsCodes = checkRecordArray(value.naicsCodes, "company.naicsCodes", errors, codeFields);
    }
    if ("sites" in value) {
      safe.sites = checkRecordArray(value.sites, "company.sites", errors, siteFields);
    }
    if ("management" in value) {
      safe.management = checkRecordArray(value.management, "company.management", errors, managementFields);
    }
    return safe;
  }

  function validate(raw) {
    const parsed = parseRawJson(raw);
    const errors = [];
    const warnings = [];

    const knownTopLevel = new Set(["schemaVersion", "meta", "profileIdentity", "businessEntity", "company"]);
    for (const key of Object.keys(parsed)) {
      if (!knownTopLevel.has(key)) warnings.push(`${key} is not a recognized top-level field and was ignored.`);
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      pushError(errors, "schemaVersion", `must equal "${SCHEMA_VERSION}".`);
    }

    const profileIdentity = validateProfileIdentity(parsed.profileIdentity, errors);
    const businessEntity = validateBusinessEntity(parsed.businessEntity, errors, warnings);
    const company = validateCompany(parsed.company, errors, warnings);

    if (errors.length) throw new SchemaValidationError(errors);

    return {
      schemaVersion: SCHEMA_VERSION,
      meta: isPlainObject(parsed.meta) ? parsed.meta : {},
      profileIdentity,
      businessEntity: businessEntity ?? {},
      company: company ?? {},
      warnings
    };
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.schema = { SCHEMA_VERSION, ACTIONS, validate, SchemaValidationError };
})();
