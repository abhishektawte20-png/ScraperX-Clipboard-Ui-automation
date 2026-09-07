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
| Entity ID / PBID (read-only, for identity lock) | **Ready** (PBID + domain; Entity ID still missing) | `identityLock.readRtsIdentityFromPage()` reads PBID from a `flat-button__caption`-prefixed span (hash-suffix tolerant), formal name from `input[name="formalNameVariations"]`, and domain from `#domainValue` with `#webURL`-derived fallback. Entity ID has no selector evidence yet but is not required for the lock to function (PBID/domain suffice). Applying name variations now works end to end once identity matches. |
| EIN / FEIN | **Out of scope** | User decision: not needed. |
| Entity Registration area | **Out of scope** | User decision: not needed. |
| CRD area | **Out of scope** | User decision: not needed. |
| Other Name Variations field | Missing | |
| Email Default Structure dropdown | **In review** | `registry/businessEntity.general.js`, `core/workflows/businessEntityGeneral.js`. Full 42-option catalog evidenced (native `<select name="businessEntity.emailDefaultStructure.id">`). Shares the `#saveBusinessEntityButton` group (see below) — needs the same save-heuristic confirmation. |
| Entity Type control | **Out of scope** | User decision: not needed. |
| Primary Entity dropdown | **Out of scope** | User decision: not needed. |
| Company Financing Status dropdown | **Out of scope** | User decision: not needed. |
| Website Address | **In review** | `#webURL`. Shares `#saveBusinessEntityButton` (id, `data-test-id="be-page-save-changes-btn"`) with Email Default Structure and Research Notes — all three are applied and saved together as one group (`core/workflows/businessEntityGeneral.js`). **Open gap**: the Save button was evidenced starting `disabled="disabled"`; no before/after-save screenshot pair was supplied, so the workflow's "becomes disabled again after a successful save" verification signal is an inference, not confirmed. One quick manual check (does the button re-disable after a real save?) flips this group from `evidenceStatus: "in-review"` to `"ready"`. |
| Domains table (Primary/Favicon/Accept All Email Forms, Add Domain) | Missing | Distinct from Website Address — only a read-only example row was seen, with an apparently separate row-level Save button. Not implemented. |
| Research Notes (Business Entity level) | **In review** | `.highlight-textarea` (a `contenteditable` div, not an input — new `core/adapters/contentEditable.js`). Same shared-save-group and open gap as above. Workflow appends new notes as new lines rather than overwriting, per the JSON `action` semantics. |
| Firm Logo | Missing | |
| Social Media Identifier table + Add form | Missing | The "New" button was shown `disabled`, and the only other evidence was an empty placeholder + a read-only example row from a different profile (reveals `identifierid`/`smnid`/`smnlink`/`smnnetwork` attributes, useful for future duplicate detection, but not an add-form). Still need: the Network dropdown options, the identifier input, and a Save button. |
| Query Tool / Activity Log / Gravity Identifier / Identifiers overview | Missing | |

## Company

| Field | Status | Notes |
| --- | --- | --- |
| Navigation to Company tab | Evidenced (infra, not a field) | `.navigation__text-hint`-prefixed span with text "Company"; not yet wired into any workflow since no Company field is ready to use it. |
| Name section | Missing | |
| Brief Description / Full Description | Missing | Both textareas share the exact same class (`text-input`) and a Vue scope id, with no `id`/`name` to tell them apart — need the surrounding container/label markup to disambiguate. No Save button evidenced for either. |
| Keywords | Missing | Existing keywords render as pills with a `(<number>)` suffix that looks like a PitchBook taxonomy ID — suggests new keywords come from an autocomplete match against a controlled taxonomy, not free text. Need to see what happens when you type into `.keywords__input` (does a suggestion dropdown appear?) and the Save button. |
| Search Keywords | Missing | `textarea[name="businessEntity.searchKeywords"]` is a clean, stable selector, but there's no Save button evidenced for it (same gap as Brief/Full Description — likely a shared Company-page Save button, not yet seen). |
| Industries (primary radio, Add/Edit Industry popup, hierarchy) | Missing — **and an open architecture question** | The screenshot shows "Add/Edit Industry" opens a **separate browser window** (`rts.pitchbook.com/industryGroup/create.html?id=...`), not an in-page modal. The current extension only injects into the tab where the toolbar icon was clicked (`activeTab` + `scripting`); it has no way to detect or auto-inject into a newly opened window without a broader permission (e.g. `tabs`/`windows`), which would need explicit justification per the security principles. **Needs a decision**: should the researcher manually re-click the toolbar icon inside that popup window (no new permission, extra manual step), or should the extension request permission to auto-inject there? Also still missing: the tree/checkbox DOM inside that popup and its Save Changes button. |
| Published / Recommended Verticals, Add New Vertical | Missing | Only the "Add New Vertical" button was evidenced; no popup form, no dropdown options, no Save button. |
| General section (Research/Financing/Ownership/Business/Publish status) | Missing | |
| Financing Status Notes / Research Notes (Company level) | Missing | Distinct from the Business Entity Research Notes already in review. |
| Business Status History / Ownership Status History | Missing | |
| Employee History, Add New Employee Count | Missing | Only the "Add New Employee Count" button caption was evidenced; no opened-form fields or Save button. |
| SIC records, Add New SIC Industry Path | Missing | Code (`input[name="code"]`, class `numberField`) and Source dropdown (`select[name="source"]`: blank/Morningstar/PitchBook/SEC) are evidenced, and the Add button has a stable `onclick="companySic.add()"` hook — but no Save button or saved-state confirmation, and it's unclear whether "Add New Sic Industry Path" opens a simple row (as the field evidence suggests) or a hierarchy popup like Industries. |
| GECS | Missing | Only Add/Save button captions were evidenced (generic `button__caption` class, text "Add GECS" / "Save Changes"); no form fields at all. |
| NAICS | Missing | Add button has a stable `data-test-id="naics-add-button"` — good. Save button is only the generic caption pattern again. No form fields evidenced. |
| Rounds / Investors / Service Providers overview | **Out of scope** | Not requested. |
| Management overview, Add New Management, Management/Board links, Former Management | **Out of scope (user decision)** | User: "Let's not automate the management part" — duplicate-detection risk was the stated reason. This also matches the brief's own Stage 5 gating (full person-search → creation → relationship → save → verify chain required), so it stays off regardless. |
| Site Links, Add New Link, existing site table + edit form | Missing | Need Site Type + Country/State dropdown behavior. |
| Attached Files / Company Activity Log | Missing | |

## Other outstanding items

- Sample Rovo JSON output (e.g. the referenced Psypher example) — needed to sanity-check the canonical schema against real agent output.
- `selectors-data.js` / `test-static.mjs` / icon assets from the reference Conference ScraperX extension — referenced in the brief but not attached to this repo; only useful for comparison, not required to proceed.
