# Evidence checklist

Status of the DOM/visual evidence needed before each RTS workflow can be added to `registry/index.js` and enabled. A field moves from **Missing** to **Ready** only after all five evidence items exist for it:

1. The parent RTS section (screenshot or DOM extract).
2. The Add/Edit button that opens the control.
3. The opened form/popup.
4. Every dropdown, shown open, with its full option list.
5. The scoped Save button and the saved record afterward (to build read-back verification).

Evidence should be provided as raw outer HTML (copy from DevTools: right-click element → Copy → Copy outerHTML) plus a screenshot for visual context. Screenshots alone are not enough — they don't expose selectors.

## Status legend
- **Missing** — no evidence yet; field is not in the registry, or is present with `evidenceStatus: "missing"` and empty `candidates`.
- **In review** — evidence supplied, being turned into a registry entry.
- **Ready** — registry entry has real selector candidates and has been exercised at least once in a controlled test.

## Business Entity

| Field | Status | Notes |
| --- | --- | --- |
| Name variations (Add New Name Variation, Type dropdown, Save, verify) | **Ready** | `registry/businessEntity.nameVariations.js`, `core/workflows/businessEntityNameVariations.js`. Evidenced from Protocol DMC Spain (PBID 862926-85): native `<select class="businessEntityNameType">` with 9 exact options, `#addNameVariation`, `#saveBusinessEntityNameVariation` (scoped — distinct from the Entity section's own unrelated Save button), and the post-save `savedNameVariation` class + `data-defaultvalue` match used for read-back verification. "View All Name Variations" toggle selector still unconfirmed (text-fallback only). |
| Formal / Familiar / Former / Legal name, start date | Missing | |
| Parent / Spun Out Of lookups | Missing | |
| Entity ID / PBID (read-only, for identity lock) | Partial | We have the visible value (`PBID: 862926-85`, top of page, next to a copy icon) and the URL pattern `https://rts.pitchbook.com/ext/{pbid}/BE/{sectionId}`, but not the outerHTML of the PBID/company-name header element itself. Still blocks `identityLock.readRtsIdentityFromPage()` — applying any field is blocked until this is evidenced, since the identity lock runs before every apply regardless of which field. **This is the next highest-value piece of evidence** — it unblocks real application for name variations immediately. |
| EIN / FEIN | Missing | |
| Entity Registration area | Missing | |
| CRD area | Missing | |
| Other Name Variations field | Missing | |
| Email Default Structure dropdown | Missing | Need exact option list. |
| Entity Type control | Missing | Need exact selection behavior. |
| Primary Entity dropdown | Missing | |
| Company Financing Status dropdown | Missing | |
| Website Address / Domain info | Missing | Recommended second field per Stage 3 plan. |
| Research Notes | Missing | Recommended third field per Stage 3 plan. |
| Firm Logo | Missing | |
| Social Media Identifier table + Add form | Missing | Need Social Media Network dropdown options. |
| Query Tool / Activity Log / Gravity Identifier / Identifiers overview | Missing | |

## Company

| Field | Status | Notes |
| --- | --- | --- |
| Name section | Missing | |
| Brief Description / Full Description | Missing | |
| Keywords / Search Keywords | Missing | Need tag-entry behavior. |
| Industries (primary radio, Add/Edit Industry popup, hierarchy) | Missing | |
| Published / Recommended Verticals, Add New Vertical | Missing | Need vertical dropdown options. |
| General section (Research/Financing/Ownership/Business/Publish status) | Missing | |
| Financing Status Notes / Research Notes | Missing | |
| Business Status History / Ownership Status History | Missing | |
| Employee History, Add New Employee Count | Missing | |
| SIC records, Add New SIC Industry Path | Missing | |
| Rounds / Investors / Service Providers overview | Missing | Out of scope unless specified. |
| Management overview, Add New Management, Management/Board links, Former Management | Missing | See Stage 5 gating below. |
| Site Links, Add New Link, existing site table + edit form | Missing | Need Site Type + Country/State dropdown behavior. |
| Attached Files / Company Activity Log | Missing | |
| Industry Classification / GECS / NAICS entry point | Missing | |

## Management person workflow (Stage 5 — gated entirely)

Per the brief: **do not automate any part of this journey until the full chain is evidenced** — person search, person creation, relationship creation, save, and verification. Missing: person search page, search results (match found / no match), Add New Person to Database, Person General page fields, Person Management tab, company management relationship form, title selection, start/end dates, current/former/board status, and the final save/connect action.

## Other outstanding items

- Sample Rovo JSON output (e.g. the referenced Psypher example) — needed to sanity-check the canonical schema against real agent output.
- `selectors-data.js` / `test-static.mjs` / icon assets from the reference Conference ScraperX extension — referenced in the brief but not attached to this repo; only useful for comparison, not required to proceed.
