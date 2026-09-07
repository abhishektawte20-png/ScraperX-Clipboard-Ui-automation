"use strict";

/*
 * Profile identity lock. compareIdentity() is a pure function and is fully
 * testable without a browser. readRtsIdentityFromPage() is a stub: reading
 * PBID / Entity ID / domain / company name from a live RTS Business Entity
 * page requires selector evidence that has not been supplied yet (see
 * docs/evidence-checklist.md). It throws NotEvidencedError rather than
 * guessing a selector, per the project's accuracy requirements.
 */
(() => {
  class NotEvidencedError extends Error {
    constructor(message) {
      super(message);
      this.name = "NotEvidencedError";
    }
  }

  function normalizeDomain(value) {
    if (!value) return null;
    let text = String(value).trim().toLowerCase();
    text = text.replace(/^https?:\/\//, "").replace(/^www\./, "");
    text = text.replace(/\/.*$/, "");
    return text || null;
  }

  function normalizeText(value) {
    return value === null || value === undefined ? null : String(value).trim().replace(/\s+/g, " ").toLowerCase();
  }

  // Compares the identity block from the parsed Rovo JSON against whatever
  // identity fields could be read from the currently open RTS record.
  // Blocking identifiers (pbId, entityId, domain) must not conflict; a
  // conflict on any one of them blocks the entire application process.
  function compareIdentity(jsonIdentity, rtsIdentity) {
    const reasons = [];
    let hasStrongComparison = false;

    const blockingPairs = [
      ["pbId", jsonIdentity.pbId, rtsIdentity.pbId],
      ["entityId", jsonIdentity.entityId, rtsIdentity.entityId],
      ["domain", normalizeDomain(jsonIdentity.domain), normalizeDomain(rtsIdentity.domain)]
    ];

    for (const [field, jsonValue, rtsValue] of blockingPairs) {
      if (jsonValue && rtsValue) {
        hasStrongComparison = true;
        if (jsonValue !== rtsValue) {
          reasons.push(`${field} mismatch: JSON has "${jsonValue}", RTS shows "${rtsValue}".`);
        }
      }
    }

    if (reasons.length) {
      return { status: "mismatch", reasons };
    }

    if (!hasStrongComparison) {
      return {
        status: "insufficient",
        reasons: ["No shared strong identifier (pbId, entityId, or domain) was available to compare. Application is blocked until one matches."]
      };
    }

    const nameJson = normalizeText(jsonIdentity.companyName || jsonIdentity.formalName);
    const nameRts = normalizeText(rtsIdentity.companyName || rtsIdentity.formalName);
    if (nameJson && nameRts && nameJson !== nameRts) {
      reasons.push(`Company name differs (informational only): JSON has "${jsonIdentity.companyName}", RTS shows "${rtsIdentity.companyName}".`);
    }

    return { status: reasons.length ? "match-with-warnings" : "match", reasons };
  }

  function readRtsIdentityFromPage() {
    throw new NotEvidencedError(
      "Reading PBID, Entity ID, domain, and company name from the live RTS Business Entity page is not implemented: " +
      "no DOM evidence for the Entity Overview / Identifiers section has been supplied yet."
    );
  }

  globalThis.SXRTS = globalThis.SXRTS || {};
  globalThis.SXRTS.identityLock = { compareIdentity, readRtsIdentityFromPage, normalizeDomain, normalizeText, NotEvidencedError };
})();
